import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst()
    const apiUrl = settings?.evolutionApiUrl || process.env.EVOLUTION_API_URL
    const apiKey = settings?.evolutionApiKey || process.env.EVOLUTION_API_KEY
    const instance = settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'barberialeads'

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ state: 'unconfigured', error: 'Evolution API no configurada' })
    }

    // Check status
    const res = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ state: 'disconnected', instance })
    }

    const data = await res.json()
    return NextResponse.json({
      state: data.instance?.state || 'disconnected',
      instance,
    })
  } catch (error) {
    return NextResponse.json({
      state: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
