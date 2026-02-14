"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
const api = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path)

interface CityLiveData {
  aqi?: number
  city?: string
  time?: string
  station?: string
  uid?: number | string
  coordinates?: { lat?: number; lon?: number } | number[]
  components?: Record<string, number | { v?: number }>
  iaqi?: Record<string, number | { v?: number }>
  current?: { pm25?: number; pm10?: number; no2?: number }
  rawStation?: Record<string, unknown>
}

interface TrendItem {
  date: string
  aqi: number
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts"
import { Scale, TrendingUp, TrendingDown, Minus, Sparkles, ArrowRight, BarChart3, Activity, MapPin, Clock, RefreshCw, Zap, Wind } from "lucide-react"

// Custom tooltip type
interface CustomTooltipPayload {
  value?: number
  name?: string
  color?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: CustomTooltipPayload[]
  label?: string
}

const CITY_DATA = {
  Delhi: {
    current: { aqi: 185, pm25: 125, pm10: 180, no2: 45 },
    trend: [
      { month: "Jan", aqi: 185 },
      { month: "Feb", aqi: 192 },
      { month: "Mar", aqi: 178 },
      { month: "Apr", aqi: 165 },
      { month: "May", aqi: 198 },
      { month: "Jun", aqi: 175 },
    ]
  },
  Mumbai: {
    current: { aqi: 95, pm25: 65, pm10: 95, no2: 25 },
    trend: [
      { month: "Jan", aqi: 95 },
      { month: "Feb", aqi: 88 },
      { month: "Mar", aqi: 102 },
      { month: "Apr", aqi: 85 },
      { month: "May", aqi: 115 },
      { month: "Jun", aqi: 92 },
    ]
  },
  Bangalore: {
    current: { aqi: 65, pm25: 45, pm10: 75, no2: 15 },
    trend: [
      { month: "Jan", aqi: 65 },
      { month: "Feb", aqi: 72 },
      { month: "Mar", aqi: 68 },
      { month: "Apr", aqi: 62 },
      { month: "May", aqi: 78 },
      { month: "Jun", aqi: 65 },
    ]
  },
  Chennai: {
    current: { aqi: 78, pm25: 55, pm10: 85, no2: 20 },
    trend: [
      { month: "Jan", aqi: 78 },
      { month: "Feb", aqi: 82 },
      { month: "Mar", aqi: 75 },
      { month: "Apr", aqi: 72 },
      { month: "May", aqi: 85 },
      { month: "Jun", aqi: 78 },
    ]
  },
  Kolkata: {
    current: { aqi: 142, pm25: 95, pm10: 135, no2: 35 },
    trend: [
      { month: "Jan", aqi: 142 },
      { month: "Feb", aqi: 148 },
      { month: "Mar", aqi: 135 },
      { month: "Apr", aqi: 128 },
      { month: "May", aqi: 155 },
      { month: "Jun", aqi: 142 },
    ]
  }
}

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", cssVar: "--aqi-good" }
  if (aqi <= 100) return { label: "Moderate", cssVar: "--aqi-moderate" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", cssVar: "--aqi-unhealthy-sensitive" }
  if (aqi <= 200) return { label: "Unhealthy", cssVar: "--aqi-unhealthy" }
  if (aqi <= 300) return { label: "Very Unhealthy", cssVar: "--aqi-very-unhealthy" }
  return { label: "Hazardous", cssVar: "--aqi-hazardous" }
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3 min-w-[150px]">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: CustomTooltipPayload, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function ComparePage() {
  const [city1, setCity1] = useState<string>('')
  const [city2, setCity2] = useState<string>('')
  const [cities, setCities] = useState<string[]>([])
  const [data1, setData1] = useState<CityLiveData | null>(null)
  const [data2, setData2] = useState<CityLiveData | null>(null)
  const [trend1, setTrend1] = useState<TrendItem[]>([])
  const [trend2, setTrend2] = useState<TrendItem[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(api('/cities'))
        if (res.ok) {
          const data = await res.json()
          setCities(data)
          if (data.length) {
            setCity1(data[0])
            setCity2(data[1] || data[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch cities for compare', err)
      }
    }
    fetchCities()
  }, [])

  const getPm25Value = useCallback((liveData: CityLiveData | null, cityKey: string) => {
    // Try known shapes from backend WAQI/live and fall back to sample CITY_DATA
    try {
      const comps = liveData?.components || liveData?.iaqi || {}
      if (comps) {
        // WAQI often nests as { pm25: { v: 12 } }
        const pm = comps.pm25
        if (pm && typeof pm === 'object' && 'v' in pm && pm.v != null) return pm.v
        if (pm != null && typeof pm === 'number') return pm
      }
      if (liveData?.current && liveData.current.pm25 != null) return liveData.current.pm25
    } catch {
      // ignore and fallback
    }
    return CITY_DATA[cityKey as keyof typeof CITY_DATA]?.current.pm25 ?? 'N/A'
  }, [])

  const updateCompare = async () => {
    if (!(city1 && city2)) return
    setLoading(true)

    // Fetch highest-station info from WAQI for both cities (prefer stations endpoint)
    try {
      // city1 stations
      try {
        const s1 = await fetch(api(`/live/aqi/stations?city=${encodeURIComponent(city1)}`))
        if (s1.ok) {
          const js = await s1.json()
          const top = js.stations?.[0]
          if (top) {
            setData1({
              aqi: top.aqi,
              station: top.station_name,
              time: top.time,
              uid: top.uid,
              coordinates: top.coordinates,
              rawStation: top,
            })
          }
        } else {
          // fallback to city-level live
          const r = await fetch(api(`/live/aqi?city=${encodeURIComponent(city1)}`))
          if (r.ok) setData1(await r.json())
        }
      } catch {
        // city1 station fetch failed
      }

      // Also fetch city-level live for components (PM2.5 etc.) if available
      try {
        const comp = await fetch(api(`/live/aqi?city=${encodeURIComponent(city1)}`))
        if (comp.ok) {
          const cd = await comp.json()
          setData1((prev: CityLiveData | null) => ({ ...(prev || {}), components: cd.components || cd.iaqi || cd }))
        }
      } catch { /* non-fatal */ }

      // city2 stations
      try {
        const s2 = await fetch(api(`/live/aqi/stations?city=${encodeURIComponent(city2)}`))
        if (s2.ok) {
          const js2 = await s2.json()
          const top2 = js2.stations?.[0]
          if (top2) {
            setData2({
              aqi: top2.aqi,
              station: top2.station_name,
              time: top2.time,
              uid: top2.uid,
              coordinates: top2.coordinates,
              rawStation: top2,
            })
          }
        } else {
          const r2 = await fetch(api(`/live/aqi?city=${encodeURIComponent(city2)}`))
          if (r2.ok) setData2(await r2.json())
        }
      } catch {
        // city2 station fetch failed
      }

      try {
        const comp2 = await fetch(api(`/live/aqi?city=${encodeURIComponent(city2)}`))
        if (comp2.ok) {
          const cd2 = await comp2.json()
          setData2((prev: CityLiveData | null) => ({ ...(prev || {}), components: cd2.components || cd2.iaqi || cd2 }))
        }
      } catch { /* non-fatal */ }

      // Fetch last 1 year CSV-based historical series from backend compare endpoint
      try {
        const compRes = await fetch(api(`/compare?city1=${encodeURIComponent(city1)}&city2=${encodeURIComponent(city2)}`))
        if (compRes.ok) {
          const compJson = await compRes.json()
          setTrend1((compJson.city1?.dates || []).map((dt:string,i:number)=>({date:dt, aqi: compJson.city1.aqi[i]})))
          setTrend2((compJson.city2?.dates || []).map((dt:string,i:number)=>({date:dt, aqi: compJson.city2.aqi[i]})))
        } else {
          // fallback per-city analytics
          const a1 = await fetch(api(`/analytics?city=${encodeURIComponent(city1)}`))
          if (a1.ok) { const d = await a1.json(); setTrend1((d.dates || []).map((dt:string,i:number)=>({date:dt, aqi: d.aqi[i]}))) }
          const a2 = await fetch(api(`/analytics?city=${encodeURIComponent(city2)}`))
          if (a2.ok) { const d2 = await a2.json(); setTrend2((d2.dates || []).map((dt:string,i:number)=>({date:dt, aqi: d2.aqi[i]}))) }
        }
      } catch (e) { console.error('compare fetch failed', e) }

    } catch (err) {
      console.error('updateCompare failed', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-update when selected cities change
  useEffect(() => {
    if (city1 && city2) {
      updateCompare()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city1, city2])

  const comparisonData = (() => {
    const len = Math.max(trend1.length, trend2.length)
    return Array.from({length: len}).map((_, i) => ({
      date: trend1[i]?.date ?? trend2[i]?.date ?? `#${i+1}`,
      [city1 ?? 'city1']: trend1[i]?.aqi ?? null,
      [city2 ?? 'city2']: trend2[i]?.aqi ?? null
    }))
  })()

  const pollutantComparison = (() => {
    const a1 = data1 ? (data1.aqi ?? null) : (CITY_DATA[city1 as keyof typeof CITY_DATA]?.current.aqi ?? null)
    const a2 = data2 ? (data2.aqi ?? null) : (CITY_DATA[city2 as keyof typeof CITY_DATA]?.current.aqi ?? null)
    return [
      { pollutant: "AQI", [city1 ?? 'city1']: a1, [city2 ?? 'city2']: a2 },
    ]
  })()

  const getDifference = (val1: number, val2: number) => {
    const diff = val1 - val2
    const percent = (val2 === 0 || !isFinite(val2)) ? 0 : Math.abs((diff / val2) * 100)
    return { diff, percent, isHigher: diff > 0 }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        
        <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-16 relative z-10">
          <div className="text-center space-y-6 max-w-3xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Scale className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Side-by-Side Analysis</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              City Comparison
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare air quality metrics between different Indian cities in real-time
            </p>
          </div>

          {/* City Selector */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-500">City 1</span>
              </div>
              <Select value={city1} onValueChange={setCity1}>
                <SelectTrigger className="w-44 border-0 bg-transparent focus:ring-0">
                  <SelectValue placeholder="Select first city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center p-3 rounded-full bg-muted/50 border border-border/50">
              <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 sm:rotate-0" />
            </div>

            <div className="flex items-center gap-3 p-2 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-500/10">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">City 2</span>
              </div>
              <Select value={city2} onValueChange={setCity2}>
                <SelectTrigger className="w-44 border-0 bg-transparent focus:ring-0">
                  <SelectValue placeholder="Select second city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={updateCompare} 
              disabled={!(city1 && city2) || loading}
              className={cn(
                "px-5 py-2.5 rounded-xl font-medium transition-all duration-200",
                "bg-primary text-white hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              {loading ? 'Comparing...' : 'Compare'}
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8">
        <div className="space-y-8">
          {/* AQI Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            {/* City 1 Card */}
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-lg">{city1 || 'Select City'}</span>
                    {data1?.station && (
                      <p className="text-xs font-normal text-muted-foreground mt-0.5">{data1.station}</p>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  (() => {
                    const aqi1 = data1?.aqi ?? CITY_DATA[city1 as keyof typeof CITY_DATA]?.current.aqi ?? null
                    const category = aqi1 ? getAQICategory(aqi1) : null
                    return (
                      <div className="space-y-4">
                        <div className="flex items-end gap-3">
                          <span 
                            className="text-5xl font-bold"
                            style={{ color: category ? `rgb(var(${category.cssVar}))` : undefined }}
                          >
                            {aqi1 ?? 'N/A'}
                          </span>
                          <span className="text-lg text-muted-foreground mb-1">AQI</span>
                        </div>
                        {category && (
                          <Badge 
                            className="text-white text-sm px-3 py-1"
                            style={{ backgroundColor: `rgb(var(${category.cssVar}))` }}
                          >
                            {category.label}
                          </Badge>
                        )}
                        {data1?.time && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Updated: {new Date(data1.time).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()
                )}
              </CardContent>
            </Card>

            {/* City 2 Card */}
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-400" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MapPin className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <span className="text-lg">{city2 || 'Select City'}</span>
                    {data2?.station && (
                      <p className="text-xs font-normal text-muted-foreground mt-0.5">{data2.station}</p>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  (() => {
                    const aqi2 = data2?.aqi ?? CITY_DATA[city2 as keyof typeof CITY_DATA]?.current.aqi ?? null
                    const category = aqi2 ? getAQICategory(aqi2) : null
                    return (
                      <div className="space-y-4">
                        <div className="flex items-end gap-3">
                          <span 
                            className="text-5xl font-bold"
                            style={{ color: category ? `rgb(var(${category.cssVar}))` : undefined }}
                          >
                            {aqi2 ?? 'N/A'}
                          </span>
                          <span className="text-lg text-muted-foreground mb-1">AQI</span>
                        </div>
                        {category && (
                          <Badge 
                            className="text-white text-sm px-3 py-1"
                            style={{ backgroundColor: `rgb(var(${category.cssVar}))` }}
                          >
                            {category.label}
                          </Badge>
                        )}
                        {data2?.time && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Updated: {new Date(data2.time).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comparison Summary */}
          <Card className="overflow-hidden border-border/40 bg-gradient-to-r from-card/80 to-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4">
                {(() => {
                  const a1 = data1?.aqi ?? CITY_DATA[city1 as keyof typeof CITY_DATA]?.current.aqi ?? null
                  const a2 = data2?.aqi ?? CITY_DATA[city2 as keyof typeof CITY_DATA]?.current.aqi ?? null
                  if (a1 !== null && a2 !== null) {
                    const diff = getDifference(a1, a2)
                    if (a1 > a2) {
                      return (
                        <div className="flex items-center gap-4 text-center">
                          <div className="p-3 rounded-xl bg-red-500/10">
                            <TrendingUp className="h-6 w-6 text-red-500" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              <span className="text-blue-500">{city1}</span> has{' '}
                              <span className="text-red-500">{diff.percent.toFixed(1)}% higher</span> AQI than{' '}
                              <span className="text-green-500">{city2}</span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Difference of {Math.abs(diff.diff)} AQI points
                            </p>
                          </div>
                        </div>
                      )
                    }
                    if (a2 > a1) {
                      return (
                        <div className="flex items-center gap-4 text-center">
                          <div className="p-3 rounded-xl bg-green-500/10">
                            <TrendingDown className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">
                              <span className="text-blue-500">{city1}</span> has{' '}
                              <span className="text-green-500">{getDifference(a2, a1).percent.toFixed(1)}% lower</span> AQI than{' '}
                              <span className="text-green-500">{city2}</span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Difference of {Math.abs(diff.diff)} AQI points
                            </p>
                          </div>
                        </div>
                      )
                    }
                  }
                  return (
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-muted">
                        <Minus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">
                        Both cities have similar AQI levels
                      </p>
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pollutant Comparison */}
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <BarChart3 className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-lg">AQI Comparison</span>
                    <p className="text-sm font-normal text-muted-foreground mt-0.5">Current levels side by side</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={pollutantComparison} barGap={8}>
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4DB748" stopOpacity={1} />
                          <stop offset="100%" stopColor="#4DB748" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="pollutant" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey={city1} fill="url(#blueGradient)" name={city1} radius={[6, 6, 0, 0]} />
                      <Bar dataKey={city2} fill="url(#greenGradient)" name={city2} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* PM2.5 & Stats */}
            <div className="space-y-6">
              <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Wind className="h-5 w-5 text-purple-500" />
                    </div>
                    <span className="text-lg">PM2.5 Levels</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <p className="text-sm text-muted-foreground mb-1">{city1}</p>
                      {loading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-2xl font-bold text-blue-500">
                          {getPm25Value(data1, city1)} <span className="text-sm font-normal">μg/m³</span>
                        </p>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                      <p className="text-sm text-muted-foreground mb-1">{city2}</p>
                      {loading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-2xl font-bold text-green-500">
                          {getPm25Value(data2, city2)} <span className="text-sm font-normal">μg/m³</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-lg">Quick Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg AQI ({city1})</p>
                      <p className="text-xl font-bold text-blue-500">
                        {trend1.length ? (trend1.reduce((s, i) => s + (i.aqi || 0), 0) / trend1.length).toFixed(0) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg AQI ({city2})</p>
                      <p className="text-xl font-bold text-green-500">
                        {trend2.length ? (trend2.reduce((s, i) => s + (i.aqi || 0), 0) / trend2.length).toFixed(0) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Trend Comparison Chart - Full Width */}
          <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-green-500/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-lg">Trend Comparison</span>
                  <p className="text-sm font-normal text-muted-foreground mt-0.5">Historical AQI data over the last year</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-80 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={comparisonData}>
                    <defs>
                      <linearGradient id="lineBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="lineGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4DB748" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4DB748" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return isNaN(+date) ? value : date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                      }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={city1}
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name={city1}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey={city2}
                      stroke="#4DB748"
                      strokeWidth={3}
                      name={city2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '450ms' }}>
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Zap className="h-5 w-5 text-blue-500" />
                  </div>
                  <span>{city1} Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Average AQI</span>
                      <span className="font-semibold text-blue-500">
                        {trend1.length ? (trend1.reduce((sum, item) => sum + (item.aqi || 0), 0) / trend1.length).toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Peak AQI</span>
                      <span className="font-semibold text-red-500">
                        {trend1.length ? Math.max(...trend1.map(item => item.aqi || 0)) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Lowest AQI</span>
                      <span className="font-semibold text-green-500">
                        {trend1.length ? Math.min(...trend1.map(item => item.aqi || 0)) : 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-400" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Zap className="h-5 w-5 text-green-500" />
                  </div>
                  <span>{city2} Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Average AQI</span>
                      <span className="font-semibold text-green-500">
                        {trend2.length ? (trend2.reduce((sum, item) => sum + (item.aqi || 0), 0) / trend2.length).toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Peak AQI</span>
                      <span className="font-semibold text-red-500">
                        {trend2.length ? Math.max(...trend2.map(item => item.aqi || 0)) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Lowest AQI</span>
                      <span className="font-semibold text-green-500">
                        {trend2.length ? Math.min(...trend2.map(item => item.aqi || 0)) : 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}