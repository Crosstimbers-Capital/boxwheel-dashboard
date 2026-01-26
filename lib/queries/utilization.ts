/**
 * Utilization Queries
 *
 * These queries calculate fleet utilization metrics.
 * Utilization = Trailers on Rent / Total Trailers
 *
 * Key concepts:
 * - Status 'LEASED' indicates a trailer is on rent
 * - Type field contains trailer type (VAN, REEFER, FLAT, etc.)
 * - Usage field contains age bucket (OTR, CARTAGE, STORAGE)
 * - City field is the branch location
 */

/**
 * Current utilization by branch
 * Returns one row per branch with total, leased, and utilization %
 */
export const utilizationByBranch = `
  SELECT
    City as branch,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE City IS NOT NULL AND City != ''
  GROUP BY City
  ORDER BY City
`

/**
 * Utilization by trailer type
 */
export const utilizationByType = `
  SELECT
    Type as trailer_type,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE Type IS NOT NULL AND Type != ''
  GROUP BY Type
  ORDER BY total_trailers DESC
`

/**
 * Utilization matrix: Type x Usage (age bucket)
 * This is the key view for the UtilizationMatrix heatmap
 */
export const utilizationMatrix = `
  SELECT
    COALESCE(Type, 'UNKNOWN') as trailer_type,
    COALESCE(Usage, 'UNKNOWN') as usage_category,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  GROUP BY Type, Usage
  ORDER BY Type, Usage
`

/**
 * Global utilization summary
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
`

/**
 * Utilization by branch and type (detailed breakdown)
 */
export const utilizationByBranchAndType = `
  SELECT
    City as branch,
    Type as trailer_type,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_trailers,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE City IS NOT NULL AND City != ''
    AND Type IS NOT NULL AND Type != ''
  GROUP BY City, Type
  ORDER BY City, Type
`
