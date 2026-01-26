import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default async function DashboardPage() {
  const { global, branches, error } = await getStats()

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard Overview"
        description="Fleet utilization and key metrics"
      />

      <div className="p-6">
        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">
                Database Connection Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Could not connect to the database. Check your environment
                variables.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {error}
                </pre>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Global KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Fleet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(global?.total_trailers || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    trailers in system
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercent(global?.utilization || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(global?.leased_trailers || 0)} on rent
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Available
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(global?.available_trailers || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ready to lease
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Branches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{branches.length}</div>
                  <p className="text-xs text-muted-foreground">
                    active locations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Branch Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Branch Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Branch</th>
                        <th className="text-right py-2 font-medium">Total</th>
                        <th className="text-right py-2 font-medium">Leased</th>
                        <th className="text-right py-2 font-medium">
                          Utilization
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.slice(0, 10).map((branch) => (
                        <tr key={branch.branch} className="border-b">
                          <td className="py-2">{branch.branch}</td>
                          <td className="text-right py-2">
                            {formatNumber(branch.total_trailers)}
                          </td>
                          <td className="text-right py-2">
                            {formatNumber(branch.leased_count)}
                          </td>
                          <td className="text-right py-2">
                            {formatPercent(branch.utilization)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
