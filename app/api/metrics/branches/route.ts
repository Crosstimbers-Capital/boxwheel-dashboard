import { NextRequest, NextResponse } from 'next/server'
import { queryTrident } from '@/lib/db'
import { branchSummary, branchList } from '@/lib/queries/branches'

/**
 * GET /api/metrics/branches
 *
 * Query params:
 * - view: 'summary' | 'list' (default: 'summary')
 *
 * Returns branch data based on the requested view.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const view = searchParams.get('view') || 'summary'

  try {
    let data
    let query

    switch (view) {
      case 'list':
        query = branchList
        break
      case 'summary':
      default:
        query = branchSummary
        break
    }

    data = await queryTrident(query)

    return NextResponse.json({
      view,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Branches API error:', error)

    const message =
      process.env.NODE_ENV === 'development'
        ? error instanceof Error
          ? error.message
          : 'Unknown error'
        : 'Failed to fetch branch data'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
