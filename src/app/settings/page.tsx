'use client'

import { useState, useEffect } from 'react'
import { Settings, Key, Save, CheckCircle2, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import ServerStatusWidget from '@/components/ServerStatusWidget'

type SettingsData = {
  apifyToken: string
  evolutionApiUrl: string
  evolutionApiKey: string
  evolutionInstance: string
  zohoSmtpHost: string
  zohoSmtpPort: number
  zohoEmail: string
  zohoPassword: string
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function SectionCard({ title, icon, children, href, linkLabel }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; href?: string; linkLabel?: string
}) {
  return (
    <div className="glass p-6 space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs"
            style={{ color: '#7c3aed' }}
          >
            {linkLabel}
            <ExternalLink size={11} />
          </a>
        )}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsData>({
    apifyToken: '', evolutionApiUrl: '', evolutionApiKey: '', evolutionInstance: '',
    zohoSmtpHost: 'smtp.zoho.com', zohoSmtpPort: 465, zohoEmail: '', zohoPassword: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wppState, setWppState] = useState<'open' | 'connecting' | 'disconnected' | 'loading'>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)

  const checkWppStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      if (data.state === 'open') {
        setWppState('open')
        setQrCode(null)
      } else if (data.state === 'connecting') {
        setWppState('connecting')
      } else {
        setWppState('disconnected')
      }
    } catch {
      setWppState('disconnected')
    }
  }

  const loadQrCode = async () => {
    setLoadingQr(true)
    try {
      const res = await fetch('/api/whatsapp/connect')
      const data = await res.json()
      if (data.base64) {
        setQrCode(data.base64)
      } else if (data.instance?.state === 'open') {
        setWppState('open')
        setQrCode(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingQr(false)
    }
  }

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((data) => {
      setForm(data)
      setLoading(false)
    })
    checkWppStatus()
  }, [])

  // Poll status while QR code is open
  useEffect(() => {
    if (!qrCode && wppState !== 'connecting') return
    const interval = setInterval(async () => {
      const res = await fetch('/api/whatsapp/status')
      const data = await res.json()
      if (data.state === 'open') {
        setWppState('open')
        setQrCode(null)
        clearInterval(interval)
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [qrCode, wppState])

  const set = (key: keyof SettingsData) => (value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 size={24} className="spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <div className="animate-in">
        <h1 className="text-3xl font-bold text-white mb-1">
          <span className="gradient-text">Configuración</span>
        </h1>
        <p style={{ color: '#6b7280' }}>Configurá tus credenciales de API para activar las integraciones</p>
      </div>

      {/* Apify */}
      <SectionCard
        title="Apify — Google Maps Scraper"
        icon={<Key size={15} className="text-purple-400" />}
        href="https://console.apify.com/account/integrations"
        linkLabel="Obtener token"
      >
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>API Token</label>
          <PasswordInput
            value={form.apifyToken}
            onChange={set('apifyToken')}
            placeholder="apify_api_xxxxxxxxxxxxxxxx"
          />
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
            Necesario para scrapear barberías en Google Maps
          </p>
        </div>
      </SectionCard>

      {/* Evolution API / WhatsApp */}
      <SectionCard
        title="Evolution API — WhatsApp Business"
        icon={<span className="text-green-400 text-sm">📱</span>}
        href="https://evolution-api.com"
        linkLabel="Documentación"
      >
        <div className="space-y-4">
          {/* Live server wake-up & status widget */}
          <ServerStatusWidget variant="banner" />

          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>URL de tu instancia</label>
            <input
              type="text"
              value={form.evolutionApiUrl}
              onChange={(e) => set('evolutionApiUrl')(e.target.value)}
              placeholder="https://api.tudominio.com"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>API Key</label>
            <PasswordInput
              value={form.evolutionApiKey}
              onChange={set('evolutionApiKey')}
              placeholder="tu-api-key"
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Nombre de instancia</label>
            <input
              type="text"
              value={form.evolutionInstance}
              onChange={(e) => set('evolutionInstance')(e.target.value)}
              placeholder="mi-instancia"
              className="input"
            />
          </div>
          {/* Estado de conexión y botón QR */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Estado de WhatsApp:</span>
              {wppState === 'open' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Conectado
                </span>
              ) : wppState === 'connecting' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                  Esperando escaneo...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                  Desconectado
                </span>
              )}
            </div>

            {wppState !== 'open' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={loadQrCode}
                  disabled={loadingQr}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
                >
                  {loadingQr ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generando código QR...
                    </>
                  ) : (
                    <>
                      <span>📲</span>
                      {qrCode ? 'Actualizar Código QR' : 'Vincular WhatsApp (Ver Código QR)'}
                    </>
                  )}
                </button>

                {qrCode && (
                  <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center text-center animate-in">
                    <p className="text-xs text-emerald-400 font-medium mb-1">
                      Escanea este código con tu celular
                    </p>
                    <p className="text-[11px] text-gray-400 mb-3">
                      WhatsApp &rarr; Dispositivos vinculados &rarr; Vincular dispositivo
                    </p>
                    <div className="bg-white p-3 rounded-xl shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCode}
                        alt="Código QR WhatsApp"
                        className="w-60 h-60 object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">
                      Se actualizará automáticamente apenas lo escanees.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Zoho Mail */}
      <SectionCard
        title="Zoho Mail — Email fallback"
        icon={<span className="text-blue-400 text-sm">📧</span>}
        href="https://mail.zoho.com/zm/#mail/settings/alias"
        linkLabel="Zoho settings"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Servidor SMTP</label>
              <input
                type="text"
                value={form.zohoSmtpHost}
                onChange={(e) => set('zohoSmtpHost')(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Puerto</label>
              <input
                type="number"
                value={form.zohoSmtpPort}
                onChange={(e) => set('zohoSmtpPort')(Number(e.target.value))}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Email</label>
            <input
              type="email"
              value={form.zohoEmail}
              onChange={(e) => set('zohoEmail')(e.target.value)}
              placeholder="tu@tudominio.com"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Contraseña de aplicación</label>
            <PasswordInput
              value={form.zohoPassword}
              onChange={set('zohoPassword')}
              placeholder="••••••••"
            />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              Usá una contraseña de aplicación de Zoho, no la contraseña de tu cuenta
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary flex items-center gap-2 px-8"
      >
        {saving ? (
          <>
            <Loader2 size={15} className="spin" />
            Guardando...
          </>
        ) : saved ? (
          <>
            <CheckCircle2 size={15} />
            ¡Guardado!
          </>
        ) : (
          <>
            <Save size={15} />
            Guardar configuración
          </>
        )}
      </button>
    </div>
  )
}
