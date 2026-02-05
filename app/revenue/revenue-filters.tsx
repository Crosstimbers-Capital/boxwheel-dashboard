'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, Suspense } from 'react'
import { FilterBar, BranchFilter, TimePeriodFilter } from '@/components/ui/filters'
import { timePeriods } from '@/lib/config'
import { Skeleton } from '@/components/ui/skeleton'

interface RevenueFiltersProps {
  branches: string[]
}

function RevenueFiltersContent({ branches }: RevenueFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const branch = searchParams.get('branch') || 'all'
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
      <TimePeriodFilter 
        value={period} 
        onChange={(val) => handleFilterChange('period', val)} 
      />
    </FilterBar>
  )
}

export function RevenueFilters(props: RevenueFiltersProps) {
  return (
    <Suspense fallback={<Skeleton className="h-16 w-full" />}>
      <RevenueFiltersContent {...props} />
    </Suspense>
  )
}
