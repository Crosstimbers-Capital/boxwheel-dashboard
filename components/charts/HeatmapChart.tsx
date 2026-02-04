'use client'

import { cn } from '@/lib/utils'
import { colors, getUtilizationStatus } from '@/lib/config'

interface HeatmapCell {
  row: string
  col: string
  value: number
  count?: number
}

interface HeatmapChartProps {
  data: HeatmapCell[]
  rows: string[]
  cols: string[]
  formatValue?: (value: number) => string
  formatCount?: (count: number) => string
  onCellClick?: (cell: HeatmapCell) => void
  colorScale?: 'utilization' | 'variance' | 'neutral'
}

export function HeatmapChart({
  data,
  rows,
  cols,
  formatValue = (v) => `${(v * 100).toFixed(1)}%`,
  formatCount = (c) => `(${c})`,
  onCellClick,
  colorScale = 'utilization',
}: HeatmapChartProps) {
  const getCellData = (row: string, col: string): HeatmapCell | undefined => {
    return data.find((d) => d.row === row && d.col === col)
  }

  const getCellColor = (value: number | undefined): string => {
    if (value === undefined) return 'bg-gray-100'
    
    if (colorScale === 'utilization') {
      const status = getUtilizationStatus(value)
      switch (status) {
        case 'good': return 'bg-green-100 hover:bg-green-200'
        case 'warning': return 'bg-amber-100 hover:bg-amber-200'
        case 'critical': return 'bg-red-100 hover:bg-red-200'
      }
    }
    
    if (colorScale === 'variance') {
      if (value >= 0) return 'bg-green-100 hover:bg-green-200'
      if (value >= -0.10) return 'bg-amber-100 hover:bg-amber-200'
      return 'bg-red-100 hover:bg-red-200'
    }
    
    // Neutral color scale (intensity based)
    const intensity = Math.min(value, 1)
    const shade = Math.floor(intensity * 4) * 100 + 100
    return `bg-blue-${shade} hover:bg-blue-${shade + 100}`
  }

  const getTextColor = (value: number | undefined): string => {
    if (value === undefined) return 'text-gray-400'
    
    if (colorScale === 'utilization') {
      const status = getUtilizationStatus(value)
      switch (status) {
        case 'good': return 'text-green-700'
        case 'warning': return 'text-amber-700'
        case 'critical': return 'text-red-700'
      }
    }
    
    if (colorScale === 'variance') {
      if (value >= 0) return 'text-green-700'
      if (value >= -0.10) return 'text-amber-700'
      return 'text-red-700'
    }
    
    return 'text-blue-700'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-sm font-medium text-muted-foreground border-b" />
            {cols.map((col) => (
              <th
                key={col}
                className="p-2 text-center text-sm font-medium text-muted-foreground border-b whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="p-2 text-sm font-medium text-muted-foreground border-r whitespace-nowrap">
                {row}
              </td>
              {cols.map((col) => {
                const cell = getCellData(row, col)
                const hasData = cell !== undefined && cell.value !== undefined
                
                return (
                  <td
                    key={`${row}-${col}`}
                    className={cn(
                      'p-2 text-center border transition-colors',
                      hasData ? getCellColor(cell?.value) : 'bg-gray-50',
                      onCellClick && hasData && 'cursor-pointer'
                    )}
                    onClick={() => hasData && onCellClick?.(cell!)}
                  >
                    {hasData ? (
                      <div className="flex flex-col items-center">
                        <span className={cn('text-sm font-semibold', getTextColor(cell?.value))}>
                          {formatValue(cell!.value)}
                        </span>
                        {cell?.count !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {formatCount(cell.count)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
