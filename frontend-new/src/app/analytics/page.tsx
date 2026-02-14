"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts"
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Zap,
  RefreshCw,
  Sparkles,
  Sun,
  Cloud,
  CloudRain,
  Snowflake
} from "lucide-react"

// Pollutant distribution removed — values were static placeholders and not city-specific.

function computeSeasonalData(series: { date: string; aqi: number }[]) {
  // Seasons mapping (user requested):
  // Winter: Dec(11), Jan(0), Feb(1)
  // Spring: Mar(2), Apr(3), May(4)
  // Summer: Jun(5), Jul(6), Aug(7)
  // Monsoon: Sep(8), Oct(9), Nov(10)
  const buckets: Record<string, number[]> = {
    Winter: [],
    Spring: [],
    Summer: [],
    Monsoon: [],
  }

  series.forEach((row) => {
    const d = new Date(row.date)
    if (isNaN(+d) || typeof row.aqi !== 'number' || !isFinite(row.aqi)) return
    const m = d.getMonth()
    if ([11, 0, 1].includes(m)) buckets.Winter.push(row.aqi)
    else if ([2, 3, 4].includes(m)) buckets.Spring.push(row.aqi)
    else if ([5, 6, 7].includes(m)) buckets.Summer.push(row.aqi)
    else if ([8, 9, 10].includes(m)) buckets.Monsoon.push(row.aqi)
  })

  const seasons = ['Winter', 'Spring', 'Summer', 'Monsoon']
  const result = seasons.map((s) => {
    const arr = buckets[s]
    const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    return { season: s, aqi: avg }
  })

  // Filter out seasons with null values so chart only shows available data
  return result.filter(r => r.aqi !== null)
}

// Yearly comparison helper (from historical)
function computeYearlyComparison(series: {date: string; aqi: number}[]) {
  const buckets: Record<string, {sum: number; count: number}> = {}
  series.forEach((d) => {
    const year = (d.date || '').slice(0,4)
    if (!year) return
    if (!buckets[year]) buckets[year] = { sum: 0, count: 0 }
    buckets[year].sum += (d.aqi || 0)
    buckets[year].count += 1
  })
  const years = Object.keys(buckets).sort()
  return years.map((y) => ({ year: y, aqi: +(buckets[y].sum / buckets[y].count).toFixed(1) }))
}

// Seasonal patterns helper (from historical)
function computeSeasonalPatterns(series: {date: string; aqi: number}[]) {
  const seasons: Record<string, {months: number[]; sum: number; count: number}> = {
    Winter: { months: [12,1,2], sum: 0, count: 0 },
    Spring: { months: [3,4,5], sum: 0, count: 0 },
    Summer: { months: [6,7,8], sum: 0, count: 0 },
    Monsoon: { months: [9,10,11], sum: 0, count: 0 },
  }
  series.forEach((d) => {
    const m = (d.date || '').slice(5,7)
    const month = Number(m)
    if (!month) return
    Object.values(seasons).forEach((s) => {
      if (s.months.includes(month)) {
        s.sum += (d.aqi || 0)
        s.count += 1
      }
    })
  })
  return Object.entries(seasons).map(([name, s]) => ({
    name,
    avg: s.count ? Math.round(s.sum / s.count) : NaN,
  }))
}

