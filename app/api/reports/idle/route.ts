import { NextRequest, NextResponse } from 'next/server'
import { queryAnalytics } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const branch = searchParams.get('branch')
  const type = searchParams.get('type')
  const idleBucket = searchParams.get('idleBucket')

  try {
    let whereClause = `WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)`
    
    if (branch) {
      whereClause += ` AND Branch = '${branch.replace(/'/g, "''")}'`
    }
    if (type) {
      whereClause += ` AND TypeBucket = '${type.replace(/'/g, "''")}'`
    }
    if (idleBucket) {
      whereClause += ` AND IdleDurationBucket = '${idleBucket.replace(/'/g, "''")}'`
    }

    const query = `
      SELECT 
        Unit,
        Branch,
        TypeBucket,
        UsageCategory,
        LengthBucket,
        YearRange,
        AssetCost,
        LastActiveMonth,
        CumulativeLeases,
        MonthsIdle,
        IdleDurationBucket,
        CardRate
      FROM dbo.vw_IdleAssetsOverTime
      ${whereClause}
      ORDER BY MonthsIdle DESC, Branch, Unit
    `

    const data = await queryAnalytics(query)

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
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    const filename = `idle-assets-report-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate idle report:', error)
    return NextResponse.json({ error: 'Failed to generate report. Analytics views may not be available.' }, { status: 500 })
  }
}
