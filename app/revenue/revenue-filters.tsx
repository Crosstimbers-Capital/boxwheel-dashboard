'use client'

import { useState } from 'react'
import { FilterBar, BranchFilter, TypeFilter, UsageFilter, TimePeriodFilter } from '@/components/ui/filters'
import { timePeriods } from '@/lib/config'

interface RevenueFiltersProps {
  branches: string[]
}

export function RevenueFilters({ branches }: RevenueFiltersProps) {
  const [branch, setBranch] = useState('all')
  const [type, setType] = useState('all')
  const [usage, setUsage] = useState('all')
  const [period, setPeriod] = useState(timePeriods.default)

  return (
    <FilterBar>
      <BranchFilter branches={branches} value={branch} onChange={setBranch} />
      <TypeFilter value={type} onChange={setType} />
      <UsageFilter value={usage} onChange={setUsage} />
      <TimePeriodFilter value={period} onChange={setPeriod} />
    </FilterBar>
  )
}
