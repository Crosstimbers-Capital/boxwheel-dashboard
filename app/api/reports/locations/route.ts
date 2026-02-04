import { NextRequest, NextResponse } from 'next/server'
import { queryTrident } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const branch = searchParams.get('branch')
  const state = searchParams.get('state')

  try {
    let whereClause = `WHERE s.Status = 'LEASED'
      AND gps.Latitude IS NOT NULL
      AND gps.Longitude IS NOT NULL`
    
    if (branch) {
      whereClause += ` AND s.Fleetcity = '${branch.replace(/'/g, "''")}'`
    }
    if (state) {
      whereClause += ` AND gps.State = '${state.replace(/'/g, "''")}'`
    }

    const query = `
      SELECT 
        s.Unit,
        s.Fleetcity AS HomeBranch,
        l.CustomerID AS Customer,
        s.Type,
        CASE 
          WHEN s.Type IS NULL OR LTRIM(RTRIM(s.Type)) = '' THEN 'SPECIALTY'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN', 'DRY VAN') THEN 'DRY_VAN'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN LIFTGATE', 'LIFTGATE') THEN 'DRY_VAN_LIFTGATE'
          WHEN LTRIM(RTRIM(s.Type)) IN ('REEFER LIFTGATE') THEN 'REEFER_LIFTGATE'
          ELSE LTRIM(RTRIM(s.Type))
        END AS TypeBucket,
        gps.Latitude,
        gps.Longitude,
        gps.Address,
        gps.City AS CurrentCity,
        gps.State AS CurrentState,
        gps.Speed,
        gps.Heading,
        gps.LastUpdate
      FROM TSpecs s
      INNER JOIN TLeases l ON s.Unit = l.Unit 
        AND l.LeaseStatus = 'ACTIVE'
        AND l.DateOn <= GETDATE()
        AND (l.DateOff IS NULL OR l.DateOff > GETDATE())
      LEFT JOIN Trident_SpireonAPI.dbo.AssetStatuses gps ON s.Unit = gps.AssetName
      ${whereClause}
      ORDER BY gps.State, gps.City, s.Unit
    `

    const data = await queryTrident(query)

    if (data.length === 0) {
      return new NextResponse('No location data found', { status: 404 })
    }

    // Convert to CSV
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = (row as any)[h]
          if (val === null || val === undefined) return ''
          if (val instanceof Date) return val.toISOString()
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    const filename = `trailer-locations-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate locations report:', error)
    return NextResponse.json({ error: 'Failed to generate report. GPS data may not be accessible.' }, { status: 500 })
  }
}
