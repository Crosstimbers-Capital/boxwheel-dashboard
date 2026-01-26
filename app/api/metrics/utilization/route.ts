import { NextRequest, NextResponse } from 'next/server'
import { queryTrident } from '@/lib/db'
import {
  utilizationByBranch,
  utilizationByType,
  utilizationMatrix,
  globalUtilization,
} from '@/lib/queries/utilization'

/**
 * GET /api/metrics/utilization
 *
 * Query params:
 * - view: 'branch' | 'type' | 'matrix' | 'global' (default: 'global')
 *
 * Returns utilization data based on the requested view.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const view = searchParams.get('view') || 'global'

  try {
    let data
    let query

    switch (view) {
      case 'branch':
        query = utilizationByBranch
        break
      case 'type':
        query = utilizationByType
        break
      case 'matrix':
        query = utilizationMatrix
        break
      case 'global':
      default:
        query = globalUtilization
        break
    }

    data = await queryTrident(query)

    return NextResponse.json({
      view,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Utilization API error:', error)

    const message =
      process.env.NODE_ENV === 'development'
        ? error instanceof Error
          ? error.message
          : 'Unknown error'
        : 'Failed to fetch utilization data'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
