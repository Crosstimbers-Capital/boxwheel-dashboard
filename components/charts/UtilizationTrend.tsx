'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatPercent } from '@/lib/utils'

interface DataPoint {
  label: string
  utilization: number
  [key: string]: string | number // Allow additional series
}

interface UtilizationTrendProps {
  data: DataPoint[]
  height?: number
  showLegend?: boolean
  series?: Array<{
    key: string
    name: string
    color: string
  }>
}

/**
 * Line chart for utilization trends over time
 *
 * @example
 * // Single series (default)
 * <UtilizationTrend
 *   data={[
 *     { label: 'Jan', utilization: 0.72 },
 *     { label: 'Feb', utilization: 0.75 },
 *   ]}
 * />
 *
 * @example
 * // Multiple series
 * <UtilizationTrend
 *   data={[
 *     { label: 'Jan', denver: 0.72, dallas: 0.68 },
 *     { label: 'Feb', denver: 0.75, dallas: 0.71 },
 *   ]}
 *   series={[
 *     { key: 'denver', name: 'Denver', color: '#2563eb' },
 *     { key: 'dallas', name: 'Dallas', color: '#16a34a' },
 *   ]}
 * />
 */
export function UtilizationTrend({
  data,
  height = 300,
  showLegend = false,
  series,
}: UtilizationTrendProps) {
  // Default to single 'utilization' series if none specified
  const chartSeries = series || [
    { key: 'utilization', name: 'Utilization', color: '#2563eb' },
  ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          tickFormatter={(value) => formatPercent(value, 0)}
          domain={[0, 1]}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          formatter={(value) => formatPercent(Number(value), 1)}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
        />
        {showLegend && <Legend />}
        {chartSeries.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ fill: s.color, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
