"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  Heart,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Skull,
  Wind,
  Activity,
} from "lucide-react"

/* ─── AQI Health Advisory Data ─────────────────────────────── */

interface HealthAdvisory {
  /** AQI category label */
  label: string
  /** Short description shown inside the badge */
  shortLabel: string
  /** Health guidance text */
  guidance: string
  /** Recommended actions list */
  actions: string[]
  /** Icon component for the category */
  icon: React.ComponentType<{ className?: string }>
  /** CSS classes — background, text, border (use AQI semantic tokens) */
  bgClass: string
  textClass: string
  borderClass: string
  /** For dark-on-light or white-on-dark text on badges */
  badgeTextClass: string
  /** CSS variable name for the category color e.g. "--aqi-good" */
  cssVar: string
}

const ADVISORIES: { min: number; max: number; data: HealthAdvisory }[] = [
  {
    min: 0,
    max: 50,
    data: {
      label: "Good",
      shortLabel: "Good",
      guidance:
        "Air quality is excellent. Ideal for outdoor activities.",
      actions: [
        "Enjoy outdoor activities freely",
        "Open windows for ventilation",
        "Great day for exercise outside",
      ],
      icon: Heart,
      bgClass: "bg-[rgb(var(--aqi-good-bg))]",
      textClass: "text-[rgb(var(--aqi-good))]",
      borderClass: "border-[rgb(var(--aqi-good)/0.3)]",
      badgeTextClass: "text-white dark:text-gray-900",
      cssVar: "--aqi-good",
    },
  },
  {
    min: 51,
    max: 100,
    data: {
      label: "Moderate",
      shortLabel: "Moderate",
      guidance:
        "Acceptable air quality. Sensitive individuals should be cautious.",
      actions: [
        "Generally safe for outdoor activities",
        "Sensitive groups may limit prolonged outdoor exertion",
        "Monitor air quality updates if you have asthma",
      ],
      icon: Activity,
      bgClass: "bg-[rgb(var(--aqi-moderate-bg))]",
      textClass: "text-[rgb(var(--aqi-moderate))]",
      borderClass: "border-[rgb(var(--aqi-moderate)/0.3)]",
      badgeTextClass: "text-gray-900 dark:text-gray-900",
      cssVar: "--aqi-moderate",
    },
  },
  {
    min: 101,
    max: 150,
    data: {
      label: "Unhealthy for Sensitive Groups",
      shortLabel: "Sensitive",
      guidance:
        "Limit prolonged outdoor exertion if you have respiratory issues.",
      actions: [
        "Reduce prolonged outdoor activities",
        "Keep asthma medications accessible",
        "Close windows during peak traffic hours",
        "Use air purifiers indoors if available",
      ],
      icon: Wind,
      bgClass: "bg-[rgb(var(--aqi-unhealthy-sensitive-bg))]",
      textClass: "text-[rgb(var(--aqi-unhealthy-sensitive))]",
      borderClass: "border-[rgb(var(--aqi-unhealthy-sensitive)/0.3)]",
      badgeTextClass: "text-white dark:text-gray-900",
      cssVar: "--aqi-unhealthy-sensitive",
    },
  },
  {
    min: 151,
    max: 200,
    data: {
      label: "Unhealthy",
      shortLabel: "Unhealthy",
      guidance:
        "Avoid outdoor activities. Masks and air purifiers recommended.",
      actions: [
        "Avoid strenuous outdoor activities",
        "Wear N95 masks outdoors",
        "Use air purifiers indoors",
        "Keep windows and doors closed",
      ],
      icon: ShieldAlert,
      bgClass: "bg-[rgb(var(--aqi-unhealthy-bg))]",
      textClass: "text-[rgb(var(--aqi-unhealthy))]",
      borderClass: "border-[rgb(var(--aqi-unhealthy)/0.3)]",
      badgeTextClass: "text-white",
      cssVar: "--aqi-unhealthy",
    },
  },
  {
    min: 201,
    max: 300,
    data: {
      label: "Very Unhealthy",
      shortLabel: "Very Unhealthy",
      guidance:
        "Serious health risk. Stay indoors. Outdoor work discouraged.",
      actions: [
        "Stay indoors as much as possible",
        "Seal windows and doors",
        "Run air purifiers on high setting",
        "Avoid all outdoor physical activity",
        "Consult a doctor if you experience symptoms",
      ],
      icon: ShieldCheck,
      bgClass: "bg-[rgb(var(--aqi-very-unhealthy-bg))]",
      textClass: "text-[rgb(var(--aqi-very-unhealthy))]",
      borderClass: "border-[rgb(var(--aqi-very-unhealthy)/0.3)]",
      badgeTextClass: "text-white",
      cssVar: "--aqi-very-unhealthy",
    },
  },
  {
    min: 301,
    max: Infinity,
    data: {
      label: "Hazardous",
      shortLabel: "Hazardous",
      guidance:
        "Health emergency. Remain indoors and follow government advisories.",
      actions: [
        "HEALTH EMERGENCY — remain indoors",
        "Seal all openings, use wet towels under doors",
        "Run air purifiers continuously",
        "Avoid all outdoor exposure",
        "Follow government emergency advisories",
        "Seek medical attention for any symptoms",
      ],
      icon: Skull,
      bgClass: "bg-[rgb(var(--aqi-hazardous-bg))]",
      textClass: "text-[rgb(var(--aqi-hazardous))]",
      borderClass: "border-[rgb(var(--aqi-hazardous)/0.3)]",
      badgeTextClass: "text-white",
      cssVar: "--aqi-hazardous",
    },
  },
]

