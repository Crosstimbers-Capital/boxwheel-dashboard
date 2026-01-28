import { Header } from '@/components/layout'
import { queryTrident } from '@/lib/db'
import {
  utilizationByBranch,
  utilizationByType,
  utilizationMatrix,
} from '@/lib/queries/utilization'
import { formatNumber, formatPercent } from '@/lib/utils'

interface BranchUtilization {
  branch: string
  total_trailers: number
  leased_trailers: number
  utilization: number
}

interface TypeUtilization {
  trailer_type: string
  total_trailers: number
  leased_trailers: number
  utilization: number
}

interface MatrixRow {
  trailer_type: string
  usage_category: string
  total_trailers: number
  leased_trailers: number
  utilization: number
}

async function getFleetData() {
  try {
    const [byBranch, byType, matrix] = await Promise.all([
      queryTrident<BranchUtilization>(utilizationByBranch),
      queryTrident<TypeUtilization>(utilizationByType),
      queryTrident<MatrixRow>(utilizationMatrix),
    ])
    return { byBranch, byType, matrix, error: null }
  } catch (error) {
    console.error('Failed to fetch fleet data:', error)
    return {
      byBranch: [],
      byType: [],
      matrix: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function getUtilizationClass(util: number): string {
  if (util >= 0.8) return 'util-full'
  if (util >= 0.7) return 'util-high'
  if (util >= 0.6) return 'util-mid'
  if (util >= 0.4) return 'util-low'
  return 'util-empty'
}

export default async function FleetPage() {
  const { byBranch, byType, matrix, error } = await getFleetData()

  // Pivot matrix data for heatmap display
  const types = [...new Set(matrix.map((r) => r.trailer_type))].sort()
  const usages = [...new Set(matrix.map((r) => r.usage_category))].sort()

  const matrixMap = new Map<string, MatrixRow>()
  matrix.forEach((row) => {
    matrixMap.set(`${row.trailer_type}-${row.usage_category}`, row)
  })

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Fleet Utilization"
        description="Utilization by type, age bucket, and branch"
      />

      <div className="flex-1 p-5">
        {error ? (
          <div className="surface-raised rounded-lg border p-5">
            <h3
              className="font-semibold mb-1"
              style={{ color: 'hsl(var(--alert))' }}
            >
              Error
            </h3>
            <p className="text-sm" style={{ color: 'hsl(var(--ink-muted))' }}>
              {error}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Utilization by Type - compact cards */}
            <div className="surface-raised rounded-lg border">
              <div className="px-5 py-3 border-b">
                <h2 className="font-semibold">By Trailer Type</h2>
              </div>
              <div className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {byType.slice(0, 8).map((type) => (
                    <div
                      key={type.trailer_type}
                      className="flex items-center justify-between p-3 rounded border"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {type.trailer_type}
                        </p>
                        <p
                          className="text-xs tabular-nums"
                          style={{ color: 'hsl(var(--ink-muted))' }}
                        >
                          {formatNumber(type.leased_trailers)} /{' '}
                          {formatNumber(type.total_trailers)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${getUtilizationClass(
                          type.utilization || 0
                        )}`}
                      >
                        {formatPercent(type.utilization || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Utilization Matrix - Heatmap */}
            <div className="surface-raised rounded-lg border">
              <div className="px-5 py-3 border-b">
                <h2 className="font-semibold">Utilization Matrix</h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'hsl(var(--ink-muted))' }}
                >
                  Type × Age Bucket
                </p>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th
                        className="text-left py-2 px-3 font-medium text-xs"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Type
                      </th>
                      {usages.map((usage) => (
                        <th
                          key={usage}
                          className="text-center py-2 px-3 font-medium text-xs"
                          style={{ color: 'hsl(var(--ink-muted))' }}
                        >
                          {usage}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((type) => (
                      <tr key={type}>
                        <td className="py-1.5 px-3 font-medium text-sm">
                          {type}
                        </td>
                        {usages.map((usage) => {
                          const cell = matrixMap.get(`${type}-${usage}`)
                          if (!cell || cell.total_trailers === 0) {
                            return (
                              <td key={usage} className="py-1.5 px-2">
                                <div
                                  className="util-cell text-center py-2 px-2"
                                  style={{
                                    background: 'hsl(var(--steel-dim))',
                                    color: 'hsl(var(--ink-faint))',
                                  }}
                                >
                                  <span className="text-xs">—</span>
                                </div>
                              </td>
                            )
                          }
                          return (
                            <td key={usage} className="py-1.5 px-2">
                              <div
                                className={`util-cell text-center py-2 px-2 ${getUtilizationClass(
                                  cell.utilization || 0
                                )}`}
                              >
                                <div className="font-semibold text-sm tabular-nums">
                                  {formatPercent(cell.utilization || 0)}
                                </div>
                                <div className="text-[10px] opacity-70 tabular-nums">
                                  {formatNumber(cell.total_trailers)}
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Branch Table */}
            <div className="surface-raised rounded-lg border">
              <div className="px-5 py-3 border-b">
                <h2 className="font-semibold">By Branch</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--steel-dim))' }}>
                      <th
                        className="text-left py-2.5 px-5 font-medium text-xs"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Branch
                      </th>
                      <th
                        className="text-right py-2.5 px-5 font-medium text-xs"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Total
                      </th>
                      <th
                        className="text-right py-2.5 px-5 font-medium text-xs"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Leased
                      </th>
                      <th
                        className="text-right py-2.5 px-5 font-medium text-xs"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Utilization
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {byBranch.map((branch) => (
                      <tr
                        key={branch.branch}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                      >
                        <td className="py-2.5 px-5 font-medium">
                          {branch.branch}
                        </td>
                        <td className="py-2.5 px-5 text-right tabular-nums">
                          {formatNumber(branch.total_trailers)}
                        </td>
                        <td className="py-2.5 px-5 text-right tabular-nums">
                          {formatNumber(branch.leased_trailers)}
                        </td>
                        <td className="py-2.5 px-5 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${getUtilizationClass(
                              branch.utilization || 0
                            )}`}
                          >
                            {formatPercent(branch.utilization || 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
