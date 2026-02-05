'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, Suspense } from 'react'
import { FilterBar, BranchFilter, TypeFilter, UsageFilter, TimePeriodFilter } from '@/components/ui/filters'
import { timePeriods } from '@/lib/config'
import { Skeleton } from '@/components/ui/skeleton'

interface FleetFiltersProps {
  branches: string[]
}

function FleetFiltersContent({ branches }: FleetFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const branch = searchParams.get('branch') || 'all'
  const type = searchParams.get('type') || 'all'
  const usage = searchParams.get('usage') || 'all'
  const period = searchParams.get('period') || timePeriods.default

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      return params.toString()
    },
    [searchParams]
  )

  const handleFilterChange = (name: string, value: string) => {
    router.push(pathname + '?' + createQueryString(name, value), { scroll: false })
  }

  return (
    <FilterBar>
      <BranchFilter 
        branches={branches} 
        value={branch} 
        onChange={(val) => handleFilterChange('branch', val)} 
      />
      <TypeFilter 
        value={type} 
        onChange={(val) => handleFilterChange('type', val)} 
      />
      <UsageFilter 
        value={usage} 
        onChange={(val) => handleFilterChange('usage', val)} 
      />
      <TimePeriodFilter 
        value={period} 
        onChange={(val) => handleFilterChange('period', val)} 
      />
    </FilterBar>
  )
}

export function FleetFilters(props: FleetFiltersProps) {
  return (
    <Suspense fallback={<Skeleton className="h-16 w-full" />}>
      <FleetFiltersContent {...props} />
    </Suspense>
  )
}
