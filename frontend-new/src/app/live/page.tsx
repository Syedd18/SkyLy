"use client"

import { useState, useEffect, useCallback } from "react"
import { HeroSection } from "@/components/hero-section"
import { PollutantCards } from "@/components/pollutant-cards"
import { StationsList } from "@/components/stations-list"
import { HealthAdvisoryPanel } from "@/components/health-advisory-panel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AQIData } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { 
  MapPin, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  Satellite, 
  Radio,
  Thermometer,
  Wind,
  Navigation2,
  RefreshCw
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface CityData {
  name: string
  lat?: number
  lng?: number
  city?: string
}

interface SatelliteData {
  pm2_5?: number
  pm10?: number
  nitrogen_dioxide?: number
  ozone?: number
  sulphur_dioxide?: number
  carbon_monoxide?: number
  us_aqi?: number
  european_aqi?: number
  temperature?: number
  dew?: number
  h?: number
  wind_speed?: number
  p?: number
  wind_dir?: number
  lat?: number
  lng?: number
}

interface StationData {
  components?: Record<string, number | undefined>
  aqi?: number
  name?: string
  station_name?: string
  time?: string
}

interface FavoriteItem {
  city: string
}

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "rgb(var(--aqi-good))", bgColor: "rgb(var(--aqi-good-bg))" }
  if (aqi <= 100) return { label: "Moderate", color: "rgb(var(--aqi-moderate))", bgColor: "rgb(var(--aqi-moderate-bg))" }
  if (aqi <= 150) return { label: "Sensitive", color: "rgb(var(--aqi-unhealthy-sensitive))", bgColor: "rgb(var(--aqi-unhealthy-sensitive-bg))" }
  if (aqi <= 200) return { label: "Unhealthy", color: "rgb(var(--aqi-unhealthy))", bgColor: "rgb(var(--aqi-unhealthy-bg))" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "rgb(var(--aqi-very-unhealthy))", bgColor: "rgb(var(--aqi-very-unhealthy-bg))" }
  return { label: "Hazardous", color: "rgb(var(--aqi-hazardous))", bgColor: "rgb(var(--aqi-hazardous-bg))" }
}

