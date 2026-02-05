/**
 * Branch Queries
 *
 * Queries for branch-level KPIs and filter options.
 * Uses Fleetcity for branch names from TSpecs.
 */

/**
 * Get list of active branches for filters
 * Only includes branches with AVAILABLE or LEASED trailers
 */
export const activeBranches = `
  SELECT DISTINCT Fleetcity as branch
  FROM TSpecs
  WHERE (Status = 'AVAILABLE' OR Status = 'LEASED')
    AND Fleetcity != 'TBD'
  ORDER BY Fleetcity
`

/**
 * Branch summary with key metrics and most available trailer type
 */
export const branchSummary = `
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
      AND Fleetcity IS NOT NULL AND Fleetcity != '' AND Fleetcity != 'TBD'
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
      AND Fleetcity IS NOT NULL AND Fleetcity != '' AND Fleetcity != 'TBD'
    GROUP BY Fleetcity, Type, Length
  )
  SELECT 
    b.*,
    ta.Type as most_available_type,
    ta.Length as most_available_length,
    ta.type_count as most_available_count
  FROM BranchBase b
  LEFT JOIN TypeAvailability ta ON b.branch = ta.branch AND ta.rank = 1
  ORDER BY b.branch
`

/**
 * Branch fleet composition by type bucket
 */
export const branchFleetComposition = `
  SELECT
    s.Fleetcity as branch,
    CASE 
      WHEN s.Type IS NULL OR LTRIM(RTRIM(s.Type)) = '' 
        OR LTRIM(RTRIM(s.Type)) IN ('CHASSIS', 'CONGEAR', 'CURTAIN', 'DROPDECK',
            'ELECTRIC STANDBY UNIT', 'REEFER ELECTRIC STANDBY UNIT', 'SEE COMMENTS', 
            'MOVE VAN', 'STEPDECK', 'PUP', 'PUP VAN')
      THEN 'SPECIALTY'
      WHEN LTRIM(RTRIM(s.Type)) IN ('VAN', 'DRY VAN') THEN 'DRY_VAN'
      WHEN LTRIM(RTRIM(s.Type)) IN ('VAN LIFTGATE', 'LIFTGATE') THEN 'DRY_VAN_LIFTGATE'
      WHEN LTRIM(RTRIM(s.Type)) IN ('REEFER LIFTGATE') THEN 'REEFER_LIFTGATE'
      ELSE LTRIM(RTRIM(s.Type))
    END AS type_bucket,
    COUNT(*) as total_count,
    SUM(CASE WHEN s.Status = 'LEASED' THEN 1 ELSE 0 END) as leased_count
  FROM TSpecs s
  WHERE (s.Status = 'AVAILABLE' OR s.Status = 'LEASED')
    AND s.Fleetcity IS NOT NULL AND s.Fleetcity != '' AND s.Fleetcity != 'TBD'
  GROUP BY s.Fleetcity,
    CASE 
      WHEN s.Type IS NULL OR LTRIM(RTRIM(s.Type)) = '' 
        OR LTRIM(RTRIM(s.Type)) IN ('CHASSIS', 'CONGEAR', 'CURTAIN', 'DROPDECK',
            'ELECTRIC STANDBY UNIT', 'REEFER ELECTRIC STANDBY UNIT', 'SEE COMMENTS', 
            'MOVE VAN', 'STEPDECK', 'PUP', 'PUP VAN')
      THEN 'SPECIALTY'
      WHEN LTRIM(RTRIM(s.Type)) IN ('VAN', 'DRY VAN') THEN 'DRY_VAN'
      WHEN LTRIM(RTRIM(s.Type)) IN ('VAN LIFTGATE', 'LIFTGATE') THEN 'DRY_VAN_LIFTGATE'
      WHEN LTRIM(RTRIM(s.Type)) IN ('REEFER LIFTGATE') THEN 'REEFER_LIFTGATE'
      ELSE LTRIM(RTRIM(s.Type))
    END
  ORDER BY branch, type_bucket
`
