'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  Settings,
  Scissors,
  TrendingUp,
  RotateCcw,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scraper', label: 'Scraper', icon: Search },
  { href: '/messages', label: 'Mensajes', icon: MessageSquare },
  { href: '/followup', label: 'Seguimiento', icon: RotateCcw },
  { href: '/settings', label: 'Configuración', icon: Settings },
]


export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-64 flex flex-col z-50"
      style={{
        background: 'rgba(13, 13, 20, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            <Scissors size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">BarberLeads</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>
              Uruguay 🇺🇾
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
              style={{
                background: active ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                color: active ? '#a78bfa' : '#9ca3af',
                border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
              }}
            >
              <Icon size={17} />
              {label}
              {active && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: '#7c3aed', boxShadow: '0 0 6px #7c3aed' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom stats teaser */}
      <div className="px-4 py-4 border-t border-white/5">
        <div
          className="rounded-xl p-3 text-xs"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={13} style={{ color: '#a78bfa' }} />
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>BarberLeads UY</span>
          </div>
          <p style={{ color: '#6b7280', lineHeight: '1.4' }}>
            Scraping + Outreach automatizado
          </p>
        </div>
      </div>
    </aside>
  )
}
