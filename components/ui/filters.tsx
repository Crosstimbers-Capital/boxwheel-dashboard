'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { timePeriods, buckets } from '@/lib/config'

interface FilterBarProps {
  children: React.ReactNode
  className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border', className)}>
      {children}
    </div>
  )
}

interface BranchFilterProps {
  branches: string[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function BranchFilter({ branches, value, onChange, className }: BranchFilterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">Branch</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Branches</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch} value={branch}>
              {branch}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface TimePeriodFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimePeriodFilter({ value, onChange, className }: TimePeriodFilterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">Time Period</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {timePeriods.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface TypeFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TypeFilter({ value, onChange, className }: TypeFilterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">Type</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {buckets.type.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface UsageFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function UsageFilter({ value, onChange, className }: UsageFilterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">Usage Category</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {buckets.usage.map((usage) => (
            <SelectItem key={usage.value} value={usage.value}>
              {usage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface LengthFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function LengthFilter({ value, onChange, className }: LengthFilterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">Length</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="All Lengths" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Lengths</SelectItem>
          {buckets.length.map((length) => (
            <SelectItem key={length.value} value={length.value}>
              {length.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface IdleBucketFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function IdleBucketFilter({ value, onChange, className }: IdleBucketFilterProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-xs font-medium text-muted-foreground">Idle Duration</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Durations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Durations</SelectItem>
          {buckets.idleDuration.map((bucket) => (
            <SelectItem key={bucket.value} value={bucket.value}>
              {bucket.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
