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

async function getFleetData() {
  try {
    // Single optimized query + branches list (2 queries instead of 6)
    const [combinedResult, branchList] = await Promise.all([
      queryTrident<CombinedFleetData>(fleetDataCombined),
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
        WHERE AggLevel = 'GLOBAL'
          AND Month >= FORMAT(DATEADD(MONTH, -12, GETDATE()), 'yyyy-MM')
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

export default async function FleetPage() {
  const { byBranch, byType, byUsage, matrix, branches, trendData, error } = await getFleetData()

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

  const usageChartData = byUsage.map(u => ({
    name: buckets.usage.find(b => b.value === u.usage_category)?.label || u.usage_category,
    utilization: u.utilization,
    total: u.total_trailers,
    leased: u.leased_trailers,
  }))

  const branchChartData = byBranch.slice(0, 10).map(b => ({
    name: b.branch,
    utilization: b.utilization,
    total: b.total_trailers,
    leased: b.leased_trailers,
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
                  height={400}
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
