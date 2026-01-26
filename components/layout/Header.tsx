'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
    </header>
  )
}
