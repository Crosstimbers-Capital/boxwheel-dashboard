'use client'

import { colors, getUtilizationStatus, thresholds } from '@/lib/config'

interface UtilizationGaugeProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showThresholds?: boolean
}

export function UtilizationGauge({ 
  value, 
  size = 'md',
  showThresholds = true 
}: UtilizationGaugeProps) {
  const status = getUtilizationStatus(value)
  const percentage = Math.min(Math.max(value * 100, 0), 100)
  
  const dimensions = {
    sm: { width: 120, height: 80, strokeWidth: 8, fontSize: 16 },
    md: { width: 180, height: 110, strokeWidth: 12, fontSize: 24 },
    lg: { width: 240, height: 140, strokeWidth: 16, fontSize: 32 },
  }
  
  const { width, height, strokeWidth, fontSize } = dimensions[size]
  const radius = (width - strokeWidth) / 2
  const circumference = Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const statusColors = {
    good: colors.status.good,
    warning: colors.status.warning,
    critical: colors.status.critical,
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${height - strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height - strokeWidth / 2}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${height - strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height - strokeWidth / 2}`}
          fill="none"
          stroke={statusColors[status]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        
        {/* Threshold markers */}
        {showThresholds && (
          <>
            {/* Warning threshold (60%) */}
            <line
              x1={strokeWidth / 2 + radius * (1 - Math.cos(Math.PI * thresholds.utilization.warning))}
              y1={height - strokeWidth / 2 - radius * Math.sin(Math.PI * thresholds.utilization.warning)}
              x2={strokeWidth / 2 + radius * (1 - Math.cos(Math.PI * thresholds.utilization.warning)) + 8 * Math.cos(Math.PI * thresholds.utilization.warning - Math.PI / 2)}
              y2={height - strokeWidth / 2 - radius * Math.sin(Math.PI * thresholds.utilization.warning) + 8 * Math.sin(Math.PI * thresholds.utilization.warning - Math.PI / 2)}
              stroke={colors.status.warning}
              strokeWidth={2}
            />
            {/* Good threshold (80%) */}
            <line
              x1={strokeWidth / 2 + radius * (1 - Math.cos(Math.PI * thresholds.utilization.good))}
              y1={height - strokeWidth / 2 - radius * Math.sin(Math.PI * thresholds.utilization.good)}
              x2={strokeWidth / 2 + radius * (1 - Math.cos(Math.PI * thresholds.utilization.good)) + 8 * Math.cos(Math.PI * thresholds.utilization.good - Math.PI / 2)}
              y2={height - strokeWidth / 2 - radius * Math.sin(Math.PI * thresholds.utilization.good) + 8 * Math.sin(Math.PI * thresholds.utilization.good - Math.PI / 2)}
              stroke={colors.status.good}
              strokeWidth={2}
            />
          </>
        )}
        
        {/* Value text */}
        <text
          x={width / 2}
          y={height - strokeWidth / 2 - 10}
          textAnchor="middle"
          className="font-bold"
          style={{ fontSize, fill: statusColors[status] }}
        >
          {percentage.toFixed(1)}%
        </text>
      </svg>
      
      {showThresholds && (
        <div className="flex justify-between w-full text-xs text-muted-foreground mt-1 px-2">
          <span>0%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  )
}
