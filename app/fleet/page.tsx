import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

/**
 * Get utilization color based on percentage
 */
function getUtilizationColor(util: number): string {
  if (util >= 0.8) return 'bg-green-100 text-green-800'
  if (util >= 0.6) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
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
    <div className="flex flex-col">
      <Header
        title="Fleet Utilization"
        description="Utilization metrics by branch, type, and age bucket"
      />

      <div className="p-6 space-y-6">
        {error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Utilization by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Utilization by Trailer Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {byType.slice(0, 8).map((type) => (
                    <div
                      key={type.trailer_type}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{type.trailer_type}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(type.leased_trailers)} /{' '}
                          {formatNumber(type.total_trailers)}
                        </p>
                      </div>
                      <Badge
                        className={getUtilizationColor(type.utilization || 0)}
                      >
                        {formatPercent(type.utilization || 0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Utilization Matrix (Type x Usage) */}
            <Card>
              <CardHeader>
                <CardTitle>Utilization Matrix</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Trailer Type x Age Bucket (Usage Category)
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Type</th>
                        {usages.map((usage) => (
                          <th
                            key={usage}
                            className="text-center py-2 px-3 font-medium"
                          >
                            {usage}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {types.map((type) => (
                        <tr key={type} className="border-b">
                          <td className="py-2 px-3 font-medium">{type}</td>
                          {usages.map((usage) => {
                            const cell = matrixMap.get(`${type}-${usage}`)
                            if (!cell || cell.total_trailers === 0) {
                              return (
                                <td
                                  key={usage}
                                  className="text-center py-2 px-3 text-muted-foreground"
                                >
                                  —
                                </td>
                              )
                            }
                            return (
                              <td key={usage} className="text-center py-2 px-3">
                                <div
                                  className={`inline-block px-2 py-1 rounded ${getUtilizationColor(
                                    cell.utilization || 0
                                  )}`}
                                >
                                  <div className="font-medium">
                                    {formatPercent(cell.utilization || 0)}
                                  </div>
                                  <div className="text-xs opacity-75">
                                    ({formatNumber(cell.total_trailers)})
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
              </CardContent>
            </Card>

            {/* Utilization by Branch */}
            <Card>
              <CardHeader>
                <CardTitle>Utilization by Branch</CardTitle>
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
                      {byBranch.map((branch) => (
                        <tr key={branch.branch} className="border-b">
                          <td className="py-2">{branch.branch}</td>
                          <td className="text-right py-2">
                            {formatNumber(branch.total_trailers)}
                          </td>
                          <td className="text-right py-2">
                            {formatNumber(branch.leased_trailers)}
                          </td>
                          <td className="text-right py-2">
                            <Badge
                              className={getUtilizationColor(
                                branch.utilization || 0
                              )}
                            >
                              {formatPercent(branch.utilization || 0)}
                            </Badge>
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
