"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Info, Medal, TrendingUp, TrendingDown, Filter, ArrowUpDown, Award, Crown, Star } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface CityRankData {
  name: string
  aqi: number | null
  lat: number | null
  lng: number | null
  maxAqi?: number | null
  station?: string
  stationAqi?: number | null
  rank?: number
}

interface RawCityData {
  name?: string
  aqi?: number | string
  lat?: number | string
  lng?: number | string
}

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "rgb(var(--aqi-good))" }
  if (aqi <= 100) return { label: "Moderate", color: "rgb(var(--aqi-moderate))" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "rgb(var(--aqi-unhealthy-sensitive))" }
  if (aqi <= 200) return { label: "Unhealthy", color: "rgb(var(--aqi-unhealthy))" }
  if (aqi <= 300) return { label: "Very Unhealthy", color: "rgb(var(--aqi-very-unhealthy))" }
  return { label: "Hazardous", color: "rgb(var(--aqi-hazardous))" }
}

function getRankIcon(index: number) {
  if (index === 0) return <Crown className="h-4 w-4 text-yellow-500" />
  if (index === 1) return <Medal className="h-4 w-4 text-gray-400" />
  if (index === 2) return <Award className="h-4 w-4 text-amber-600" />
  return null
}


export default function RankingPage() {
  const [showInfo, setShowInfo] = useState(false)
    const [sortBy, setSortBy] = useState<"rank" | "high" | "low">("rank")
  const [filter, setFilter] = useState<"all" | "good" | "moderate" | "unhealthy">("all")
  const [citiesData, setCitiesData] = useState<CityRankData[]>([])

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cities/available`)
        if (!res.ok) return
        const data = await res.json()
        // data.cities is array of {name, lat, lng, aqi}
        const base: CityRankData[] = (data.cities || []).map((c: RawCityData) => {
          const aqi = Number.isFinite(Number(c.aqi)) ? Number(c.aqi) : null
          const lat = Number.isFinite(Number(c.lat)) ? Number(c.lat) : null
          const lng = Number.isFinite(Number(c.lng)) ? Number(c.lng) : null
          return { name: c.name || '', aqi, lat, lng }
        })

        // For each city, fetch its stations and determine the station with highest AQI
        const controller = new AbortController()
        try {
          const promises = base.map(async (city: CityRankData) => {
            try {
              const url = `${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(city.name)}`
              const res2 = await fetch(url, { signal: controller.signal })
              if (!res2.ok) return { ...city, maxAqi: city.aqi, station: undefined }
              const d = await res2.json()
              const stations = d.stations || d || []
              let max: number | null = null
              let stationName: string | undefined = undefined
              for (const s of stations) {
                const a = Number.isFinite(Number(s.aqi)) ? Number(s.aqi) : (s.aqi && typeof s.aqi === 'object' && 'v' in s.aqi ? Number(s.aqi.v) : null)
                if (typeof a === 'number' && (max === null || a > max)) {
                  max = a
                  // backend returns station_name; fall back to other fields if absent
                  stationName = s.station_name || s.station || s.name || s.location || s.uid || undefined
                }
              }
              return { ...city, maxAqi: max ?? city.aqi, station: stationName, stationAqi: max ?? null }
            } catch {
              return { ...city, maxAqi: city.aqi, station: undefined }
            }
          })

          const results = await Promise.all(promises)
          // sort by descending maxAqi (nulls last)
          results.sort((a: CityRankData, b: CityRankData) => {
            const aa = (typeof a.maxAqi === 'number') ? a.maxAqi : -Infinity
            const bb = (typeof b.maxAqi === 'number') ? b.maxAqi : -Infinity
            return bb - aa
          })
          const withRank = results.map((c: CityRankData, idx: number) => ({ ...c, rank: idx + 1 }))
          setCitiesData(withRank)
        } finally {
          controller.abort()
        }
      } catch (err) {
        console.error('Failed to fetch ranking data', err)
      }
    }
    fetchCities()
  }, [])

  // Exclude cities with missing AQI (using station maxAqi if available) from the ranking list
  const filteredCities = citiesData.filter(city => {
    const effective = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi
    if (effective === null || effective === undefined || effective <= 0) return false
    if (filter === "all") return true
    const category = getAQICategory(effective).label.toLowerCase()
    return category.includes(filter)
  })

  const sortedCities = [...filteredCities].sort((a, b) => {
    if (sortBy === 'rank') return (a.rank ?? 0) - (b.rank ?? 0)
    const aVal = (typeof a.maxAqi === 'number') ? a.maxAqi : a.aqi ?? -Infinity
    const bVal = (typeof b.maxAqi === 'number') ? b.maxAqi : b.aqi ?? -Infinity
    if (sortBy === 'high') return bVal - aVal
    if (sortBy === 'low') return aVal - bVal
    return (a.rank ?? 0) - (b.rank ?? 0)
  })

  const isLoading = citiesData.length === 0

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
        
        <div className="relative mx-auto px-4 py-12 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 lg:py-16">
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">Real-time City Rankings</span>
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                City AQI Rankings
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Real-time ranking of Indian cities by air quality index. 
              Higher AQI means worse air quality.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto px-4 py-6 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 lg:py-8">
        <div className="space-y-6 lg:space-y-8">
          {/* Filter Controls */}
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 lg:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters</span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                    {/* Sort Options */}
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1">
                      <span className="text-xs text-muted-foreground px-1.5 sm:hidden">Sort:</span>
                      <Button
                        variant={sortBy === 'rank' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSortBy('rank')}
                        className="h-7 sm:h-8 text-xs lg:text-sm px-2 sm:px-3"
                      >
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        Rank
                      </Button>
                      <Button
                        variant={sortBy === 'high' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSortBy('high')}
                        className="h-7 sm:h-8 text-xs lg:text-sm px-2 sm:px-3"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        High→Low
                      </Button>
                      <Button
                        variant={sortBy === 'low' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setSortBy('low')}
                        className="h-7 sm:h-8 text-xs lg:text-sm px-2 sm:px-3"
                      >
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Low→High
                      </Button>
                    </div>

                    {/* Filter Options */}
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1">
                      <span className="text-xs text-muted-foreground px-1.5 sm:hidden">Filter:</span>
                      <Button
                        variant={filter === "all" ? "default" : "ghost"}
                        onClick={() => setFilter("all")}
                        size="sm"
                        className="h-7 sm:h-8 text-xs lg:text-sm px-2 sm:px-3"
                      >
                        All
                      </Button>
                      <Button
                        variant={filter === "good" ? "default" : "ghost"}
                        onClick={() => setFilter("good")}
                        size="sm"
                        className="h-7 sm:h-8 text-xs lg:text-sm px-2 sm:px-3"
                      >
                        <span className="h-2 w-2 rounded-full bg-aqi-good mr-1" />
                        Good
                      </Button>
                      <Button
                        variant={filter === "moderate" ? "default" : "ghost"}
                        onClick={() => setFilter("moderate")}
                        size="sm"
                        className="h-7 sm:h-8 text-xs lg:text-sm px-2 sm:px-3"
                      >
                        <span className="h-2 w-2 rounded-full bg-aqi-moderate mr-1" />
                        Moderate
                      </Button>
                      <Button
                        variant={filter === "unhealthy" ? "default" : "ghost"}
                        onClick={() => setFilter("unhealthy")}
                        size="sm"
                        className="h-7 sm:h-8 text-xs lg:text-sm px-2 sm:px-3"
                      >
                        <span className="h-2 w-2 rounded-full bg-aqi-unhealthy mr-1" />
                        Unhealthy
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
              <CardContent className="p-4 lg:p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgb(var(--aqi-good) / 0.1)' }}>
                    <Star className="h-5 w-5" style={{ color: 'rgb(var(--aqi-good))' }} />
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'rgb(var(--aqi-good))' }}>
                  {citiesData.filter(city => { const e = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi; return typeof e === 'number' && e <= 50 }).length}
                </div>
                <p className="text-xs lg:text-sm text-muted-foreground">Cities with Good AQI</p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
              <CardContent className="p-4 lg:p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgb(var(--aqi-moderate) / 0.1)' }}>
                    <TrendingUp className="h-5 w-5" style={{ color: 'rgb(var(--aqi-moderate))' }} />
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'rgb(var(--aqi-moderate))' }}>
                  {citiesData.filter(city => { const e = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi; return typeof e === 'number' && e > 50 && e <= 100 }).length}
                </div>
                <p className="text-xs lg:text-sm text-muted-foreground">Cities with Moderate AQI</p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
              <CardContent className="p-4 lg:p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgb(var(--aqi-unhealthy) / 0.1)' }}>
                    <TrendingDown className="h-5 w-5" style={{ color: 'rgb(var(--aqi-unhealthy))' }} />
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'rgb(var(--aqi-unhealthy))' }}>
                  {citiesData.filter(city => { const e = (typeof city.maxAqi === 'number') ? city.maxAqi : city.aqi; return typeof e === 'number' && e > 100 }).length}
                </div>
                <p className="text-xs lg:text-sm text-muted-foreground">Cities with Poor AQI</p>
              </CardContent>
            </Card>
          </div>

          {/* Rankings List */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <CardHeader className="px-4 lg:px-6">
              <CardTitle className="relative flex items-center gap-2 text-base lg:text-lg">
                <Trophy className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-500" />
                <span>City Rankings</span>
                <button
                  aria-label="Ranking info"
                  onClick={() => setShowInfo(s => !s)}
                  className="ml-2 p-1 rounded-lg hover:bg-muted transition-colors"
                >
                  <Info className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
                </button>
                {showInfo && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <div className="absolute -top-2 left-4 w-3 h-3 rotate-45 bg-popover border-l border-t border-border" />
                    <div
                      role="dialog"
                      aria-label="Ranking info"
                      className="w-64 lg:w-72 p-3 rounded-xl shadow-xl bg-popover text-popover-foreground border border-border text-xs lg:text-sm"
                    >
                      <p>Rankings are based on the highest AQI reading from any monitoring station in each city. Higher rank = worse air quality.</p>
                    </div>
                  </div>
                )}
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {sortedCities.length} cities
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 lg:space-y-3">
                  {sortedCities.map((city, index) => {
                    const effective = (typeof city.maxAqi === 'number') ? city.maxAqi : (city.aqi ?? 0)
                    const category = getAQICategory(effective)
                    const isTopThree = index < 3

                    return (
                      <div
                        key={city.name}
                        className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 lg:p-4 rounded-xl border transition-all duration-300 gap-3 ${
                          isTopThree 
                            ? "bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border-yellow-500/20 hover:border-yellow-500/40 ring-2" 
                            : "border-border/40 hover:bg-muted/50 hover:border-border"
                        }`}
                        style={isTopThree ? { '--tw-ring-color': `${category.color}33` } as React.CSSProperties : undefined}
                      >
                        <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                          <div className={`flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-full shrink-0 text-sm lg:text-base font-semibold ${
                            isTopThree
                              ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {getRankIcon(index) || (index + 1)}
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm lg:text-base font-semibold truncate">{city.name}</h3>
                              {isTopThree && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
                            </div>
                            {city.station && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {city.station}{city.stationAqi ? ` • AQI ${city.stationAqi}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Badge 
                            className="text-white text-xs px-2 lg:px-3 py-0.5"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.label}
                          </Badge>
                          <span 
                            className="text-lg lg:text-xl font-bold"
                            style={{ color: category.color }}
                          >
                            {effective ?? 'N/A'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}