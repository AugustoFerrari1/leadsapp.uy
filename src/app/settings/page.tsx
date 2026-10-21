'use client'

import { useState, useEffect } from 'react'
import { Settings, Key, Save, CheckCircle2, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react'

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

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((data) => {
      setForm(data)
      setLoading(false)
    })
  }, [])

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
        <div className="space-y-3">
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
          <div
            className="rounded-xl p-3 text-xs"
            style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)' }}
          >
            <p className="text-green-400 font-semibold mb-1">¿Cómo configurar Evolution API?</p>
            <ol className="space-y-1" style={{ color: '#9ca3af' }}>
              <li>1. Instalá Evolution API en un VPS o Railway</li>
              <li>2. Escaneá el QR con tu celular de WPP Business</li>
              <li>3. Pegá la URL, API Key e instancia acá</li>
            </ol>
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
