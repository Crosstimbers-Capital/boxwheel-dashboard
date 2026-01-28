import { Header } from '@/components/layout'
import { queryTrident } from '@/lib/db'
import { globalUtilization } from '@/lib/queries/utilization'
import { branchSummary } from '@/lib/queries/branches'
import { formatNumber, formatPercent } from '@/lib/utils'

interface GlobalStats {
  total_trailers: number
  leased_trailers: number
  utilization: number
  available_trailers: number
  other_status: number
}

interface BranchStats {
  branch: string
  total_trailers: number
  leased_count: number
  utilization: number
}

async function getStats() {
  try {
    const [global, branches] = await Promise.all([
      queryTrident<GlobalStats>(globalUtilization),
      queryTrident<BranchStats>(branchSummary),
    ])
    return { global: global[0], branches, error: null }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return {
      global: null,
      branches: [],
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

export default async function DashboardPage() {
  const { global, branches, error } = await getStats()

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Overview" />

      <div className="flex-1 p-5">
        {error ? (
          <div className="surface-raised rounded-lg border p-5">
            <h3
              className="font-semibold mb-1"
              style={{ color: 'hsl(var(--alert))' }}
            >
              Database Connection Error
            </h3>
            <p className="text-sm" style={{ color: 'hsl(var(--ink-muted))' }}>
              Could not connect to the database.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-3 text-xs p-2 rounded surface-inset overflow-auto">
                {error}
              </pre>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Hero Utilization */}
            <div className="surface-raised rounded-lg border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-1"
                    style={{ color: 'hsl(var(--ink-muted))' }}
                  >
                    Fleet Utilization
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-4xl font-bold tabular-nums"
                      style={{ color: 'hsl(var(--lime-dark))' }}
                    >
                      {formatPercent(global?.utilization || 0)}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: 'hsl(var(--ink-muted))' }}
                    >
                      {formatNumber(global?.leased_trailers || 0)} of{' '}
                      {formatNumber(global?.total_trailers || 0)} trailers
                    </span>
                  </div>
                </div>

                {/* Supporting stats */}
                <div className="flex gap-6">
                  <div className="text-right">
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: 'hsl(var(--ink-muted))' }}
                    >
                      Available
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatNumber(global?.available_trailers || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-xs mb-0.5"
                      style={{ color: 'hsl(var(--ink-muted))' }}
                    >
                      Branches
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {branches.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Utilization bar */}
              <div className="mt-4">
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'hsl(var(--steel-dim))' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(global?.utilization || 0) * 100}%`,
                      background: 'hsl(var(--lime))',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Branch Performance */}
            <div className="surface-raised rounded-lg border">
              <div className="px-5 py-3 border-b">
                <h2 className="font-semibold">Branch Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--steel-dim))' }}>
                      <th
                        className="text-left py-2.5 px-5 font-medium"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Branch
                      </th>
                      <th
                        className="text-right py-2.5 px-5 font-medium"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Fleet
                      </th>
                      <th
                        className="text-right py-2.5 px-5 font-medium"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Leased
                      </th>
                      <th
                        className="text-right py-2.5 px-5 font-medium"
                        style={{ color: 'hsl(var(--ink-muted))' }}
                      >
                        Utilization
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.slice(0, 12).map((branch, i) => (
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
                          {formatNumber(branch.leased_count)}
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
