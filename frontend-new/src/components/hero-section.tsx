"use client"

import { useState, useEffect } from "react"
import { AQIData } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, AQIBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Clock, Wind, Thermometer, Droplets, Navigation2, Search } from "lucide-react"
import { AnimatedNumber } from "@/components/animated-number"
import { cn } from "@/lib/utils"

interface HeroSectionProps {
  aqiData: AQIData | null
  loading: boolean
  location: string
  onLocationChange: (location: string) => void
  onSelectedStationChange?: (station: StationData | null) => void
}

interface StationData {
  station_name?: string
  name?: string
  aqi?: number
  time?: string
  components?: Record<string, number | undefined>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
const api = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path)

// Enhanced AQI category with more styling info
function getAQICategory(aqi: number) {
  if (aqi <= 50) return { 
    label: "Good", 
    cssVar: "--aqi-good",
    gradient: "from-[rgb(var(--aqi-good)/0.2)] to-[rgb(var(--aqi-good)/0.05)]",
    ring: "ring-[rgb(var(--aqi-good)/0.3)]"
  }
  if (aqi <= 100) return { 
    label: "Moderate", 
    cssVar: "--aqi-moderate",
    gradient: "from-[rgb(var(--aqi-moderate)/0.2)] to-[rgb(var(--aqi-moderate)/0.05)]",
    ring: "ring-[rgb(var(--aqi-moderate)/0.3)]"
  }
  if (aqi <= 150) return { 
    label: "Unhealthy for Sensitive Groups", 
    cssVar: "--aqi-unhealthy-sensitive",
    gradient: "from-[rgb(var(--aqi-unhealthy-sensitive)/0.2)] to-[rgb(var(--aqi-unhealthy-sensitive)/0.05)]",
    ring: "ring-[rgb(var(--aqi-unhealthy-sensitive)/0.3)]"
  }
  if (aqi <= 200) return { 
    label: "Unhealthy", 
    cssVar: "--aqi-unhealthy",
    gradient: "from-[rgb(var(--aqi-unhealthy)/0.2)] to-[rgb(var(--aqi-unhealthy)/0.05)]",
    ring: "ring-[rgb(var(--aqi-unhealthy)/0.3)]"
  }
  if (aqi <= 300) return { 
    label: "Very Unhealthy", 
    cssVar: "--aqi-very-unhealthy",
    gradient: "from-[rgb(var(--aqi-very-unhealthy)/0.2)] to-[rgb(var(--aqi-very-unhealthy)/0.05)]",
    ring: "ring-[rgb(var(--aqi-very-unhealthy)/0.3)]"
  }
  return { 
    label: "Hazardous", 
    cssVar: "--aqi-hazardous",
    gradient: "from-[rgb(var(--aqi-hazardous)/0.2)] to-[rgb(var(--aqi-hazardous)/0.05)]",
    ring: "ring-[rgb(var(--aqi-hazardous)/0.3)]"
  }
}

