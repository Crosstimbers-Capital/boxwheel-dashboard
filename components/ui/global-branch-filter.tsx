'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, Suspense } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface GlobalBranchFilterProps {
  branches: string[]
  className?: string
}

function BranchFilterContent({ branches, className }: GlobalBranchFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentBranch = searchParams.get('branch') || 'all'

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

  const handleBranchChange = (value: string) => {
    router.push(pathname + '?' + createQueryString('branch', value), { scroll: false })
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        Filter Branch:
      </span>
      <Select value={currentBranch} onValueChange={handleBranchChange}>
        <SelectTrigger className="w-[180px] h-9 bg-card border-slate-200">
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

export function GlobalBranchFilter(props: GlobalBranchFilterProps) {
  return (
    <Suspense fallback={<Skeleton className="h-9 w-[180px]" />}>
      <BranchFilterContent {...props} />
    </Suspense>
  )
}
