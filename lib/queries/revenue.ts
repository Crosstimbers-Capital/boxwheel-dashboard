/**
 * Revenue Queries
 *
 * Queries for comparing actual billed rates vs card rates.
 * Uses the vw_RevenueDetails view from Analytics DB.
 */

/**
 * Revenue summary with card rate comparison (Analytics DB)
 * Last 12 months aggregated
 */
export const revenueSummary = `
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
`

/**
 * Revenue details by branch (Analytics DB)
 */
export const revenueByBranch = `
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
  WHERE CardRateMonth IS NOT NULL
    AND Branch IS NOT NULL
  GROUP BY Branch
  ORDER BY Branch
`

/**
 * Revenue details by type bucket (Analytics DB)
 */
export const revenueByType = `
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
`

/**
 * Revenue details by usage category (Analytics DB)
 */
export const revenueByUsage = `
  SELECT 
    UsageCategory as usage_category,
    COUNT(*) as invoice_count,
    SUM(BilledMonthlyRate) as total_billed,
    AVG(BilledMonthlyRate) as avg_billed_rate,
    AVG(CardRateMonth) as avg_card_rate,
    AVG(MonthlyRateVariance) as avg_variance
  FROM dbo.vw_RevenueDetails
  WHERE CardRateMonth IS NOT NULL
  GROUP BY UsageCategory
  ORDER BY usage_category
`

/**
 * Monthly revenue trend (Analytics DB)
 */
export const revenueTrend = `
  SELECT 
    FORMAT(BillingStopDate, 'yyyy-MM') as month,
    COUNT(*) as invoice_count,
    SUM(BilledMonthlyRate) as total_billed,
    AVG(BilledMonthlyRate) as avg_billed_rate,
    AVG(CardRateMonth) as avg_card_rate,
    AVG(MonthlyRateVariance) as avg_variance
  FROM dbo.vw_RevenueDetails
  WHERE CardRateMonth IS NOT NULL
  GROUP BY FORMAT(BillingStopDate, 'yyyy-MM')
  ORDER BY month
`

/**
 * Units without card rates (Analytics DB)
 * These are units where we can't benchmark performance
 */
export const unitsWithoutCardRate = `
  SELECT 
    UnitNumber as unit,
    Branch as branch,
    TypeBucket as type_bucket,
    UsageCategory as usage_category,
    LengthBucket as length_bucket,
    YearRange as year_range,
    AVG(BilledMonthlyRate) as avg_billed_rate,
    COUNT(*) as invoice_count
  FROM dbo.vw_RevenueDetails
  WHERE CardRateMonth IS NULL
  GROUP BY UnitNumber, Branch, TypeBucket, UsageCategory, LengthBucket, YearRange
  ORDER BY Branch, TypeBucket
`

/**
 * Count of units without card rate by bucket (Analytics DB)
 */
export const unitsWithoutCardRateSummary = `
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
`

/**
 * Revenue variance distribution (Analytics DB)
 * Shows how many invoices fall into each variance bucket
 */
export const revenueVarianceDistribution = `
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
  ORDER BY 
    CASE 
      WHEN CardRateMonth IS NULL THEN 'No Card Rate'
      WHEN MonthlyRateVariance >= 0 THEN 'At or Above Card'
      WHEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth >= -0.10 THEN 'Within 10%'
      WHEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth >= -0.20 THEN '10-20% Below'
      ELSE 'More than 20% Below'
    END
`
