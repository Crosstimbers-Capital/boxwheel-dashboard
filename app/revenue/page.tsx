import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { queryTrident, queryAnalytics } from '@/lib/db'
import { activeBranches } from '@/lib/queries/branches'
import { formatNumber, formatPercent, formatCurrency } from '@/lib/utils'
import { getRateVarianceStatus, colors } from '@/lib/config'
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { TrendChart } from '@/components/charts/TrendChart'
import { BarChartComponent } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { RevenueFilters } from './revenue-filters'

interface RevenueSummary {
  invoice_count: number
  total_billed: number
  avg_billed_rate: number
  avg_card_rate: number
  avg_variance: number
  avg_variance_pct: number
  at_or_above_card: number
  below_card: number
}

interface BranchRevenue {
  branch: string
  invoice_count: number
  total_billed: number
  avg_billed_rate: number
  avg_card_rate: number
  avg_variance: number
  avg_variance_pct: number
}

interface TypeRevenue {
  type_bucket: string
  invoice_count: number
  total_billed: number
  avg_billed_rate: number
  avg_card_rate: number
  avg_variance: number
}

interface VarianceDistribution {
  variance_bucket: string
  invoice_count: number
  total_billed: number
}

interface UnitsWithoutRate {
  type_bucket: string
  usage_category: string
  length_bucket: string
  unit_count: number
  total_revenue_at_risk: number
}

interface TrendData {
  month: string
  avg_billed_rate: number
  avg_card_rate: number
  avg_variance: number
}

