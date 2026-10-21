import { prisma } from '@/lib/prisma'
import { scrapeBarberShops } from '@/lib/apify'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cities, maxPerCity = 30 } = body

    // Get token from settings or env
    const settings = await prisma.settings.findFirst()
    const token = settings?.apifyToken || process.env.APIFY_TOKEN || ''

    if (!token) {
      return NextResponse.json({ error: 'Apify token not configured' }, { status: 400 })
    }

    const results = await scrapeBarberShops(token, cities, maxPerCity)

    // Upsert leads (avoid duplicates by name+address)
    let created = 0
    let skipped = 0

    for (const item of results) {
      const existing = await prisma.lead.findFirst({
        where: { name: item.title, address: item.address || undefined },
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.lead.create({
        data: {
          name: item.title,
          phone: item.phone || null,
          email: item.email || null,
          website: item.website || null,
          address: item.address || null,
          city: item.city || null,
          rating: item.totalScore || null,
          reviewsCount: item.reviewsCount || null,
          category: item.categoryName || null,
          googleMapsUrl: item.url || null,
          latitude: item.location?.lat || null,
          longitude: item.location?.lng || null,
          preferredChannel: item.phone ? 'whatsapp' : item.email ? 'email' : null,
          status: 'new',
        },
      })
      created++
    }

    return NextResponse.json({
      success: true,
      total: results.length,
      created,
      skipped,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scraping failed' },
      { status: 500 }
    )
  }
}
