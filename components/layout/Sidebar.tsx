'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Truck,
  DollarSign,
  Clock,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Fleet', href: '/fleet', icon: Truck },
  { name: 'Revenue', href: '/revenue', icon: DollarSign },
  { name: 'Idle Assets', href: '/idle', icon: Clock },
  { name: 'Branches', href: '/branches', icon: Building2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div
      className="flex h-full w-56 flex-col"
      style={{ background: 'hsl(var(--asphalt))' }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded font-bold text-sm"
            style={{
              background: 'hsl(var(--lime))',
              color: 'hsl(220 13% 10%)',
            }}
          >
            BW
          </div>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'hsl(var(--ink-inverse))' }}
          >
            Boxwheel
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/5'
              )}
              style={
                isActive
                  ? { background: 'hsl(var(--asphalt-light))' }
                  : undefined
              }
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-[11px] text-white/40 leading-relaxed">
          Data as of ~7 PM MST
        </p>
      </div>
    </div>
  )
}