async function getRevenueData() {
  try {
    const [branchList] = await Promise.all([
      queryTrident<{ branch: string }>(activeBranches),
    ])

    // Get analytics data
    let summary: RevenueSummary | null = null
    let byBranch: BranchRevenue[] = []
    let byType: TypeRevenue[] = []
    let varianceDistribution: VarianceDistribution[] = []
    let unitsWithoutRate: UnitsWithoutRate[] = []
    let trendData: TrendData[] = []

    try {
      const [
        summaryResult,
        branchResult,
        typeResult,
        varianceResult,
        noRateResult,
        trendResult,
      ] = await Promise.all([
        queryAnalytics<RevenueSummary>(`
          SELECT 
            COUNT(*) as invoice_count,
            SUM(BilledMonthlyRate) as total_billed,
            AVG(BilledMonthlyRate) as avg_billed_rate,
            AVG(CardRateMonth) as avg_card_rate,
            AVG(MonthlyRateVariance) as avg_variance,
            AVG(CASE WHEN CardRateMonth > 0 
              THEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth 
              ELSE NULL END) as avg_variance_pct,
            SUM(CASE WHEN MonthlyRateVariance >= 0 THEN 1 ELSE 0 END) as at_or_above_card,
            SUM(CASE WHEN MonthlyRateVariance < 0 THEN 1 ELSE 0 END) as below_card
          FROM dbo.vw_RevenueDetails
          WHERE CardRateMonth IS NOT NULL
        `),
        queryAnalytics<BranchRevenue>(`
          SELECT 
            Branch as branch,
            COUNT(*) as invoice_count,
            SUM(BilledMonthlyRate) as total_billed,
            AVG(BilledMonthlyRate) as avg_billed_rate,
            AVG(CardRateMonth) as avg_card_rate,
            AVG(MonthlyRateVariance) as avg_variance,
            AVG(CASE WHEN CardRateMonth > 0 
              THEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth 
              ELSE NULL END) as avg_variance_pct
          FROM dbo.vw_RevenueDetails
          WHERE CardRateMonth IS NOT NULL AND Branch IS NOT NULL
          GROUP BY Branch
          ORDER BY Branch
        `),
        queryAnalytics<TypeRevenue>(`
          SELECT 
            TypeBucket as type_bucket,
            COUNT(*) as invoice_count,
            SUM(BilledMonthlyRate) as total_billed,
            AVG(BilledMonthlyRate) as avg_billed_rate,
            AVG(CardRateMonth) as avg_card_rate,
            AVG(MonthlyRateVariance) as avg_variance
          FROM dbo.vw_RevenueDetails
          WHERE CardRateMonth IS NOT NULL
          GROUP BY TypeBucket
          ORDER BY total_billed DESC
        `),
        queryAnalytics<VarianceDistribution>(`
          SELECT 
            CASE 
              WHEN CardRateMonth IS NULL THEN 'No Card Rate'
              WHEN MonthlyRateVariance >= 0 THEN 'At or Above Card'
              WHEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth >= -0.10 THEN 'Within 10%'
              WHEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth >= -0.20 THEN '10-20% Below'
              ELSE 'More than 20% Below'
            END as variance_bucket,
            COUNT(*) as invoice_count,
            SUM(BilledMonthlyRate) as total_billed
          FROM dbo.vw_RevenueDetails
          GROUP BY 
            CASE 
              WHEN CardRateMonth IS NULL THEN 'No Card Rate'
              WHEN MonthlyRateVariance >= 0 THEN 'At or Above Card'
              WHEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth >= -0.10 THEN 'Within 10%'
              WHEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth >= -0.20 THEN '10-20% Below'
              ELSE 'More than 20% Below'
            END
        `),
        queryAnalytics<UnitsWithoutRate>(`
          SELECT 
            TypeBucket as type_bucket,
            UsageCategory as usage_category,
            LengthBucket as length_bucket,
            COUNT(DISTINCT UnitNumber) as unit_count,
            SUM(BilledMonthlyRate) as total_revenue_at_risk
          FROM dbo.vw_RevenueDetails
          WHERE CardRateMonth IS NULL
          GROUP BY TypeBucket, UsageCategory, LengthBucket
          ORDER BY unit_count DESC
        `),
        queryAnalytics<TrendData>(`
          SELECT 
            FORMAT(BillingStopDate, 'yyyy-MM') as month,
            AVG(BilledMonthlyRate) as avg_billed_rate,
            AVG(CardRateMonth) as avg_card_rate,
            AVG(MonthlyRateVariance) as avg_variance
          FROM dbo.vw_RevenueDetails
          WHERE CardRateMonth IS NOT NULL
          GROUP BY FORMAT(BillingStopDate, 'yyyy-MM')
          ORDER BY month
        `),
      ])

      summary = summaryResult[0]
      byBranch = branchResult
      byType = typeResult
      varianceDistribution = varianceResult
      unitsWithoutRate = noRateResult
      trendData = trendResult
    } catch (e) {
      console.log('Revenue analytics not available:', e)
    }

    return {
      summary,
      byBranch,
      byType,
      varianceDistribution,
      unitsWithoutRate,
      trendData,
      branches: branchList.map(b => b.branch),
      error: null,
    }
  } catch (error) {
    console.error('Failed to fetch revenue data:', error)
    return {
      summary: null,
      byBranch: [],
      byType: [],
      varianceDistribution: [],
      unitsWithoutRate: [],
      trendData: [],
      branches: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default async function RevenuePage() {
  const { summary, byBranch, byType, varianceDistribution, unitsWithoutRate, trendData, branches, error } = await getRevenueData()

  const varianceStatus = summary ? getRateVarianceStatus(summary.avg_variance_pct || 0) : 'neutral'
  
  // Transform data for charts
  const donutData = varianceDistribution.map(v => ({
    name: v.variance_bucket,
    value: v.invoice_count,
    color: v.variance_bucket === 'At or Above Card' ? colors.status.good :
           v.variance_bucket === 'Within 10%' ? colors.status.warning :
           v.variance_bucket === 'No Card Rate' ? colors.status.neutral :
           colors.status.critical,
  }))

  const branchChartData = byBranch.map(b => ({
    name: b.branch,
    variance: b.avg_variance_pct || 0,
    billed: b.avg_billed_rate,
    card: b.avg_card_rate,
  }))

  const typeChartData = byType.map(t => ({
    name: t.type_bucket.replace('_', ' '),
    billed: t.avg_billed_rate,
    card: t.avg_card_rate,
    variance: t.avg_variance,
  }))

  const totalUnitsWithoutRate = unitsWithoutRate.reduce((sum, u) => sum + u.unit_count, 0)
  const totalRevenueAtRisk = unitsWithoutRate.reduce((sum, u) => sum + (u.total_revenue_at_risk || 0), 0)

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Revenue Analysis"
        description="Compare actual billed rates against card rate benchmarks"
      />

      <div className="flex-1 p-6 space-y-6">
        {error || !summary ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Analytics Data Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700">
                Revenue analytics views are not yet available. Please ensure the vw_RevenueDetails view 
                has been created in the Analytics database and contains data.
              </p>
              {error && process.env.NODE_ENV === 'development' && (
                <pre className="text-xs bg-amber-100 p-2 rounded mt-2 overflow-auto">{error}</pre>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <RevenueFilters branches={branches} />

            {/* KPI Summary */}
            <KpiGrid columns={4}>
              <KpiCard
                title="Avg Rate vs Card"
                value={`${((summary.avg_variance_pct || 0) * 100).toFixed(1)}%`}
                subtitle={summary.avg_variance_pct >= 0 ? 'Above card rate' : 'Below card rate'}
                status={varianceStatus}
                icon={summary.avg_variance_pct >= 0 ? TrendingUp : TrendingDown}
              />
              <KpiCard
                title="At/Above Card Rate"
                value={formatNumber(summary.at_or_above_card)}
                subtitle={`${formatPercent(summary.at_or_above_card / summary.invoice_count)} of invoices`}
                status="good"
                icon={CheckCircle}
              />
              <KpiCard
                title="Below Card Rate"
                value={formatNumber(summary.below_card)}
                subtitle={`${formatPercent(summary.below_card / summary.invoice_count)} of invoices`}
                status={summary.below_card > summary.at_or_above_card ? 'critical' : 'warning'}
                icon={AlertTriangle}
              />
              <KpiCard
                title="Avg Monthly Rate"
                value={formatCurrency(summary.avg_billed_rate)}
                subtitle={`Card: ${formatCurrency(summary.avg_card_rate)}`}
                status="neutral"
                icon={DollarSign}
              />
            </KpiGrid>

            {/* Rate Trend */}
            {trendData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Rate Trend: Billed vs Card Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    data={trendData}
                    xKey="month"
                    lines={[
                      { key: 'avg_billed_rate', label: 'Avg Billed', color: colors.chart.primary },
                      { key: 'avg_card_rate', label: 'Card Rate', color: colors.chart.secondary },
                    ]}
                    formatType="currency"
                    height={300}
                  />
                </CardContent>
              </Card>
            )}

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Variance Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Rate Variance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    data={donutData}
                    centerValue={formatNumber(summary.invoice_count)}
                    centerLabel="Total Invoices"
                    height={300}
                  />
                </CardContent>
              </Card>

              {/* By Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Average Rates by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartComponent
                    data={typeChartData}
                    xKey="name"
                    bars={[
                      { key: 'billed', label: 'Billed Rate', color: colors.chart.primary },
                      { key: 'card', label: 'Card Rate', color: colors.chart.secondary },
                    ]}
                    formatType="currency"
                    layout="vertical"
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Branch Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Performance by Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Branch</th>
                        <th className="text-right py-3 px-2 font-medium">Invoices</th>
                        <th className="text-right py-3 px-2 font-medium">Avg Billed</th>
                        <th className="text-right py-3 px-2 font-medium">Card Rate</th>
                        <th className="text-right py-3 px-2 font-medium">Variance</th>
                        <th className="text-right py-3 px-2 font-medium">Variance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byBranch.map((branch) => {
                        const status = getRateVarianceStatus(branch.avg_variance_pct || 0)
                        return (
                          <tr key={branch.branch} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 font-medium">{branch.branch}</td>
                            <td className="text-right py-3 px-2">{formatNumber(branch.invoice_count)}</td>
                            <td className="text-right py-3 px-2">{formatCurrency(branch.avg_billed_rate)}</td>
                            <td className="text-right py-3 px-2">{formatCurrency(branch.avg_card_rate)}</td>
                            <td className="text-right py-3 px-2">
                              <span className={status === 'good' ? 'text-green-600' : status === 'warning' ? 'text-amber-600' : 'text-red-600'}>
                                {formatCurrency(branch.avg_variance)}
                              </span>
                            </td>
                            <td className="text-right py-3 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                status === 'good' ? 'bg-green-100 text-green-700' :
                                status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {((branch.avg_variance_pct || 0) * 100).toFixed(1)}%
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

            {/* Units Without Card Rate */}
            {unitsWithoutRate.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Units Without Card Rate ({totalUnitsWithoutRate} units)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    These unit buckets are missing card rate benchmarks. Revenue at risk: {formatCurrency(totalRevenueAtRisk)}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-medium">Type</th>
                          <th className="text-left py-2 px-2 font-medium">Usage</th>
                          <th className="text-left py-2 px-2 font-medium">Length</th>
                          <th className="text-right py-2 px-2 font-medium">Units</th>
                          <th className="text-right py-2 px-2 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitsWithoutRate.slice(0, 10).map((item, i) => (
                          <tr key={i} className="border-b">
                            <td className="py-2 px-2">{item.type_bucket}</td>
                            <td className="py-2 px-2">{item.usage_category}</td>
                            <td className="py-2 px-2">{item.length_bucket}</td>
                            <td className="text-right py-2 px-2">{item.unit_count}</td>
                            <td className="text-right py-2 px-2">{formatCurrency(item.total_revenue_at_risk || 0)}</td>
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
