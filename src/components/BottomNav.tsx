"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../lib/useAuth'

const hiddenPrefixes = ['/login', '/signup', '/admin']
const hiddenPaths = ['/']

const sideItems = [
  { href: '/dashboard', label: 'Home', icon: '/icons/nav-home.svg' },
  { href: '/missions', label: 'Mission', icon: '/icons/nav-missions.svg' },
  { href: '/us', label: 'Us', icon: '/icons/nav-us.svg' },
  { href: '/settings', label: 'Cài đặt', icon: '/icons/nav-settings.svg' }
]

export default function BottomNav() {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  if (loading || !user || hiddenPaths.includes(pathname) || hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] border-t border-pink-100 bg-white/95 px-4 pb-3 pt-2 shadow-[0_-14px_34px_rgba(236,72,153,0.14)] backdrop-blur"
      aria-label="Điều hướng chính"
    >
      <div className="grid grid-cols-5 items-end gap-1">
        {sideItems.slice(0, 2).map((item) => (
          <NavItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}

        <Link
          href="/timeline"
          className="mx-auto flex h-16 w-16 -translate-y-4 items-center justify-center rounded-full bg-white p-1.5 shadow-[0_16px_30px_rgba(236,72,153,0.32)] ring-4 ring-pink-100 transition hover:scale-105 focus:outline-none focus:ring-pink-200"
          aria-label="Mở timeline"
        >
          <img src="/icons/nav-heart.svg" alt="" className="h-full w-full" />
        </Link>

        {sideItems.slice(2).map((item) => (
          <NavItem key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  )
}

function NavItem({
  item,
  active
}: {
  item: { href: string; label: string; icon: string }
  active: boolean
}) {
  return (
    <Link
      href={item.href}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-pink-200 ${
        active ? 'bg-pink-50 text-pink-500' : 'text-indigo-900/70 hover:text-pink-500'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <img src={item.icon} alt="" className="h-5 w-5" />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  )
}
