import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST() {
  const startTime = Date.now()
  try {
    const settings = await prisma.settings.findFirst()
    const rawUrl = settings?.evolutionApiUrl || process.env.EVOLUTION_API_URL
    const apiKey = settings?.evolutionApiKey || process.env.EVOLUTION_API_KEY
    const instance = settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'barberialeads'

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: 'URL de Evolution API no configurada en Ajustes' },
        { status: 400 }
      )
    }

    const apiUrl = rawUrl.trim().replace(/\/+$/, '')

    // Send wake ping with up to 80 seconds timeout (Render cold starts take ~40-60s)
    const wakeRes = await fetch(apiUrl, {
      method: 'GET',
      headers: apiKey ? { apikey: apiKey } : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(80000),
    })

    const durationMs = Date.now() - startTime

    if (!wakeRes.ok && wakeRes.status !== 502 && wakeRes.status !== 503) {
      // It might have responded with 401 or 404, but that means the server IS awake!
      // Any response from the container means it is online.
    }

    // Verify instance state
    let whatsappState: 'open' | 'connecting' | 'disconnected' | 'unknown' = 'unknown'
    if (apiKey && instance) {
      try {
        const stateRes = await fetch(`${apiUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
          headers: { apikey: apiKey },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
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
      success: true,
      online: true,
      durationMs,
      whatsappState,
      message: `¡Servidor activado con éxito! (Respondió en ${(durationMs / 1000).toFixed(1)}s)`,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Error al despertar servidor'
    return NextResponse.json(
      {
        success: false,
        online: false,
        durationMs,
        error: `No se pudo reactivar el servidor tras ${(durationMs / 1000).toFixed(1)}s: ${message}`,
      },
      { status: 504 }
    )
  }
}
