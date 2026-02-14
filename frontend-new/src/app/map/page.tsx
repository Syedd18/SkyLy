"use client"

import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Globe, Activity, Wind } from "lucide-react"

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <span>Loading Map...</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-96 w-full rounded-xl" />
      </CardContent>
    </Card>
  ),
})

export default function MapPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="relative mx-auto px-4 py-12 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 lg:py-16">
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Interactive Air Quality Map</span>
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                India AQI Map
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Explore real-time air quality data across India with our interactive map. 
              Click on any city to view detailed AQI information.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto px-4 py-6 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 lg:py-8">
        <div className="space-y-6 lg:space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
              <CardContent className="flex items-center gap-4 p-4 lg:p-6">
                <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Coverage</p>
                  <p className="text-xl lg:text-2xl font-bold">All India</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
              <CardContent className="flex items-center gap-4 p-4 lg:p-6">
                <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-aqi-good/10 text-aqi-good">
                  <Activity className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Data Source</p>
                  <p className="text-xl lg:text-2xl font-bold">Real-time</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
              <CardContent className="flex items-center gap-4 p-4 lg:p-6">
                <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <Wind className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Updates</p>
                  <p className="text-xl lg:text-2xl font-bold">Every Hour</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <MapComponent />
          </div>

          {/* Legend Card */}
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg">Understanding AQI Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Good", range: "0-50", color: "bg-aqi-good" },
                  { label: "Moderate", range: "51-100", color: "bg-aqi-moderate" },
                  { label: "Sensitive", range: "101-150", color: "bg-aqi-sensitive" },
                  { label: "Unhealthy", range: "151-200", color: "bg-aqi-unhealthy" },
                  { label: "Very Unhealthy", range: "201-300", color: "bg-aqi-very-unhealthy" },
                  { label: "Hazardous", range: "300+", color: "bg-aqi-hazardous" },
                ].map((level) => (
                  <div key={level.label} className="flex items-start gap-2 p-2 lg:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={`h-3 w-3 lg:h-4 lg:w-4 rounded-full ${level.color} mt-0.5 flex-shrink-0`} />
                    <div>
                      <p className="font-medium text-xs lg:text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.range}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}