export function HeroSection({
  aqiData,
  loading,
  location,
  onLocationChange,
  onSelectedStationChange,
}: HeroSectionProps) {
  const [typedCity, setTypedCity] = useState("")
  const [satellite, setSatellite] = useState<{
    temperature?: number
    wind_speed?: number
    wind_dir?: number | string
    humidity?: number
  } | null>(null)
  const [satLoading, setSatLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_stationsLoading, setStationsLoading] = useState(false)

  const extractVal = (v: unknown): number | string | undefined => {
    if (typeof v === 'object' && v !== null && 'v' in v) return (v as { v: number | string }).v
    return v as number | string | undefined
  }
  const aqiValNumber = aqiData ? Number(extractVal(aqiData.aqi) ?? 0) : 0
  const displayedAqi = selectedStation?.aqi ?? aqiValNumber
  const category = getAQICategory(Number(displayedAqi ?? 0))
  const lastUpdated = selectedStation?.time ?? aqiData?.time

  // Fetch satellite/weather data
  useEffect(() => {
    const fetchSatellite = async () => {
      if (!location) return
      setSatLoading(true)
      try {
        const res = await fetch(api(`/satellite/live?city=${encodeURIComponent(location)}`))
        if (res.ok) {
          const data = await res.json()
          setSatellite(data)
        } else {
          setSatellite(null)
        }
      } catch {
        setSatellite(null)
      } finally {
        setSatLoading(false)
      }
    }
    fetchSatellite()
  }, [location])

  // Fetch stations and select highest AQI
  useEffect(() => {
    const fetchStations = async () => {
      if (!location) {
        setSelectedStation(null)
        onSelectedStationChange?.(null)
        return
      }
      setStationsLoading(true)
      try {
        const res = await fetch(api(`/live/aqi/stations?city=${encodeURIComponent(location)}`))
        if (res.ok) {
          const data = await res.json()
          const stations: StationData[] = data.stations || []
          let maxStation: StationData | null = null
          for (const s of stations) {
            if (!s || typeof s.aqi !== 'number') continue
            if (!maxStation || (s.aqi > (maxStation.aqi ?? 0))) maxStation = s
          }
          setSelectedStation(maxStation)
          onSelectedStationChange?.(maxStation)
        } else {
          setSelectedStation(null)
        }
      } catch {
        setSelectedStation(null)
      } finally {
        setStationsLoading(false)
      }
    }
    fetchStations()
  }, [location, onSelectedStationChange])

  const handleSearch = () => {
    if (typedCity.trim()) {
      onLocationChange(typedCity.trim())
      setTypedCity("")
    }
  }

  // Format time for display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'N/A'
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'N/A'
    }
  }

  return (
    <section className="relative">
      {/* Loading State */}
      {loading ? (
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left: AQI Display skeleton */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start gap-4">
                <Skeleton variant="circular" className="w-40 h-40" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              {/* Right: Details skeleton */}
              <div className="lg:col-span-7 space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : aqiData ? (
        <Card 
          className={cn(
            "overflow-hidden relative",
            "ring-2",
            category.ring
          )}
        >
          {/* Gradient background based on AQI */}
          <div className={cn(
            "absolute inset-0 bg-linear-to-br opacity-50",
            category.gradient
          )} />
          
          <CardContent className="relative p-4 sm:p-6 lg:p-8">
            {/* Search Bar - Inline row */}
            <div className="flex items-center gap-2 mb-5 max-w-md">
              <SearchInput
                placeholder="Search city..."
                value={typedCity}
                onChange={(e) => setTypedCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onClear={() => setTypedCity("")}
                className="flex-1"
                inputSize="sm"
              />
              <Button 
                size="sm" 
                onClick={handleSearch}
                disabled={!typedCity.trim()}
                className="flex-shrink-0"
              >
                <Search className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Go</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left Column: AQI Display */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-start">
                {/* Circular AQI Gauge */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 lg:w-52 lg:h-52">
                  {/* Background circle */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      className="stroke-muted"
                      strokeWidth="8"
                    />
                    {/* Progress arc */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={`rgb(var(${category.cssVar}))`}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.min((displayedAqi / 800) ** 0.85, 1) * 264} 264`}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  
                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span 
                      className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight tabular-nums animate-count-up"
                      style={{ color: `rgb(var(${category.cssVar}))` }}
                    >
                      <AnimatedNumber value={Number(displayedAqi ?? 0)} />
                    </span>
                    <span className="text-sm text-muted-foreground mt-1">AQI</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4 text-center lg:text-left">
                  <AQIBadge aqi={displayedAqi} size="lg" />
                  
                  {/* Location & Time */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-center lg:justify-start gap-2 text-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">{location}, India</span>
                    </div>
                    {selectedStation?.station_name && (
                      <p className="text-xs text-muted-foreground pl-6">
                        Station: {selectedStation.station_name}
                      </p>
                    )}
                    <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated {formatTime(lastUpdated)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
                {/* PM Values Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Card variant="glass" className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">PM2.5</p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums">
                          {selectedStation?.components?.pm25 ?? extractVal(aqiData.components?.pm25) ?? '—'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">µg/m³</p>
                      </div>
                      <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-primary/10">
                        <Droplets className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                    </div>
                  </Card>

                  <Card variant="glass" className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">PM10</p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums">
                          {selectedStation?.components?.pm10 ?? extractVal(aqiData.components?.pm10) ?? '—'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">µg/m³</p>
                      </div>
                      <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-aqi-moderate/10">
                        <Wind className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-aqi-moderate" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Weather Card */}
                <Card variant="glass" className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">Current Weather</h3>
                    <Badge variant="outline" className="text-xs">
                      Open-Meteo
                    </Badge>
                  </div>
                  
                  {satLoading ? (
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Thermometer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="text-[10px] sm:text-xs">Temp</span>
                        </div>
                        <p className="text-base sm:text-lg lg:text-xl font-semibold tabular-nums">
                          {satellite?.temperature ?? '—'}°C
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Wind className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="text-[10px] sm:text-xs">Wind</span>
                        </div>
                        <p className="text-base sm:text-lg lg:text-xl font-semibold tabular-nums">
                          {satellite?.wind_speed ?? '—'} m/s
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Navigation2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="text-[10px] sm:text-xs">Dir</span>
                        </div>
                        <p className="text-base sm:text-lg lg:text-xl font-semibold tabular-nums">
                          {satellite?.wind_dir ?? '—'}°
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Error/No Data State */
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-muted inline-block">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                Unable to load AQI data
              </h3>
              <p className="text-muted-foreground">
                We couldn&apos;t find data for &quot;{location}&quot;. Try searching for another city.
              </p>
              <div className="flex items-center gap-2 justify-center max-w-xs mx-auto">
                <SearchInput
                  placeholder="Try another city..."
                  value={typedCity}
                  onChange={(e) => setTypedCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  onClear={() => setTypedCity("")}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!typedCity.trim()}>
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}