import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const settings = await prisma.settings.findFirst()
  if (!settings) {
    // Return defaults, never expose passwords
    return NextResponse.json({
      apifyToken: '',
      evolutionApiUrl: '',
      evolutionApiKey: '',
      evolutionInstance: '',
      zohoSmtpHost: 'smtp.zoho.com',
      zohoSmtpPort: 465,
      zohoEmail: '',
      zohoPassword: '',
    })
  }
  return NextResponse.json({
    ...settings,
    zohoPassword: settings.zohoPassword ? '••••••••' : '',
    evolutionApiKey: settings.evolutionApiKey ? '••••••••' : '',
    apifyToken: settings.apifyToken ? '••••••••' : '',
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const existing = await prisma.settings.findFirst()

  const data = {
    apifyToken: body.apifyToken === '••••••••' ? undefined : body.apifyToken,
    evolutionApiUrl: body.evolutionApiUrl,
    evolutionApiKey: body.evolutionApiKey === '••••••••' ? undefined : body.evolutionApiKey,
    evolutionInstance: body.evolutionInstance,
    zohoSmtpHost: body.zohoSmtpHost,
    zohoSmtpPort: Number(body.zohoSmtpPort),
    zohoEmail: body.zohoEmail,
    zohoPassword: body.zohoPassword === '••••••••' ? undefined : body.zohoPassword,
  }

  // Remove undefined keys
  const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))

  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: cleanData })
  } else {
    await prisma.settings.create({ data: cleanData as Parameters<typeof prisma.settings.create>[0]['data'] })
  }

  return NextResponse.json({ success: true })
}
