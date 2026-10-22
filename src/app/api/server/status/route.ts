import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  try {
    const settings = await prisma.settings.findFirst()
    const rawUrl = settings?.evolutionApiUrl || process.env.EVOLUTION_API_URL
    const apiKey = settings?.evolutionApiKey || process.env.EVOLUTION_API_KEY
    const instance = settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'barberialeads'

    if (!rawUrl) {
      return NextResponse.json({
        online: false,
        status: 'unconfigured',
        error: 'URL de Evolution API no configurada',
      })
    }

    const apiUrl = rawUrl.trim().replace(/\/+$/, '')

    // Fast check: ping the root or health endpoint with a 4-second timeout
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: apiKey ? { apikey: apiKey } : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })

    const latencyMs = Date.now() - startTime

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return NextResponse.json({
        online: false,
        status: 'sleeping',
        error: `Servidor suspendido en Render (HTTP ${res.status})`,
        url: apiUrl,
        latencyMs,
      })
    }

    if (!res.ok) {
      return NextResponse.json({
        online: false,
        status: 'error',
        error: `Respuesta HTTP ${res.status}`,
        url: apiUrl,
        latencyMs,
      })
    }

    // Now check instance state
    let whatsappState: 'open' | 'connecting' | 'disconnected' | 'unknown' = 'unknown'
    if (apiKey && instance) {
      try {
        const stateRes = await fetch(`${apiUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
          headers: { apikey: apiKey },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        })
        if (stateRes.ok) {
          const stateData = await stateRes.json()
          whatsappState = stateData.instance?.state || 'disconnected'
        }
      } catch {
        whatsappState = 'unknown'
      }
    }

    return NextResponse.json({
      online: true,
      status: 'online',
      url: apiUrl,
      instance,
      whatsappState,
      latencyMs,
    })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Error de conexión'

    // If timeout or connection refused, it typically means Render is sleeping / spin-down
    const isSleeping =
      message.includes('timeout') ||
      message.includes('abort') ||
      message.includes('ECONNREFUSED') ||
      message.includes('fetch failed')

    return NextResponse.json({
      online: false,
      status: isSleeping ? 'sleeping' : 'error',
      error: isSleeping ? 'Servidor suspendido o iniciando en Render' : message,
      latencyMs,
    })
  }
}
