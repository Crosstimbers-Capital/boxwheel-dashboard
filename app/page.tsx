import { Suspense } from 'react'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'
import { queryTrident, queryAnalytics } from '@/lib/db'
import { globalUtilization } from '@/lib/queries/utilization'
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
  XCircle,
  Ban,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { UtilizationGauge } from '@/components/charts/UtilizationGauge'
import { TrendChart } from '@/components/charts/TrendChart'
import { BarChartComponent } from '@/components/charts/BarChart'
import { cn } from '@/lib/utils'
import { GlobalBranchFilter } from '@/components/ui/global-branch-filter'

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
  most_available_type: string
  most_available_length: string
  most_available_count: number
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

interface IdleTypeBreakdown {
  type_bucket: string
  max_duration_bucket: string
  never_leased_pct: number
}

interface UtilizationMonth {
  Month: string
  utilization: number
}

async function getOverviewData(branch?: string) {
  const branchFilter = branch && branch !== 'all' ? `AND Fleetcity = '${branch}'` : ''
  const branchFilterAnalytics = branch && branch !== 'all' ? `AND Branch = '${branch}'` : ''

  console.log(`[DEBUG] Starting getOverviewData for branch: ${branch || 'all'}`)
  const startTime = Date.now()

  try {
    const tridentStart = Date.now()
    const [global, branches] = await Promise.all([
      queryTrident<GlobalStats>(`
        SELECT
          COUNT(*) as total_trailers,
          SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
          CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
            NULLIF(COUNT(*), 0) as utilization,
          SUM(CASE WHEN Status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_trailers,
          SUM(CASE WHEN Status NOT IN ('LEASED', 'AVAILABLE') THEN 1 ELSE 0 END) as other_status
        FROM TSpecs
        WHERE (Status = 'AVAILABLE' OR Status = 'LEASED')
          AND Fleetcity != 'TBD'
          ${branchFilter}
      `),
      queryTrident<BranchStats>(branch && branch !== 'all' ? `
        WITH BranchBase AS (
          SELECT
            Fleetcity as branch,
            COUNT(*) as total_trailers,
            SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_count,
            SUM(CASE WHEN Status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_count,
            CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
              NULLIF(COUNT(*), 0) as utilization
          FROM TSpecs
          WHERE (Status = 'AVAILABLE' OR Status = 'LEASED')
            AND Fleetcity = '${branch}'
          GROUP BY Fleetcity
        ),
        TypeAvailability AS (
          SELECT 
            Fleetcity as branch,
            Type,
            Length,
            COUNT(*) as type_count,
            ROW_NUMBER() OVER (PARTITION BY Fleetcity ORDER BY COUNT(*) DESC, Type, Length) as rank
          FROM TSpecs
          WHERE Status = 'AVAILABLE'
            AND Fleetcity = '${branch}'
          GROUP BY Fleetcity, Type, Length
        )
        SELECT 
          b.*,
          ta.Type as most_available_type,
          ta.Length as most_available_length,
          ta.type_count as most_available_count
        FROM BranchBase b
        LEFT JOIN TypeAvailability ta ON b.branch = ta.branch AND ta.rank = 1
      ` : branchSummary),
    ])
    console.log(`[DEBUG] Trident queries took: ${Date.now() - tridentStart}ms`)

    // Try to get analytics data (may fail if views don't exist yet)
    let idleSummary: IdleSummary | null = null
    let revenueSummary: RevenueSummary | null = null
    let idleBreakdown: IdleTypeBreakdown[] = []
    let mmUtilizationChange: number | null = null
    
    try {
      const analyticsStart = Date.now()
      
      const idleSumTask = queryAnalytics<any>(`
        SELECT 
          COUNT(*) as total_idle,
          AVG(CAST(MonthsIdle AS FLOAT)) as avg_months_idle,
          SUM(CASE WHEN IdleDurationBucket = '24+ Months' THEN 1 ELSE 0 END) as critical_count
        FROM dbo.vw_IdleAssetsOverTime
        WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
          AND Branch != 'TBD'
          ${branchFilterAnalytics}
      `).then(res => {
        console.log(`[DEBUG] Analytics: Idle Summary took ${Date.now() - analyticsStart}ms`)
        return res
      })

      const revenueTask = queryAnalytics<any>(`
        WITH LatestMonth AS (
          SELECT MAX(FORMAT(BillingStopDate, 'yyyy-MM')) as MaxMonth 
          FROM dbo.vw_RevenueDetails
          WHERE Branch != 'TBD'
        )
        SELECT 
          AVG(CASE WHEN CardRateMonth > 0 
            THEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth 
            ELSE NULL END) as avg_variance_pct,
          SUM(CASE WHEN MonthlyRateVariance >= 0 THEN 1 ELSE 0 END) as at_or_above_card,
          SUM(CASE WHEN MonthlyRateVariance < 0 THEN 1 ELSE 0 END) as below_card
        FROM dbo.vw_RevenueDetails
        CROSS JOIN LatestMonth
        WHERE CardRateMonth IS NOT NULL
          AND Branch != 'TBD'
          AND FORMAT(BillingStopDate, 'yyyy-MM') = MaxMonth
          ${branchFilterAnalytics}
      `).then(res => {
        console.log(`[DEBUG] Analytics: Revenue Summary took ${Date.now() - analyticsStart}ms`)
        return res
      })

      const idleBreakdownTask = queryAnalytics<IdleTypeBreakdown>(`
        WITH TypeTotals AS (
          SELECT 
            TypeBucket as type_bucket,
            COUNT(*) as total_type_units,
            SUM(CASE WHEN CumulativeLeases = 0 THEN 1 ELSE 0 END) as total_never_leased
          FROM dbo.vw_IdleAssetsOverTime
          WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
            AND Branch != 'TBD'
            ${branchFilterAnalytics}
          GROUP BY TypeBucket
        ),
        BucketCounts AS (
          SELECT 
            TypeBucket as type_bucket,
            IdleDurationBucket as idle_bucket,
            COUNT(*) as bucket_unit_count
          FROM dbo.vw_IdleAssetsOverTime
          WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
            AND Branch != 'TBD'
            ${branchFilterAnalytics}
          GROUP BY TypeBucket, IdleDurationBucket
        ),
        MaxBuckets AS (
          SELECT 
            type_bucket,
            idle_bucket,
            bucket_unit_count,
            ROW_NUMBER() OVER (PARTITION BY type_bucket ORDER BY bucket_unit_count DESC) as rank
          FROM BucketCounts
        )
        SELECT 
          t.type_bucket,
          mb.idle_bucket as max_duration_bucket,
          CAST(t.total_never_leased AS FLOAT) / NULLIF(t.total_type_units, 0) as never_leased_pct
        FROM TypeTotals t
        LEFT JOIN MaxBuckets mb ON t.type_bucket = mb.type_bucket AND mb.rank = 1
        ORDER BY t.total_type_units DESC
      `).then(res => {
        console.log(`[DEBUG] Analytics: Idle Breakdown took ${Date.now() - analyticsStart}ms`)
        return res
      })

      const mmTask = queryAnalytics<UtilizationMonth>(`
        SELECT TOP 2
          Month,
          CAST(SUM(NumRentedTrailers) AS FLOAT) / NULLIF(SUM(NumTrailers), 0) as utilization
        FROM dbo.vw_LQA_bucketStatistics
        WHERE AggLevel = ${branch && branch !== 'all' ? "'BY_BRANCH'" : "'GLOBAL'"}
          AND Branch != 'TBD'
          ${branchFilterAnalytics}
        GROUP BY Month
        ORDER BY Month DESC
      `).then(res => {
        console.log(`[DEBUG] Analytics: M/M Trend took ${Date.now() - analyticsStart}ms`)
        return res
      })

      const [idleResult, revenueResult, breakdownResult, mmResult] = await Promise.all([
        idleSumTask, revenueTask, idleBreakdownTask, mmTask
      ])
      
      console.log(`[DEBUG] Total Analytics queries took: ${Date.now() - analyticsStart}ms`)

      idleSummary = idleResult[0] || null
      revenueSummary = revenueResult[0] || null
      idleBreakdown = breakdownResult
      
      if (mmResult.length >= 2) {
        mmUtilizationChange = mmResult[0].utilization - mmResult[1].utilization
      }
    } catch (e) {
      console.log('[DEBUG] Analytics views not available yet or timed out:', e)
    }

    console.log(`[DEBUG] getOverviewData total execution: ${Date.now() - startTime}ms`)

    return { 
      global: global[0], 
      branches, 
      idleSummary,
      revenueSummary,
      idleBreakdown,
      mmUtilizationChange,
      error: null 
    }
  } catch (error) {
    console.error('[DEBUG] Failed to fetch overview data:', error)
    return {
      global: null,
      branches: [],
      idleSummary: null,
      revenueSummary: null,
      idleBreakdown: [],
      mmUtilizationChange: null,
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

function getUtilizationClass(util: number): string {
  if (util >= 0.8) return 'util-full'
  if (util >= 0.7) return 'util-high'
  if (util >= 0.6) return 'util-mid'
  if (util >= 0.4) return 'util-low'
  return 'util-empty'
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: { branch?: string }
}) {
  const branch = searchParams.branch
  const { global, branches, idleSummary, revenueSummary, idleBreakdown, mmUtilizationChange, error } = await getOverviewData(branch)

  const utilizationStatus = global ? getUtilizationStatus(global.utilization) : 'neutral'
  const idleStatus = idleSummary ? getIdleStatus(idleSummary.avg_months_idle) : 'neutral'
  const rateStatus = revenueSummary ? getRateVarianceStatus(revenueSummary.avg_variance_pct || 0) : 'neutral'

  // Calculate critical alerts
  const alerts = []
  if (global && global.utilization < 0.7) {
    alerts.push({ type: 'critical', message: `Utilization below 70% ${branch && branch !== 'all' ? `at ${branch}` : ''}`, icon: AlertTriangle })
  }
  if (revenueSummary && (revenueSummary.avg_variance_pct || 0) < -0.1) {
    alerts.push({ type: 'warning', message: 'Average rates 10%+ below card (Last Month)', icon: DollarSign })
  }

  // Sort branches by utilization for display
  const sortedBranches = [...branches].sort((a, b) => b.utilization - a.utilization)
  const bottomBranches = [...branches]
    .sort((a, b) => a.utilization - b.utilization)
    .slice(0, 5)

  const displayIdleBreakdown = idleBreakdown.slice(0, 5)

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
            {/* Filter and Alert Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                {alerts.length > 0 && alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border",
                      alert.type === 'critical' ? "status-critical" : "status-warning"
                    )}
                  >
                    <alert.icon className="h-4 w-4" />
                    {alert.message}
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border status-good">
                    <CheckCircle2 className="h-4 w-4" />
                    Fleet performance is healthy
                  </div>
                )}
              </div>
              
              <GlobalBranchFilter branches={branches.map(b => b.branch)} />
            </div>

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
                  // subtitle="Leased & Available"
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
                  subtitle={revenueSummary ? `${revenueSummary.at_or_above_card} at/above card rate (L/M)` : 'Analytics data pending'}
                  status={rateStatus}
                  icon={DollarSign}
                />
              </KpiGrid>
            </Suspense>

            {/* Utilization Gauge and Branch Performance */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Large Utilization Gauge */}
              <Card className="surface-raised border-0">
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
                    {mmUtilizationChange !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">M/M Change:</span>
                        <div className={cn(
                          "flex items-center text-sm font-bold",
                          mmUtilizationChange >= 0 ? "text-[hsl(72,61%,45%)]" : "text-red-600"
                        )}>
                          {mmUtilizationChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {formatPercent(Math.abs(mmUtilizationChange))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        M/M Change: N/A
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Branches Needing Attention */}
              <Card className="surface-raised border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" style={{ color: 'hsl(var(--warning))' }} />
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
                              className={cn(
                                "h-full rounded-full transition-all",
                                branch.utilization >= 0.6 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${Math.min(branch.utilization * 100, 100)}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-sm font-semibold w-12 text-right",
                            branch.utilization >= 0.6 ? "text-amber-600" : "text-red-600"
                          )}>
                            {formatPercent(branch.utilization)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Idle Assets Breakdown */}
              <Card className="surface-raised border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    Idle Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ background: 'hsl(var(--steel-dim))' }}>
                          <th className="text-left py-2 px-4 font-medium">Type</th>
                          <th className="text-left py-2 px-4 font-medium">Max Bucket</th>
                          <th className="text-right py-2 px-4 font-medium">% Never</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayIdleBreakdown.map((item, i) => (
                          <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4 font-medium text-xs">{item.type_bucket}</td>
                            <td className="py-3 px-4">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                item.max_duration_bucket === '24+ Months' ? "bg-red-100 text-red-700" :
                                item.max_duration_bucket === '12-24 Months' ? "bg-orange-100 text-orange-700" :
                                item.max_duration_bucket === '6-12 Months' ? "bg-amber-100 text-amber-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                                {item.max_duration_bucket}
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums font-semibold text-amber-600">
                              {formatPercent(item.never_leased_pct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Branch Summary Table */}
            <Card className="surface-raised border-0">
              <CardHeader>
                <CardTitle>All Branches Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ background: 'hsl(var(--steel-dim))' }}>
                        <th className="text-left py-3 px-4 font-medium">Branch</th>
                        <th className="text-right py-3 px-4 font-medium">Total</th>
                        <th className="text-right py-3 px-4 font-medium">Leased</th>
                        <th className="text-right py-3 px-4 font-medium">Available</th>
                        <th className="text-right py-3 px-4 font-medium">Utilization</th>
                        <th className="text-left py-3 px-4 font-medium">Most Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBranches.map((branch) => {
                        const status = getUtilizationStatus(branch.utilization)
                        return (
                          <tr key={branch.branch} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4 font-medium">{branch.branch}</td>
                            <td className="text-right py-3 px-4 tabular-nums">
                              {formatNumber(branch.total_trailers)}
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums">
                              {formatNumber(branch.leased_count)}
                            </td>
                            <td className="text-right py-3 px-4 tabular-nums">
                              {formatNumber(branch.available_count)}
                            </td>
                            <td className="text-right py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <span className={cn(
                                  "inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums",
                                  getUtilizationClass(branch.utilization)
                                )}>
                                  {formatPercent(branch.utilization)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {branch.most_available_type ? (
                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold tabular-nums border border-slate-200">
                                    {branch.most_available_count}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {branch.most_available_length}&apos; {branch.most_available_type}
                                  </span>
                                </div>
                              ) : '—'}
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
