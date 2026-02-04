import { NextRequest, NextResponse } from 'next/server'
import { queryTrident } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const branch = searchParams.get('branch')
  const type = searchParams.get('type')
  const status = searchParams.get('status')

  try {
    let whereClause = `WHERE 1=1`
    
    if (branch) {
      whereClause += ` AND s.Fleetcity = '${branch.replace(/'/g, "''")}'`
    }
    if (type) {
      whereClause += ` AND (
        CASE 
          WHEN s.Type IS NULL OR LTRIM(RTRIM(s.Type)) = '' THEN 'SPECIALTY'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN', 'DRY VAN') THEN 'DRY_VAN'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN LIFTGATE', 'LIFTGATE') THEN 'DRY_VAN_LIFTGATE'
          WHEN LTRIM(RTRIM(s.Type)) IN ('REEFER LIFTGATE') THEN 'REEFER_LIFTGATE'
          ELSE LTRIM(RTRIM(s.Type))
        END
      ) = '${type.replace(/'/g, "''")}'`
    }
    if (status) {
      whereClause += ` AND s.Status = '${status.replace(/'/g, "''")}'`
    } else {
      whereClause += ` AND (s.Status = 'AVAILABLE' OR s.Status = 'LEASED')`
    }

    const query = `
      SELECT 
        s.Unit,
        s.Fleetcity AS Branch,
        s.Status,
        s.Type,
        CASE 
          WHEN s.Type IS NULL OR LTRIM(RTRIM(s.Type)) = '' THEN 'SPECIALTY'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN', 'DRY VAN') THEN 'DRY_VAN'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN LIFTGATE', 'LIFTGATE') THEN 'DRY_VAN_LIFTGATE'
          WHEN LTRIM(RTRIM(s.Type)) IN ('REEFER LIFTGATE') THEN 'REEFER_LIFTGATE'
          ELSE LTRIM(RTRIM(s.Type))
        END AS TypeBucket,
        s.Year,
        s.Length,
        CASE 
          WHEN TRY_CAST(REPLACE(s.Length, '''', '') AS INT) < 28 THEN '20'
          WHEN TRY_CAST(REPLACE(s.Length, '''', '') AS INT) BETWEEN 28 AND 32 THEN '28-32'
          WHEN TRY_CAST(REPLACE(s.Length, '''', '') AS INT) BETWEEN 33 AND 42 THEN '40'
          WHEN TRY_CAST(REPLACE(s.Length, '''', '') AS INT) BETWEEN 43 AND 50 THEN '48'
          ELSE '53' 
        END AS LengthBucket,
        CASE 
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 0 AND 3 THEN 'OTR_0'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 4 AND 6 THEN 'OTR_1'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 7 AND 8 THEN 'OTR_2'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 9 AND 12 THEN 'CART_1'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 13 AND 16 THEN 'CART_2'
          ELSE 'STORAGE'
        END AS UsageCategory,
        s.Make,
        s.VIN,
        s.Cost,
        s.PurchaseDate,
        s.SoldDate
      FROM TSpecs s
      ${whereClause}
      ORDER BY s.Fleetcity, s.Unit
    `

    const data = await queryTrident(query)

    if (data.length === 0) {
      return new NextResponse('No data found', { status: 404 })
    }

    // Convert to CSV
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = (row as any)[h]
          if (val === null || val === undefined) return ''
          if (val instanceof Date) return val.toISOString().split('T')[0]
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    const filename = `fleet-inventory-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate inventory report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
