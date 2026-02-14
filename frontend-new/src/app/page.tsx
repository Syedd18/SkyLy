"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, AQIBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  SkeletonAQICard 
} from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { 
  Heart, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Star, 
  Trash2, 
  RefreshCw,
  ArrowRight,
  Sparkles,
  Shield,
  Wind,
  BarChart3,
  Clock,
  ExternalLink,
  User,
  Mail,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface Favorite {
  city: string
  aqi: number
  time: string
  station?: string
  stationAqi?: number | null
}

// Enhanced AQI category with more detailed info
function getAQICategory(aqi: number) {
  if (aqi <= 50) return { 
    label: "Good", 
    shortLabel: "Good",
    color: "bg-aqi-good", 
    textColor: "text-aqi-good",
    bgColor: "bg-aqi-good/10",
    description: "Air quality is satisfactory"
  }
  if (aqi <= 100) return { 
    label: "Moderate", 
    shortLabel: "Moderate",
    color: "bg-aqi-moderate", 
    textColor: "text-aqi-moderate",
    bgColor: "bg-aqi-moderate/10",
    description: "Acceptable air quality"
  }
  if (aqi <= 150) return { 
    label: "Unhealthy for Sensitive", 
    shortLabel: "Sensitive",
    color: "bg-aqi-sensitive", 
    textColor: "text-aqi-sensitive",
    bgColor: "bg-aqi-sensitive/10",
    description: "Sensitive groups may experience effects"
  }
  if (aqi <= 200) return { 
    label: "Unhealthy", 
    shortLabel: "Unhealthy",
    color: "bg-aqi-unhealthy", 
    textColor: "text-aqi-unhealthy",
    bgColor: "bg-aqi-unhealthy/10",
    description: "Everyone may experience health effects"
  }
  if (aqi <= 300) return { 
    label: "Very Unhealthy", 
    shortLabel: "Very Poor",
    color: "bg-aqi-very-unhealthy", 
    textColor: "text-aqi-very-unhealthy",
    bgColor: "bg-aqi-very-unhealthy/10",
    description: "Health alert: significant risk"
  }
  return { 
    label: "Hazardous", 
    shortLabel: "Hazardous",
    color: "bg-aqi-hazardous", 
    textColor: "text-aqi-hazardous",
    bgColor: "bg-aqi-hazardous/10",
    description: "Emergency conditions"
  }
}

// Feature card for unauthenticated users
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  delay = 0 
}: { 
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  delay?: number
}) {
  return (
    <Card 
      variant="interactive" 
      className="group animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6 sm:p-8 text-center">
        <div className={cn(
          "inline-flex p-4 rounded-2xl mb-5",
          "bg-primary/10 group-hover:bg-primary/15",
          "transition-all duration-300"
        )}>
          <Icon className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

// Stats card with animated counter effect
function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  iconColor,
  iconBg,
  delay = 0,
  trend
}: { 
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  iconColor: string
  iconBg: string
  delay?: number
  trend?: "up" | "down"
}) {
  return (
    <Card 
      variant="interactive"
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl transition-colors duration-200",
            iconBg
          )}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight animate-count-up">
                {value}
              </p>
              {trend && (
                <span className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded",
                  trend === "up" ? "text-aqi-unhealthy bg-aqi-unhealthy/10" : "text-aqi-good bg-aqi-good/10"
                )}>
                  {trend === "up" ? "↑" : "↓"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Favorite city card with enhanced design
function FavoriteCard({ 
  favorite, 
  onRemove,
  delay = 0
}: { 
  favorite: Favorite
  onRemove: (city: string) => void
  delay?: number
}) {
  const category = getAQICategory(favorite.aqi)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  
  // Update time periodically for relative time display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  
  // Parse city name for display
  const getDisplayCity = (fullName: string | undefined) => {
    if (!fullName) return ''
    const parts = fullName.split(',').map(p => p.trim()).filter(Boolean)
    const knownCountries = ['india']
    while (parts.length > 1 && knownCountries.includes(parts[parts.length - 1].toLowerCase())) {
      parts.pop()
    }
    return parts[parts.length - 1] || fullName
  }
  
  // Parse timestamp
  const parseUpdated = (t: string | number | undefined | null) => {
    if (!t && t !== 0) return null
    if (typeof t === 'number') return isFinite(t) ? new Date(t) : null
    const s = String(t).trim()
    if (/^\d+$/.test(s)) {
      const n = Number(s)
      return isFinite(n) ? (s.length <= 10 ? new Date(n * 1000) : new Date(n)) : null
    }
    const d = new Date(s)
    return isFinite(d.getTime()) ? d : null
  }
  
  const displayCity = getDisplayCity(favorite.city)
  const updatedDate = parseUpdated(favorite.time)
  
  // Calculate relative time safely using state
  const updatedText = useMemo(() => {
    if (!updatedDate) return '—'
    const diff = Math.round((updatedDate.getTime() - currentTime) / 60000)
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diff, 'minute')
  }, [updatedDate, currentTime])

  return (
    <Card 
      variant="interactive"
      className={cn(
        "group overflow-hidden animate-fade-in-up",
        "border-l-4",
        category.color.replace('bg-', 'border-')
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{displayCity}</h3>
            {favorite.station && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                📍 {favorite.station}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(favorite.city)}
            className={cn(
              "h-8 w-8 -mr-2 -mt-1",
              "opacity-0 group-hover:opacity-100",
              "transition-opacity duration-200",
              "hover:text-destructive hover:bg-destructive/10"
            )}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* AQI Display */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-4xl font-bold tracking-tight",
                category.textColor
              )}>
                {favorite.aqi}
              </span>
              <span className="text-sm text-muted-foreground">AQI</span>
            </div>
            <AQIBadge aqi={favorite.aqi} size="sm" className="mt-2" />
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{updatedText}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { isAuthenticated, token, user, logout } = useAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [stats, setStats] = useState({
    totalCities: 0,
    goodCities: 0,
    badCities: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = useCallback(async (showRefreshing = false) => {
    if (!token) {
      setLoading(false)
      return
    }

    if (showRefreshing) {
      setRefreshing(true)
    }

    try {
      console.log('Dashboard: Loading favorites...')
      const response = await fetch(`${API_BASE_URL}/api/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('Dashboard: Favorites response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Dashboard: Favorites data:', data)

        // Enrich favorites with per-city highest-station AQI where available
        const promises = (data.favorites || []).map(async (fav: Favorite) => {
          try {
            const url = `${API_BASE_URL}/live/aqi/stations?city=${encodeURIComponent(fav.city)}`
            const res2 = await fetch(url)

            if (res2.ok) {
              const d = await res2.json()
              const stations = d.stations || d || []
              
              console.log(`Dashboard: ${fav.city} stations:`, stations.map((s: { station_name?: string; aqi?: number }) => ({ name: s.station_name, aqi: s.aqi, type: typeof s.aqi })))
              
              // Find the station with highest AQI (same logic as Live AQI page)
              let maxStation = null
              for (const s of stations) {
                const aqiNum = typeof s.aqi === 'number' ? s.aqi : Number(s.aqi)
                if (!s || isNaN(aqiNum)) continue
                if (!maxStation || (aqiNum > (typeof maxStation.aqi === 'number' ? maxStation.aqi : Number(maxStation.aqi)))) {
                  maxStation = s
                }
              }
              
              console.log(`Dashboard: ${fav.city} selected station:`, maxStation?.station_name, 'AQI:', maxStation?.aqi)
              
              if (maxStation) {
                return { 
                  ...fav, 
                  aqi: typeof maxStation.aqi === 'number' ? maxStation.aqi : Number(maxStation.aqi), 
                  station: maxStation.station_name || maxStation.name || 'Unknown', 
                  stationAqi: typeof maxStation.aqi === 'number' ? maxStation.aqi : Number(maxStation.aqi), 
                  time: maxStation.time || fav.time 
                }
              }
            }
            
            // Fallback: try city-level AQI if station lookup fails
            try {
              const resCity = await fetch(`${API_BASE_URL}/live/aqi?city=${encodeURIComponent(fav.city)}`)
              if (resCity.ok) {
                const cd = await resCity.json()
                const a = (cd && typeof cd.aqi !== 'undefined' && cd.aqi !== null && cd.aqi !== '-') ? Number(cd.aqi) : null
                return { ...fav, aqi: Number.isFinite(a as number) ? a : fav.aqi, station: undefined, stationAqi: Number.isFinite(a as number) ? a : null, time: cd?.time ?? fav.time }
              }
            } catch {
              // ignore
            }

            return fav
          } catch {
            return fav
          }
        })

        const enriched = await Promise.all(promises)
        setFavorites(enriched)

        // Calculate stats using enriched AQI values
        const totalCities = enriched.length
        const goodCities = enriched.filter((fav: Favorite) => (typeof fav.aqi === 'number') && fav.aqi <= 50).length
        // Count cities with concerning AQI: Unhealthy for Sensitive Groups (>100) and worse
        const badCities = enriched.filter((fav: Favorite) => (typeof fav.aqi === 'number') && fav.aqi > 100).length

        setStats({
          totalCities,
          goodCities,
          badCities
        })
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    if (isAuthenticated && token) {
      loadDashboard()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, token, loadDashboard])

  // Reload when page becomes visible again (user switches tabs back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && token) {
        console.log('Dashboard: Page became visible, reloading...')
        loadDashboard(true)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isAuthenticated, token, loadDashboard])

  // Also reload when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && token) {
        console.log('Dashboard: Window focused, reloading...')
        loadDashboard(true)
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isAuthenticated, token, loadDashboard])

  const handleRefresh = () => {
    loadDashboard(true)
  }

  const removeFavorite = async (cityName: string) => {
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/favorites/${encodeURIComponent(cityName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Immediately update local state for snappy UI
        setFavorites(prev => prev.filter(f => f.city !== cityName))
        setStats(prev => ({
          ...prev,
          totalCities: prev.totalCities - 1
        }))
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <main className="relative overflow-hidden">
          {/* Hero Section */}
          <section className="relative py-16 sm:py-24 lg:py-32">
            {/* Background gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-aqi-good/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 relative z-10">
              <div className="text-center max-w-4xl mx-auto space-y-8">
                {/* Badge */}
                <div className="animate-fade-in">
                  <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium">
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Real-time Air Quality Monitoring
                  </Badge>
                </div>

                {/* Heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  Breathe Better with{' '}
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">
                    SkyLy
                  </span>
                </h1>

                {/* Description */}
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                  Monitor air quality in real-time, track your favorite cities, 
                  and get personalized health insights powered by data from 
                  monitoring stations across India.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                  <Link href="/live">
                    <Button size="lg" className="w-full sm:w-auto px-8 gap-2 group">
                      <Activity className="h-4 w-4" />
                      View Live AQI
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link href="/map">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 gap-2">
                      <MapPin className="h-4 w-4" />
                      Explore Map
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 sm:py-24 bg-muted/30">
            <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                  Everything you need to monitor air quality
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Comprehensive tools and insights to help you make informed decisions about the air you breathe.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                <FeatureCard
                  icon={Activity}
                  title="Real-time Monitoring"
                  description="Live AQI data from monitoring stations across India, updated every hour."
                  delay={0}
                />
                <FeatureCard
                  icon={Star}
                  title="Personal Dashboard"
                  description="Save favorite cities and track air quality trends over time."
                  delay={100}
                />
                <FeatureCard
                  icon={Heart}
                  title="Health Insights"
                  description="Get personalized recommendations based on current AQI levels."
                  delay={200}
                />
                <FeatureCard
                  icon={BarChart3}
                  title="Analytics & Trends"
                  description="Visualize historical data and identify air quality patterns."
                  delay={300}
                />
                <FeatureCard
                  icon={Wind}
                  title="Pollutant Breakdown"
                  description="Detailed analysis of PM2.5, PM10, O3, NO2, SO2, and CO levels."
                  delay={400}
                />
                <FeatureCard
                  icon={Shield}
                  title="Smart Alerts"
                  description="Get notified when air quality changes in your tracked cities."
                  delay={500}
                />
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 sm:py-24">
            <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
              <Card variant="gradient" className="max-w-5xl mx-auto overflow-hidden">
                <CardContent className="p-8 sm:p-12 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                    Ready to start monitoring?
                  </h2>
                  <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                    Sign in to access your personal dashboard, save favorite cities, 
                    and get personalized air quality insights.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/live">
                      <Button size="lg" className="w-full sm:w-auto px-8">
                        Get Started Free
                      </Button>
                    </Link>
                    <Link href="/about">
                      <Button variant="ghost" size="lg" className="w-full sm:w-auto gap-2">
                        Learn More
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-6 sm:py-8 lg:py-12">
        <div className="space-y-8 sm:space-y-12">
          {/* Header */}
          <header className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Welcome back, {user?.name?.split(' ')[0]}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Here&apos;s an overview of your favorite cities&apos; air quality.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full sm:w-auto gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </header>

          {/* Stats Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              icon={MapPin}
              value={stats.totalCities}
              label="Cities Tracked"
              iconColor="text-primary"
              iconBg="bg-primary/10"
              delay={0}
            />
            <StatCard
              icon={TrendingDown}
              value={stats.goodCities}
              label="Good AQI Cities"
              iconColor="text-aqi-good"
              iconBg="bg-aqi-good/10"
              delay={100}
            />
            <StatCard
              icon={TrendingUp}
              value={stats.badCities}
              label="Concerning AQI Cities"
              iconColor="text-aqi-unhealthy"
              iconBg="bg-aqi-unhealthy/10"
              delay={200}
            />
          </section>

          {/* Favorites Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Favorite Cities</h2>
                  <p className="text-sm text-muted-foreground">
                    {favorites.length} {favorites.length === 1 ? 'city' : 'cities'} tracked
                  </p>
                </div>
              </div>
              <Link href="/live">
                <Button variant="ghost" size="sm" className="gap-1">
                  Add City
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(3)].map((_, i) => (
                  <SkeletonAQICard key={i} />
                ))}
              </div>
            ) : favorites.length === 0 ? (
              <Card variant="outline" className="border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                    <Heart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No favorite cities yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Add cities to your favorites from the Live AQI page to track them here.
                  </p>
                  <Link href="/live">
                    <Button className="gap-2">
                      <Activity className="h-4 w-4" />
                      Browse Live AQI
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {favorites.map((favorite, index) => (
                  <FavoriteCard
                    key={favorite.city}
                    favorite={favorite}
                    onRemove={removeFavorite}
                    delay={index * 50}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/live" className="block">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Live AQI</h3>
                    <p className="text-sm text-muted-foreground">Check current levels</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/map" className="block">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-aqi-good/10">
                    <MapPin className="h-5 w-5 text-aqi-good" />
                  </div>
                  <div>
                    <h3 className="font-medium">India Map</h3>
                    <p className="text-sm text-muted-foreground">View geographic data</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/analytics" className="block">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-aqi-moderate/10">
                    <BarChart3 className="h-5 w-5 text-aqi-moderate" />
                  </div>
                  <div>
                    <h3 className="font-medium">Analytics</h3>
                    <p className="text-sm text-muted-foreground">View trends & stats</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/insights" className="block">
              <Card variant="interactive" className="h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-aqi-sensitive/10">
                    <Heart className="h-5 w-5 text-aqi-sensitive" />
                  </div>
                  <div>
                    <h3 className="font-medium">Health Tips</h3>
                    <p className="text-sm text-muted-foreground">Get recommendations</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}
