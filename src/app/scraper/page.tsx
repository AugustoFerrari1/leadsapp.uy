'use client'

import { useState } from 'react'
import { Search, MapPin, Loader2, CheckCircle2, AlertCircle, Scissors } from 'lucide-react'

const CITIES = [
  'Montevideo', 'Salto', 'Paysandú', 'Las Piedras', 'Rivera',
  'Maldonado', 'Tacuarembó', 'Melo', 'Mercedes', 'Artigas',
  'Minas', 'San José', 'Durazno', 'Florida', 'Treinta y Tres',
]

type ScrapeResult = {
  success: boolean
  total: number
  created: number
  skipped: number
  error?: string
}

export default function ScraperPage() {
  const [selectedCities, setSelectedCities] = useState<string[]>(['Montevideo'])
  const [maxPerCity, setMaxPerCity] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    )
  }

  const selectAll = () => setSelectedCities([...CITIES])
  const clearAll = () => setSelectedCities([])

  const handleScrape = async () => {
    if (selectedCities.length === 0) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cities: selectedCities, maxPerCity }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ success: false, total: 0, created: 0, skipped: 0, error: 'Error de conexión' })
    }
    setLoading(false)
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="animate-in">
        <h1 className="text-3xl font-bold text-white mb-1">
          Scraper de <span className="gradient-text">Barberías</span>
        </h1>
        <p style={{ color: '#6b7280' }}>
          Busca barberías en Google Maps vía Apify y guarda los leads automáticamente
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* City selector */}
        <div className="xl:col-span-2 glass p-6 space-y-4 animate-in">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <MapPin size={16} className="text-purple-400" />
              Seleccionar ciudades
            </h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="btn-secondary text-xs py-1.5 px-3">
                Todas
              </button>
              <button onClick={clearAll} className="btn-secondary text-xs py-1.5 px-3">
                Ninguna
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CITIES.map((city) => {
              const active = selectedCities.includes(city)
              return (
                <button
                  key={city}
                  onClick={() => toggleCity(city)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                  style={{
                    background: active ? 'rgba(124,58,237,0.15)' : 'rgba(28,28,40,0.5)',
                    border: active ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    color: active ? '#a78bfa' : '#9ca3af',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: active ? '#7c3aed' : '#374151', boxShadow: active ? '0 0 6px #7c3aed' : 'none' }}
                  />
                  {city}
                </button>
              )
            })}
          </div>
        </div>

        {/* Config + Run */}
        <div className="space-y-4">
          <div className="glass p-6 space-y-4 animate-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Search size={16} className="text-purple-400" />
              Configuración
            </h2>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#9ca3af' }}>
                Máximo por ciudad
              </label>
              <input
                type="number"
                value={maxPerCity}
                onChange={(e) => setMaxPerCity(Number(e.target.value))}
                min={5}
                max={200}
                className="input"
              />
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                Más resultados = más créditos Apify
              </p>
            </div>

            <div
              className="rounded-xl p-3 text-xs space-y-1"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              <p className="text-purple-300 font-semibold">Estimación</p>
              <p style={{ color: '#9ca3af' }}>
                ~{selectedCities.length * maxPerCity} leads máximos
              </p>
              <p style={{ color: '#6b7280' }}>
                {selectedCities.length} ciudad{selectedCities.length !== 1 ? 'es' : ''} seleccionada{selectedCities.length !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={handleScrape}
              disabled={loading || selectedCities.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Scrapendo...
                </>
              ) : (
                <>
                  <Scissors size={16} />
                  Buscar Barberías
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div
              className="glass p-5 animate-in"
              style={{
                borderColor: result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
              }}
            >
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-semibold">
                    <CheckCircle2 size={16} />
                    ¡Completado!
                  </div>
                  <div className="space-y-1 text-sm" style={{ color: '#9ca3af' }}>
                    <p>
                      <span className="text-white font-medium">{result.total}</span> encontradas
                    </p>
                    <p>
                      <span className="text-green-400 font-medium">{result.created}</span> nuevas guardadas
                    </p>
                    <p>
                      <span style={{ color: '#6b7280' }}>{result.skipped}</span> duplicadas saltadas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-red-400">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Error</p>
                    <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                      {result.error || 'Verificá el token de Apify en Configuración'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info note */}
          <div
            className="glass p-4 text-xs space-y-1"
            style={{ borderColor: 'rgba(59,130,246,0.2)' }}
          >
            <p className="text-blue-400 font-semibold">💡 Tip</p>
            <p style={{ color: '#6b7280' }}>
              El scraper usa el actor <code className="text-blue-300">compass/crawler-google-places</code> de Apify.
              Configurá tu token en <strong className="text-gray-300">Configuración</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
