import { NextRequest, NextResponse } from 'next/server'
import { queryTrident } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const branch = searchParams.get('branch')
  const type = searchParams.get('type')
  const usage = searchParams.get('usage')

  try {
    let whereClause = `WHERE (s.Status = 'AVAILABLE' OR s.Status = 'LEASED')`
    
    if (branch) {
      whereClause += ` AND s.Fleetcity = '${branch.replace(/'/g, "''")}'`
    }

    const query = `
      SELECT 
        s.Unit,
        s.Fleetcity AS Branch,
        s.Status,
        s.Type,
        s.Year,
        s.Length,
        CASE 
          WHEN s.Type IS NULL OR LTRIM(RTRIM(s.Type)) = '' THEN 'SPECIALTY'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN', 'DRY VAN') THEN 'DRY_VAN'
          WHEN LTRIM(RTRIM(s.Type)) IN ('VAN LIFTGATE', 'LIFTGATE') THEN 'DRY_VAN_LIFTGATE'
          WHEN LTRIM(RTRIM(s.Type)) IN ('REEFER LIFTGATE') THEN 'REEFER_LIFTGATE'
          ELSE LTRIM(RTRIM(s.Type))
        END AS TypeBucket,
        CASE 
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 0 AND 3 THEN 'OTR_0'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 4 AND 6 THEN 'OTR_1'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 7 AND 8 THEN 'OTR_2'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 9 AND 12 THEN 'CART_1'
          WHEN (YEAR(GETDATE()) - TRY_CAST(s.Year AS INT)) BETWEEN 13 AND 16 THEN 'CART_2'
          ELSE 'STORAGE'
        END AS UsageCategory,
        s.Cost,
        s.PurchaseDate
      FROM TSpecs s
      ${whereClause}
      ORDER BY s.Fleetcity, s.Unit
    `

    const data = await queryTrident(query)

    // Convert to CSV
    const headers = Object.keys(data[0] || {})
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const val = (row as any)[h]
          if (val === null || val === undefined) return ''
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    const filename = `utilization-report-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate utilization report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
