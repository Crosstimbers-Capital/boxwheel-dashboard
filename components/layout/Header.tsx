'use client'

import { RefreshCw } from 'lucide-react'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-5 py-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm" style={{ color: 'hsl(var(--ink-muted))' }}>
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors hover:bg-gray-50"
        style={{
          color: 'hsl(var(--ink-muted))',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </header>
  )
}
