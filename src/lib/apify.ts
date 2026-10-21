import { ApifyClient } from 'apify-client'

export interface BarberLead {
  title: string
  phone?: string
  email?: string
  website?: string
  address?: string
  city?: string
  totalScore?: number
  reviewsCount?: number
  categoryName?: string
  url?: string
  location?: { lat: number; lng: number }
}

const URUGUAY_CITIES = [
  { name: 'Montevideo', query: 'barberias en Montevideo Uruguay' },
  { name: 'Salto', query: 'barberias en Salto Uruguay' },
  { name: 'Paysandú', query: 'barberias en Paysandú Uruguay' },
  { name: 'Las Piedras', query: 'barberias en Las Piedras Uruguay' },
  { name: 'Rivera', query: 'barberias en Rivera Uruguay' },
  { name: 'Maldonado', query: 'barberias en Maldonado Uruguay' },
  { name: 'Tacuarembó', query: 'barberias en Tacuarembó Uruguay' },
  { name: 'Melo', query: 'barberias en Melo Uruguay' },
  { name: 'Mercedes', query: 'barberias en Mercedes Uruguay' },
  { name: 'Artigas', query: 'barberias en Artigas Uruguay' },
  { name: 'Minas', query: 'barberias en Minas Uruguay' },
  { name: 'San José', query: 'barberias en San José Uruguay' },
  { name: 'Durazno', query: 'barberias en Durazno Uruguay' },
  { name: 'Florida', query: 'barberias en Florida Uruguay' },
  { name: 'Treinta y Tres', query: 'barberias en Treinta y Tres Uruguay' },
]

export { URUGUAY_CITIES }

export async function scrapeBarberShops(
  token: string,
  cities: string[],
  maxPerCity: number = 50
): Promise<BarberLead[]> {
  const client = new ApifyClient({ token })

  const searchQueries = URUGUAY_CITIES.filter((c) => cities.includes(c.name)).map((c) => c.query)

  if (searchQueries.length === 0) return []

  const runInput = {
    searchStringsArray: searchQueries,
    maxCrawledPlacesPerSearch: maxPerCity,
    language: 'es',
    skipClosedPlaces: false,
    extractEmails: true,
    countryCode: 'UY',
  }

  const run = await client.actor('compass/crawler-google-places').call(runInput)
  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  return items.map((item: Record<string, unknown>) => ({
    title: (item.title as string) || '',
    phone: (item.phone as string) || undefined,
    email: (item.email as string) || undefined,
    website: (item.website as string) || undefined,
    address: (item.address as string) || undefined,
    city: extractCity(item.address as string),
    totalScore: (item.totalScore as number) || undefined,
    reviewsCount: (item.reviewsCount as number) || undefined,
    categoryName: (item.categoryName as string) || undefined,
    url: (item.url as string) || undefined,
    location: item.location as { lat: number; lng: number } | undefined,
  }))
}

function extractCity(address: string): string {
  if (!address) return ''
  const parts = address.split(',')
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim()
  }
  return ''
}
