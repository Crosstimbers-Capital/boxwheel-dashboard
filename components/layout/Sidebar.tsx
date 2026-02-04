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
  { name: 'Fleet Utilization', href: '/fleet', icon: Truck },
  { name: 'Revenue', href: '/revenue', icon: DollarSign },
  { name: 'Idle Assets', href: '/idle', icon: Clock },
  { name: 'Location Tracking', href: '/locations', icon: MapPin },
  { name: 'Reports', href: '/reports', icon: FileDown },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-56 flex-col" style={{ background: 'hsl(220, 13%, 10%)' }}>
      {/* Logo */}
      <div className="flex h-16 items-center px-5" style={{ borderBottom: '1px solid hsl(220, 10%, 18%)' }}>
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
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'text-[hsl(72,61%,52%)]'
                  : 'text-[hsl(220,10%,65%)] hover:text-[hsl(220,10%,90%)]'
              )}
              style={{
                background: isActive ? 'hsl(220, 10%, 16%)' : undefined,
              }}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3" style={{ borderTop: '1px solid hsl(220, 10%, 18%)' }}>
        <div className="rounded-md p-3" style={{ background: 'hsl(220, 10%, 14%)' }}>
          <p className="text-xs font-medium" style={{ color: 'hsl(220, 10%, 80%)' }}>Data Refresh</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(220, 10%, 55%)' }}>
            Nightly at ~7:00 PM MST
          </p>
        </div>
      </div>
    </div>
  )
}
