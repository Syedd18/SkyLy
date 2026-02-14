"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Wind, RefreshCw, AlertCircle } from "lucide-react"
import "leaflet/dist/leaflet.css"

interface CityMapData {
  name: string
  lat: number | null
  lng: number | null
  aqi: number | null
}

interface RawCityData {
  name?: string
  lat?: number | string
  lng?: number | string
  aqi?: number | string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
const api = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path)

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "#4DB748" }
  if (aqi <= 100) return { label: "Moderate", color: "#F9A61A" }
  if (aqi <= 150) return { label: "Sensitive", color: "#F57825" }
  if (aqi <= 200) return { label: "Unhealthy", color: "#ED1B24" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#8E1B66" }
  return { label: "Hazardous", color: "#671F20" }
}

export default function MapComponent() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [cities, setCities] = useState<CityMapData[]>([])
  const [maxStationMap, setMaxStationMap] = useState<Record<string, { aqi: number | null; station?: string }>>({})
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setMapError(null)
        const res = await fetch(api('/cities/available'))
        if (!res.ok) {
          setMapError(`Server returned ${res.status} while fetching cities`)
          return
        }
        const data = await res.json()
        const normalized = (data.cities || []).map((c: RawCityData) => {
          const lat = Number.isFinite(Number(c.lat)) ? Number(c.lat) : null
          const lng = Number.isFinite(Number(c.lng)) ? Number(c.lng) : null
          const aqi = Number.isFinite(Number(c.aqi)) ? Number(c.aqi) : null
          return { name: c.name || '', lat, lng, aqi }
        })
        if (!normalized.length) {
          setMapError('No city coordinates returned from server')
        }
        setCities(normalized)
      } catch (error: unknown) {
        console.error('Failed to load map cities', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        setMapError(errorMessage)
      }
    }

    fetchCities()
  }, [])

  // After we have cities, fetch station lists per city and remember the station with highest AQI
  useEffect(() => {
    if (!cities || cities.length === 0) return

    const controller = new AbortController()

    const fetchStationsForCities = async () => {
      try {
        const promises = cities.map(async (city: CityMapData) => {
          if (!city?.name) return [city?.name, { aqi: null, station: undefined }]
          try {
            const url = api(`/live/aqi/stations?city=${encodeURIComponent(city.name)}`)
            const res = await fetch(url, { signal: controller.signal })
            if (!res.ok) return [city.name, { aqi: null, station: undefined }]
            const data = await res.json()
            const stations = data.stations || data || []
            let max: number | null = null
            let maxStationName: string | undefined = undefined
            for (const s of stations) {
              const a = Number.isFinite(Number(s.aqi)) ? Number(s.aqi) : (s.aqi && typeof s.aqi === 'object' && 'v' in s.aqi ? Number(s.aqi.v) : null)
              if (typeof a === 'number' && (max === null || a > max)) {
                max = a
                maxStationName = s.station_name || s.name || s.station || s.location || undefined
              }
            }
            return [city.name, { aqi: max, station: maxStationName }]
          } catch {
            return [city.name, { aqi: null, station: undefined }]
          }
        })

        const results = await Promise.all(promises)
        const map: Record<string, { aqi: number | null; station?: string }> = {}
        for (const [name, info] of results) {
          if (typeof name === 'string') map[name] = info as { aqi: number | null; station?: string }
        }
        setMaxStationMap(map)
      } catch {
        // silent
      }
    }

    fetchStationsForCities()
    return () => controller.abort()
  }, [cities])

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <span>Interactive Air Quality Map</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setMapError(null)
              setCities([])
              setTimeout(() => {
                ;(async () => {
                  try {
                    const res = await fetch(api('/cities/available'))
                    if (!res.ok) { setMapError(`Server returned ${res.status} while fetching cities`); return }
                    const data = await res.json()
                    const normalized = (data.cities || []).map((c: RawCityData) => ({ name: c.name || '', lat: Number(c.lat), lng: Number(c.lng), aqi: Number(c.aqi) }))
                    setCities(normalized)
                    setMapError(null)
                  } catch (error: unknown) { 
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    setMapError(errorMessage) 
                  }
                })()
              }, 100)
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        {mapError && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Failed to load map data</p>
              <p className="text-xs text-muted-foreground mt-1">{mapError}</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative h-[500px] rounded-lg overflow-hidden">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              key={isDark ? 'dark' : 'light'}
              url={isDark 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
              attribution={isDark
                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }
            />

            {cities.filter((city: CityMapData) => typeof city.lat === 'number' && typeof city.lng === 'number').map((city: CityMapData) => {
              // Prefer the highest-station AQI for this city if available
              const stationInfo = maxStationMap[city.name]
              const aqi = (stationInfo && typeof stationInfo.aqi === 'number') ? stationInfo.aqi : (typeof city.aqi === 'number' ? city.aqi : null)
              const color = aqi !== null ? getAQICategory(aqi).color : '#999999'
              const radius = Math.max(8, Math.min(16, (aqi ?? 20) / 8))
              return (
                <CircleMarker 
                  key={city.name} 
                  center={[city.lat!, city.lng!]} 
                  radius={radius} 
                  pathOptions={{ 
                    color, 
                    fillColor: color, 
                    fillOpacity: 0.7,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div className="p-3 min-w-[180px]">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-base text-neutral-800 dark:text-neutral-50">{city.name}</h3>
                      </div>
                      <div className="flex items-center justify-between gap-3 p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4" style={{ color }} />
                          <span className="font-semibold text-lg">{aqi ?? 'N/A'}</span>
                        </div>
                        <Badge className="text-white text-xs font-medium" style={{ backgroundColor: color }}>
                          {aqi !== null ? getAQICategory(aqi).label : 'No data'}
                        </Badge>
                      </div>
                      {stationInfo && stationInfo.station && (
                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          📍 {stationInfo.station}
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>

          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-background/95 backdrop-blur-sm border border-border/50 p-3 rounded-xl shadow-lg">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              AQI Legend
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              {[
                { value: 25, label: "Good (0-50)" },
                { value: 75, label: "Moderate (51-100)" },
                { value: 125, label: "Sensitive (101-150)" },
                { value: 175, label: "Unhealthy (151-200)" },
                { value: 250, label: "Very Unhealthy (201-300)" },
                { value: 350, label: "Hazardous (300+)" }
              ].map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-background" 
                    style={{ backgroundColor: getAQICategory(value).color, outlineColor: getAQICategory(value).color }}
                  />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* City count badge */}
          <div className="absolute top-4 left-4 z-[1000]">
            <Badge variant="secondary" className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-sm">
              <MapPin className="h-3 w-3 mr-1" />
              {cities.length} Cities
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}