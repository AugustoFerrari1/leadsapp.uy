'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  RotateCcw,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Clock,
  ExternalLink,
  MessageSquare,
  Globe,
  Sparkles,
  AlertCircle,
  ChevronDown,
  X,
  Eye,
  Check,
} from 'lucide-react'

type Message = {
  id: string
  channel: string
  content: string
  status: string
  sentAt: string
}

type Lead = {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  website?: string | null
  status: string
  preferredChannel?: string
  lastContactAt?: string
  createdAt: string
  messages?: Message[]
}

const FOLLOWUP_TEMPLATES = [
  {
    id: 'seg-dia3',
    label: 'Seguimiento: día 3 (Recordatorio)',
    subject: 'Recordatorio Turno.uy para tu barbería',
    text: `Hola de vuelta! Te escribí el otro día de Turno.uy.

Por si se te pasó: es una plataforma uruguaya para que tus clientes reserven turno desde el celular solos las 24hs, con recordatorios automáticos por WhatsApp para no perder reservas.

Cuesta solo $400/mes, sin contratos y con 15 días gratis.

¿Te gustaría que te muestre una demo rápida de 5 minutos?`,
  },
  {
    id: 'seg-demo',
    label: 'Seguimiento: demo rápida',
    subject: 'Demo de 10 min de Turno.uy',
    text: `Hola! De nuevo de Turno.uy.

Las barberías que sumaron turnos online reducen ausencias un 60% y dejan de perder tiempo atendiendo el WhatsApp mientras cortan.

¿Te parece coordinar una videollamada corta o te mando un video de 2 minutos mostrando cómo funciona?`,
  },
  {
    id: 'seg-urgencia',
    label: 'Último intento: sin compromiso',
    subject: 'Último mensaje sobre Turno.uy',
    text: `Hola! Última vez que te escribo por acá para no ser pesado.

Si en algún momento querés automatizar los turnos de tu barbería y tener tu link propio de reservas por $400/mes, avisame y te dejamos la cuenta configurada.

¡Éxitos con la barbería!`,
  },
]

