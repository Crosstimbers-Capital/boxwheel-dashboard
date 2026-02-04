'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { colors } from '@/lib/config'

interface DataPoint {
  name: string
  value: number
  color?: string
}

interface DonutChartProps {
  data: DataPoint[]
  centerLabel?: string
  centerValue?: string | number
  height?: number
  showLegend?: boolean
  formatValue?: (value: number) => string
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 250,
  showLegend = true,
  formatValue = (v) => v.toLocaleString(),
}: DonutChartProps) {
  const chartColors = colors.chartPalette

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || chartColors[index % chartColors.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value: number) => [formatValue(value), '']}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        )}
        
        {/* Center text */}
        {(centerLabel || centerValue) && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {centerValue && (
              <tspan
                x="50%"
                dy="-0.5em"
                className="text-2xl font-bold"
                fill="hsl(var(--foreground))"
              >
                {centerValue}
              </tspan>
            )}
            {centerLabel && (
              <tspan
                x="50%"
                dy={centerValue ? "1.5em" : "0"}
                className="text-xs"
                fill="hsl(var(--muted-foreground))"
              >
                {centerLabel}
              </tspan>
            )}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}
