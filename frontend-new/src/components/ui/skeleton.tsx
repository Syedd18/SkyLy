import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text" | "card"
  animation?: "pulse" | "shimmer" | "none"
}

function Skeleton({
  className,
  variant = "default",
  animation = "shimmer",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted",
        {
          // Variants
          "rounded-md": variant === "default",
          "rounded-full": variant === "circular",
          "rounded h-4 w-full": variant === "text",
          "rounded-xl": variant === "card",
        },
        {
          // Animation
          "animate-pulse": animation === "pulse",
          "skeleton": animation === "shimmer",
        },
        className
      )}
      {...props}
    />
  )
}

// Skeleton text with multiple lines
interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  lastLineWidth?: string
}

function SkeletonText({ 
  lines = 3, 
  lastLineWidth = "60%",
  className,
  ...props 
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          style={i === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  )
}

// Skeleton card
interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hasHeader?: boolean
  hasFooter?: boolean
  headerHeight?: string
  contentLines?: number
}

function SkeletonCard({
  hasHeader = true,
  hasFooter = false,
  headerHeight = "h-6",
  contentLines = 3,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-6 space-y-4",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center space-x-4">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="space-y-2 flex-1">
            <Skeleton className={cn("w-1/3", headerHeight)} />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      )}
      <SkeletonText lines={contentLines} />
      {hasFooter && (
        <div className="flex justify-end space-x-2 pt-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      )}
    </div>
  )
}

// Skeleton for AQI card
function SkeletonAQICard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton variant="circular" className="h-16 w-16" />
      </div>
      <div className="flex items-baseline space-x-2">
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-40" />
    </div>
  )
}

// Skeleton for pollutant card
function SkeletonPollutantCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 text-center space-y-3",
        className
      )}
      {...props}
    >
      <Skeleton className="h-4 w-16 mx-auto" />
      <Skeleton className="h-8 w-12 mx-auto" />
      <Skeleton className="h-3 w-10 mx-auto" />
    </div>
  )
}

// Skeleton for city list item
function SkeletonCityItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border-b",
        className
      )}
      {...props}
    >
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" className="h-8 w-8" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonCard, 
  SkeletonAQICard, 
  SkeletonPollutantCard,
  SkeletonCityItem 
}
