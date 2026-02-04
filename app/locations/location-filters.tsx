'use client'

import { useState } from 'react'
import { FilterBar, BranchFilter, TypeFilter } from '@/components/ui/filters'

interface LocationFiltersProps {
  branches: string[]
}

export function LocationFilters({ branches }: LocationFiltersProps) {
  const [branch, setBranch] = useState('all')
  const [type, setType] = useState('all')

  return (
    <FilterBar>
      <BranchFilter branches={branches} value={branch} onChange={setBranch} />
      <TypeFilter value={type} onChange={setType} />
    </FilterBar>
  )
}
