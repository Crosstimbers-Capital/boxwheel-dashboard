/**
 * Branch Queries
 *
 * Queries for branch-level KPIs and comparisons.
 */

/**
 * Branch summary with key metrics
 */
export const branchSummary = `
  SELECT
    City as branch,
    COUNT(*) as total_trailers,
    SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) as leased_count,
    SUM(CASE WHEN Status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_count,
    CAST(SUM(CASE WHEN Status = 'LEASED' THEN 1 ELSE 0 END) AS FLOAT) /
      NULLIF(COUNT(*), 0) as utilization
  FROM TSpecs
  WHERE City IS NOT NULL AND City != ''
  GROUP BY City
  ORDER BY total_trailers DESC
`

/**
 * List of all branches
 */
export const branchList = `
  SELECT DISTINCT City as branch
  FROM TSpecs
  WHERE City IS NOT NULL AND City != ''
  ORDER BY City
`

/**
 * Branch fleet composition
 */
export const branchFleetComposition = `
  SELECT
    City as branch,
    Type as trailer_type,
    Usage as usage_category,
    COUNT(*) as count
  FROM TSpecs
  WHERE City IS NOT NULL AND City != ''
  GROUP BY City, Type, Usage
  ORDER BY City, Type, Usage
`
