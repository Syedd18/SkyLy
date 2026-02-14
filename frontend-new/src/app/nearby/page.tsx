"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Navigation as NavigationIcon, RefreshCw, AlertCircle, Radar, Settings, ExternalLink, Compass, Radio, Locate } from "lucide-react"
import getSupabaseClient from "@/lib/supabaseClient"

interface CityData {
  city: string
  lat: number | null
  lng: number | null
  name?: string
}

interface StationData {
  uid?: string
  station_name?: string
  name?: string
  city?: string
  location?: string
  aqi?: number
  aqi_value?: number
  coordinates?: { lat: number; lng: number }
  distance?: number
}

interface RawCityData {
  name?: string
  city?: string
  lat?: number
  lng?: number
}

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "bg-aqi-good", text: "text-aqi-good", ring: "ring-aqi-good/20" }
  if (aqi <= 100) return { label: "Moderate", color: "bg-aqi-moderate", text: "text-aqi-moderate", ring: "ring-aqi-moderate/20" }
  if (aqi <= 150) return { label: "Sensitive", color: "bg-aqi-sensitive", text: "text-aqi-sensitive", ring: "ring-aqi-sensitive/20" }
  if (aqi <= 200) return { label: "Unhealthy", color: "bg-aqi-unhealthy", text: "text-aqi-unhealthy", ring: "ring-aqi-unhealthy/20" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-aqi-very-unhealthy", text: "text-aqi-very-unhealthy", ring: "ring-aqi-very-unhealthy/20" }
  return { label: "Hazardous", color: "bg-aqi-hazardous", text: "text-aqi-hazardous", ring: "ring-aqi-hazardous/20" }
}

