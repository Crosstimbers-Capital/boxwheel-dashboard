/**
 * Utilization Queries
 *
 * These queries calculate fleet utilization metrics.
 * Utilization = Trailers on Rent / Total Trailers
 *
 * Uses the standardized bucket definitions from Analytics views.
 */

/**
 * Global utilization summary (current snapshot)
 */
export const globalUtilization = `
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
`

/**
 * Current utilization by branch
 */
export const utilizationByBranch = `
  SELECT
    Fleetcity as branch,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE (Status = 'AVAILABLE' OR Status = 'LEASED')
    AND Fleetcity IS NOT NULL AND Fleetcity != '' AND Fleetcity != 'TBD'
  GROUP BY Fleetcity
  ORDER BY Fleetcity
`

/**
 * Utilization by standardized type bucket
 */
export const utilizationByType = `
  SELECT
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
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE (Status = 'AVAILABLE' OR Status = 'LEASED')
    AND Fleetcity != 'TBD'
  GROUP BY 
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
    END
  ORDER BY total_trailers DESC
`

/**
 * Utilization by usage category (age bucket)
 */
export const utilizationByUsage = `
  SELECT
    CASE 
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 0 AND 3 THEN 'OTR_0'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 4 AND 6 THEN 'OTR_1'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 7 AND 8 THEN 'OTR_2'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 9 AND 12 THEN 'CART_1'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 13 AND 16 THEN 'CART_2'
      ELSE 'STORAGE'
    END AS usage_category,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE (Status = 'AVAILABLE' OR Status = 'LEASED')
    AND Fleetcity != 'TBD'
  GROUP BY 
    CASE 
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 0 AND 3 THEN 'OTR_0'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 4 AND 6 THEN 'OTR_1'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 7 AND 8 THEN 'OTR_2'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 9 AND 12 THEN 'CART_1'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 13 AND 16 THEN 'CART_2'
      ELSE 'STORAGE'
    END
  ORDER BY usage_category
`

/**
 * Utilization matrix: Type x Usage (for heatmap visualization)
 */
export const utilizationMatrix = `
  SELECT
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
    END AS usage_category,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE (Status = 'AVAILABLE' OR Status = 'LEASED')
    AND Fleetcity != 'TBD'
  GROUP BY 
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
    END,
    CASE 
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 0 AND 3 THEN 'OTR_0'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 4 AND 6 THEN 'OTR_1'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 7 AND 8 THEN 'OTR_2'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 9 AND 12 THEN 'CART_1'
      WHEN (YEAR(GETDATE()) - TRY_CAST(Year AS INT)) BETWEEN 13 AND 16 THEN 'CART_2'
      ELSE 'STORAGE'
    END
  ORDER BY type_bucket, usage_category
`

/**
 * OPTIMIZED: Combined fleet data query - single table scan returns all metrics
 * This replaces multiple separate queries with one efficient query
 */
export const fleetDataCombined = `
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
`

/**
 * Historical utilization trend from LQA bucket statistics (Analytics DB)
 * Returns monthly utilization for the last 12 months
 */
export const utilizationTrend = `
  SELECT 
    Month,
    SUM(NumRentedTrailers) as leased_trailers,
    SUM(NumTrailers) as total_trailers,
    CAST(SUM(NumRentedTrailers) AS FLOAT) / NULLIF(SUM(NumTrailers), 0) as utilization
  FROM dbo.vw_LQA_bucketStatistics
  WHERE AggLevel = 'GLOBAL'
    AND Month >= FORMAT(DATEADD(MONTH, -12, GETDATE()), 'yyyy-MM')
    AND Branch != 'TBD'
  GROUP BY Month
  ORDER BY Month
`

/**
 * Historical utilization by branch (Analytics DB)
 */
export const utilizationTrendByBranch = `
  SELECT 
    Month,
    Branch as branch,
    SUM(NumRentedTrailers) as leased_trailers,
    SUM(NumTrailers) as total_trailers,
    CAST(SUM(NumRentedTrailers) AS FLOAT) / NULLIF(SUM(NumTrailers), 0) as utilization
  FROM dbo.vw_LQA_bucketStatistics
  WHERE AggLevel = 'BY_BRANCH'
    AND Month >= FORMAT(DATEADD(MONTH, -12, GETDATE()), 'yyyy-MM')
    AND Branch != 'ALL' AND Branch != 'TBD'
  GROUP BY Month, Branch
  ORDER BY Month, Branch
`
