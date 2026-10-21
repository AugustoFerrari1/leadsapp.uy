'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Phone,
  Mail,
  Globe,
  Star,
  MapPin,
  ChevronDown,
  Trash2,
  Filter,
  RefreshCw,
  CheckSquare,
  Square,
  Send,
} from 'lucide-react'

type Lead = {
  id: string
  name: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  rating?: number
  reviewsCount?: number
  status: string
  preferredChannel?: string
  lastContactAt?: string
  createdAt: string
  messages?: { channel: string; sentAt: string }[]
}

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'interested', 'closed', 'rejected']
const CITY_OPTIONS = [
  'all', 'Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera',
  'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes', 'Artigas', 'Minas',
  'San José', 'Durazno', 'Florida', 'Treinta y Tres',
]

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [sendResults, setSendResults] = useState<{ name: string; channel: string; success: boolean }[]>([])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterCity !== 'all') params.set('city', filterCity)
    const res = await fetch(`/api/leads?${params}`)
    const data = await res.json()
    setLeads(data)
    setLoading(false)
  }, [filterStatus, filterCity])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este lead?')) return
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE' })
    fetchLeads()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    fetchLeads()
  }

  const handleSendMessages = async () => {
    if (!messageText.trim()) return
    setSendingMessage(true)
    const res = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadIds: Array.from(selected),
        message: messageText,
        subject: '✂️ Propuesta para tu barbería',
      }),
    })
    const data = await res.json()
    setSendResults(data.results || [])
    setSendingMessage(false)
    setShowMessageModal(false)
    setSelected(new Set())
    fetchLeads()
  }

  const statusLabel: Record<string, string> = {
    new: 'Nuevo', contacted: 'Contactado', interested: 'Interesado',
    closed: 'Cerrado', rejected: 'Rechazado',
  }

  return (
    <div className="space-y-4">
      {/* Filters + Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-purple-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input text-sm py-2"
            style={{ width: 'auto', minWidth: '130px' }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'Todos los estados' : statusLabel[s]}</option>
            ))}
          </select>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="input text-sm py-2"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            {CITY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c === 'all' ? 'Todas las ciudades' : c}</option>
            ))}
          </select>
        </div>

        <button onClick={fetchLeads} className="btn-secondary flex items-center gap-2 text-sm py-2">
          <RefreshCw size={14} />
          Actualizar
        </button>

        {selected.size > 0 && (
          <button
            onClick={() => setShowMessageModal(true)}
            className="btn-primary flex items-center gap-2 text-sm py-2 ml-auto"
          >
            <Send size={14} />
            Enviar a {selected.size} lead{selected.size !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Send Results */}
      {sendResults.length > 0 && (
        <div className="glass p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white mb-2">Resultados del envío:</h4>
          {sendResults.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={r.success ? 'text-green-400' : 'text-red-400'}>
                {r.success ? '✓' : '✗'}
              </span>
              <span className="text-white">{r.name}</span>
              <span className={`badge badge-${r.channel}`}>{r.channel}</span>
            </div>
          ))}
          <button onClick={() => setSendResults([])} className="text-xs text-gray-500 hover:text-gray-300 mt-1">
            Cerrar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-4 py-3 text-left">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-white">
                    {selected.size === leads.length && leads.length > 0 ? (
                      <CheckSquare size={15} />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>
                </th>
                {['Barbería', 'Ciudad', 'Contacto', 'Rating', 'Canal', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: '#6b7280' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                    <RefreshCw size={20} className="spin mx-auto mb-2" />
                    Cargando leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                    <p className="text-lg mb-1">Sin leads aún</p>
                    <p className="text-sm">Usá el Scraper para buscar barberías</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="table-row-hover transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(lead.id)} className="text-gray-400 hover:text-white">
                        {selected.has(lead.id) ? (
                          <CheckSquare size={15} className="text-purple-400" />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{lead.name}</div>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs flex items-center gap-1 mt-0.5"
                          style={{ color: '#7c3aed' }}
                        >
                          <Globe size={10} />
                          {lead.website.replace(/^https?:\/\//, '').slice(0, 30)}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#9ca3af' }}>
                      {lead.city || <span className="text-gray-600">—</span>}
                      {lead.address && (
                        <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#6b7280' }}>
                          <MapPin size={9} />
                          <span className="truncate max-w-[120px]">{lead.address}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {lead.phone && (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#25d366' }}>
                            <Phone size={11} />
                            {lead.phone}
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#60a5fa' }}>
                            <Mail size={11} />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                        {!lead.phone && !lead.email && <span className="text-gray-600 text-xs">Sin contacto</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.rating ? (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-white font-medium">{lead.rating.toFixed(1)}</span>
                          {lead.reviewsCount && (
                            <span className="text-xs" style={{ color: '#6b7280' }}>
                              ({lead.reviewsCount})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.preferredChannel ? (
                        <span className={`badge badge-${lead.preferredChannel}`}>
                          {lead.preferredChannel === 'whatsapp' ? '📱 WPP' : '📧 Email'}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="appearance-none pr-6 pl-2 py-1 rounded-lg text-xs font-medium cursor-pointer border"
                          style={{
                            background: 'transparent',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: lead.status === 'new' ? '#a5b4fc'
                              : lead.status === 'contacted' ? '#fcd34d'
                              : lead.status === 'interested' ? '#6ee7b7'
                              : lead.status === 'closed' ? '#c4b5fd'
                              : '#fca5a5',
                          }}
                        >
                          {STATUS_OPTIONS.filter((s) => s !== 'all').map((s) => (
                            <option key={s} value={s} style={{ background: '#1c1c28', color: 'white' }}>
                              {statusLabel[s]}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={10}
                          className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: '#6b7280' }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelected(new Set([lead.id])); setShowMessageModal(true) }}
                          className="p-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
                          title="Enviar mensaje"
                        >
                          <MessageSquare size={13} className="text-purple-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {leads.length > 0 && (
          <div
            className="px-4 py-3 text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#6b7280' }}
          >
            {leads.length} leads • {leads.filter((l) => l.status === 'new').length} nuevos •{' '}
            {leads.filter((l) => l.phone).length} con teléfono •{' '}
            {leads.filter((l) => l.email).length} con email
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div className="glass w-full max-w-lg p-6 animate-in">
            <h3 className="text-white font-bold text-lg mb-1">Enviar mensaje</h3>
            <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
              Se envía por WhatsApp si hay teléfono, si no por email.
              {selected.size} lead{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}.
            </p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Hola! Soy [nombre], te contacto porque..."
              rows={6}
              className="input resize-none mb-4"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMessageModal(false)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendMessages}
                disabled={sendingMessage || !messageText.trim()}
                className="btn-primary text-sm py-2 px-6 flex items-center gap-2"
              >
                {sendingMessage ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
