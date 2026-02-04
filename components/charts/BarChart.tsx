'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts'
import { colors, getUtilizationStatus, thresholds } from '@/lib/config'

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

interface BarChartComponentProps {
  data: DataPoint[]
  xKey: string
  bars: {
    key: string
    label: string
    color?: string
  }[]
  yAxisLabel?: string
  formatType?: FormatType
  colorByStatus?: boolean
  statusKey?: string
  showThreshold?: boolean
  thresholdValue?: number
  height?: number
  layout?: 'horizontal' | 'vertical'
}

export function BarChartComponent({
  data,
  xKey,
  bars,
  yAxisLabel,
  formatType = 'none',
  colorByStatus = false,
  statusKey,
  showThreshold = false,
  thresholdValue,
  height = 300,
  layout = 'vertical',
}: BarChartComponentProps) {
  const chartColors = colors.chartPalette
  const { axis: formatYAxis, tooltip: formatTooltip } = formatters[formatType]

  const getBarColor = (entry: DataPoint, key: string) => {
    if (!colorByStatus || !statusKey) return undefined
    const value = entry[statusKey] as number
    const status = getUtilizationStatus(value)
    return colors.status[status]
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        {layout === 'vertical' ? (
          <>
            <XAxis 
              type="number"
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              width={100}
            />
          </>
        ) : (
          <>
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
          </>
        )}
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
        
        {showThreshold && thresholdValue !== undefined && (
          <ReferenceLine
            x={layout === 'vertical' ? thresholdValue : undefined}
            y={layout === 'horizontal' ? thresholdValue : undefined}
            stroke={colors.status.warning}
            strokeDasharray="5 5"
            strokeWidth={2}
          />
        )}
        
        {bars.map((bar, index) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label}
            fill={bar.color || chartColors[index % chartColors.length]}
            radius={[4, 4, 0, 0]}
          >
            {colorByStatus && data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={getBarColor(entry, bar.key)} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
