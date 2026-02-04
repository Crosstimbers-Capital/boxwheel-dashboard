import { NextRequest, NextResponse } from 'next/server'
import { queryAnalytics } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const branch = searchParams.get('branch')
  const type = searchParams.get('type')

  try {
    let whereClause = `WHERE 1=1`
    
    if (branch) {
      whereClause += ` AND Branch = '${branch.replace(/'/g, "''")}'`
    }
    if (type) {
      whereClause += ` AND TypeBucket = '${type.replace(/'/g, "''")}'`
    }

    const query = `
      SELECT 
        UnitNumber,
        Branch,
        TypeBucket,
        UsageCategory,
        LengthBucket,
        YearRange,
        BillingStartDate,
        BillingStopDate,
        BilledMonthlyRate,
        BilledDailyRate,
        BilledMileageRate,
        CardRateMonth,
        MonthlyRateVariance,
        CASE WHEN CardRateMonth > 0 
          THEN (BilledMonthlyRate - CardRateMonth) / CardRateMonth 
          ELSE NULL 
        END AS VariancePercent,
        InvoiceNo,
        LeaseNumber
      FROM dbo.vw_RevenueDetails
      ${whereClause}
      ORDER BY BillingStopDate DESC, Branch, UnitNumber
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
          if (val instanceof Date) return val.toISOString().split('T')[0]
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val
        }).join(',')
      )
    ].join('\n')

    const filename = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to generate revenue report:', error)
    return NextResponse.json({ error: 'Failed to generate report. Analytics views may not be available.' }, { status: 500 })
  }
}
