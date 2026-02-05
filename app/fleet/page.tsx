import { Suspense } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { queryTrident, queryAnalytics } from '@/lib/db'
import {
  fleetDataCombined,
} from '@/lib/queries/utilization'
import { activeBranches } from '@/lib/queries/branches'
import { formatNumber, formatPercent } from '@/lib/utils'
import { getUtilizationStatus, buckets } from '@/lib/config'
import { Truck, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HeatmapChart } from '@/components/charts/HeatmapChart'
import { BarChartComponent } from '@/components/charts/BarChart'
import { TrendChart } from '@/components/charts/TrendChart'
import { FleetFilters } from './fleet-filters'

interface GlobalStats {
  total_trailers: number
  leased_trailers: number
  utilization: number
  available_trailers: number
}

interface BranchUtilization {
  branch: string
  total_trailers: number
  leased_trailers: number
  utilization: number
}

interface TypeUtilization {
  type_bucket: string
  total_trailers: number
  leased_trailers: number
  utilization: number
}

interface UsageUtilization {
  usage_category: string
  total_trailers: number
  leased_trailers: number
  utilization: number
}

interface MatrixCell {
  type_bucket: string
  usage_category: string
  total_trailers: number
  leased_trailers: number
  utilization: number
}

interface TrendData {
  month: string
  leased_trailers: number
  total_trailers: number
  utilization: number
}

interface CombinedFleetData {
  total_trailers: number
  leased_trailers: number
  available_trailers: number
  by_branch_json: string
  by_type_json: string
  by_usage_json: string
  matrix_json: string
}

// Helper to add utilization to parsed data
function addUtilization<T extends { total_trailers: number; leased_trailers: number }>(
  items: T[]
): (T & { utilization: number })[] {
  return items.map(item => ({
    ...item,
    utilization: item.total_trailers > 0 ? item.leased_trailers / item.total_trailers : 0
  }))
}

