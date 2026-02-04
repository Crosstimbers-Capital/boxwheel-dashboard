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
  ReferenceLine,
} from 'recharts'
import { colors, thresholds } from '@/lib/config'

interface DataPoint {
  [key: string]: string | number
}

type FormatType = 'percent' | 'currency' | 'number' | 'none'

const formatters: Record<FormatType, { axis: (v: number) => string; tooltip: (v: number) => string }> = {
  percent: {
    axis: (v) => `${(v * 100).toFixed(0)}%`,
    tooltip: (v) => `${(v * 100).toFixed(1)}%`,
  },
  currency: {
    axis: (v) => `$${v.toFixed(0)}`,
    tooltip: (v) => `$${v.toFixed(2)}`,
  },
  number: {
    axis: (v) => v.toFixed(0),
    tooltip: (v) => v.toFixed(0),
  },
  none: {
    axis: (v) => v.toString(),
    tooltip: (v) => v.toString(),
  },
}

interface TrendChartProps {
  data: DataPoint[]
  xKey: string
  lines: {
    key: string
    label: string
    color?: string
  }[]
  yAxisLabel?: string
  formatType?: FormatType
  showThresholds?: boolean
  thresholdType?: 'utilization' | 'rate'
  height?: number
}

export function TrendChart({
  data,
  xKey,
  lines,
  yAxisLabel,
  formatType = 'percent',
  showThresholds = false,
  thresholdType = 'utilization',
  height = 300,
}: TrendChartProps) {
  const chartColors = colors.chartPalette
  const { axis: formatYAxis, tooltip: formatTooltip } = formatters[formatType]

  const thresholdLines = thresholdType === 'utilization'
    ? [
        { value: thresholds.utilization.good, label: 'Good (80%)', color: colors.status.good },
        { value: thresholds.utilization.warning, label: 'Warning (60%)', color: colors.status.warning },
      ]
    : [
        { value: thresholds.rateVariance.good, label: 'Card Rate', color: colors.status.good },
        { value: thresholds.rateVariance.warning, label: '-10%', color: colors.status.warning },
      ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey={xKey} 
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis 
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value: number) => [formatTooltip(value), '']}
          labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
        />
        <Legend />
        
        {showThresholds && thresholdLines.map((threshold, i) => (
          <ReferenceLine
            key={i}
            y={threshold.value}
            stroke={threshold.color}
            strokeDasharray="5 5"
            strokeWidth={1}
          />
        ))}
        
        {lines.map((line, index) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color || chartColors[index % chartColors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
