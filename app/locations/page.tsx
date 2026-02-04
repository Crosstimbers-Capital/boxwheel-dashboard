import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { queryTrident } from '@/lib/db'
import { activeBranches } from '@/lib/queries/branches'
import { formatNumber } from '@/lib/utils'
import { MapPin, Truck, AlertTriangle, Clock } from 'lucide-react'
import { LocationFilters } from './location-filters'
import { LocationMap } from './location-map'

interface TrailerLocation {
  unit: string
  branch: string
  customer_id: string
  latitude: number
  longitude: number
  last_update: string
  speed: number
  address: string
  gps_city: string
  gps_state: string
  type_bucket: string
}

interface LocationSummary {
  state: string
  unit_count: number
}

interface StaleGps {
  unit: string
  branch: string
  customer_id: string
  hours_since_update: number
  last_known_city: string
  last_known_state: string
}

async function getLocationData() {
  try {
    const [branchList] = await Promise.all([
      queryTrident<{ branch: string }>(activeBranches),
    ])

    let locations: TrailerLocation[] = []
    let byState: LocationSummary[] = []
    let staleGps: StaleGps[] = []
    let hasGpsAccess = true

    try {
      // Try to get GPS data
      const [locResult, stateResult, staleResult] = await Promise.all([
        queryTrident<TrailerLocation>(`
          SELECT TOP 1000
            s.Unit as unit,
            s.Fleetcity as branch,
            l.CustomerID as customer_id,
            gps.Latitude as latitude,
            gps.Longitude as longitude,
            gps.LastUpdate as last_update,
            gps.Speed as speed,
            gps.Address as address,
            gps.City as gps_city,
            gps.State as gps_state,
            CASE 
              WHEN s.Type IS NULL OR LTRIM(RTRIM(s.Type)) = '' THEN 'SPECIALTY'
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
        `),
        queryTrident<LocationSummary>(`
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
        `),
        queryTrident<StaleGps>(`
          SELECT TOP 50
            s.Unit as unit,
            s.Fleetcity as branch,
            l.CustomerID as customer_id,
            DATEDIFF(HOUR, gps.LastUpdate, GETDATE()) as hours_since_update,
            gps.City as last_known_city,
            gps.State as last_known_state
          FROM TSpecs s
          INNER JOIN TLeases l ON s.Unit = l.Unit 
            AND l.LeaseStatus = 'ACTIVE'
          LEFT JOIN Trident_SpireonAPI.dbo.AssetStatuses gps ON s.Unit = gps.AssetName
          WHERE s.Status = 'LEASED'
            AND (gps.LastUpdate IS NULL OR gps.LastUpdate < DATEADD(HOUR, -24, GETDATE()))
          ORDER BY gps.LastUpdate ASC
        `),
      ])

      locations = locResult
      byState = stateResult
      staleGps = staleResult
    } catch (e) {
      console.log('GPS data not accessible:', e)
      hasGpsAccess = false
    }

    return {
      locations,
      byState,
      staleGps,
      branches: branchList.map(b => b.branch),
      hasGpsAccess,
      error: null,
    }
  } catch (error) {
    console.error('Failed to fetch location data:', error)
    return {
      locations: [],
      byState: [],
      staleGps: [],
      branches: [],
      hasGpsAccess: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default async function LocationsPage() {
  const { locations, byState, staleGps, branches, hasGpsAccess, error } = await getLocationData()

  const totalWithGps = locations.length
  const staleCount = staleGps.length
  const topStates = byState.slice(0, 5)

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Location Tracking"
        description="Real-time GPS locations of leased trailers"
      />

      <div className="flex-1 p-6 space-y-6">
        {!hasGpsAccess ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                GPS Data Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700 mb-4">
                Unable to access Spireon GPS data. This could be due to:
              </p>
              <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                <li>The Trident_SpireonAPI database is not accessible from this connection</li>
                <li>The AssetStatuses table structure has changed</li>
                <li>Network or permission issues</li>
              </ul>
              <p className="text-sm text-amber-700 mt-4">
                Please verify access to <code className="bg-amber-100 px-1 rounded">Trident_SpireonAPI.dbo.AssetStatuses</code>
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <LocationFilters branches={branches} />

            {/* KPI Summary */}
            <KpiGrid columns={4}>
              <KpiCard
                title="Trailers with GPS"
                value={formatNumber(totalWithGps)}
                subtitle="Active tracking"
                status="good"
                icon={MapPin}
              />
              <KpiCard
                title="States Covered"
                value={byState.length}
                subtitle="Geographic spread"
                status="neutral"
                icon={Truck}
              />
              <KpiCard
                title="Stale GPS Data"
                value={formatNumber(staleCount)}
                subtitle="24+ hours old"
                status={staleCount > 10 ? 'warning' : 'good'}
                icon={Clock}
              />
              <KpiCard
                title="Top State"
                value={topStates[0]?.state || 'N/A'}
                subtitle={topStates[0] ? `${topStates[0].unit_count} trailers` : ''}
                status="neutral"
                icon={MapPin}
              />
            </KpiGrid>

            {/* Map */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Trailer Locations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px]">
                  <LocationMap locations={locations} />
                </div>
              </CardContent>
            </Card>

            {/* State Distribution and Stale GPS */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* By State */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribution by State</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {byState.slice(0, 15).map((state) => (
                      <div key={state.state} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{state.state}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min((state.unit_count / totalWithGps) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-8 text-right">
                            {state.unit_count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Stale GPS */}
              {staleGps.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      Stale GPS Data (24+ hours)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium">Unit</th>
                            <th className="text-left py-2 px-2 font-medium">Branch</th>
                            <th className="text-right py-2 px-2 font-medium">Hours</th>
                            <th className="text-left py-2 px-2 font-medium">Last Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staleGps.slice(0, 20).map((item) => (
                            <tr key={item.unit} className="border-b">
                              <td className="py-2 px-2 font-mono">{item.unit}</td>
                              <td className="py-2 px-2">{item.branch}</td>
                              <td className="text-right py-2 px-2 text-amber-600 font-medium">
                                {item.hours_since_update || 'N/A'}
                              </td>
                              <td className="py-2 px-2 text-muted-foreground">
                                {item.last_known_city && item.last_known_state
                                  ? `${item.last_known_city}, ${item.last_known_state}`
                                  : 'Unknown'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
