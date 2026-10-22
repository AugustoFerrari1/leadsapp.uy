'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ServerStatusWidget from '@/components/ServerStatusWidget'
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Plus,
  Trash2,
  Edit3,
  X,
  Save,
  Check,
  Globe,
  RotateCcw,
} from 'lucide-react'

type Lead = {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  website?: string | null
  status: string
  preferredChannel?: string
  lastContactAt?: string | null
  messages?: { status: string }[]
}

type Template = {
  id: string
  label: string
  text: string
  subject?: string
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'directo',
    label: 'Directo al punto',
    text: `Hola! Vi tu barbería en Google Maps y quería contarte algo corto.

Tenemos una plataforma llamada *Turno.uy* — permite que tus clientes reserven turno desde el celular las 24hs, sin que vos tengas que atender el teléfono.

Recordatorios automáticos por WhatsApp, tu propia página de reservas, agenda digital para todos tus barberos.

Todo eso por *$400/mes*. Sin contratos, cancelás cuando querés.

¿Te mando más info o hacemos una demo rápida?`,
  },
  {
    id: 'dolor-telefono',
    label: 'Dolor: teléfono',
    text: `Hola! Soy de Turno.uy.

¿Cuántas reservas perdés porque el cliente no pudo comunicarse cuando quería?

Con Turno.uy tus clientes reservan solos desde el celular, a cualquier hora. Y si no vienen, les llega un recordatorio automático por WhatsApp.

¿Tiene sentido para tu barbería? Respondé "sí" y te cuento más.`,
  },
  {
    id: 'social-proof',
    label: 'Social proof',
    text: `Hola! Soy de Turno.uy.

Barberías uruguayas que sumaron turnos online redujeron ausencias un 60% y recuperaron horas de trabajo que perdían al teléfono.

Todo por $400/mes, sin contratos.

¿Querés ver cómo funciona? Te muestro en 10 minutos, sin compromiso.`,
  },
  {
    id: 'competencia',
    label: 'Competencia + urgencia',
    text: `Hola! Soy de Turno.uy.

Las barberías con sistema de turnos online reciben hasta un 40% más reservas que las que no.

Tus clientes reservan solos a las 2 de la mañana. Vos seguís durmiendo.

$400/mes, cancelás cuando querés. ¿Lo vemos juntos esta semana?`,
  },
  {
    id: 'amigable',
    label: 'Tono amigable / vecino',
    text: `Hola! Vi tu barbería por la zona y se ve que tienen buen trabajo.

Te quería comentar que tenemos una plataforma uruguaya — *Turno.uy* — que ayuda a barberías a que sus clientes puedan reservar turno desde el celular sin llamar.

Es simple, económico ($400/mes) y los clientes la aman porque reservan cuando quieren, no cuando vos podés atender el teléfono.

¿Tenés 10 minutos para que te muestre cómo funciona? Sin compromiso.`,
  },
  {
    id: 'seguimiento-dia-3',
    label: 'Seguimiento: día 3',
    text: `Hola de vuelta! Te escribí el otro día de Turno.uy.

Por si se perdió: es un sistema de turnos online para barberías, $400/mes, sin contratos.

Si todavía no es el momento, no hay problema. Si sí te interesa, respondé y armamos una demo rápida.`,
  },
  {
    id: 'seguimiento-demo',
    label: 'Seguimiento: oferta demo',
    text: `Hola, de nuevo Turno.uy.

Última vez que te escribo sobre esto: si te interesa ver cómo funciona el sistema de turnos, te ofrezco una demo de 10 minutos esta semana.

Sin compromiso, sin venta agresiva. Solo te muestro y decidís vos.`,
  },
  {
    id: 'email-propuesta',
    label: 'Email: propuesta directa',
    subject: 'Propuesta para tu barbería',
    text: `Hola,

Vi tu barbería y creo que Turno.uy puede ayudarte.

Turno.uy es una plataforma uruguaya que permite que tus clientes reserven turno online desde el celular, a cualquier hora. Ellos reciben recordatorio automático por WhatsApp, lo que reduce ausencias. Vos tenés la agenda de todos tus barberos en un solo lugar, más control de caja y finanzas.

Precio: $400/mes. Sin contratos.

¿Te cuadra una demo de 10 minutos esta semana?

Saludos,
[Tu nombre]
Turno.uy`,
  },
]

