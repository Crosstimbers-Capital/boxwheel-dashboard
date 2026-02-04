import { NextRequest, NextResponse } from 'next/server'
import { queryAnalytics } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const branch = searchParams.get('branch')
  const type = searchParams.get('type')

  try {
    let whereClause = `WHERE MonthStr = (SELECT MAX(MonthStr) FROM dbo.vw_IdleAssetsOverTime)
      AND CumulativeLeases = 0`
    
    if (branch) {
      whereClause += ` AND Branch = '${branch.replace(/'/g, "''")}'`
    }
    if (type) {
      whereClause += ` AND TypeBucket = '${type.replace(/'/g, "''")}'`
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
        MonthsIdle AS MonthsSincePurchase,
        CardRate AS MonthlyOpportunityCost
      FROM dbo.vw_IdleAssetsOverTime
      ${whereClause}
      ORDER BY MonthsIdle DESC, Branch, Unit
    `

    const data = await queryAnalytics(query)

    if (data.length === 0) {
      return new NextResponse('No never-leased trailers found', { status: 404 })
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

    const filename = `never-leased-report-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate never-leased report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
