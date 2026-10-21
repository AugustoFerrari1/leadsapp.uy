import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst()
    const apiUrl = settings?.evolutionApiUrl || process.env.EVOLUTION_API_URL
    const apiKey = settings?.evolutionApiKey || process.env.EVOLUTION_API_KEY
    const instance = settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'barberialeads'

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Faltan credenciales de Evolution API' }, { status: 400 })
    }

    // Connect and get QR
    const res = await fetch(`${apiUrl}/instance/connect/${instance}`, {
      headers: { apikey: apiKey },
      cache: 'no-store',
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al conectar' },
      { status: 500 }
    )
  }
}
