'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Zap,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Radio,
} from 'lucide-react'

type ServerStatus = {
  online: boolean
  status: 'online' | 'sleeping' | 'unconfigured' | 'error' | 'waking'
  error?: string
  latencyMs?: number
  whatsappState?: 'open' | 'connecting' | 'disconnected' | 'unknown'
}

type Props = {
  compact?: boolean // If true, renders a compact version for sidebar; if false/banner, renders a wider card/banner
  variant?: 'sidebar' | 'banner' | 'card'
  onStatusChange?: (status: ServerStatus) => void
}

export default function ServerStatusWidget({ compact = false, variant = 'sidebar', onStatusChange }: Props) {
  const [status, setStatus] = useState<ServerStatus>({
    online: false,
    status: 'sleeping',
  })
  const [loading, setLoading] = useState(true)
  const [waking, setWaking] = useState(false)
  const [wakeSeconds, setWakeSeconds] = useState(0)
  const [wakeSuccessMsg, setWakeSuccessMsg] = useState<string | null>(null)
  const [autoKeepAlive, setAutoKeepAlive] = useState(true)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Check current server status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/server/status?_t=${Date.now()}`)
      const data: ServerStatus = await res.json()
      setStatus(data)
      onStatusChange?.(data)
      window.dispatchEvent(new CustomEvent('server-status-updated', { detail: data }))
      return data
    } catch {
      const errState: ServerStatus = { online: false, status: 'error', error: 'Error de red' }
      setStatus(errState)
      onStatusChange?.(errState)
      return errState
    } finally {
      setLoading(false)
    }
  }, [onStatusChange])

  // Listen for global status updates so all widgets synchronize
  useEffect(() => {
    const handleGlobalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ServerStatus>
      if (customEvent.detail) {
        setStatus(customEvent.detail)
      }
    }
    window.addEventListener('server-status-updated', handleGlobalUpdate)
    return () => window.removeEventListener('server-status-updated', handleGlobalUpdate)
  }, [])

  // Initial check
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Wake up server via POST /api/server/wake
  const handleWakeServer = async () => {
    if (waking) return
    setWaking(true)
    setWakeSeconds(0)
    setWakeSuccessMsg(null)

    // Notify others
    setStatus((prev) => ({ ...prev, status: 'waking' }))

    // Start timer display
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setWakeSeconds((s) => s + 1)
    }, 1000)

    try {
      const res = await fetch('/api/server/wake', {
        method: 'POST',
      })
      const data = await res.json()

      if (data.online || data.success) {
        const newStatus: ServerStatus = {
          online: true,
          status: 'online',
          latencyMs: data.durationMs,
          whatsappState: data.whatsappState || 'open',
        }
        setStatus(newStatus)
        setWakeSuccessMsg(data.message || '¡Servidor activado!')
        window.dispatchEvent(new CustomEvent('server-status-updated', { detail: newStatus }))
        setTimeout(() => setWakeSuccessMsg(null), 6000)
      } else {
        await checkStatus()
      }
    } catch (e) {
      console.error('Error waking server:', e)
      await checkStatus()
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setWaking(false)
    }
  }

  // Keep-alive loop: every 8 minutes, ping if autoKeepAlive is enabled and server is online
  useEffect(() => {
    if (!autoKeepAlive) return
    const interval = setInterval(async () => {
      // Light ping to avoid Render 15-min idle spin down
      try {
        await fetch(`/api/server/status?ping=1&_t=${Date.now()}`)
      } catch (err) {
        console.error('Keep-alive ping error:', err)
      }
    }, 8 * 60 * 1000) // 8 minutes

    return () => clearInterval(interval)
  }, [autoKeepAlive])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // 1. Sidebar Variant
  if (variant === 'sidebar') {
    return (
      <div
        className="rounded-xl p-3 text-xs space-y-2.5 transition-all"
        style={{
          background: status.online
            ? 'rgba(16, 185, 129, 0.07)'
            : waking
            ? 'rgba(245, 158, 11, 0.1)'
            : 'rgba(239, 68, 68, 0.08)',
          border: status.online
            ? '1px solid rgba(16, 185, 129, 0.25)'
            : waking
            ? '1px solid rgba(245, 158, 11, 0.35)'
            : '1px solid rgba(239, 68, 68, 0.25)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold">
            {loading ? (
              <Loader2 size={13} className="spin text-gray-400" />
            ) : waking ? (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            ) : status.online ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-red-400" />
            )}
            <span
              style={{
                color: status.online ? '#34d399' : waking ? '#fbbf24' : '#f87171',
              }}
            >
              {waking
                ? `Despertando... ${wakeSeconds}s`
                : status.online
                ? 'Servidor Activo'
                : 'Servidor Suspendido'}
            </span>
          </div>

          <button
            onClick={() => checkStatus()}
            disabled={loading || waking}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Verificar estado del servidor"
          >
            <RefreshCw size={11} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Info text */}
        <p className="text-[11px] leading-tight text-gray-400">
          {waking ? (
            <span>Iniciando Render (~45s)... Por favor esperá.</span>
          ) : status.online ? (
            <span>
              Evolution API lista {status.whatsappState === 'open' ? '• WhatsApp conectado' : ''}
            </span>
          ) : (
            <span>Render en reposo por inactividad. Activá para enviar WhatsApps.</span>
          )}
        </p>

        {wakeSuccessMsg && (
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={11} /> {wakeSuccessMsg}
          </div>
        )}

        {/* Action Button */}
        {!status.online && (
          <button
            onClick={handleWakeServer}
            disabled={waking}
            className="w-full py-1.5 px-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
            style={{
              background: waking
                ? 'rgba(245, 158, 11, 0.2)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: waking ? '#fbbf24' : '#ffffff',
              border: waking ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
            }}
          >
            {waking ? (
              <>
                <Loader2 size={12} className="spin" />
                Despertando ({wakeSeconds}s)...
              </>
            ) : (
              <>
                <Zap size={12} />
                Activar Servidor
              </>
            )}
          </button>
        )}

        {/* Auto keep-alive toggle */}
        {status.online && (
          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-gray-400">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoKeepAlive}
                onChange={(e) => setAutoKeepAlive(e.target.checked)}
                className="w-3 h-3 rounded text-emerald-500 bg-black/40 border-white/10"
              />
              <span>Mantener activo</span>
            </label>
            <span className="text-[9px] text-emerald-400/80">Auto-ping ON</span>
          </div>
        )}
      </div>
    )
  }

  // 2. Banner Variant (For Messages & Follow-up pages)
  if (variant === 'banner') {
    // If online and not waking, return subtle or null unless requested
    if (status.online && !waking && !wakeSuccessMsg) {
      return (
        <div className="flex items-center justify-between p-2.5 px-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Servidor de WhatsApp Activo y listo</span>
            {status.latencyMs && (
              <span className="text-emerald-400/70 text-[11px]">({status.latencyMs}ms)</span>
            )}
            {status.whatsappState === 'open' && (
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300">
                Instancia conectada
              </span>
            )}
          </div>
          <button
            onClick={() => checkStatus()}
            className="text-[11px] text-emerald-400/80 hover:text-emerald-200 flex items-center gap-1"
          >
            <RefreshCw size={10} className={loading ? 'spin' : ''} />
            Verificar
          </button>
        </div>
      )
    }

    return (
      <div
        className="p-3.5 px-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all animate-in"
        style={{
          background: waking
            ? 'rgba(245, 158, 11, 0.12)'
            : 'rgba(239, 68, 68, 0.12)',
          borderColor: waking
            ? 'rgba(245, 158, 11, 0.35)'
            : 'rgba(239, 68, 68, 0.3)',
        }}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{
              background: waking ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
              color: waking ? '#fbbf24' : '#f87171',
            }}
          >
            {waking ? <Loader2 size={16} className="spin" /> : <AlertTriangle size={16} />}
          </div>

          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              <span>
                {waking
                  ? `Despertando servidor en Render (${wakeSeconds}s)...`
                  : '⚠️ Servidor de WhatsApp suspendido por inactividad'}
              </span>
            </div>
            <p className="text-gray-300 text-[11px] mt-0.5">
              {waking
                ? 'Render tarda unos 40-50 segundos en arrancar el contenedor. No cierres la ventana.'
                : 'En el plan gratis de Render, el servidor entra en reposo si no se usa por 15 min. Hacé click en Activar para levantarlo antes de enviar mensajes.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleWakeServer}
            disabled={waking}
            className="py-2 px-3.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg"
            style={{
              background: waking
                ? 'rgba(245, 158, 11, 0.3)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
            }}
          >
            {waking ? (
              <>
                <Loader2 size={13} className="spin" />
                Iniciando ({wakeSeconds}s)...
              </>
            ) : (
              <>
                <Zap size={13} />
                Activar Servidor Ahora
              </>
            )}
          </button>
          <button
            onClick={() => checkStatus()}
            disabled={loading || waking}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10"
            title="Refrescar estado"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>
    )
  }

  // 3. Card Variant (e.g. for Settings page)
  return (
    <div className="glass p-5 rounded-2xl border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: status.online ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: status.online ? '#34d399' : '#f87171',
            }}
          >
            <Power size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Estado del Servidor (Render)</h3>
            <span className="text-[11px] text-gray-400">
              {status.online ? 'Servidor activo y respondiendo' : 'Servidor suspendido / dormido'}
            </span>
          </div>
        </div>

        <button
          onClick={() => checkStatus()}
          disabled={loading || waking}
          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 flex items-center gap-1"
        >
          <RefreshCw size={11} className={loading ? 'spin' : ''} />
          Verificar
        </button>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
        <span className="text-gray-400">Estado actual:</span>
        <span
          className="font-semibold flex items-center gap-1.5"
          style={{ color: status.online ? '#34d399' : waking ? '#fbbf24' : '#f87171' }}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status.online ? 'bg-emerald-400 animate-pulse' : waking ? 'bg-amber-400' : 'bg-red-400'
            }`}
          />
          {waking ? `Iniciando... (${wakeSeconds}s)` : status.online ? 'Online' : 'Suspendido (Sleeping)'}
        </span>
      </div>

      <button
        onClick={handleWakeServer}
        disabled={waking}
        className="w-full py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all"
        style={{
          background: waking
            ? 'rgba(245, 158, 11, 0.2)'
            : 'linear-gradient(135deg, #7c3aed, #6366f1)',
          color: '#ffffff',
        }}
      >
        {waking ? (
          <>
            <Loader2 size={14} className="spin" />
            Despertando contenedor en Render ({wakeSeconds}s)...
          </>
        ) : (
          <>
            <Zap size={14} />
            {status.online ? 'Enviar ping de reactivación' : 'Activar Servidor en Render'}
          </>
        )}
      </button>
    </div>
  )
}