export default function FollowUpPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTime, setFilterTime] = useState<'all' | '3days' | '7days' | 'recent'>('all')
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'email'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Composer state
  const [selectedTemplateId, setSelectedTemplateId] = useState(FOLLOWUP_TEMPLATES[0].id)
  const [messageText, setMessageText] = useState(FOLLOWUP_TEMPLATES[0].text)
  const [subject, setSubject] = useState(FOLLOWUP_TEMPLATES[0].subject)
  const [includeName, setIncludeName] = useState(false)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<{ name: string; channel: string; success: boolean; error?: string }[]>([])
  const [showResultsModal, setShowResultsModal] = useState(false)

  // Message history modal
  const [historyModalLead, setHistoryModalLead] = useState<Lead | null>(null)

  // Fetch contacted leads
  const fetchContactedLeads = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch leads that are contacted, interested, closed, rejected (or have messages)
      const res = await fetch('/api/leads?status=contacted,interested,closed,rejected&messages=all')
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch (e) {
      console.error('Error fetching leads for follow-up:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContactedLeads()
  }, [fetchContactedLeads])

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id)
    const t = FOLLOWUP_TEMPLATES.find((x) => x.id === id)
    if (t) {
      setMessageText(t.text)
      setSubject(t.subject)
    }
  }

  // Calculate days since contact
  const getDaysSinceContact = (dateStr?: string) => {
    if (!dateStr) return null
    const contactDate = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - contactDate.getTime())
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  // Format relative time in Spanish
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha'
    const days = getDaysSinceContact(dateStr)
    if (days === null) return 'Sin fecha'
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    return `Hace ${days} días`
  }

  // Clean phone for wa.me link
  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return null
    let num = phone.replace(/[\s\-\+\(\)]/g, '')
    if (num.startsWith('09') && num.length === 9) {
      num = '598' + num.slice(1)
    } else if (num.startsWith('9') && num.length === 8) {
      num = '598' + num
    }
    return `https://wa.me/${num}`
  }

  // Filtered leads
  const filteredLeads = leads.filter((l) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = l.name.toLowerCase().includes(q)
      const matchPhone = l.phone?.includes(q)
      const matchCity = l.city?.toLowerCase().includes(q)
      if (!matchName && !matchPhone && !matchCity) return false
    }

    // Channel
    if (filterChannel === 'whatsapp' && !l.phone) return false
    if (filterChannel === 'email' && (!l.email || l.phone)) return false

    // Status
    if (filterStatus !== 'all' && l.status !== filterStatus) return false

    // Time since contact
    const days = getDaysSinceContact(l.lastContactAt)
    if (filterTime === '3days') {
      if (days === null || days < 3) return false
    } else if (filterTime === '7days') {
      if (days === null || days < 7) return false
    } else if (filterTime === 'recent') {
      if (days === null || days > 2) return false
    }

    return true
  })

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)))
    }
  }

  // Quick select leads with > 3 days
  const selectOver3Days = () => {
    const ids = filteredLeads
      .filter((l) => {
        const days = getDaysSinceContact(l.lastContactAt)
        return days !== null && days >= 3
      })
      .map((l) => l.id)
    setSelectedLeads(new Set(ids))
  }

  // Status Change
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
      )
    } catch (e) {
      console.error(e)
    }
  }

  // Send follow-ups
  const handleSendFollowUp = async (targetIds?: string[]) => {
    const idsToSend = targetIds || Array.from(selectedLeads)
    if (idsToSend.length === 0 || !messageText.trim()) return

    setSending(true)
    try {
      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: idsToSend,
          message: messageText,
          subject,
          includeName,
        }),
      })

      const data = await res.json()
      setResults(data.results || [])
      setShowResultsModal(true)
      setSelectedLeads(new Set())
      await fetchContactedLeads()
    } catch (e) {
      console.error('Error sending follow-up:', e)
    } finally {
      setSending(false)
    }
  }

  // Quick statistics
  const over3DaysCount = leads.filter((l) => {
    const days = getDaysSinceContact(l.lastContactAt)
    return days !== null && days >= 3
  }).length

  const withWhatsAppCount = leads.filter((l) => !!l.phone).length
  const interestedCount = leads.filter((l) => l.status === 'interested').length

  const statusBadgeStyle = (status: string) => {
    switch (status) {
      case 'interested':
        return { bg: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)', label: '⭐ Interesado' }
      case 'closed':
        return { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', label: '✅ Cerrado (Cliente)' }
      case 'rejected':
        return { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', label: '❌ Rechazado' }
      case 'contacted':
      default:
        return { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)', label: '💬 Contactado' }
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.35)' }}
            >
              <RotateCcw size={18} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Tabla de <span className="gradient-text">Seguimiento</span>
            </h1>
          </div>
          <p style={{ color: '#9ca3af' }}>
            Recontactá a todas las barberías que ya recibieron un primer mensaje para concretar la demo o venta
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/messages"
            className="text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#d1d5db',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <MessageSquare size={14} className="text-purple-400" />
            Ir a Nuevos Leads (Primer Contacto)
          </Link>
          <button
            onClick={fetchContactedLeads}
            disabled={loading}
            className="text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
            style={{
              background: 'rgba(124,58,237,0.15)',
              color: '#c4b5fd',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in">
        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>Total Contactados</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
              <RotateCcw size={14} className="text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{leads.length}</div>
          <span className="text-[11px] text-gray-500">Barberías en base</span>
        </div>

        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>Toca seguimiento</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20">
              <Clock size={14} className="text-red-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400">{over3DaysCount}</div>
          <span className="text-[11px] text-gray-500">&gt; 3 días sin contacto</span>
        </div>

        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>WhatsApp activo</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/10 border border-green-500/20">
              <Phone size={14} className="text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-400">{withWhatsAppCount}</div>
          <span className="text-[11px] text-gray-500">Con celular disponible</span>
        </div>

        <div className="glass p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>Interesados</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
              <Sparkles size={14} className="text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{interestedCount}</div>
          <span className="text-[11px] text-gray-500">Respuestas positivas</span>
        </div>
      </div>

      {/* Follow-up Campaign Composer Card */}
      <div className="glass p-6 rounded-2xl space-y-4 border border-purple-500/20 shadow-xl animate-in">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Send size={16} className="text-purple-400" />
              Mensaje de Seguimiento
            </h2>
            <p className="text-xs text-gray-400">
              Elegí una plantilla optimizada de seguimiento o personalizá el texto antes de disparar
            </p>
          </div>

          {/* Template pills */}
          <div className="flex flex-wrap gap-2">
            {FOLLOWUP_TEMPLATES.map((tmpl) => {
              const active = selectedTemplateId === tmpl.id
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                  style={{
                    background: active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)',
                    color: active ? '#ffffff' : '#d1d5db',
                    border: active ? '1px solid rgba(167,139,250,0.6)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {tmpl.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Textarea & Options */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">Texto del mensaje (WhatsApp / Email):</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Variables:</span>
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => prev + ' {{name}}')}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-all"
                  >
                    + {'{{name}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => prev + ' {{city}}')}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-all"
                  >
                    + {'{{city}}'}
                  </button>
                </div>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                className="input text-sm resize-none"
                style={{ lineHeight: '1.6' }}
                placeholder="Escribí el texto de seguimiento..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeName}
                  onChange={(e) => setIncludeName(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-black/40 border-purple-500/30 focus:ring-0 cursor-pointer"
                />
                <span className="text-gray-300">
                  Personalizar con el nombre de cada barbería
                </span>
              </label>

              <span className="text-gray-500">{messageText.length} caracteres</span>
            </div>
          </div>

          {/* Action side */}
          <div className="lg:col-span-1 flex flex-col justify-between p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
            <div>
              <span className="text-xs font-semibold text-purple-300 block mb-1">
                Destinatarios seleccionados
              </span>
              <div className="text-3xl font-extrabold text-white">
                {selectedLeads.size}
              </div>
              <span className="text-[11px] text-gray-400">
                de {filteredLeads.length} barberías filtradas
              </span>
            </div>

            <button
              onClick={() => handleSendFollowUp()}
              disabled={sending || selectedLeads.size === 0 || !messageText.trim()}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-900/40"
            >
              {sending ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  Enviando {selectedLeads.size}...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Enviar a {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Table & Filters Card */}
      <div className="glass p-6 rounded-2xl space-y-4 animate-in">
        {/* Filters and search toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por barbería, teléfono o ciudad..."
              className="input pl-9 text-sm py-2"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Filter buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Days */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: '3days', label: `⏰ >3 días (${over3DaysCount})` },
                  { id: '7days', label: '📅 >7 días' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterTime(f.id)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: filterTime === f.id ? 'rgba(245,158,11,0.25)' : 'transparent',
                    color: filterTime === f.id ? '#fcd34d' : '#9ca3af',
                    fontWeight: filterTime === f.id ? 600 : 400,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input text-xs py-1.5 px-3 rounded-xl"
              style={{ width: 'auto' }}
            >
              <option value="all">Todos los estados</option>
              <option value="contacted">💬 Contactados</option>
              <option value="interested">⭐ Interesados</option>
              <option value="closed">✅ Cerrados</option>
              <option value="rejected">❌ Rechazados</option>
            </select>

            {/* Filter by Channel */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'whatsapp', label: '📱 WPP' },
                  { id: 'email', label: '📧 Email' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterChannel(c.id)}
                  className="text-xs px-2 py-1 rounded-lg transition-all"
                  style={{
                    background: filterChannel === c.id ? 'rgba(124,58,237,0.25)' : 'transparent',
                    color: filterChannel === c.id ? '#c4b5fd' : '#9ca3af',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selection helper row */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-2.5 py-1 rounded-lg transition-all bg-white/5 hover:bg-white/10 text-gray-300 font-medium border border-white/10"
            >
              {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
                ? 'Deseleccionar todos'
                : `Seleccionar todos (${filteredLeads.length})`}
            </button>
            <button
              onClick={selectOver3Days}
              className="px-2.5 py-1 rounded-lg transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30 flex items-center gap-1"
            >
              <Clock size={12} />
              Seleccionar solo los de &gt;3 días ({over3DaysCount})
            </button>
          </div>

          <span className="text-gray-400">
            Mostrando <strong className="text-white">{filteredLeads.length}</strong> barberías contactadas
          </span>
        </div>

        {/* The Follow-Up Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-gray-400">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-purple-600 bg-black/40 border-purple-500/30 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Barbería</th>
                <th className="py-3 px-4">Canal / Contacto</th>
                <th className="py-3 px-4">Último contacto</th>
                <th className="py-3 px-4 text-center">Mensajes</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción directa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <RefreshCw size={20} className="spin mx-auto mb-2 text-purple-400" />
                    Cargando barberías contactadas...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <p className="font-medium text-gray-400 mb-1">No hay barberías en esta vista</p>
                    <p className="text-xs text-gray-500">
                      Cuando envíes mensajes a leads desde la sección <Link href="/messages" className="text-purple-400 underline">Mensajes</Link>, aparecerán acá automáticamente para el seguimiento.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLeads.has(lead.id)
                  const daysSince = getDaysSinceContact(lead.lastContactAt)
                  const isUrgent = daysSince !== null && daysSince >= 3
                  const statusInfo = statusBadgeStyle(lead.status)
                  const waLink = getWhatsAppLink(lead.phone)
                  const messageCount = lead.messages?.length || 1

                  return (
                    <tr
                      key={lead.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        background: isSelected ? 'rgba(124,58,237,0.06)' : undefined,
                      }}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 rounded text-purple-600 bg-black/40 border-purple-500/30 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Lead Name & City */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{lead.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.city && (
                            <span className="text-xs text-gray-500">{lead.city}</span>
                          )}
                          {lead.website ? (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                            >
                              <Globe size={10} /> Web
                            </a>
                          ) : (
                            <span className="text-[10px] text-amber-500/80">Sin web</span>
                          )}
                        </div>
                      </td>

                      {/* Phone / Email */}
                      <td className="py-3.5 px-4 text-xs">
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <span className="p-1 rounded-md bg-green-500/10 text-green-400">
                              <Phone size={12} />
                            </span>
                            <span>{lead.phone}</span>
                          </div>
                        ) : lead.email ? (
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <span className="p-1 rounded-md bg-blue-500/10 text-blue-400">
                              <Mail size={12} />
                            </span>
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Sin contacto</span>
                        )}
                      </td>

                      {/* Last Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white">
                            {formatTimeAgo(lead.lastContactAt)}
                          </span>
                          {isUrgent && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              title={`Hace ${daysSince} días que no se contacta`}
                            >
                              Toca seguimiento
                            </span>
                          )}
                        </div>
                        {lead.lastContactAt && (
                          <span className="text-[10px] text-gray-500 block mt-0.5">
                            {new Date(lead.lastContactAt).toLocaleDateString('es-UY', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </td>

                      {/* Message History Pill */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setHistoryModalLead(lead)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-purple-300 border border-white/10 transition-all"
                          title="Ver historial de mensajes enviados a esta barbería"
                        >
                          <Eye size={12} />
                          {messageCount} {messageCount === 1 ? 'mensaje' : 'mensajes'}
                        </button>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3.5 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="text-xs py-1 px-2 rounded-lg border focus:outline-none cursor-pointer"
                          style={{
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            borderColor: 'transparent',
                          }}
                        >
                          <option value="contacted" className="bg-[#181824] text-amber-300">💬 Contactado</option>
                          <option value="interested" className="bg-[#181824] text-green-300">⭐ Interesado</option>
                          <option value="closed" className="bg-[#181824] text-blue-300">✅ Cerrado (Cliente)</option>
                          <option value="rejected" className="bg-[#181824] text-red-300">❌ Rechazado</option>
                        </select>
                      </td>

                      {/* Direct Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all"
                              title="Abrir chat en WhatsApp Web directo"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSendFollowUp([lead.id])}
                            disabled={sending}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1"
                            title="Enviar el mensaje de seguimiento actual a esta barbería"
                          >
                            <Send size={11} />
                            Seguimiento
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Message History of Lead */}
      {historyModalLead && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="glass w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl animate-in"
            style={{ background: '#12121a' }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-purple-400" />
                  Historial de {historyModalLead.name}
                </h3>
                <p className="text-xs text-gray-400">
                  {historyModalLead.phone || historyModalLead.email || 'Sin datos de contacto'}
                </p>
              </div>
              <button
                onClick={() => setHistoryModalLead(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Messages list */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {(!historyModalLead.messages || historyModalLead.messages.length === 0) ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No hay mensajes registrados para esta barbería.
                </p>
              ) : (
                historyModalLead.messages.map((m, index) => (
                  <div
                    key={m.id || index}
                    className="p-3.5 rounded-xl border space-y-1.5"
                    style={{
                      background: m.status === 'sent' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                      borderColor: m.status === 'sent' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold flex items-center gap-1.5" style={{ color: m.status === 'sent' ? '#86efac' : '#fca5a5' }}>
                        {m.channel === 'whatsapp' ? '📱 WhatsApp' : '📧 Email'} •{' '}
                        {m.status === 'sent' ? 'Enviado con éxito' : 'Fallido'}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        {new Date(m.sentAt).toLocaleString('es-UY', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-sans bg-black/30 p-2.5 rounded-lg border border-white/5">
                      {m.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setHistoryModalLead(null)}
                className="text-xs px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Results after sending */}
      {showResultsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="glass w-full max-w-lg rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl p-6 space-y-4 animate-in"
            style={{ background: '#12121a' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-400" />
                Resultados del envío de seguimiento
              </h3>
              <button
                onClick={() => setShowResultsModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl border"
                  style={{
                    background: r.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    borderColor: r.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 truncate">
                    {r.success ? (
                      <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-400 flex-shrink-0" />
                    )}
                    <span className="font-medium text-white truncate">{r.name}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-gray-300">
                      {r.channel === 'whatsapp' ? '📱 WPP' : '📧 Email'}
                    </span>
                    {!r.success && r.error && (
                      <span className="text-[11px] text-red-400 max-w-[150px] truncate" title={r.error}>
                        {r.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-gray-400">
                ✅ {results.filter((r) => r.success).length} enviados • ❌ {results.filter((r) => !r.success).length} fallidos
              </span>
              <button
                onClick={() => setShowResultsModal(false)}
                className="btn-primary text-xs px-4 py-2"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
