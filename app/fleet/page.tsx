import { Suspense } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'
import { queryTrident, queryAnalytics } from '@/lib/db'
import { fleetDataCombined } from '@/lib/queries/utilization'
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

export default async function FleetUtilizationPage() {
  const { global, byBranch, byType, byUsage, matrix, branches, trendData, error } = await getFleetData()

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
        description="Breakdown of utilization by type, usage category, and branch"
      />

      <div className="flex-1 p-6 space-y-6">
        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <FleetFilters branches={branches} />

            {/* KPI Summary */}
            <KpiGrid columns={4}>
              <KpiCard
                title="Overall Utilization"
                value={formatPercent(global?.utilization || 0)}
                subtitle={`${formatNumber(global?.leased_trailers || 0)} on rent`}
                status={getUtilizationStatus(global?.utilization || 0)}
                icon={Truck}
              />
              <KpiCard
                title="Total Fleet"
                value={formatNumber(global?.total_trailers || 0)}
                subtitle="Active trailers"
                status="neutral"
              />
              <KpiCard
                title="Available"
                value={formatNumber(global?.available_trailers || 0)}
                subtitle="Ready to lease"
                status="neutral"
              />
              <KpiCard
                title="Branches"
                value={byBranch.length}
                subtitle="Active locations"
                status="neutral"
              />
            </KpiGrid>

            {/* Utilization Trend */}
            {trendData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Utilization Trend (Last 12 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    data={trendData as { [key: string]: string | number }[]}
                    xKey="month"
                    lines={[
                      { key: 'utilization', label: 'Utilization' }
                    ]}
                    formatType="percent"
                    showThresholds={true}
                    thresholdType="utilization"
                    height={300}
                  />
                </CardContent>
              </Card>
            )}

            {/* Heatmap: Type x Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Utilization Matrix: Type × Usage Category</CardTitle>
              </CardHeader>
              <CardContent>
                <HeatmapChart
                  data={heatmapData}
                  rows={types}
                  cols={usageCategories}
                  colorScale="utilization"
                />
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded" />
                    <span>80%+ (Good)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-100 rounded" />
                    <span>60-80% (Fair)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 rounded" />
                    <span>&lt;60% (Low)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* By Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Utilization by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={typeChartData}
                    xKey="name"
                    bars={[{ key: 'utilization', label: 'Utilization' }]}
                    formatType="percent"
                    colorByStatus={true}
                    statusKey="utilization"
                    layout="vertical"
                    height={300}
                  />
                </CardContent>
              </Card>

              {/* By Usage Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Utilization by Usage Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={usageChartData}
                    xKey="name"
                    bars={[{ key: 'utilization', label: 'Utilization' }]}
                    formatType="percent"
                    colorByStatus={true}
                    statusKey="utilization"
                    layout="vertical"
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Branch Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Branch Utilization Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={branchChartData}
                  xKey="name"
                  bars={[{ key: 'utilization', label: 'Utilization' }]}
                  formatType="percent"
                  colorByStatus={true}
                  statusKey="utilization"
                  showThreshold={true}
                  thresholdValue={0.8}
                  layout="horizontal"
                  height={350}
                />
              </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
              <CardHeader>
                <CardTitle>Branch Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Branch</th>
                        <th className="text-right py-3 px-2 font-medium">Total</th>
                        <th className="text-right py-3 px-2 font-medium">Leased</th>
                        <th className="text-right py-3 px-2 font-medium">Available</th>
                        <th className="text-right py-3 px-2 font-medium">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byBranch.map((branch) => {
                        const status = getUtilizationStatus(branch.utilization)
                        return (
                          <tr key={branch.branch} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 font-medium">{branch.branch}</td>
                            <td className="text-right py-3 px-2">{formatNumber(branch.total_trailers)}</td>
                            <td className="text-right py-3 px-2">{formatNumber(branch.leased_trailers)}</td>
                            <td className="text-right py-3 px-2">{formatNumber(branch.total_trailers - branch.leased_trailers)}</td>
                            <td className="text-right py-3 px-2">
                              <span className={`font-semibold ${
                                status === 'good' ? 'text-green-600' :
                                status === 'warning' ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {formatPercent(branch.utilization)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
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
