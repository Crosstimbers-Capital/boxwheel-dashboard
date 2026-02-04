import { Suspense } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'
import { queryTrident, queryAnalytics } from '@/lib/db'
import { globalUtilization, utilizationByBranch } from '@/lib/queries/utilization'
import { branchSummary } from '@/lib/queries/branches'
import { formatNumber, formatPercent, formatCurrency } from '@/lib/utils'
import { 
  getUtilizationStatus, 
  getIdleStatus,
  getRateVarianceStatus,
  colors 
} from '@/lib/config'
import { 
  Truck, 
  TrendingUp, 
  Clock, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { UtilizationGauge } from '@/components/charts/UtilizationGauge'
import { TrendChart } from '@/components/charts/TrendChart'
import { BarChartComponent } from '@/components/charts/BarChart'

interface GlobalStats {
  total_trailers: number
  leased_trailers: number
  utilization: number
  available_trailers: number
  other_status: number
}

interface BranchStats {
  branch: string
  total_trailers: number
  leased_count: number
  available_count: number
  utilization: number
}

interface IdleSummary {
  total_idle: number
  avg_months_idle: number
  critical_count: number
}

interface RevenueSummary {
  avg_variance_pct: number
  at_or_above_card: number
  below_card: number
}

async function getOverviewData() {
  try {
    const [global, branches] = await Promise.all([
      queryTrident<GlobalStats>(globalUtilization),
      queryTrident<BranchStats>(branchSummary),
    ])

    // Try to get analytics data (may fail if views don't exist yet)
    let idleSummary: IdleSummary | null = null
    let revenueSummary: RevenueSummary | null = null
    
    try {
      const [idleResult, revenueResult] = await Promise.all([
        queryAnalytics<any>(`
          SELECT 
            COUNT(*) as total_idle,
            AVG(MonthsIdle) as avg_months_idle,
            SUM(CASE WHEN IdleDurationBucket = '24+ Months' THEN 1 ELSE 0 END) as critical_count
          FROM dbo.vw_IdleAssetsOverTime
          WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
        `),
        queryAnalytics<any>(`
          SELECT 
            AVG(CASE WHEN CardRateMonth > 0 
              THEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth 
              ELSE NULL END) as avg_variance_pct,
            SUM(CASE WHEN MonthlyRateVariance >= 0 THEN 1 ELSE 0 END) as at_or_above_card,
            SUM(CASE WHEN MonthlyRateVariance < 0 THEN 1 ELSE 0 END) as below_card
          FROM dbo.vw_RevenueDetails
          WHERE CardRateMonth IS NOT NULL
        `),
      ])
      idleSummary = idleResult[0] || null
      revenueSummary = revenueResult[0] || null
    } catch (e) {
      console.log('Analytics views not available yet:', e)
    }

    return { 
      global: global[0], 
      branches, 
      idleSummary,
      revenueSummary,
      error: null 
    }
  } catch (error) {
    console.error('Failed to fetch overview data:', error)
    return {
      global: null,
      branches: [],
      idleSummary: null,
      revenueSummary: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function LoadingKpis() {
  return (
    <KpiGrid>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </KpiGrid>
  )
}

export default async function OverviewPage() {
  const { global, branches, idleSummary, revenueSummary, error } = await getOverviewData()

  const utilizationStatus = global ? getUtilizationStatus(global.utilization) : 'neutral'
  const idleStatus = idleSummary ? getIdleStatus(idleSummary.avg_months_idle) : 'neutral'
  const rateStatus = revenueSummary ? getRateVarianceStatus(revenueSummary.avg_variance_pct || 0) : 'neutral'

  // Calculate critical alerts
  const alerts = []
  if (global && global.utilization < 0.6) {
    alerts.push({ type: 'critical', message: 'Utilization below 60%', icon: AlertTriangle })
  }
  if (idleSummary && idleSummary.critical_count > 50) {
    alerts.push({ type: 'warning', message: `${idleSummary.critical_count} trailers idle 24+ months`, icon: Clock })
  }
  if (revenueSummary && (revenueSummary.avg_variance_pct || 0) < -0.1) {
    alerts.push({ type: 'warning', message: 'Average rates 10%+ below card', icon: DollarSign })
  }

  // Sort branches by utilization for display
  const sortedBranches = [...branches].sort((a, b) => b.utilization - a.utilization)
  const topBranches = sortedBranches.slice(0, 5)
  const bottomBranches = sortedBranches.slice(-5).reverse()

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Dashboard Overview"
        description="Real-time fleet performance at a glance"
      />

      <div className="flex-1 p-6 space-y-6">
        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Database Connection Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Could not connect to the database. Check your environment variables.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {error}
                </pre>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Alert Banner */}
            {alerts.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      alert.type === 'critical'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <alert.icon className="h-4 w-4" />
                    {alert.message}
                  </div>
                ))}
              </div>
            )}

            {/* Main KPI Cards */}
            <Suspense fallback={<LoadingKpis />}>
              <KpiGrid columns={4}>
                <KpiCard
                  title="Fleet Utilization"
                  value={formatPercent(global?.utilization || 0)}
                  subtitle={`${formatNumber(global?.leased_trailers || 0)} of ${formatNumber(global?.total_trailers || 0)} on rent`}
                  status={utilizationStatus}
                  icon={Truck}
                />
                <KpiCard
                  title="Total Fleet"
                  value={formatNumber(global?.total_trailers || 0)}
                  subtitle={`${formatNumber(global?.available_trailers || 0)} available`}
                  status="neutral"
                  icon={Truck}
                />
                <KpiCard
                  title="Idle Assets"
                  value={formatNumber(idleSummary?.total_idle || global?.available_trailers || 0)}
                  subtitle={idleSummary ? `${idleSummary.critical_count} critical (24+ mo)` : 'Analytics data pending'}
                  status={idleStatus}
                  icon={Clock}
                />
                <KpiCard
                  title="Rate Performance"
                  value={revenueSummary ? `${((revenueSummary.avg_variance_pct || 0) * 100).toFixed(1)}%` : 'N/A'}
                  subtitle={revenueSummary ? `${revenueSummary.at_or_above_card} at/above card rate` : 'Analytics data pending'}
                  status={rateStatus}
                  icon={DollarSign}
                />
              </KpiGrid>
            </Suspense>

            {/* Utilization Gauge and Branch Performance */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Large Utilization Gauge */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Overall Utilization</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-4">
                  <UtilizationGauge 
                    value={global?.utilization || 0} 
                    size="lg"
                    showThresholds={true}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Target: 80%+ for healthy performance
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Branches */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Top Performing Branches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topBranches.map((branch) => (
                      <div key={branch.branch} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{branch.branch}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${Math.min(branch.utilization * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold w-12 text-right ${
                            branch.utilization >= 0.8 ? 'text-green-600' :
                            branch.utilization >= 0.6 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {formatPercent(branch.utilization)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Branches Needing Attention */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Needs Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bottomBranches.map((branch) => (
                      <div key={branch.branch} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{branch.branch}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                branch.utilization >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(branch.utilization * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-semibold w-12 text-right ${
                            branch.utilization >= 0.6 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {formatPercent(branch.utilization)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Branch Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Branches Performance</CardTitle>
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
                        <th className="py-3 px-2 font-medium w-32">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBranches.map((branch) => {
                        const status = getUtilizationStatus(branch.utilization)
                        return (
                          <tr key={branch.branch} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-2 font-medium">{branch.branch}</td>
                            <td className="text-right py-3 px-2">
                              {formatNumber(branch.total_trailers)}
                            </td>
                            <td className="text-right py-3 px-2">
                              {formatNumber(branch.leased_count)}
                            </td>
                            <td className="text-right py-3 px-2">
                              {formatNumber(branch.available_count)}
                            </td>
                            <td className="text-right py-3 px-2 font-semibold">
                              {formatPercent(branch.utilization)}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      status === 'good' ? 'bg-green-500' :
                                      status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(branch.utilization * 100, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  status === 'good' ? 'bg-green-100 text-green-700' :
                                  status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {status === 'good' ? 'Good' : status === 'warning' ? 'Fair' : 'Low'}
                                </span>
                              </div>
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
