import { Suspense } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { queryTrident, queryAnalytics } from '@/lib/db'
import { activeBranches } from '@/lib/queries/branches'
import { formatNumber, formatPercent } from '@/lib/utils'
import { getUtilizationStatus, buckets } from '@/lib/config'
import { Truck, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react'
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

interface FleetKpis {
  current_utilization: number
  previous_utilization: number
  mm_change: number
  new_leases: number
  ended_leases: number
  asset_churn_pct: number
  leased_at_start: number
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

async function getFleetData(branch?: string, period: string = 'LTM') {
  const branchFilter = branch && branch !== 'all' ? `AND Fleetcity = '${branch}'` : ''
  const branchFilterAnalytics = branch && branch !== 'all' ? `AND Branch = '${branch}'` : ''
  const branchFilterLeases = branch && branch !== 'all' ? `AND Unit IN (SELECT Unit FROM TSpecs WHERE Fleetcity = '${branch}')` : ''

  // Determine date range for activity based on period
  let months = 12
  if (period === 'L3M') months = 3
  if (period === 'L6M') months = 6
  if (period === 'YTD') months = new Date().getMonth() + 1

  try {
    // Run queries in parallel
    const [combinedResult, branchList, kpiResult] = await Promise.all([
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
      // KPI Query (Utilization trend + Churn)
      queryAnalytics<any>(`
        DECLARE @MaxMonth CHAR(7) = (SELECT MAX(Month) FROM dbo.vw_LQA_bucketStatistics WHERE Branch != 'TBD');
        DECLARE @PrevMonth CHAR(7) = FORMAT(DATEADD(MONTH, -1, CAST(@MaxMonth + '-01' AS DATE)), 'yyyy-MM');
        
        -- Start of current month for churn calc
        DECLARE @StartOfPeriod DATE = CAST(@MaxMonth + '-01' AS DATE);
        DECLARE @EndOfPeriod DATE = EOMONTH(@StartOfPeriod);

        WITH UtilStats AS (
          SELECT 
            Month,
            CAST(SUM(NumRentedTrailers) AS FLOAT) / NULLIF(SUM(NumTrailers), 0) as utilization,
            SUM(NumRentedTrailers) as leased_count
          FROM dbo.vw_LQA_bucketStatistics
          WHERE AggLevel = ${branch && branch !== 'all' ? "'BY_BRANCH'" : "'GLOBAL'"}
            AND Branch != 'TBD'
            ${branchFilterAnalytics}
            AND Month IN (@MaxMonth, @PrevMonth)
          GROUP BY Month
        ),
        LeaseActivity AS (
          SELECT 
            COUNT(CASE WHEN DateOn >= DATEADD(MONTH, -${months}, GETDATE()) THEN 1 END) as new_leases,
            COUNT(CASE WHEN DateOff < GETDATE() AND DateOff >= DATEADD(MONTH, -${months}, GETDATE()) THEN 1 END) as ended_leases
          FROM TLeases
          WHERE 1=1 ${branchFilterLeases}
        ),
        ChurnCalc AS (
          -- Units returned in the LATEST month
          SELECT 
            COUNT(*) as units_returned_latest
          FROM TLeases
          WHERE DateOff >= @StartOfPeriod AND DateOff <= @EndOfPeriod
            ${branchFilterLeases}
        )
        SELECT 
          (SELECT utilization FROM UtilStats WHERE Month = @MaxMonth) as current_utilization,
          (SELECT utilization FROM UtilStats WHERE Month = @PrevMonth) as previous_utilization,
          (SELECT leased_count FROM UtilStats WHERE Month = @PrevMonth) as leased_at_start,
          (SELECT new_leases FROM LeaseActivity) as new_leases,
          (SELECT ended_leases FROM LeaseActivity) as ended_leases,
          (SELECT units_returned_latest FROM ChurnCalc) as units_returned_latest
      `)
    ])

    const combined = combinedResult[0]
    const kpisRaw = kpiResult[0]

    const kpis: FleetKpis = {
      current_utilization: kpisRaw.current_utilization || (combined.total_trailers > 0 ? combined.leased_trailers / combined.total_trailers : 0),
      previous_utilization: kpisRaw.previous_utilization || 0,
      mm_change: (kpisRaw.current_utilization || 0) - (kpisRaw.previous_utilization || 0),
      new_leases: kpisRaw.new_leases || 0,
      ended_leases: kpisRaw.ended_leases || 0,
      leased_at_start: kpisRaw.leased_at_start || 0,
      asset_churn_pct: kpisRaw.leased_at_start > 0 ? (kpisRaw.units_returned_latest || 0) / kpisRaw.leased_at_start : 0
    }
    
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
      kpis,
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
      kpis: null,
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
  searchParams: { branch?: string; period?: string }
}) {
  const branch = searchParams.branch
  const period = searchParams.period || 'LTM'
  const { byBranch, byType, byUsage, matrix, branches, trendData, kpis, error } = await getFleetData(branch, period)

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

            {/* KPI Row */}
            {kpis && (
              <KpiGrid columns={4}>
                <KpiCard
                  title="Current Utilization"
                  value={formatPercent(kpis.current_utilization)}
                  subtitle="Active Leases / Total Fleet"
                  status={getUtilizationStatus(kpis.current_utilization)}
                  icon={Truck}
                />
                <KpiCard
                  title="M/M Change"
                  value={formatPercent(Math.abs(kpis.mm_change))}
                  subtitle={kpis.mm_change >= 0 ? "Increase from prev month" : "Decrease from prev month"}
                  status={kpis.mm_change >= 0 ? 'good' : 'critical'}
                  icon={kpis.mm_change >= 0 ? ArrowUpRight : ArrowDownRight}
                />
                <KpiCard
                  title="Lease Activity"
                  value={`${kpis.new_leases} / ${kpis.ended_leases}`}
                  subtitle={`New vs Ended (${period})`}
                  status={kpis.new_leases >= kpis.ended_leases ? 'good' : 'warning'}
                  icon={RefreshCcw}
                />
                <KpiCard
                  title="Asset Churn (Turn-in)"
                  value={formatPercent(kpis.asset_churn_pct)}
                  subtitle="Units Returned / Leased at Start"
                  status={kpis.asset_churn_pct < 0.05 ? 'good' : 'warning'}
                  icon={TrendingDown}
                />
              </KpiGrid>
            )}

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