async function getFleetData(branch?: string) {
  const branchFilter = branch && branch !== 'all' ? `AND Fleetcity = '${branch}'` : ''
  const branchFilterAnalytics = branch && branch !== 'all' ? `AND Branch = '${branch}'` : ''

  try {
    // Single optimized query + branches list (2 queries instead of 6)
    const [combinedResult, branchList] = await Promise.all([
      queryTrident<CombinedFleetData>(`
        WITH BaseData AS (
          SELECT
            Unit,
            Status,
            Fleetcity,
            CASE 
              WHEN Type IS NULL OR LTRIM(RTRIM(Type)) = '' 
                OR LTRIM(RTRIM(Type)) IN ('CHASSIS', 'CONGEAR', 'CURTAIN', 'DROPDECK',
                    'ELECTRIC STANDBY UNIT', 'REEFER ELECTRIC STANDBY UNIT', 'SEE COMMENTS', 
                    'MOVE VAN', 'STEPDECK', 'PUP', 'PUP VAN')
              THEN 'SPECIALTY'
              WHEN LTRIM(RTRIM(Type)) IN ('VAN', 'DRY VAN') THEN 'DRY_VAN'
              WHEN LTRIM(RTRIM(Type)) IN ('VAN LIFTGATE', 'LIFTGATE') THEN 'DRY_VAN_LIFTGATE'
              WHEN LTRIM(RTRIM(Type)) IN ('REEFER LIFTGATE') THEN 'REEFER_LIFTGATE'
              ELSE LTRIM(RTRIM(Type))
            END AS type_bucket,
            CASE 
              WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 0 AND 3 THEN 'OTR_0'
              WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 4 AND 6 THEN 'OTR_1'
              WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 7 AND 8 THEN 'OTR_2'
              WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 9 AND 12 THEN 'CART_1'
              WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 13 AND 16 THEN 'CART_2'
              ELSE 'STORAGE'
            END AS usage_category
          FROM TSpecs
          WHERE Status IN ('AVAILABLE', 'LEASED')
            AND Fleetcity != 'TBD'
            ${branchFilter}
        )
        SELECT
          -- Global metrics
          COUNT(*) as total_trailers,
          SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
          SUM(CASE WHEN Status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_trailers,
          -- Breakdown data as JSON strings for parsing
          (SELECT Fleetcity as branch, 
                  COUNT(*) as total_trailers, 
                  SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers
           FROM BaseData WHERE Fleetcity IS NOT NULL AND Fleetcity != ''
           GROUP BY Fleetcity FOR JSON PATH) as by_branch_json,
          (SELECT type_bucket, 
                  COUNT(*) as total_trailers, 
                  SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers
           FROM BaseData GROUP BY type_bucket FOR JSON PATH) as by_type_json,
          (SELECT usage_category, 
                  COUNT(*) as total_trailers, 
                  SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers
           FROM BaseData GROUP BY usage_category FOR JSON PATH) as by_usage_json,
          (SELECT type_bucket, usage_category, 
                  COUNT(*) as total_trailers, 
                  SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers
           FROM BaseData GROUP BY type_bucket, usage_category FOR JSON PATH) as matrix_json
        FROM BaseData
      `),
      queryTrident<{ branch: string }>(activeBranches),
    ])

    const combined = combinedResult[0]
    
    // Parse JSON results and add computed utilization
    const byBranch = addUtilization(
      JSON.parse(combined.by_branch_json || '[]') as { branch: string; total_trailers: number; leased_trailers: number }[]
    ).sort((a, b) => a.branch.localeCompare(b.branch))
    
    const byType = addUtilization(
      JSON.parse(combined.by_type_json || '[]') as { type_bucket: string; total_trailers: number; leased_trailers: number }[]
    ).sort((a, b) => b.total_trailers - a.total_trailers)
    
    const byUsage = addUtilization(
      JSON.parse(combined.by_usage_json || '[]') as { usage_category: string; total_trailers: number; leased_trailers: number }[]
    ).sort((a, b) => a.usage_category.localeCompare(b.usage_category))
    
    const matrix = addUtilization(
      JSON.parse(combined.matrix_json || '[]') as { type_bucket: string; usage_category: string; total_trailers: number; leased_trailers: number }[]
    )

    const global: GlobalStats = {
      total_trailers: combined.total_trailers,
      leased_trailers: combined.leased_trailers,
      available_trailers: combined.available_trailers,
      utilization: combined.total_trailers > 0 ? combined.leased_trailers / combined.total_trailers : 0
    }

    // Try to get trend data from analytics
    let trendData: TrendData[] = []
    try {
      trendData = await queryAnalytics<TrendData>(`
        SELECT 
          Month as month,
          SUM(NumRentedTrailers) as leased_trailers,
          SUM(NumTrailers) as total_trailers,
          CAST(SUM(NumRentedTrailers) AS FLOAT) / NULLIF(SUM(NumTrailers), 0) as utilization
        FROM dbo.vw_LQA_bucketStatistics
        WHERE AggLevel = ${branch && branch !== 'all' ? "'BY_BRANCH'" : "'GLOBAL'"}
          AND Month >= FORMAT(DATEADD(MONTH, -12, GETDATE()), 'yyyy-MM')
          AND Branch != 'TBD'
          ${branchFilterAnalytics}
        GROUP BY Month
        ORDER BY Month
      `)
    } catch (e) {
      console.log('Trend data not available:', e)
    }

    return {
      global,
      byBranch,
      byType,
      byUsage,
      matrix,
      branches: branchList.map(b => b.branch),
      trendData,
      error: null,
    }
  } catch (error) {
    console.error('Failed to fetch fleet data:', error)
    return {
      global: null,
      byBranch: [],
      byType: [],
      byUsage: [],
      matrix: [],
      branches: [],
      trendData: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get utilization class based on percentage
 */
function getUtilizationClass(util: number): string {
  if (util >= 0.8) return 'util-full'
  if (util >= 0.7) return 'util-high'
  if (util >= 0.6) return 'util-mid'
  if (util >= 0.4) return 'util-low'
  return 'util-empty'
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: { branch?: string }
}) {
  const branch = searchParams.branch
  const { byBranch, byType, byUsage, matrix, branches, trendData, error } = await getFleetData(branch)

  // Transform matrix data for heatmap
  const types = [...new Set(matrix.map(m => m.type_bucket))].sort()
  const usageCategories = ['OTR_0', 'OTR_1', 'OTR_2', 'CART_1', 'CART_2', 'STORAGE']
  
  const heatmapData = matrix.map(m => ({
    row: m.type_bucket,
    col: m.usage_category,
    value: m.utilization,
    count: m.total_trailers,
  }))

  // Transform for bar charts
  const typeChartData = byType.map(t => ({
    name: t.type_bucket.replace('_', ' '),
    utilization: t.utilization,
    total: t.total_trailers,
    leased: t.leased_trailers,
  }))

  const usageOrder = ['OTR_0', 'OTR_1', 'OTR_2', 'CART_1', 'CART_2', 'STORAGE']
  const usageChartData = [...byUsage]
    .sort((a, b) => usageOrder.indexOf(a.usage_category) - usageOrder.indexOf(b.usage_category))
    .map(u => ({
      name: buckets.usage.find(b => b.value === u.usage_category)?.label || u.usage_category,
      utilization: u.utilization,
      total: u.total_trailers,
      leased: u.leased_trailers,
    }))

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Fleet Utilization"
        description="Utilization metrics by branch, type, and age bucket"
      />

      <div className="p-6 space-y-6">
        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <FleetFilters branches={branches} />

            {/* Utilization by Type */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="surface-raised border-0">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Utilization by Trailer Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={typeChartData}
                    xKey="name"
                    bars={[{ key: 'utilization', label: 'Utilization', color: 'hsl(var(--lime))' }]}
                    formatType="percent"
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card className="surface-raised border-0">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Utilization by Age Bucket</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={usageChartData}
                    xKey="name"
                    bars={[{ key: 'utilization', label: 'Utilization', color: 'hsl(var(--lime-muted))' }]}
                    formatType="percent"
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Utilization Matrix (Heatmap) */}
            <Card className="surface-raised border-0">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Utilization Matrix</CardTitle>
                <p className="text-sm text-muted-foreground">Trailer Type x Age Bucket (Usage Category)</p>
              </CardHeader>
              <CardContent>
                <HeatmapChart
                  data={heatmapData}
                  rows={types}
                  cols={usageCategories}
                />
              </CardContent>
            </Card>

            {/* Trend Chart */}
            {trendData.length > 0 && (
              <Card className="surface-raised border-0">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Utilization Trend (LTM)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    data={trendData as any}
                    xKey="month"
                    lines={[
                      { key: 'utilization', label: 'Utilization', color: 'hsl(var(--lime))' }
                    ]}
                    formatType="percent"
                    height={300}
                  />
                </CardContent>
              </Card>
            )}

            {/* Branch Table */}
            <Card className="surface-raised border-0">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Branch Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ background: 'hsl(var(--steel-dim))' }}>
                        <th className="text-left py-3 px-4 font-medium">Branch</th>
                        <th className="text-right py-3 px-4 font-medium">Total</th>
                        <th className="text-right py-3 px-4 font-medium">Leased</th>
                        <th className="text-right py-3 px-4 font-medium">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byBranch.map((branch) => (
                        <tr key={branch.branch} className="border-b hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-medium">{branch.branch}</td>
                          <td className="text-right py-3 px-4 tabular-nums">
                            {formatNumber(branch.total_trailers)}
                          </td>
                          <td className="text-right py-3 px-4 tabular-nums">
                            {formatNumber(branch.leased_trailers)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums",
                              getUtilizationClass(branch.utilization)
                            )}>
                              {formatPercent(branch.utilization)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
