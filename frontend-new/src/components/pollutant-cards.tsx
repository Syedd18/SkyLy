"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AnimatedNumber } from "@/components/animated-number"
import { cn } from "@/lib/utils"
import { 
  Droplets, 
  Wind, 
  Flame, 
  Cloud, 
  Thermometer, 
  Gauge,
  Navigation2,
  CloudRain
} from "lucide-react"

interface PollutantCardsProps {
  components: Record<string, unknown>
}

const pollutantInfo: Record<string, { 
  name: string
  shortName: string
  unit?: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = {
  // Particulate matter
  pm25: { 
    name: "PM2.5", 
    shortName: "PM2.5",
    unit: "μg/m³", 
    description: "Fine particles ≤2.5µm",
    icon: Droplets,
    color: "text-purple-500"
  },
  pm2_5: { 
    name: "PM2.5", 
    shortName: "PM2.5",
    unit: "μg/m³", 
    description: "Fine particles ≤2.5µm",
    icon: Droplets,
    color: "text-purple-500"
  },
  pm10: { 
    name: "PM10", 
    shortName: "PM10",
    unit: "μg/m³", 
    description: "Coarse particles ≤10µm",
    icon: Wind,
    color: "text-orange-500"
  },

  // Gases
  no2: { 
    name: "Nitrogen Dioxide", 
    shortName: "NO₂",
    unit: "ppb", 
    description: "Traffic/combustion pollutant",
    icon: Cloud,
    color: "text-red-500"
  },
  so2: { 
    name: "Sulfur Dioxide", 
    shortName: "SO₂",
    unit: "ppb", 
    description: "Industrial emissions",
    icon: Flame,
    color: "text-yellow-500"
  },
  co: { 
    name: "Carbon Monoxide", 
    shortName: "CO",
    unit: "ppm", 
    description: "Incomplete combustion",
    icon: Cloud,
    color: "text-gray-500"
  },
  o3: { 
    name: "Ozone", 
    shortName: "O₃",
    unit: "ppb", 
    description: "Ground-level ozone",
    icon: Cloud,
    color: "text-blue-500"
  },

  // AQI values
  us_aqi: { 
    name: "US AQI", 
    shortName: "US AQI",
    unit: "",
    icon: Gauge,
    color: "text-primary"
  },
  european_aqi: { 
    name: "EU AQI", 
    shortName: "EU AQI",
    unit: "",
    icon: Gauge,
    color: "text-primary"
  },

  // Weather
  temperature: { 
    name: "Temperature", 
    shortName: "Temp",
    unit: "°C",
    icon: Thermometer,
    color: "text-orange-400"
  },
  t: { 
    name: "Temperature", 
    shortName: "Temp",
    unit: "°C",
    icon: Thermometer,
    color: "text-orange-400"
  },
  dew: { 
    name: "Dew Point", 
    shortName: "Dew",
    unit: "°C",
    icon: CloudRain,
    color: "text-cyan-500"
  },
  h: { 
    name: "Humidity", 
    shortName: "Humidity",
    unit: "%",
    icon: Droplets,
    color: "text-blue-400"
  },
  wind_speed: { 
    name: "Wind Speed", 
    shortName: "Wind",
    unit: "m/s",
    icon: Wind,
    color: "text-teal-500"
  },
  w: { 
    name: "Wind Speed", 
    shortName: "Wind",
    unit: "m/s",
    icon: Wind,
    color: "text-teal-500"
  },
  wind_dir: { 
    name: "Wind Direction", 
    shortName: "Dir",
    unit: "°",
    icon: Navigation2,
    color: "text-teal-500"
  },
  p: { 
    name: "Pressure", 
    shortName: "Pressure",
    unit: "hPa",
    icon: Gauge,
    color: "text-indigo-500"
  },
}

function getPollutantStatus(value: number, pollutant: string) {
  const thresholds: Record<string, { good: number; moderate: number; unhealthy: number }> = {
    pm25: { good: 12, moderate: 35, unhealthy: 55 },
    pm2_5: { good: 12, moderate: 35, unhealthy: 55 },
    pm10: { good: 54, moderate: 154, unhealthy: 254 },
    no2: { good: 53, moderate: 100, unhealthy: 360 },
    so2: { good: 35, moderate: 75, unhealthy: 185 },
    co: { good: 4.4, moderate: 9.4, unhealthy: 12.4 },
    o3: { good: 54, moderate: 70, unhealthy: 85 },
  }

  const t = thresholds[pollutant]
  if (!t) return "unknown"

  if (value <= t.good) return "good"
  if (value <= t.moderate) return "moderate"
  if (value <= t.unhealthy) return "unhealthy"
  return "hazardous"
}

function getStatusStyles(status: string) {
  switch (status) {
    case "good": 
      return { text: "text-aqi-good", bg: "bg-aqi-good/10", ring: "ring-aqi-good/20" }
    case "moderate": 
      return { text: "text-aqi-moderate", bg: "bg-aqi-moderate/10", ring: "ring-aqi-moderate/20" }
    case "unhealthy": 
      return { text: "text-aqi-sensitive", bg: "bg-aqi-sensitive/10", ring: "ring-aqi-sensitive/20" }
    case "hazardous": 
      return { text: "text-aqi-hazardous", bg: "bg-aqi-hazardous/10", ring: "ring-aqi-hazardous/20" }
    default: 
      return { text: "text-muted-foreground", bg: "bg-muted/50", ring: "" }
  }
}

export function PollutantCards({ components }: PollutantCardsProps) {
  const entries = Object.entries(components || {})

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pollutant data available
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {entries.map(([key, value], index) => {
        // Extract value from WAQI format or plain number
        const rawValue = typeof value === 'object' && value !== null && 'v' in value 
          ? (value as { v: number | string }).v 
          : value
        const v = typeof rawValue === 'number' ? rawValue : Number(rawValue)
        
        const info = pollutantInfo[key] || { 
          name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), 
          shortName: key.toUpperCase(),
          unit: '',
          icon: Gauge,
          color: "text-muted-foreground"
        }
        const Icon = info.icon

        // Determine status for pollutant keys
        const isPollutant = key.startsWith('pm') || ['pm2_5', 'pm10', 'no2', 'so2', 'co', 'o3'].includes(key)
        const status = (typeof v === 'number' && !isNaN(v) && isPollutant) 
          ? getPollutantStatus(v, key) 
          : 'unknown'
        const statusStyles = getStatusStyles(status)

        return (
          <Card 
            key={key}
            variant="glass"
            className={cn(
              "group overflow-hidden animate-fade-in-up",
              isPollutant && status !== 'unknown' && "ring-1",
              statusStyles.ring
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-3 sm:p-4">
              {/* Header with icon */}
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isPollutant && status !== 'unknown' ? statusStyles.bg : "bg-muted/50"
                )}>
                  <Icon className={cn(
                    "h-3.5 w-3.5 sm:h-4 sm:w-4",
                    isPollutant && status !== 'unknown' ? statusStyles.text : info.color
                  )} />
                </div>
                {info.unit && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {info.unit}
                  </span>
                )}
              </div>

              {/* Value */}
              <div className={cn(
                "text-xl sm:text-2xl font-bold tracking-tight transition-colors",
                isPollutant && status !== 'unknown' ? statusStyles.text : "text-foreground"
              )}>
                {typeof v === 'number' && !isNaN(v) ? (
                  Number.isInteger(v) ? (
                    <AnimatedNumber value={v} />
                  ) : (
                    <AnimatedNumber value={parseFloat(v.toFixed(1))} />
                  )
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </div>

              {/* Label */}
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1 truncate">
                {info.shortName}
              </p>

              {/* Description on hover - hidden on mobile */}
              {info.description && (
                <p className="hidden sm:block text-[10px] text-muted-foreground/70 mt-1 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {info.description}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}