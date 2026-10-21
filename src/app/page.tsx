'use client'

import { useState, useEffect } from 'react'
import LeadsTable from '@/components/LeadsTable'
import { Users, Phone, Mail, TrendingUp, Scissors } from 'lucide-react'

type Stats = {
  total: number
  withPhone: number
  withEmail: number
  contacted: number
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({ total: 0, withPhone: 0, withEmail: 0, contacted: 0 })

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((leads: { phone?: string; email?: string; status: string }[]) => {
        setStats({
          total: leads.length,
          withPhone: leads.filter((l) => l.phone).length,
          withEmail: leads.filter((l) => l.email).length,
          contacted: leads.filter((l) => l.status === 'contacted').length,
        })
      })
  }, [])

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: '#7c3aed', glow: 'rgba(124,58,237,0.3)' },
    { label: 'Con Teléfono', value: stats.withPhone, icon: Phone, color: '#25d366', glow: 'rgba(37,211,102,0.3)' },
    { label: 'Con Email', value: stats.withEmail, icon: Mail, color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
    { label: 'Contactados', value: stats.contacted, icon: TrendingUp, color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="animate-in">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            <Scissors size={18} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Dashboard <span className="gradient-text">BarberLeads UY</span>
          </h1>
        </div>
        <p style={{ color: '#6b7280' }}>Gestión de leads de barberías en Uruguay 🇺🇾</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, glow }, i) => {
          const r = parseInt(color.slice(1, 3), 16)
          const g = parseInt(color.slice(3, 5), 16)
          const b = parseInt(color.slice(5, 7), 16)
          return (
            <div
              key={label}
              className="glass p-5 animate-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium" style={{ color: '#6b7280' }}>{label}</span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `rgba(${r},${g},${b},0.15)`, border: `1px solid ${glow}` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="animate-in" style={{ animationDelay: '200ms' }}>
        <h2 className="text-lg font-semibold text-white mb-4">Leads</h2>
        <LeadsTable />
      </div>
    </div>
  )
}