export default function LiveAQIPage() {
  const [aqiData, setAqiData] = useState<AQIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState("Delhi")
  const [autoDetect, setAutoDetect] = useState(false)
  const [showPollutants, setShowPollutants] = useState(true)
  const { isAuthenticated, token } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [satellite, setSatellite] = useState<SatelliteData | null>(null)
  const [showStations, setShowStations] = useState(false)
  const [showSatellite, setShowSatellite] = useState(false)
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Find nearest city from available cities
  const findNearestCity = useCallback(async (userLat: number, userLon: number): Promise<string> => {
    try {
      const citiesRes = await fetch(`${API_BASE_URL}/cities/all`)
      if (!citiesRes.ok) return "Delhi"
      
      const citiesData = await citiesRes.json()
      const cities = citiesData.cities || citiesData
      
      if (!Array.isArray(cities) || cities.length === 0) return "Delhi"

      let nearestCity = "Delhi"
      let minDistance = Infinity

      cities.forEach((city: CityData) => {
        if (city.lat && city.lng) {
          const distance = calculateDistance(userLat, userLon, city.lat, city.lng)
          if (distance < minDistance) {
            minDistance = distance
            nearestCity = city.name
          }
        }
      })

      return nearestCity
    } catch {
      return "Delhi"
    }
  }, [])

  useEffect(() => {
    if (autoDetect) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          const nearestCity = await findNearestCity(latitude, longitude)
          setLocation(nearestCity)
          setAutoDetect(false)
          setLoading(false)
        },
        () => {
          setLocation("Delhi")
          setAutoDetect(false)
          setLoading(false)
        }
      )
    }
  }, [autoDetect, findNearestCity])

  const fetchAqiData = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const liveRes = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(location)}`)

      if (liveRes.ok) {
        const data = await liveRes.json()
        setAqiData(data)
      } else {
        setAqiData(null)
      }
    } catch {
      setAqiData(null)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [location])

  useEffect(() => {
    fetchAqiData()
    const interval = setInterval(fetchAqiData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAqiData])

  const handleToggleSatellite = async () => {
    if (showSatellite) {
      setShowSatellite(false)
      setSatellite(null)
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/satellite/live?city=${encodeURIComponent(location)}`)
      if (res.ok) {
        setSatellite(await res.json())
        setShowSatellite(true)
      }
    } catch {
      // Satellite fetch failed silently
    }
  }

  const handleLocateMe = () => setAutoDetect(true)

  const checkFavorite = useCallback(async () => {
    if (!isAuthenticated || !token || !aqiData) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const normalize = (s: string | undefined) => {
          if (!s) return ''
          const parts = s.split(',').map(p => p.trim()).filter(Boolean)
          const knownCountries = ['india']
          while (parts.length > 1 && knownCountries.includes(parts[parts.length - 1].toLowerCase())) parts.pop()
          return (parts.length ? parts[parts.length - 1].toLowerCase() : '')
        }
        const target = normalize(aqiData.city ?? location)
        setIsFavorite(data.favorites?.some((f: FavoriteItem) => normalize(f.city) === target) ?? false)
      }
    } catch {
      // Failed to check favorites silently
    }
  }, [isAuthenticated, token, aqiData, location])

  useEffect(() => {
    checkFavorite()
  }, [checkFavorite])

  const toggleFavorite = async () => {
    if (!isAuthenticated || !token || !aqiData) return
    setFavoritesLoading(true)
    try {
      const prev = isFavorite
      setIsFavorite(!prev)
      const method = prev ? 'DELETE' : 'POST'
      const res = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(location)}`, { 
        method, 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const detail = errorData.detail || ''
        if ((method === 'POST' && detail.includes('already')) || 
            (method === 'DELETE' && detail.includes('not found'))) {
          return
        }
        setIsFavorite(prev)
      }
    } catch {
      // Failed to toggle favorite
    } finally {
      setFavoritesLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto px-4 py-8 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Live Air Quality
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-lg text-muted-foreground">{location}, India</span>
                {aqiData && (
                  <span className="text-sm text-muted-foreground">
                    · Updated {new Date(aqiData.time).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchAqiData()}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLocateMe}
              >
                <Navigation2 className="mr-2 h-4 w-4" />
                Locate Me
              </Button>
              {isAuthenticated && (
                <Button 
                  variant={isFavorite ? "default" : "outline"}
                  size="sm"
                  onClick={toggleFavorite}
                  disabled={favoritesLoading}
                >
                  <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Saved' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto px-4 py-6 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
        <div className="space-y-8">
          {/* Hero Section with AQI Gauge */}
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
              <HeroSection
                aqiData={aqiData}
                loading={loading}
                location={location}
                onLocationChange={setLocation}
                onSelectedStationChange={setSelectedStation}
              />
            </Card>
          </div>

          {/* Health Advisory Panel */}
          {aqiData && aqiData.aqi != null && (
            <div className="animate-fade-in-up" style={{ animationDelay: '175ms' }}>
              <HealthAdvisoryPanel aqi={selectedStation?.aqi ?? Number(aqiData.aqi)} />
            </div>
          )}

          {/* Pollutant Details Section */}
          {aqiData && (
            <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              {/* Section Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Pollutant Details</h2>
                  <p className="text-sm text-muted-foreground">Current air quality components</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showPollutants}
                      onChange={(e) => setShowPollutants(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Show details</span>
                    {showPollutants ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </label>
                </div>
              </div>

              {showPollutants && (
                <div className="space-y-6">
                  {/* WAQI Pollutant Values */}
                  <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <Radio className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Station Measurements</h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">WAQI</span>
                      </div>
                      <PollutantCards components={(selectedStation?.components) || (aqiData?.components) || {}} />
                    </CardContent>
                  </Card>

                  {/* Satellite Data Section */}
                  {showSatellite && satellite && (
                    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-2">
                          <Satellite className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">Satellite Model Data</h3>
                          <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs text-secondary">Open-Meteo</span>
                        </div>
                        <PollutantCards components={{
                          ...(satellite.pm2_5 !== undefined && { pm2_5: satellite.pm2_5 }),
                          ...(satellite.pm10 !== undefined && { pm10: satellite.pm10 }),
                          ...(satellite.nitrogen_dioxide !== undefined && { no2: satellite.nitrogen_dioxide }),
                          ...(satellite.ozone !== undefined && { o3: satellite.ozone }),
                          ...(satellite.sulphur_dioxide !== undefined && { so2: satellite.sulphur_dioxide }),
                          ...(satellite.carbon_monoxide !== undefined && { co: satellite.carbon_monoxide }),
                        }} />
                      </CardContent>
                    </Card>
                  )}

                  {/* Satellite Weather & Info Cards */}
                  {showSatellite && satellite && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Satellite AQI Card */}
                      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Satellite className="h-5 w-5 text-primary" />
                              <h3 className="font-medium">Satellite AQI</h3>
                            </div>
                            <span className="text-xs text-muted-foreground">Latest</span>
                          </div>
                          {satellite.us_aqi === null && satellite.pm2_5 === null && satellite.pm10 === null ? (
                            <div className="mt-4 text-center text-muted-foreground py-4">
                              No satellite data available
                            </div>
                          ) : (
                            <>
                              <div className="mt-4">
                                <div className="text-sm text-muted-foreground">US AQI</div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span 
                                    className="text-3xl font-bold"
                                    style={{ color: satellite.us_aqi != null ? getAQICategory(Number(satellite.us_aqi)).color : undefined }}
                                  >
                                    {satellite.us_aqi ?? 'N/A'}
                                  </span>
                                  {satellite.us_aqi != null && (
                                    <span 
                                      className="rounded-full px-2 py-0.5 text-xs text-white"
                                      style={{ backgroundColor: getAQICategory(Number(satellite.us_aqi)).color }}
                                    >
                                      {getAQICategory(Number(satellite.us_aqi)).label}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="text-muted-foreground">PM2.5</div>
                                  <div className="font-medium">{satellite.pm2_5 ?? 'N/A'} µg/m³</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">PM10</div>
                                  <div className="font-medium">{satellite.pm10 ?? 'N/A'} µg/m³</div>
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      {/* Weather Card */}
                      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Thermometer className="h-5 w-5 text-orange-500" />
                              <h3 className="font-medium">Weather</h3>
                            </div>
                            <span className="text-xs text-muted-foreground">Current</span>
                          </div>
                          <div className="mt-4 space-y-3">
                            <div>
                              <div className="text-sm text-muted-foreground">Temperature</div>
                              <div className="text-2xl font-bold">{satellite.temperature ?? 'N/A'}°C</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Wind className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {satellite.wind_speed ? `${satellite.wind_speed} m/s` : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Location Card */}
                      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-primary" />
                              <h3 className="font-medium">Coordinates</h3>
                            </div>
                            <span className="text-xs text-muted-foreground">Location</span>
                          </div>
                          <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Latitude</span>
                              <span className="font-medium">{satellite.lat ?? 'N/A'}°</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Longitude</span>
                              <span className="font-medium">{satellite.lng ?? 'N/A'}°</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stations Section */}
          {aqiData && (
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Monitoring Stations</h2>
                  <p className="text-sm text-muted-foreground">Air quality stations in {location}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={showStations ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowStations(s => !s)}
                  >
                    <Radio className="mr-2 h-4 w-4" />
                    {showStations ? 'Hide Stations' : 'Show Stations'}
                  </Button>
                  <Button
                    variant={showSatellite ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleSatellite}
                  >
                    <Satellite className="mr-2 h-4 w-4" />
                    {showSatellite ? 'Hide Satellite' : 'Show Satellite'}
                  </Button>
                </div>
              </div>

              {showStations && (
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <StationsList city={location} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}