function getAdvisory(aqi: number): HealthAdvisory {
  const match = ADVISORIES.find((a) => aqi >= a.min && aqi <= a.max)
  return match?.data ?? ADVISORIES[0].data
}

/* ─── Component ────────────────────────────────────────────── */

interface HealthAdvisoryPanelProps {
  aqi: number
  className?: string
  /** Compact mode for sticky mobile bottom sheet */
  compact?: boolean
}

export function HealthAdvisoryPanel({
  aqi,
  className,
  compact = false,
}: HealthAdvisoryPanelProps) {
  const advisory = useMemo(() => getAdvisory(aqi), [aqi])
  const Icon = advisory.icon

  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 px-4 py-3 rounded-xl border aqi-category-transition",
          advisory.bgClass,
          advisory.borderClass,
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={`Air quality: ${advisory.label}. ${advisory.guidance}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex-shrink-0 p-2 rounded-lg",
              advisory.textClass
            )}
            style={{
              backgroundColor: `rgb(var(${advisory.cssVar}) / 0.15)`,
            }}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                  advisory.badgeTextClass
                )}
                style={{
                  backgroundColor: `rgb(var(${advisory.cssVar}))`,
                }}
              >
                {advisory.shortLabel}
              </span>
              <span className="text-sm font-medium text-foreground">
                AQI {aqi}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {advisory.guidance}
            </p>
          </div>
        </div>
        
        {/* Top actions in compact mode */}
        <div className="pl-11 space-y-1.5 border-t border-current/10 pt-2">
          {advisory.actions.slice(0, 3).map((action, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11px] leading-snug text-foreground/90"
            >
              <AlertTriangle
                className={cn(
                  "h-3 w-3 flex-shrink-0 mt-0.5",
                  advisory.textClass
                )}
                aria-hidden="true"
              />
              <span className="line-clamp-1">{action}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 sm:p-6 aqi-category-transition animate-fade-in",
        advisory.bgClass,
        advisory.borderClass,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Air quality: ${advisory.label}. ${advisory.guidance}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex-shrink-0 p-3 rounded-xl",
            advisory.textClass
          )}
          style={{
            backgroundColor: `rgb(var(${advisory.cssVar}) / 0.15)`,
          }}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* AQI Badge */}
            <span
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-bold",
                advisory.badgeTextClass
              )}
              style={{
                backgroundColor: `rgb(var(${advisory.cssVar}))`,
              }}
            >
              {aqi} — {advisory.shortLabel}
            </span>
          </div>

          <h3
            className={cn(
              "text-base sm:text-lg font-semibold mt-1",
              advisory.textClass
            )}
          >
            {advisory.label}
          </h3>

          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {advisory.guidance}
          </p>
        </div>
      </div>

      {/* Actions list */}
      <div className="mt-4 pt-4 border-t border-current/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Recommended Actions
        </p>
        <ul className="space-y-2" role="list">
          {advisory.actions.map((action, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <AlertTriangle
                className={cn(
                  "h-4 w-4 flex-shrink-0 mt-0.5",
                  advisory.textClass
                )}
                aria-hidden="true"
              />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export { getAdvisory, ADVISORIES }
export type { HealthAdvisory }