export default function NearbyPage() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [stations, setStations] = useState<StationData[]>([])
  const [stationsError, setStationsError] = useState<string | null>(null)
  const [radiusKm, setRadiusKm] = useState(15)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

  function haversineDistance(lat1:number, lon1:number, lat2:number, lon2:number) {
    const toRad = (x:number) => (x * Math.PI) / 180
    const R = 6371 // km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const fetchNearbyStations = useCallback(async (lat:number, lng:number, rKm?: number) => {
    console.log('🔄 fetchNearbyStations CALLED with:', { lat, lng, rKm, currentRadius: radiusKm })
      try {
      setStationsError(null)
      let cities: CityData[] = []

      // Use /cities/all directly - it's much faster than /satellite/map
      try {
        console.log('🌐 Fetching cities from:', `${API_BASE_URL}/cities/all`)
        const supabase = getSupabaseClient()
        const sessionResp = supabase ? await supabase.auth.getSession() : null
        const token = sessionResp?.data?.session?.access_token
        const commonHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const allRes = await fetch(`${API_BASE_URL}/cities/all`, { headers: { 'Content-Type': 'application/json', ...commonHeaders } })
        console.log('📡 cities/all response status:', allRes.status, allRes.ok)
        if (allRes.ok) {
          const allJson = await allRes.json()
          console.log('✅ cities/all response:', allJson)
          const raw = allJson.cities || allJson
          cities = (raw || []).map((c: RawCityData) => ({ city: c.name || c.city || '', lat: c.lat ?? null, lng: c.lng ?? null })).filter((c: CityData) => c.lat != null && c.lng != null)
        }
      } catch (e) {
        console.warn('⚠️ cities/all fetch failed', e)
      }

      if (!cities || cities.length === 0) {
        setStations([])
        setStationsError('No city coordinates available from server')
        return
      }
      
      console.log('Total cities loaded:', cities.length)
      console.log('User location:', lat, lng)
      
      // cities is array with city, lat, lng
      const effectiveRadius = typeof rKm === 'number' ? rKm : radiusKm
      // Use 3x radius for city search to catch stations in cities whose center is far but have nearby stations
      const citySearchRadius = effectiveRadius * 3
      const nearbyCities = cities.filter((c: CityData) => {
        if (!c.lat || !c.lng) return false
        const d = haversineDistance(lat, lng, c.lat, c.lng)
        return d <= citySearchRadius
      })
      
      console.log('Searching cities within', citySearchRadius, 'km (3x', effectiveRadius, 'km):', nearbyCities.length, nearbyCities.map((c: CityData) => c.city))

      // Fetch stations for each nearby city
      const stationPromises = nearbyCities.map(async (c: CityData) => {
        try {
          const supabase = getSupabaseClient()
          const sessionResp = supabase ? await supabase.auth.getSession() : null
          const token = sessionResp?.data?.session?.access_token
          const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
          const r = await fetch(`${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(c.city)}`, { headers: { 'Content-Type': 'application/json', ...headers } })
          if (!r.ok) return []
          const data = await r.json()
          return (data.stations || [])
        } catch (e) {
          console.error(`failed to fetch stations for ${c.city}`, e)
          return []
        }
      })

      const results = await Promise.all(stationPromises)
      const merged = results.flat()
      console.log('Total stations fetched:', merged.length)

      // Keep only stations with valid coordinates and numeric AQI
      const validStations = merged.filter((s: StationData) => {
        const latS = s?.coordinates?.lat
        const lngS = s?.coordinates?.lng
        const aqiVal = s?.aqi ?? s?.aqi_value
        const isValid = latS != null && lngS != null && aqiVal != null && !isNaN(Number(aqiVal))
        if (!isValid && s.station_name) {
          console.log('Filtered out station:', s.station_name, { lat: latS, lng: lngS, aqi: aqiVal })
        }
        return isValid
      })
      console.log('Valid stations after filtering:', validStations.length)

      // Add distance from user, deduplicate by uid or station_name, and sort by distance
      const seen = new Set()
      const withDistance = validStations.map((s: StationData) => {
        const dist = haversineDistance(lat, lng, s.coordinates!.lat, s.coordinates!.lng)
        return { ...s, distance: Number(dist.toFixed(2)) }
      }).filter((s: StationData) => {
        const key = s.uid ?? s.station_name ?? `${s.coordinates?.lat}-${s.coordinates?.lng}`
        if (seen.has(key)) return false
        seen.add(key)
        return (s.distance ?? 0) <= effectiveRadius
      }).sort((a: StationData, b: StationData) => {
        // First sort by distance (ascending)
        const distDiff = (a.distance ?? 0) - (b.distance ?? 0)
        if (Math.abs(distDiff) > 0.5) return distDiff // If distance difference > 0.5km, sort by distance
        // For nearby stations (within 0.5km), sort by AQI (descending) to show worse air quality first
        return (b.aqi ?? b.aqi_value ?? 0) - (a.aqi ?? a.aqi_value ?? 0)
      })
      
      console.log('Final stations after dedup and distance filter:', withDistance.length)

      if (!withDistance || withDistance.length === 0) {
        setStations([])
        setStationsError('No stations found within the selected radius')
      } else {
        setStations(withDistance)
        setStationsError(null)
      }
    } catch (err) {
      console.error(err)
      setStationsError('Failed to fetch nearby stations')
    }
  }, [API_BASE_URL, radiusKm])

  const getUserLocation = useCallback(() => {
    console.log('📍 getUserLocation CALLED')
    setIsLoadingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported by browser')
      setLocationError("Geolocation is not supported by this browser")
      setIsLoadingLocation(false)
      return
    }

    console.log('🌍 Requesting geolocation permission...')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('✅ Geolocation success:', position.coords)
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // Get location name via reverse geocoding
        let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        try {
          console.log('🗺️ Reverse geocoding:', lat, lng)
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'AirPollutionApp/1.0' }
          })
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            console.log('📍 Reverse geocoding response:', geoData)
            const addr = geoData.address || {}
            
            // Prioritize smaller localities: village > town > suburb > municipality > city_district > city
            // This ensures Potheri/Guduvancheri is shown instead of Chennai
            const locality = addr.village || addr.hamlet || addr.town || addr.suburb || 
                           addr.municipality || addr.city_district || addr.neighbourhood || 
                           addr.city || addr.county
            const state = addr.state
            
            if (locality) {
              locationName = state ? `${locality}, ${state}` : locality
              console.log('✅ Location name resolved:', locationName, 'from', {
                village: addr.village,
                town: addr.town,
                suburb: addr.suburb,
                municipality: addr.municipality,
                city: addr.city
              })
            }
          }
        } catch (e) {
          console.warn('⚠️ Reverse geocoding failed:', e)
        }
        
        const coords = { lat, lng, name: locationName }
        setUserLocation(coords)
        setIsLoadingLocation(false)
        console.log('🚀 Calling fetchNearbyStations with coords:', coords)
        await fetchNearbyStations(lat, lng)
      },
      (error) => {
        console.error('❌ Geolocation error:', error)
        let errorMessage = "Unable to retrieve your location"
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user. Using Delhi as default location."
            console.log('⚠️ Permission denied, using Delhi fallback')
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Using Delhi as default location."
            console.log('⚠️ Position unavailable, using Delhi fallback')
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Using Delhi as default location."
            console.log('⚠️ Timeout, using Delhi fallback')
            break
        }
        // Fallback to Delhi coordinates
        const delhiCoords = { lat: 28.6139, lng: 77.2090, name: 'Delhi, India' }
        console.log('🏙️ Setting fallback location:', delhiCoords)
        setUserLocation(delhiCoords)
        setLocationError(errorMessage)
        setIsLoadingLocation(false)
        console.log('🚀 Calling fetchNearbyStations with Delhi coords')
        fetchNearbyStations(delhiCoords.lat, delhiCoords.lng)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [fetchNearbyStations])

  const refreshStations = () => {
    if (userLocation) {
      fetchNearbyStations(userLocation.lat, userLocation.lng)
    }
  }

  useEffect(() => {
    console.log('🎬 Component mounted, calling getUserLocation')
    getUserLocation()
  }, [getUserLocation])

  useEffect(() => {
    console.log('🔄 userLocation or radiusKm changed:', { userLocation, radiusKm })
    if (userLocation) {
      console.log('🚀 Triggering fetchNearbyStations from useEffect with radius:', radiusKm)
      fetchNearbyStations(userLocation.lat, userLocation.lng, radiusKm)
    }
  }, [userLocation, radiusKm, fetchNearbyStations])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="relative mx-auto px-4 py-12 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 lg:py-16">
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Radar className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-muted-foreground">Location-based Discovery</span>
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                Nearby Stations
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Find air quality monitoring stations near your current location. 
              Get real-time AQI data from the closest sensors.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto px-4 py-6 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 lg:py-8">
        <div className="space-y-6 lg:space-y-8">
          {/* Location Card */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Locate className="h-5 w-5 text-primary" />
                  </div>
                  <span>Your Location</span>
                </div>
                <Button
                  onClick={getUserLocation}
                  disabled={isLoadingLocation}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                  {isLoadingLocation ? 'Detecting...' : 'Refresh'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationError ? (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Location Error</p>
                    <p className="text-sm text-muted-foreground mt-1">{locationError}</p>
                  </div>
                </div>
              ) : userLocation ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg truncate">{userLocation.name || 'Current Location'}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {userLocation.lat.toFixed(4)}°N, {userLocation.lng.toFixed(4)}°E
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary" />
                      <span>{stations.length} station{stations.length !== 1 ? 's' : ''} found</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-primary" />
                      <span>Within {radiusKm}km radius</span>
                    </div>
                    {stations.length > 0 && (
                      <div className="flex items-center gap-2">
                        <NavigationIcon className="h-4 w-4 text-primary" />
                        <span>Nearest: {stations[0].distance}km away</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
                    <MapPin className="h-8 w-8 text-muted-foreground animate-pulse" />
                  </div>
                  <p className="text-muted-foreground">Detecting your location...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Station Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <div>
              <h2 className="text-xl lg:text-2xl font-semibold">Nearby Stations</h2>
              {stations.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Average AQI: <span className="font-medium">{Math.round(stations.reduce((sum, s) => sum + (s.aqi ?? s.aqi_value ?? 0), 0) / stations.length)}</span>
                </p>
              )}
            </div>
            <Button onClick={refreshStations} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* Stations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {stationsError ? (
              <div className="col-span-full">
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{stationsError}</p>
                    <Button onClick={refreshStations} variant="outline" className="mt-4">
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : stations.length === 0 && userLocation ? (
              <div className="col-span-full">
                <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Radio className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No stations found within {radiusKm}km</p>
                    <p className="text-sm text-muted-foreground mt-1">Try increasing the search radius</p>
                  </CardContent>
                </Card>
              </div>
            ) : stations.length === 0 ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="border-border/40 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : stations.map((station: StationData, idx) => {
              const aqiVal = station.aqi ?? station.aqi_value ?? 0
              const category = getAQICategory(aqiVal)
              return (
                <Card 
                  key={idx} 
                  className={`border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg ${category.ring} ring-2`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base lg:text-lg font-semibold truncate">{station.station_name || station.name}</h3>
                        <p className="text-xs lg:text-sm text-muted-foreground truncate mt-0.5">{station.city || station.location || ''}</p>
                      </div>
                      <Badge className={`${category.color} text-white shrink-0`}>
                        {category.label}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* AQI Display */}
                    <div className="flex items-center justify-center p-4 rounded-xl bg-muted/30">
                      <div className="text-center">
                        <div className={`text-4xl lg:text-5xl font-bold ${category.text}`}>
                          {aqiVal}
                        </div>
                        <p className="text-xs text-muted-foreground uppercase mt-1">Air Quality Index</p>
                      </div>
                    </div>

                    {/* Distance Info */}
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <NavigationIcon className="h-4 w-4" />
                          Distance
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.max(10, Math.min(100, (1 - (station.distance ?? 0) / radiusKm) * 100))}%` }}
                            />
                          </div>
                          <span className="font-semibold w-16 text-right">{station.distance ?? 'N/A'} km</span>
                        </div>
                      </div>
                      {station.coordinates && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Compass className="h-4 w-4" />
                            Coordinates
                          </span>
                          <span className="font-mono text-xs">
                            {station.coordinates.lat?.toFixed(4)}, {station.coordinates.lng?.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      variant="outline"
                      onClick={() => {
                        const lat = station.coordinates?.lat
                        const lng = station.coordinates?.lng
                        if (lat && lng) {
                          window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Map
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Settings Card */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <Settings className="h-5 w-5" />
                Location Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium">Search Radius</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Maximum distance for stations
                    </p>
                  </div>
                  <select 
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" 
                    value={radiusKm} 
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setRadiusKm(v)
                      if (userLocation) fetchNearbyStations(userLocation.lat, userLocation.lng, v)
                    }}
                  >
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={15}>15 km</option>
                    <option value={20}>20 km</option>
                    <option value={25}>25 km</option>
                    <option value={30}>30 km</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium">Auto-detect</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Find stations automatically
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={getUserLocation}>
                    {isLoadingLocation ? 'Detecting...' : 'Enable'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AQI change alerts
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}