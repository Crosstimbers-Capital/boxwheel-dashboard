'use client'

import { useState } from 'react'
import { FilterBar, BranchFilter, TypeFilter, UsageFilter, IdleBucketFilter } from '@/components/ui/filters'

interface IdleFiltersProps {
  branches: string[]
}

export function IdleFilters({ branches }: IdleFiltersProps) {
  const [branch, setBranch] = useState('all')
  const [type, setType] = useState('all')
  const [usage, setUsage] = useState('all')
  const [idleBucket, setIdleBucket] = useState('all')

  return (
    <FilterBar>
      <BranchFilter branches={branches} value={branch} onChange={setBranch} />
      <TypeFilter value={type} onChange={setType} />
      <UsageFilter value={usage} onChange={setUsage} />
      <IdleBucketFilter value={idleBucket} onChange={setIdleBucket} />
    </FilterBar>
  )
}
