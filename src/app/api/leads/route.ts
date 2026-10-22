import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const city = searchParams.get('city')
  const search = searchParams.get('search')
  const allMessages = searchParams.get('messages') === 'all'

  const where: Record<string, unknown> = {}

  if (status && status !== 'all') {
    if (status === 'new') {
      // Solo leads que NO fueron contactados exitosamente
      where.status = 'new'
      where.lastContactAt = null
      where.messages = {
        none: {
          status: 'sent',
        },
      }
    } else if (status.includes(',')) {
      where.status = { in: status.split(',').map((s) => s.trim()) }
    } else {
      where.status = status
    }
  }


  if (city && city !== 'all') {
    where.city = { contains: city, mode: 'insensitive' }
  }

  if (search && search.trim() !== '') {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ]
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        ...(allMessages ? {} : { take: 5 }),
      },
    },
    orderBy: [
      { lastContactAt: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  return NextResponse.json(leads)
}


export async function POST(request: NextRequest) {
  const body = await request.json()

  const lead = await prisma.lead.create({
    data: {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      address: body.address || null,
      city: body.city || null,
      rating: body.rating || null,
      reviewsCount: body.reviewsCount || null,
      category: body.category || null,
      googleMapsUrl: body.googleMapsUrl || null,
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      preferredChannel: body.phone ? 'whatsapp' : body.email ? 'email' : null,
      status: 'new',
    },
  })

  return NextResponse.json(lead)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...data } = body

  const lead = await prisma.lead.update({
    where: { id },
    data,
  })

  return NextResponse.json(lead)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.lead.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
