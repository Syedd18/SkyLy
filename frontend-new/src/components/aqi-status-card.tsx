"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Heart, Activity, Wind, ShieldAlert, ShieldCheck, Skull } from "lucide-react"

/* ─── AQI category mapping (matches HealthAdvisoryPanel) ──── */

interface AQICategoryInfo {
  label: string
  icon: React.ComponentType<{ className?: string }>
  bgClass: string
  textClass: string
  borderClass: string
  badgeTextClass: string
  /** CSS var name for the category (e.g. "--aqi-good") */
  cssVar: string
}

function getAQICategoryInfo(aqi: number): AQICategoryInfo {
  if (aqi <= 50)
    return {
      label: "Good",
      icon: Heart,
      bgClass: "bg-[rgb(var(--aqi-good-bg))]",
      textClass: "text-[rgb(var(--aqi-good))]",
      borderClass: "border-[rgb(var(--aqi-good)/0.25)]",
      badgeTextClass: "text-white dark:text-gray-900",
      cssVar: "--aqi-good",
    }
  if (aqi <= 100)
    return {
      label: "Moderate",
      icon: Activity,
      bgClass: "bg-[rgb(var(--aqi-moderate-bg))]",
      textClass: "text-[rgb(var(--aqi-moderate))]",
      borderClass: "border-[rgb(var(--aqi-moderate)/0.25)]",
      badgeTextClass: "text-gray-900",
      cssVar: "--aqi-moderate",
    }
  if (aqi <= 150)
    return {
      label: "Unhealthy for Sensitive Groups",
      icon: Wind,
      bgClass: "bg-[rgb(var(--aqi-unhealthy-sensitive-bg))]",
      textClass: "text-[rgb(var(--aqi-unhealthy-sensitive))]",
      borderClass: "border-[rgb(var(--aqi-unhealthy-sensitive)/0.25)]",
      badgeTextClass: "text-white dark:text-gray-900",
      cssVar: "--aqi-unhealthy-sensitive",
    }
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      icon: ShieldAlert,
      bgClass: "bg-[rgb(var(--aqi-unhealthy-bg))]",
      textClass: "text-[rgb(var(--aqi-unhealthy))]",
      borderClass: "border-[rgb(var(--aqi-unhealthy)/0.25)]",
      badgeTextClass: "text-white",
      cssVar: "--aqi-unhealthy",
    }
  if (aqi <= 300)
    return {
      label: "Very Unhealthy",
      icon: ShieldCheck,
      bgClass: "bg-[rgb(var(--aqi-very-unhealthy-bg))]",
      textClass: "text-[rgb(var(--aqi-very-unhealthy))]",
      borderClass: "border-[rgb(var(--aqi-very-unhealthy)/0.25)]",
      badgeTextClass: "text-white",
      cssVar: "--aqi-very-unhealthy",
    }
  return {
    label: "Hazardous",
    icon: Skull,
    bgClass: "bg-[rgb(var(--aqi-hazardous-bg))]",
    textClass: "text-[rgb(var(--aqi-hazardous))]",
    borderClass: "border-[rgb(var(--aqi-hazardous)/0.25)]",
    badgeTextClass: "text-white",
    cssVar: "--aqi-hazardous",
  }
}

/* ─── AQIStatusCard Component ─────────────────────────────── */

interface AQIStatusCardProps {
  aqi: number
  cityName?: string
  stationName?: string
  lastUpdated?: string
  className?: string
}

export function AQIStatusCard({
  aqi,
  cityName,
  stationName,
  lastUpdated,
  className,
}: AQIStatusCardProps) {
  const cat = useMemo(() => getAQICategoryInfo(aqi), [aqi])
  const Icon = cat.icon

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
        "aqi-category-transition",
        cat.bgClass,
        cat.borderClass,
        className
      )}
      role="status"
      aria-label={`${cityName ?? "City"} AQI is ${aqi}, ${cat.label}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={cn(
            "flex-shrink-0 p-3 rounded-xl",
            cat.textClass,
          )}
          style={{ backgroundColor: `rgb(var(${cat.cssVar}) / 0.12)` }}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            {/* AQI number */}
            <span
              className={cn("text-3xl sm:text-4xl font-bold tabular-nums", cat.textClass)}
            >
              {aqi}
            </span>

            {/* Badge */}
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                cat.badgeTextClass
              )}
              style={{ backgroundColor: `rgb(var(${cat.cssVar}))` }}
            >
              {cat.label}
            </span>
          </div>

          {/* City / station info */}
          {(cityName || stationName) && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {cityName}
              {stationName && (
                <span className="text-xs"> · {stationName}</span>
              )}
            </p>
          )}

          {/* Last updated */}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated{" "}
              {(() => {
                try {
                  return new Date(lastUpdated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                } catch {
                  return lastUpdated
                }
              })()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export { getAQICategoryInfo }
export type { AQICategoryInfo }
