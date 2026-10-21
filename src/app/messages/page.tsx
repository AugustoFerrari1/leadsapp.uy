'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
} from 'lucide-react'

type Lead = {
  id: string
  name: string
  phone?: string
  email?: string
  city?: string
  status: string
  preferredChannel?: string
}

const TEMPLATES = [
  {
    label: '🎯 Directo al punto',
    text: `Hola! 👋 Vi tu barbería en Google Maps y quería contarte algo corto.

Tenemos una plataforma llamada *Turno.uy* — permite que tus clientes reserven turno desde el celular las 24hs, sin que vos tengas que atender el teléfono.

Recordatorios automáticos por WhatsApp, tu propia página de reservas, agenda digital para todos tus barberos.

Todo eso por *$400/mes*. Sin contratos, cancelás cuando querés.

¿Te mando más info o hacemos una demo rápida? 💈`,
  },
  {
    label: '😤 Punto de dolor (teléfono)',
    text: `Hola! Una pregunta: ¿cuántas veces por día te interrumpen el trabajo para reservar un turno?

Con *Turno.uy* tus clientes reservan solos desde el celular, reciben recordatorio automático por WhatsApp y vos seguís cortando sin parar.

Barberías en Uruguay ya lo usan y dicen que les cambió la rutina.

¿Querés verlo en acción? Te muestro en 10 minutos. 💈`,
  },
  {
    label: '💸 Precio como gancho',
    text: `Hola! Te mando esto rápido porque creo que te puede servir.

Hay barberías que pagan $3.000–$5.000/mes por sistemas de turnos online. Nosotros lo hacemos por *$400/mes* con todo incluido:

✅ Página de reservas propia
✅ Recordatorios por WhatsApp automáticos
✅ Agenda para todos tus barberos
✅ Control de caja y finanzas
✅ Link directo + código QR

Se llama *Turno.uy*, es uruguayo y está hecho para barberías como la tuya.

¿Te interesa probarlo? 🙌`,
  },
  {
    label: '🚀 Urgencia + competencia',
    text: `Hola! ¿Sabías que las barberías que tienen sistema de turnos online reciben hasta un 40% más de reservas que las que no?

Mientras tus competidores siguen dependiendo del teléfono, vos podrías tener tus clientes reservando solos a las 2 de la mañana.

*Turno.uy* es la plataforma de turnos para barberías de Uruguay. $400/mes, sin ataduras.

¿Te cuento más? 💈`,
  },
  {
    label: '🤝 Tono amigable / vecino',
    text: `Hola! Vi tu barbería por la zona y se ve que tienen buen trabajo. 💈

Te quería comentar que tenemos una plataforma uruguaya — *Turno.uy* — que ayuda a barberías a que sus clientes puedan reservar turno desde el celular sin llamar.

Es simple, económico ($400/mes) y los clientes la aman porque reservan cuando quieren, no cuando vos podés atender el teléfono.

¿Tenés 10 minutos para que te muestre cómo funciona? Sin compromiso.`,
  },
  {
    label: '📧 Asunto email: Para tu barbería',
    text: `Hola, te escribo porque vi tu barbería y creo que esto te puede ayudar.

Me llamo [Nombre] y trabajo en Turno.uy, una plataforma uruguaya de gestión de turnos para barberías.

**¿Qué hace Turno.uy?**
- Tus clientes reservan turno online desde el celular, las 24hs
- Reciben recordatorio automático por WhatsApp → menos ausencias
- Vos tenés la agenda de todos tus barberos en un solo lugar
- Control de caja, finanzas, reseñas y mucho más

**Precio: $400/mes.** Sin contratos ni costos ocultos.

Si te interesa, con gusto te muestro una demo en 10 minutos por videollamada o en persona.

Saludos!
[Nombre]
Turno.uy`,
  },
  {
    label: '⭐ Social proof',
    text: `Hola! Te cuento algo rápido.

Barberías en Uruguay que empezaron a usar *Turno.uy* para gestionar sus turnos online nos dicen que:

📉 Bajaron un 60% las ausencias (gracias a recordatorios automáticos por WhatsApp)
📈 Aumentaron sus reservas porque los clientes pueden reservar a cualquier hora
⏱️ Recuperaron horas de trabajo que perdían atendiendo el teléfono

Cuesta $400/mes y podés probarlo sin compromiso.

¿Querés que te cuente más? 💈`,
  },
]

export default function MessagesPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [messageText, setMessageText] = useState('')
  const [subject, setSubject] = useState('Propuesta para tu barbería')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<{ name: string; channel: string; success: boolean; error?: string }[]>([])
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'email'>('all')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/leads?status=new')
    const data = await res.json()
    setLeads(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filtered = leads.filter((l) => {
    if (filterChannel === 'whatsapp') return !!l.phone
    if (filterChannel === 'email') return !l.phone && !!l.email
    return l.phone || l.email
  })

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
      }),
    })
    const data = await res.json()
    setResults(data.results || [])
    setSelectedLeads(new Set())
    setSending(false)
    fetchLeads()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="animate-in">
        <h1 className="text-3xl font-bold text-white mb-1">
          Centro de <span className="gradient-text">Mensajes</span>
        </h1>
        <p style={{ color: '#6b7280' }}>Enviá WhatsApp o email a tus leads en un solo click</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Lead selector */}
        <div className="xl:col-span-2 glass p-5 space-y-4 animate-in h-fit">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Leads nuevos</h2>
            <div className="flex gap-2">
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

          <button
            onClick={toggleAll}
            className="text-xs px-3 py-1.5 rounded-lg w-full text-left"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            {selectedLeads.size === filtered.length && filtered.length > 0
              ? 'Deseleccionar todos'
              : `Seleccionar todos (${filtered.length})`}
          </button>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw size={18} className="spin mx-auto mb-2" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#6b7280' }}>
                Sin leads nuevos
              </p>
            ) : (
              filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => toggleLead(lead.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: selectedLeads.has(lead.id) ? 'rgba(124,58,237,0.12)' : 'rgba(28,28,40,0.5)',
                    border: selectedLeads.has(lead.id) ? '1px solid rgba(124,58,237,0.35)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">{lead.name}</span>
                    {lead.phone ? (
                      <Phone size={11} style={{ color: '#25d366', flexShrink: 0 }} />
                    ) : (
                      <Mail size={11} style={{ color: '#60a5fa', flexShrink: 0 }} />
                    )}
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
          {/* Templates */}
          <div className="glass p-5 animate-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <FileText size={14} className="text-purple-400" />
              Templates rápidos
            </h2>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setMessageText(t.text)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Composer */}
          <div className="glass p-5 space-y-4 animate-in" style={{ animationDelay: '150ms' }}>
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <MessageSquare size={14} className="text-purple-400" />
              Redactar mensaje
            </h2>

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

            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>
                Mensaje (WPP y email)
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={8}
                className="input resize-none text-sm"
                placeholder="Escribí tu mensaje acá..."
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
                      <span className="text-xs text-red-400 truncate max-w-24">{r.error}</span>
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
    </div>
  )
}