export default function MessagesPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [messageText, setMessageText] = useState('')
  const [subject, setSubject] = useState('Propuesta para tu barbería')
  const [includeName, setIncludeName] = useState(false)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<{ name: string; channel: string; success: boolean; error?: string }[]>([])
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'email'>('all')
  const [filterWebsite, setFilterWebsite] = useState<'all' | 'without_web' | 'with_web'>('all')

  // Templates management state
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES)
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formText, setFormText] = useState('')
  const [savedFeedback, setSavedFeedback] = useState(false)

  // Fetch leads (solo no contactados)
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads?status=new&_t=${Date.now()}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Error fetching uncontacted leads:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch templates from API
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setTemplates(data)
          return
        }
      }
    } catch (e) {
      console.error('Error fetching templates:', e)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
    fetchTemplates()
  }, [fetchLeads, fetchTemplates])

  const filtered = leads.filter((l) => {
    // ESTRICTO: Solo leads que nunca han sido contactados exitosamente
    if (l.status !== 'new' || l.lastContactAt) return false
    if (l.messages && l.messages.some((m) => m.status === 'sent')) return false

    const channelMatch =
      filterChannel === 'whatsapp'
        ? !!l.phone
        : filterChannel === 'email'
        ? !l.phone && !!l.email
        : l.phone || l.email
    if (!channelMatch) return false

    const hasWeb = !!l.website && l.website.trim() !== ''
    if (filterWebsite === 'without_web') return !hasWeb
    if (filterWebsite === 'with_web') return hasWeb
    return true
  })

  const withoutWebCount = filtered.filter((l) => !l.website || l.website.trim() === '').length
  const withWebCount = filtered.filter((l) => !!l.website && l.website.trim() !== '').length

  const toggleLead = (id: string) =>
    setSelectedLeads((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () => {
    if (selectedLeads.size === filtered.length) setSelectedLeads(new Set())
    else setSelectedLeads(new Set(filtered.map((l) => l.id)))
  }

  const handleSelectTemplate = (t: Template) => {
    setActiveTemplateId(t.id)
    setMessageText(t.text)
    if (t.subject) {
      setSubject(t.subject)
    }
  }

  // Save templates list to API
  const saveTemplatesToApi = async (newTemplates: Template[]) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplates),
      })
      if (res.ok) {
        setTemplates(newTemplates)
        setSavedFeedback(true)
        setTimeout(() => setSavedFeedback(false), 2500)
      }
    } catch (e) {
      console.error('Error saving templates:', e)
    }
  }

  // Quick save current textarea back into active template
  const handleQuickSaveCurrentToTemplate = async () => {
    if (!activeTemplateId) return
    const updated = templates.map((t) => {
      if (t.id === activeTemplateId) {
        return {
          ...t,
          text: messageText,
          subject: subject || t.subject,
        }
      }
      return t
    })
    await saveTemplatesToApi(updated)
  }

  // Modal actions
  const openNewTemplateForm = () => {
    setEditingId('new')
    setFormLabel('')
    setFormSubject('')
    setFormText(messageText || '')
  }

  const openEditTemplate = (t: Template) => {
    setEditingId(t.id)
    setFormLabel(t.label)
    setFormSubject(t.subject || '')
    setFormText(t.text)
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formLabel.trim() || !formText.trim()) return

    let updated: Template[] = []
    if (editingId === 'new') {
      const newTemplate: Template = {
        id: 'tmpl-' + Date.now(),
        label: formLabel.trim(),
        subject: formSubject.trim() || undefined,
        text: formText.trim(),
      }
      updated = [...templates, newTemplate]
      setActiveTemplateId(newTemplate.id)
      setMessageText(newTemplate.text)
      if (newTemplate.subject) setSubject(newTemplate.subject)
    } else {
      updated = templates.map((t) => {
        if (t.id === editingId) {
          return {
            ...t,
            label: formLabel.trim(),
            subject: formSubject.trim() || undefined,
            text: formText.trim(),
          }
        }
        return t
      })
      if (activeTemplateId === editingId) {
        setMessageText(formText.trim())
        if (formSubject.trim()) setSubject(formSubject.trim())
      }
    }

    await saveTemplatesToApi(updated)
    setEditingId(null)
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('¿Seguro que querés eliminar esta plantilla?')) return
    const updated = templates.filter((t) => t.id !== id)
    if (activeTemplateId === id) setActiveTemplateId(null)
    await saveTemplatesToApi(updated)
  }

  const handleSend = async () => {
    if (!messageText.trim() || selectedLeads.size === 0) return
    setSending(true)
    const res = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadIds: Array.from(selectedLeads),
        message: messageText,
        subject,
        includeName,
      }),
    })
    const data = await res.json()
    setResults(data.results || [])
    setSelectedLeads(new Set())
    setSending(false)
    await fetchLeads()
  }

  const activeTemplate = templates.find((t) => t.id === activeTemplateId)
  const isTextModifiedFromTemplate =
    activeTemplate && (activeTemplate.text !== messageText || (activeTemplate.subject && activeTemplate.subject !== subject))

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Centro de <span className="gradient-text">Mensajes</span>
          </h1>
          <p style={{ color: '#6b7280' }}>Enviá WhatsApp o email a tus leads en un solo click</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
          <span
            className="text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
            style={{
              background: 'rgba(124,58,237,0.3)',
              color: '#ffffff',
              border: '1px solid rgba(167,139,250,0.5)',
            }}
          >
            <MessageSquare size={13} />
            📥 Nuevos Leads (Primer contacto)
          </span>
          <Link
            href="/followup"
            className="text-xs px-3 py-1.5 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
          >
            <RotateCcw size={13} className="text-amber-400" />
            🔄 Seguimiento (Contactados)
          </Link>
        </div>
      </div>

      {/* WhatsApp / Render Server Status Banner */}
      <ServerStatusWidget variant="banner" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Lead selector */}
        <div className="xl:col-span-2 glass p-5 space-y-4 animate-in h-fit">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold text-sm">Leads no contactados</h2>
                <span className="text-[11px] text-gray-500 block">
                  {filtered.length} pendientes de 1er contacto
                </span>
              </div>
              <div className="flex gap-1.5">
                {(['all', 'whatsapp', 'email'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setFilterChannel(ch)}
                    className="text-xs px-2 py-1 rounded-lg transition-all"
                    style={{
                      background: filterChannel === ch ? 'rgba(124,58,237,0.2)' : 'transparent',
                      color: filterChannel === ch ? '#a78bfa' : '#6b7280',
                      border: filterChannel === ch ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                    }}
                  >
                    {ch === 'all' ? 'Todos' : ch === 'whatsapp' ? '📱' : '📧'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por página web */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px]" style={{ color: '#9ca3af' }}>Página web:</span>
              <div className="flex gap-1">
                {(
                  [
                    { id: 'all', label: 'Todas' },
                    { id: 'without_web', label: `🚫 Sin web (${withoutWebCount})` },
                    { id: 'with_web', label: `🌐 Con web (${withWebCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterWebsite(f.id)}
                    className="text-[11px] px-2 py-0.5 rounded-lg transition-all"
                    style={{
                      background: filterWebsite === f.id ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.03)',
                      color: filterWebsite === f.id ? '#c4b5fd' : '#9ca3af',
                      border: filterWebsite === f.id ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Botones de selección rápida */}
          <div className="flex gap-1.5">
            <button
              onClick={toggleAll}
              className="text-xs px-2 py-1.5 rounded-lg flex-1 text-center transition-all truncate"
              style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              {selectedLeads.size === filtered.length && filtered.length > 0
                ? 'Deseleccionar'
                : `Todos (${filtered.length})`}
            </button>
            <button
              onClick={() => {
                const withoutWebIds = filtered
                  .filter((l) => !l.website || l.website.trim() === '')
                  .map((l) => l.id)
                setSelectedLeads(new Set(withoutWebIds))
              }}
              className="text-xs px-2 py-1.5 rounded-lg text-center transition-all flex items-center gap-1"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.25)' }}
              title="Seleccionar únicamente los leads que no tienen sitio web"
            >
              🚫 Solo sin web
            </button>
            <button
              onClick={() => {
                const withWebIds = filtered
                  .filter((l) => !!l.website && l.website.trim() !== '')
                  .map((l) => l.id)
                setSelectedLeads(new Set(withWebIds))
              }}
              className="text-xs px-2 py-1.5 rounded-lg text-center transition-all flex items-center gap-1"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)' }}
              title="Seleccionar únicamente los leads que tienen sitio web"
            >
              🌐 Solo con web
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw size={18} className="spin mx-auto mb-2" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#6b7280' }}>
                Sin leads que coincidan con los filtros
              </p>
            ) : (
              filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => toggleLead(lead.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: selectedLeads.has(lead.id) ? 'rgba(124,58,237,0.15)' : 'rgba(28,28,40,0.5)',
                    border: selectedLeads.has(lead.id) ? '1px solid rgba(124,58,237,0.45)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white truncate flex-1">{lead.name}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lead.website && lead.website.trim() !== '' ? (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium"
                          style={{
                            background: 'rgba(59,130,246,0.15)',
                            color: '#93c5fd',
                            border: '1px solid rgba(59,130,246,0.3)',
                          }}
                          title={`Web: ${lead.website}`}
                        >
                          <Globe size={10} /> Con web
                        </span>
                      ) : (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: 'rgba(245,158,11,0.12)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245,158,11,0.25)',
                          }}
                        >
                          Sin web
                        </span>
                      )}
                      {lead.phone ? (
                        <Phone size={11} style={{ color: '#25d366' }} />
                      ) : (
                        <Mail size={11} style={{ color: '#60a5fa' }} />
                      )}
                    </div>
                  </div>
                  {lead.city && (
                    <span className="text-xs" style={{ color: '#6b7280' }}>{lead.city}</span>
                  )}
                </button>
              ))
            )}
          </div>

          {selectedLeads.size > 0 && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} seleccionado{selectedLeads.size !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Message composer */}
        <div className="xl:col-span-3 space-y-4">
          {/* Templates Selector */}
          <div className="glass p-5 animate-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <FileText size={14} className="text-purple-400" />
                Plantillas
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setIsModalOpen(true)
                }}
                className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all"
                style={{
                  background: 'rgba(124,58,237,0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(124,58,237,0.3)',
                }}
              >
                <Edit3 size={12} />
                Editar / Crear plantillas
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {templates.map((t) => {
                const isSelected = activeTemplateId === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className="text-xs py-1.5 px-3 rounded-lg transition-all"
                    style={{
                      background: isSelected ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#ffffff' : '#d1d5db',
                      border: isSelected ? '1px solid rgba(167,139,250,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Composer */}
          <div className="glass p-5 space-y-4 animate-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <MessageSquare size={14} className="text-purple-400" />
                Redactar mensaje
              </h2>

              {/* Quick save button when a template is modified in the textarea */}
              {isTextModifiedFromTemplate && (
                <button
                  type="button"
                  onClick={handleQuickSaveCurrentToTemplate}
                  className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all animate-pulse"
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    color: '#86efac',
                    border: '1px solid rgba(34,197,94,0.35)',
                  }}
                  title="Guardar este texto como la nueva versión de esta plantilla"
                >
                  <Save size={12} />
                  Guardar cambio en plantilla
                </button>
              )}

              {savedFeedback && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check size={13} /> Guardado
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>
                Asunto (para email)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input text-sm"
                placeholder="Asunto del email..."
              />
            </div>

            {/* Toggle para activar/desactivar personalización con nombre de la barbería */}
            <div
              className="flex items-center justify-between p-3 rounded-xl border transition-all"
              style={{
                background: includeName ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)',
                borderColor: includeName ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)',
              }}
            >
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeName}
                  onChange={(e) => setIncludeName(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-black/40 border-purple-500/30 focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Personalizar con el nombre de la barbería
                  </span>
                  <span className="text-[11px] block" style={{ color: includeName ? '#c4b5fd' : '#9ca3af' }}>
                    {includeName
                      ? 'Activado: saluda a cada barbería con su nombre (ej: "Hola [Barbería]!")'
                      : 'Desactivado: envía mensaje neutro directo sin nombres'}
                  </span>
                </div>
              </label>

              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                style={{
                  background: includeName ? 'rgba(34,197,94,0.15)' : 'rgba(156,163,175,0.1)',
                  color: includeName ? '#86efac' : '#9ca3af',
                  border: includeName ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(156,163,175,0.2)',
                }}
              >
                {includeName ? '✓ Con nombre' : 'Sin nombre'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs" style={{ color: '#9ca3af' }}>
                  Mensaje (WPP y email)
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span style={{ color: '#6b7280' }}>Variables:</span>
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => prev + ' {{name}}')}
                    className="px-2 py-0.5 rounded text-[11px] font-mono transition-colors"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}
                    title="Insertar nombre de la barbería dinámicamente"
                  >
                    + {'{{name}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageText((prev) => prev + ' {{city}}')}
                    className="px-2 py-0.5 rounded text-[11px] font-mono transition-colors"
                    style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}
                    title="Insertar ciudad dinámicamente"
                  >
                    + {'{{city}}'}
                  </button>
                </div>
              </div>

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={9}
                className="input resize-none text-sm"
                placeholder="Escribí o editá tu mensaje acá antes de enviar..."
                style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
              />
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                {messageText.length} caracteres
              </p>
            </div>

            <div
              className="rounded-xl p-3 text-xs"
              style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)' }}
            >
              <p className="font-semibold mb-1" style={{ color: '#25d366' }}>📱 Lógica de envío</p>
              <p style={{ color: '#9ca3af' }}>
                Si el lead tiene teléfono → <strong style={{ color: '#25d366' }}>WhatsApp Business</strong>
                <br />
                Si no tiene teléfono pero tiene email → <strong style={{ color: '#60a5fa' }}>Email (Zoho)</strong>
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !messageText.trim() || selectedLeads.size === 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  Enviando {selectedLeads.size} mensajes...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Enviar a {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="glass p-5 space-y-3 animate-in">
              <h3 className="text-white font-semibold text-sm">Resultados</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {r.success ? (
                      <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-white flex-1 truncate">{r.name}</span>
                    <span className={`badge badge-${r.channel}`}>
                      {r.channel === 'whatsapp' ? '📱 WPP' : '📧 Email'}
                    </span>
                    {!r.success && r.error && (
                      <span className="text-xs text-red-400 truncate max-w-xs cursor-help" title={r.error}>
                        {r.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs" style={{ color: '#6b7280' }}>
                ✅ {results.filter((r) => r.success).length} enviados •{' '}
                ❌ {results.filter((r) => !r.success).length} fallidos
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Administrar y crear plantillas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="glass w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl animate-in"
            style={{ background: '#12121a' }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-purple-400" />
                  Gestión de Plantillas
                </h3>
                <p className="text-xs text-gray-400">
                  Editá el texto de las plantillas existentes o creá nuevas sin tocar el código
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingId(null)
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form to add or edit template */}
              {editingId !== null ? (
                <form onSubmit={handleSaveForm} className="space-y-4 bg-white/5 p-4 rounded-xl border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">
                      {editingId === 'new' ? '➕ Nueva plantilla' : '✏️ Editar plantilla'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nombre / Etiqueta del botón *</label>
                      <input
                        type="text"
                        value={formLabel}
                        onChange={(e) => setFormLabel(e.target.value)}
                        placeholder="Ej: Promo primavera"
                        className="input text-sm w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Asunto de email (opcional)</label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        placeholder="Ej: Oportunidad para tu barbería"
                        className="input text-sm w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-gray-400">Contenido del mensaje *</label>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500 text-[11px]">Variables:</span>
                        <button
                          type="button"
                          onClick={() => setFormText((prev) => prev + ' {{name}}')}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300"
                        >
                          + {'{{name}}'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormText((prev) => prev + ' {{city}}')}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300"
                        >
                          + {'{{city}}'}
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      rows={6}
                      className="input text-sm w-full resize-none font-sans"
                      placeholder="Escribí el texto de la plantilla..."
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5">
                      <Save size={13} />
                      Guardar plantilla
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Tenés {templates.length} plantillas guardadas</span>
                  <button
                    type="button"
                    onClick={openNewTemplateForm}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Crear nueva plantilla
                  </button>
                </div>
              )}

              {/* Templates list */}
              <div className="space-y-3">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{t.label}</span>
                        {t.subject && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            Email: {t.subject}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditTemplate(t)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-3 whitespace-pre-line font-mono bg-black/20 p-2 rounded-lg">
                      {t.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/10 flex justify-between items-center text-xs text-gray-400">
              <span>Las plantillas quedan guardadas en el sistema permanentemente.</span>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingId(null)
                }}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}