// Season icon and color helper
function getSeasonInfo(name: string) {
  switch (name) {
    case 'Winter':
      return { icon: <Snowflake className="w-5 h-5 text-blue-500" />, color: 'text-blue-500', bg: 'bg-blue-500/5', text: 'text-blue-500' }
    case 'Spring':
      return { icon: <Sun className="w-5 h-5 text-amber-500" />, color: 'text-amber-500', bg: 'bg-amber-500/5', text: 'text-amber-500' }
    case 'Summer':
      return { icon: <Zap className="w-5 h-5 text-orange-500" />, color: 'text-orange-500', bg: 'bg-orange-500/5', text: 'text-orange-500' }
    case 'Monsoon':
      return { icon: <CloudRain className="w-5 h-5 text-emerald-500" />, color: 'text-emerald-500', bg: 'bg-emerald-500/5', text: 'text-emerald-500' }
    default:
      return { icon: <Cloud className="w-5 h-5 text-gray-500" />, color: 'text-gray-500', bg: 'bg-gray-500/5', text: 'text-gray-500' }
  }
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-xl">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm text-muted-foreground">
          AQI: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [cities, setCities] = useState<string[]>([])
  const [series, setSeries] = useState<{date: string; aqi: number}[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cities`)
        if (res.ok) {
          const data = await res.json()
          setCities(data)
          if (!selectedCity && data.length) setSelectedCity(data[0])
        }
      } catch (err) {
        console.error('Failed to load cities', err)
      }
    }

    fetchCities()
  }, [selectedCity])

  const fetchAnalytics = useCallback(async (city: string) => {
    setLoadingData(true)
    try {
      const res = await fetch(`${API_BASE_URL}/analytics?city=${encodeURIComponent(city)}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const data = await res.json()
      const arr = (data.dates || []).map((d: string, i: number) => ({ date: d, aqi: data.aqi[i] }))
      setSeries(arr)
    } catch (err) {
      console.error(err)
      setSeries([])
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    // On initial load, fetch data for selected city if present
    if (selectedCity) {
      fetchAnalytics(selectedCity)
    }
  }, [selectedCity, fetchAnalytics])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-16 relative z-10">
          <div className="text-center space-y-6 max-w-3xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Data-Driven Insights</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Air Quality Analytics
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Comprehensive analysis of air quality trends, patterns, and seasonal variations
            </p>
          </div>

          {/* City Selector */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 sm:mt-10 px-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-2 sm:p-1 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 w-full sm:w-auto">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-full sm:w-56 border-0 bg-transparent focus:ring-0">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading cities...</div>
                  ) : (
                    cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <button 
                onClick={() => selectedCity && fetchAnalytics(selectedCity)} 
                disabled={!selectedCity || loadingData} 
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                  "bg-primary text-white hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2"
                )}
              >
                <RefreshCw className={cn("w-4 h-4", loadingData && "animate-spin")} />
                {loadingData ? 'Loading...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8">
        <div className="space-y-8">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Average AQI</p>
                    {loadingData ? (
                      <Skeleton className="h-9 w-20" />
                    ) : (
                      <p className="text-3xl font-bold">
                        {series.length ? Math.round(series.reduce((s, it) => s + (it.aqi || 0), 0) / series.length) : 'N/A'}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Current Period</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Trend Change</p>
                    {loadingData ? (
                      <Skeleton className="h-9 w-24" />
                    ) : (
                      (() => {
                        const avgCurrent = series.length ? (series.reduce((sum, item) => sum + (item.aqi || 0), 0) / series.length) : NaN
                        const previous = series.slice(-6)
                        const avgPrev = previous.length ? (previous.reduce((sum, item) => sum + (item.aqi || 0), 0) / previous.length) : NaN
                        const change = (isFinite(avgPrev) && avgPrev !== 0) ? ((avgCurrent - avgPrev) / avgPrev * 100) : NaN
                        const isPositive = isFinite(change) && change > 0
                        return (
                          <div className="flex items-center gap-2">
                            <p className={cn("text-3xl font-bold", isPositive ? "text-red-500" : "text-green-500")}>
                              {isFinite(change) ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : 'N/A'}
                            </p>
                            {isFinite(change) && (isPositive ? <TrendingUp className="w-5 h-5 text-red-500" /> : <TrendingDown className="w-5 h-5 text-green-500" />)}
                          </div>
                        )
                      })()
                    )}
                    <p className="text-xs text-muted-foreground mt-1">vs Previous Period</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10">
                    <TrendingUp className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Peak Value</p>
                    {loadingData ? (
                      <Skeleton className="h-9 w-16" />
                    ) : (
                      <p className="text-3xl font-bold text-red-500">
                        {series.length ? Math.max(...series.map(it => it.aqi || 0)) : 'N/A'}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Maximum AQI</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <Zap className="w-6 h-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {(!loadingData && series.length === 0) && (
            <div className="p-8 text-center border border-dashed border-border rounded-xl bg-muted/30">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No AQI data available for this city. Select a city and click Update.</p>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {/* Seasonal Analysis */}
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-lg">Seasonal Analysis</span>
                    <p className="text-sm font-normal text-muted-foreground mt-0.5">Average AQI by season</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingData ? (
                  <div className="space-y-4">
                    <Skeleton className="h-48 sm:h-64 w-full" />
                  </div>
                ) : (
                  <div className="h-[220px] sm:h-[280px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {series.length ? (
                      (() => {
                        const seasonal = computeSeasonalData(series)
                        return seasonal.length ? (
                          <BarChart data={seasonal} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis dataKey="season" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} width={35} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="aqi" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted-foreground">Not enough data for seasonal analysis</div>
                        )
                      })()
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">Select a city to view data</div>
                    )}
                  </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Yearly Comparison */}
            <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Calendar className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <span className="text-lg">Yearly Comparison</span>
                    <p className="text-sm font-normal text-muted-foreground mt-0.5">Year-over-year AQI trends</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingData ? (
                  <Skeleton className="h-48 sm:h-64 w-full" />
                ) : (
                  <div className="h-[220px] sm:h-[280px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {series.length ? (
                      <LineChart data={computeYearlyComparison(series)} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} width={35} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="aqi" stroke="#ED1B24" strokeWidth={2.5} dot={{ fill: "#ED1B24", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">Select a city to view data</div>
                    )}
                  </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Historical Trends - Full Width */}
          <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-lg">Historical Trends</span>
                  <p className="text-sm font-normal text-muted-foreground mt-0.5">Complete AQI timeline for {selectedCity || 'selected city'}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingData ? (
                <Skeleton className="h-56 sm:h-72 md:h-80 w-full" />
              ) : (
                <div className="h-[250px] sm:h-[300px] md:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  {series.length ? (
                    <AreaChart data={series} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return isNaN(+date) ? value : date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                        }}
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} width={35} />
                      <Tooltip 
                        content={<CustomTooltip />}
                        labelFormatter={(value) => {
                          const date = new Date(value)
                          return isNaN(+date) ? value : date.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                        }}
                      />
                      <Area type="monotone" dataKey="aqi" stroke="hsl(var(--primary))" fill="url(#areaGradient)" strokeWidth={2} />
                    </AreaChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">Select a city to view historical data</div>
                  )}
                </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seasonal Patterns Cards */}
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Seasonal Patterns</h2>
                <p className="text-sm text-muted-foreground">Understanding air quality variations across seasons</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {computeSeasonalPatterns(series).map((s, index) => {
                const info = getSeasonInfo(s.name)
                return (
                  <Card 
                    key={s.name} 
                    className={cn(
                      "overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300 group",
                      info.bg
                    )}
                    style={{ animationDelay: `${350 + index * 50}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-muted/50">
                          {info.icon}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {s.name === 'Winter' ? 'Dec-Feb' : s.name === 'Spring' ? 'Mar-May' : s.name === 'Summer' ? 'Jun-Aug' : 'Sep-Nov'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{s.name}</h3>
                      <p className={cn("text-3xl font-bold mb-2", info.text)}>
                        {Number.isFinite(s.avg) ? s.avg : 'N/A'}
                        {Number.isFinite(s.avg) && <span className="text-sm font-normal text-muted-foreground ml-1">AQI</span>}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {s.name === 'Winter' && 'Higher AQI due to cold weather inversions and heating'}
                        {s.name === 'Spring' && 'Dust storms and agricultural activities'}
                        {s.name === 'Summer' && 'Better dispersion with warmer temperatures'}
                        {s.name === 'Monsoon' && 'Rain washes away atmospheric pollutants'}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Pollutant Distribution and Key Insights removed — they were static placeholders and not city-specific. */}

          {/* Statistical Summary removed — placeholder values were not city-specific */}
        </div>
      </main>
    </div>
  )
}