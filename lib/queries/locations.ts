/**
 * Location Queries
 *
 * Queries for GPS tracking data from Spireon.
 * Uses Trident_SpireonAPI.dbo.AssetStatuses for real-time location data.
 */

/**
 * Get current location of all leased trailers
 * Joins with TSpecs to get trailer details and TLeases for customer info
 */
export const leasedTrailerLocations = `
  SELECT 
    s.Unit as unit,
    s.Fleetcity as branch,
    l.CustomerID as customer_id,
    gps.Latitude as latitude,
    gps.Longitude as longitude,
    gps.LastUpdate as last_update,
    gps.Speed as speed,
    gps.Heading as heading,
    gps.Address as address,
    gps.City as gps_city,
    gps.State as gps_state,
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
    END AS type_bucket
  FROM TSpecs s
  INNER JOIN TLeases l ON s.Unit = l.Unit 
    AND l.LeaseStatus = 'ACTIVE'
    AND l.DateOn <= GETDATE()
    AND (l.DateOff IS NULL OR l.DateOff > GETDATE())
  LEFT JOIN Trident_SpireonAPI.dbo.AssetStatuses gps ON s.Unit = gps.AssetName
  WHERE s.Status = 'LEASED'
    AND gps.Latitude IS NOT NULL
    AND gps.Longitude IS NOT NULL
`

/**
 * Location summary by state
 */
export const locationsByState = `
  SELECT 
    gps.State as state,
    COUNT(*) as unit_count
  FROM TSpecs s
  INNER JOIN TLeases l ON s.Unit = l.Unit 
    AND l.LeaseStatus = 'ACTIVE'
  LEFT JOIN Trident_SpireonAPI.dbo.AssetStatuses gps ON s.Unit = gps.AssetName
  WHERE s.Status = 'LEASED'
    AND gps.State IS NOT NULL
  GROUP BY gps.State
  ORDER BY unit_count DESC
`

/**
 * Trailers with stale GPS data (not updated in 24+ hours)
 */
export const staleGpsData = `
  SELECT 
    s.Unit as unit,
    s.Fleetcity as branch,
    l.CustomerID as customer_id,
    gps.LastUpdate as last_update,
    DATEDIFF(HOUR, gps.LastUpdate, GETDATE()) as hours_since_update,
    gps.Address as last_known_address,
    gps.City as last_known_city,
    gps.State as last_known_state
  FROM TSpecs s
  INNER JOIN TLeases l ON s.Unit = l.Unit 
    AND l.LeaseStatus = 'ACTIVE'
  LEFT JOIN Trident_SpireonAPI.dbo.AssetStatuses gps ON s.Unit = gps.AssetName
  WHERE s.Status = 'LEASED'
    AND (gps.LastUpdate IS NULL OR gps.LastUpdate < DATEADD(HOUR, -24, GETDATE()))
  ORDER BY gps.LastUpdate ASC
`

/**
 * Trailers by home branch vs current location
 * Identifies trailers that are far from their home branch
 */
export const trailersAwayFromBranch = `
  SELECT 
    s.Unit as unit,
    s.Fleetcity as home_branch,
    gps.City as current_city,
    gps.State as current_state,
    l.CustomerID as customer_id
  FROM TSpecs s
  INNER JOIN TLeases l ON s.Unit = l.Unit 
    AND l.LeaseStatus = 'ACTIVE'
  LEFT JOIN Trident_SpireonAPI.dbo.AssetStatuses gps ON s.Unit = gps.AssetName
  WHERE s.Status = 'LEASED'
    AND gps.State IS NOT NULL
  ORDER BY s.Fleetcity, gps.State
`
