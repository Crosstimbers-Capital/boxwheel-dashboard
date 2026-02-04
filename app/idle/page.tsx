import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { query } from '@/lib/db'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { getIdleStatus, colors } from '@/lib/config'
import { Clock, AlertTriangle, Ban, DollarSign } from 'lucide-react'
import { BarChartComponent } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { IdleFilters } from './idle-filters'

interface IdleSummary {
  total_idle: number
  total_idle_cost: number
  avg_months_idle: number
  total_opportunity_cost: number
  total_never_leased: number
  critical_count: number
}

interface IdleByDuration {
  idle_bucket: string
  unit_count: number
  total_cost: number
  avg_months_idle: number
  monthly_opportunity_cost: number
}

interface IdleByBranch {
  branch: string
  unit_count: number
  total_cost: number
  avg_months_idle: number
  critical_count: number
  never_leased_count: number
}

interface CriticalAsset {
  unit: string
  branch: string
  type_bucket: string
  usage_category: string
  months_idle: number
  last_active_month: string
  total_leases: number
  card_rate: number
}

async function getIdleData() {
  try {
    // Run queries in parallel - 3 simple queries
    const [summaryResult, durationResult, branchResult] = await Promise.all([
      // Summary metrics
      query<IdleSummary>(`
        SELECT 
          COUNT(*) as total_idle,
          ISNULL(SUM(AssetCost), 0) as total_idle_cost,
          ISNULL(AVG(CAST(MonthsIdle AS FLOAT)), 0) as avg_months_idle,
          ISNULL(SUM(CardRate), 0) as total_opportunity_cost,
          SUM(CASE WHEN CumulativeLeases = 0 THEN 1 ELSE 0 END) as total_never_leased,
          SUM(CASE WHEN IdleDurationBucket = '24+ Months' THEN 1 ELSE 0 END) as critical_count
        FROM dbo.vw_IdleAssetsOverTime
        WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
      `),
      
      // By Duration bucket
      query<IdleByDuration>(`
        SELECT 
          IdleDurationBucket as idle_bucket,
          COUNT(*) as unit_count,
          ISNULL(SUM(AssetCost), 0) as total_cost,
          ISNULL(AVG(CAST(MonthsIdle AS FLOAT)), 0) as avg_months_idle,
          ISNULL(SUM(CardRate), 0) as monthly_opportunity_cost
        FROM dbo.vw_IdleAssetsOverTime
        WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
        GROUP BY IdleDurationBucket
      `),
      
      // By Branch
      query<IdleByBranch>(`
        SELECT 
          Branch as branch,
          COUNT(*) as unit_count,
          ISNULL(SUM(AssetCost), 0) as total_cost,
          ISNULL(AVG(CAST(MonthsIdle AS FLOAT)), 0) as avg_months_idle,
          SUM(CASE WHEN IdleDurationBucket = '24+ Months' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN CumulativeLeases = 0 THEN 1 ELSE 0 END) as never_leased_count
        FROM dbo.vw_IdleAssetsOverTime
        WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
        GROUP BY Branch
      `),
    ])

    const summary = summaryResult[0]
    
    // Sort duration buckets in logical order
    const durationOrder = ['0-6 Months', '6-12 Months', '12-24 Months', '24+ Months']
    const byDuration = durationResult.sort((a, b) => 
      durationOrder.indexOf(a.idle_bucket) - durationOrder.indexOf(b.idle_bucket)
    )
    
    // Sort branches alphabetically
    const byBranch = branchResult.sort((a, b) => a.branch.localeCompare(b.branch))

    // Get critical assets in a separate query (small result set)
    let criticalAssets: CriticalAsset[] = []
    try {
      criticalAssets = await query<CriticalAsset>(`
        SELECT TOP 25
          Unit as unit,
          Branch as branch,
          TypeBucket as type_bucket,
          UsageCategory as usage_category,
          MonthsIdle as months_idle,
          LastActiveMonth as last_active_month,
          CumulativeLeases as total_leases,
          CardRate as card_rate
        FROM dbo.vw_IdleAssetsOverTime
        WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
          AND IdleDurationBucket = '24+ Months'
        ORDER BY MonthsIdle DESC
      `)
    } catch (e) {
      console.log('Critical assets query skipped:', e)
    }

    return {
      summary,
      byDuration,
      byBranch,
      criticalAssets,
      branches: byBranch.map(b => b.branch),
      error: null,
    }
  } catch (error) {
    console.error('Failed to fetch idle data:', error)
    return {
      summary: null,
      byDuration: [],
      byBranch: [],
      criticalAssets: [],
      branches: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default async function IdleAssetsPage() {
  const { summary, byDuration, byBranch, criticalAssets, branches, error } = await getIdleData()

  const idleStatus = summary ? getIdleStatus(summary.avg_months_idle) : 'neutral'
  
  // Duration bar chart data with industrial colors
  const durationChartData = byDuration.map(d => ({
    name: d.idle_bucket,
    units: d.unit_count,
    cost: d.total_cost,
    opportunity: d.monthly_opportunity_cost,
  }))

  // Duration donut data with color coding by severity
  const durationDonutData = byDuration.map(d => ({
    name: d.idle_bucket,
    value: d.unit_count,
    color: d.idle_bucket === '0-6 Months' ? colors.idleDuration.fresh :
           d.idle_bucket === '6-12 Months' ? colors.idleDuration.aging :
           d.idle_bucket === '12-24 Months' ? colors.idleDuration.stale :
           colors.idleDuration.critical,
  }))

  // Branch chart data - sorted by idle count
  const branchChartData = [...byBranch]
    .sort((a, b) => b.unit_count - a.unit_count)
    .slice(0, 15)
    .map(b => ({
      name: b.branch,
      total: b.unit_count,
      critical: b.critical_count,
      neverLeased: b.never_leased_count,
    }))

  // Never leased summary
  const neverLeasedData = byBranch
    .filter(b => b.never_leased_count > 0)
    .sort((a, b) => b.never_leased_count - a.never_leased_count)

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Idle Assets"
        description="Track non-leased trailers and identify optimization opportunities"
      />

      <div className="flex-1 p-5 space-y-5">
        {error || !summary ? (
          <Card className="surface-raised border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Analytics Data Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Idle assets analytics views are not yet available. Please ensure the vw_IdleAssetsOverTime view 
                has been created in the Analytics database and contains data.
              </p>
              {error && (
                <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-auto">
                  {error}
                </pre>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <IdleFilters branches={branches} />

            {/* KPI Summary */}
            <KpiGrid columns={4}>
              <KpiCard
                title="Total Idle Assets"
                value={formatNumber(summary.total_idle)}
                subtitle={`${formatCurrency(summary.total_idle_cost)} in capital`}
                status={idleStatus}
                icon={Clock}
              />
              <KpiCard
                title="Avg Months Idle"
                value={`${(summary.avg_months_idle || 0).toFixed(1)}`}
                subtitle="Across all idle units"
                status={idleStatus}
                icon={Clock}
              />
              <KpiCard
                title="Critical (24+ Months)"
                value={formatNumber(summary.critical_count)}
                subtitle="Requires immediate action"
                status={summary.critical_count > 0 ? 'critical' : 'good'}
                icon={AlertTriangle}
              />
              <KpiCard
                title="Never Leased"
                value={formatNumber(summary.total_never_leased)}
                subtitle="Zero lease history"
                status={summary.total_never_leased > 20 ? 'warning' : 'neutral'}
                icon={Ban}
              />
            </KpiGrid>

            {/* Opportunity Cost Banner */}
            {summary.total_opportunity_cost > 0 && (
              <Card className="surface-raised border-0 bg-gradient-to-r from-slate-50 to-white">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg" style={{ background: colors.brand.limeBg }}>
                        <DollarSign className="h-6 w-6" style={{ color: colors.brand.limeDark }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Monthly Opportunity Cost</p>
                        <p className="text-2xl font-bold tabular-nums" style={{ color: colors.brand.limeDark }}>
                          {formatCurrency(summary.total_opportunity_cost)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xs text-right">
                      Potential monthly revenue if all idle assets were leased at card rates
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Row - Duration Distribution */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Duration Bar Chart - Primary visualization */}
              <Card className="surface-raised border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Idle Units by Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={durationChartData}
                    xKey="name"
                    bars={[
                      { key: 'units', label: 'Units', color: colors.chart.primary },
                    ]}
                    layout="vertical"
                    height={250}
                  />
                </CardContent>
              </Card>

              {/* Duration Donut - Shows proportions */}
              <Card className="surface-raised border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Distribution by Idle Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    data={durationDonutData}
                    centerValue={formatNumber(summary.total_idle)}
                    centerLabel="Total Idle"
                    height={250}
                  />
                </CardContent>
              </Card>
            </div>

            {/* By Branch Chart */}
            <Card className="surface-raised border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Idle Assets by Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={branchChartData}
                  xKey="name"
                  bars={[
                    { key: 'total', label: 'Total Idle', color: colors.chart.primary },
                    { key: 'critical', label: 'Critical (24+ mo)', color: colors.idleDuration.critical },
                  ]}
                  layout="horizontal"
                  height={350}
                />
              </CardContent>
            </Card>

            {/* Never Leased Summary Table */}
            {neverLeasedData.length > 0 && (
              <Card className="surface-raised border-0">
                <CardHeader className="pb-2 border-b" style={{ background: colors.surfaces.steelDim }}>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Ban className="h-4 w-4" style={{ color: colors.idleDuration.aging }} />
                    Never-Leased Trailers by Branch
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: colors.surfaces.steelDim }}>
                          <th className="text-left py-3 px-4 font-medium">Branch</th>
                          <th className="text-right py-3 px-4 font-medium">Never Leased</th>
                          <th className="text-right py-3 px-4 font-medium">Total Idle</th>
                          <th className="text-right py-3 px-4 font-medium">% Never Leased</th>
                          <th className="text-right py-3 px-4 font-medium">Avg Months</th>
                        </tr>
                      </thead>
                      <tbody>
                        {neverLeasedData.map((item) => (
                          <tr key={item.branch} className="border-b hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-medium">{item.branch}</td>
                            <td className="text-right py-3 px-4 tabular-nums font-semibold" 
                                style={{ color: colors.idleDuration.aging }}>
                              {item.never_leased_count}
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums">{item.unit_count}</td>
                            <td className="text-right py-3 px-4 tabular-nums">
                              {((item.never_leased_count / item.unit_count) * 100).toFixed(0)}%
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums">
                              {(item.avg_months_idle || 0).toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Critical Assets Detail Table */}
            {criticalAssets.length > 0 && (
              <Card className="surface-raised border-0">
                <CardHeader className="pb-2 border-b" style={{ background: 'hsl(0, 70%, 97%)' }}>
                  <CardTitle className="text-base font-semibold flex items-center gap-2" 
                             style={{ color: colors.idleDuration.critical }}>
                    <AlertTriangle className="h-4 w-4" />
                    Critical Idle Assets (24+ Months) - Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm text-muted-foreground px-4 py-3 border-b bg-slate-50">
                    These trailers have been idle for over 24 months. Evaluate for disposition (sell, transfer, or scrap).
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: colors.surfaces.steelDim }}>
                          <th className="text-left py-3 px-4 font-medium">Unit</th>
                          <th className="text-left py-3 px-4 font-medium">Branch</th>
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">Usage</th>
                          <th className="text-right py-3 px-4 font-medium">Months Idle</th>
                          <th className="text-left py-3 px-4 font-medium">Last Active</th>
                          <th className="text-right py-3 px-4 font-medium">Leases</th>
                          <th className="text-right py-3 px-4 font-medium">Card Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criticalAssets.map((asset) => (
                          <tr key={asset.unit} className="border-b hover:bg-red-50/30">
                            <td className="py-3 px-4 font-mono font-medium">{asset.unit}</td>
                            <td className="py-3 px-4">{asset.branch}</td>
                            <td className="py-3 px-4 text-xs">{asset.type_bucket}</td>
                            <td className="py-3 px-4 text-xs">{asset.usage_category}</td>
                            <td className="text-right py-3 px-4 tabular-nums font-semibold"
                                style={{ color: colors.idleDuration.critical }}>
                              {asset.months_idle}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {asset.last_active_month || 'Never'}
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums">{asset.total_leases}</td>
                            <td className="text-right py-3 px-4 tabular-nums">
                              {asset.card_rate ? formatCurrency(asset.card_rate) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
