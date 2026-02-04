/**
 * Idle Assets Queries
 *
 * Queries for tracking idle (non-leased) assets.
 * Uses the vw_IdleAssetsOverTime view from Analytics DB.
 */

/**
 * Current idle assets summary (Analytics DB)
 * Gets the most recent month's data
 */
export const idleSummary = `
  SELECT 
    COUNT(*) as total_idle,
    SUM(AssetCost) as total_idle_cost,
    AVG(MonthsIdle) as avg_months_idle,
    AVG(CardRate) as avg_card_rate,
    SUM(CardRate) as total_opportunity_cost
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
`

/**
 * Idle assets by duration bucket (Analytics DB)
 * Current month snapshot
 */
export const idleByDuration = `
  SELECT 
    IdleDurationBucket as idle_bucket,
    COUNT(*) as unit_count,
    SUM(AssetCost) as total_cost,
    AVG(MonthsIdle) as avg_months_idle,
    SUM(CardRate) as monthly_opportunity_cost
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
  GROUP BY IdleDurationBucket
  ORDER BY 
    CASE IdleDurationBucket
      WHEN '0-6 Months' THEN 1
      WHEN '6-12 Months' THEN 2
      WHEN '12-24 Months' THEN 3
      WHEN '24+ Months' THEN 4
      ELSE 5
    END
`

/**
 * Idle assets by branch (Analytics DB)
 */
export const idleByBranch = `
  SELECT 
    Branch as branch,
    COUNT(*) as unit_count,
    SUM(AssetCost) as total_cost,
    AVG(MonthsIdle) as avg_months_idle,
    SUM(CardRate) as monthly_opportunity_cost,
    SUM(CASE WHEN IdleDurationBucket = '24+ Months' THEN 1 ELSE 0 END) as critical_count
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
  GROUP BY Branch
  ORDER BY Branch
`

/**
 * Idle assets by type bucket (Analytics DB)
 */
export const idleByType = `
  SELECT 
    TypeBucket as type_bucket,
    COUNT(*) as unit_count,
    SUM(AssetCost) as total_cost,
    AVG(MonthsIdle) as avg_months_idle,
    SUM(CardRate) as monthly_opportunity_cost
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
  GROUP BY TypeBucket
  ORDER BY unit_count DESC
`

/**
 * Idle assets by usage category (Analytics DB)
 */
export const idleByUsage = `
  SELECT 
    UsageCategory as usage_category,
    COUNT(*) as unit_count,
    SUM(AssetCost) as total_cost,
    AVG(MonthsIdle) as avg_months_idle,
    SUM(CardRate) as monthly_opportunity_cost
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
  GROUP BY UsageCategory
  ORDER BY usage_category
`

/**
 * Idle trend over time (Analytics DB)
 * Monthly count of idle units
 */
export const idleTrend = `
  SELECT 
    MonthStr as month,
    COUNT(*) as unit_count,
    AVG(MonthsIdle) as avg_months_idle,
    SUM(CardRate) as monthly_opportunity_cost,
    SUM(CASE WHEN IdleDurationBucket = '24+ Months' THEN 1 ELSE 0 END) as critical_count
  FROM dbo.vw_IdleAssetsOverTime
  GROUP BY MonthStr
  ORDER BY MonthStr
`

/**
 * Never-leased trailers (Analytics DB)
 * Units that have never had a lease (CumulativeLeases = 0)
 */
export const neverLeased = `
  SELECT 
    Unit as unit,
    Branch as branch,
    TypeBucket as type_bucket,
    UsageCategory as usage_category,
    LengthBucket as length_bucket,
    AssetCost as asset_cost,
    MonthsIdle as months_idle,
    CardRate as card_rate
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
    AND CumulativeLeases = 0
  ORDER BY MonthsIdle DESC
`

/**
 * Never-leased summary by branch (Analytics DB)
 */
export const neverLeasedByBranch = `
  SELECT 
    Branch as branch,
    COUNT(*) as unit_count,
    SUM(AssetCost) as total_cost,
    AVG(MonthsIdle) as avg_months_idle
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
    AND CumulativeLeases = 0
  GROUP BY Branch
  ORDER BY unit_count DESC
`

/**
 * Critical idle assets (24+ months) detail (Analytics DB)
 */
export const criticalIdleAssets = `
  SELECT 
    Unit as unit,
    Branch as branch,
    TypeBucket as type_bucket,
    UsageCategory as usage_category,
    LengthBucket as length_bucket,
    YearRange as year_range,
    AssetCost as asset_cost,
    MonthsIdle as months_idle,
    LastActiveMonth as last_active_month,
    CumulativeLeases as total_leases,
    CardRate as card_rate
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
    AND IdleDurationBucket = '24+ Months'
  ORDER BY MonthsIdle DESC, AssetCost DESC
`

/**
 * Idle matrix: Branch x Duration Bucket (Analytics DB)
 * For heatmap visualization
 */
export const idleMatrix = `
  SELECT 
    Branch as branch,
    IdleDurationBucket as idle_bucket,
    COUNT(*) as unit_count,
    SUM(AssetCost) as total_cost
  FROM dbo.vw_IdleAssetsOverTime
  WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
  GROUP BY Branch, IdleDurationBucket
  ORDER BY Branch,
    CASE IdleDurationBucket
      WHEN '0-6 Months' THEN 1
      WHEN '6-12 Months' THEN 2
      WHEN '12-24 Months' THEN 3
      WHEN '24+ Months' THEN 4
      ELSE 5
    END
`
