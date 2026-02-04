'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Truck,
  DollarSign,
  Clock,
  MapPin,
  FileDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Fleet', href: '/fleet', icon: Truck },
  { name: 'Revenue', href: '/revenue', icon: DollarSign },
  { name: 'Idle Assets', href: '/idle', icon: Clock },
  { name: 'Location Tracking', href: '/locations', icon: MapPin },
  { name: 'Reports', href: '/reports', icon: FileDown },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div
      className="flex h-full w-56 flex-col sidebar-dark"
      style={{ background: 'hsl(var(--asphalt))' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-5" style={{ borderBottom: '1px solid hsl(var(--asphalt-light))' }}>
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/boxwheel_logo.png"
            alt="Boxwheel Analytics"
            width={130}
            height={36}
            className="h-9 w-auto"
          />
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
                'nav-item flex items-center gap-2.5',
                isActive && 'active'
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'hsl(var(--asphalt-light))' }}>
        <div className="rounded-md p-3" style={{ background: 'hsl(var(--asphalt-light))' }}>
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'hsl(var(--ink-inverse) / 0.4)' }}>
            Data Refresh
          </p>
          <p className="text-xs mt-1 font-medium" style={{ color: 'hsl(var(--ink-inverse) / 0.8)' }}>
            Nightly at ~7:00 PM MST
          </p>
        </div>
      </div>
    </div>
  )
}
