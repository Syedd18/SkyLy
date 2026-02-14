import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: 
          "border-border bg-transparent text-foreground",
        success:
          "border-transparent bg-green-500 text-white shadow-sm",
        warning:
          "border-transparent bg-yellow-500 text-black shadow-sm",
        info:
          "border-transparent bg-cyan-500 text-white shadow-sm",
        // AQI-specific badges
        "aqi-good":
          "border-transparent bg-green-500 text-white shadow-sm",
        "aqi-moderate":
          "border-transparent bg-yellow-500 text-black shadow-sm",
        "aqi-unhealthy-sensitive":
          "border-transparent bg-orange-500 text-white shadow-sm",
        "aqi-unhealthy":
          "border-transparent bg-red-500 text-white shadow-sm",
        "aqi-very-unhealthy":
          "border-transparent bg-purple-500 text-white shadow-sm",
        "aqi-hazardous":
          "border-transparent bg-red-900 text-white shadow-sm",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="mr-1 -ml-0.5">{icon}</span>}
      {children}
    </div>
  )
}

// Helper function to get AQI badge variant
function getAQIBadgeVariant(aqi: number): BadgeProps["variant"] {
  if (aqi <= 50) return "aqi-good"
  if (aqi <= 100) return "aqi-moderate"
  if (aqi <= 150) return "aqi-unhealthy-sensitive"
  if (aqi <= 200) return "aqi-unhealthy"
  if (aqi <= 300) return "aqi-very-unhealthy"
  return "aqi-hazardous"
}

// Helper function to get AQI label
function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good"
  if (aqi <= 100) return "Moderate"
  if (aqi <= 150) return "Unhealthy for Sensitive Groups"
  if (aqi <= 200) return "Unhealthy"
  if (aqi <= 300) return "Very Unhealthy"
  return "Hazardous"
}

// AQI Badge component
interface AQIBadgeProps extends Omit<BadgeProps, "variant"> {
  aqi: number
  showLabel?: boolean
}

function AQIBadge({ aqi, showLabel = true, className, ...props }: AQIBadgeProps) {
  const variant = getAQIBadgeVariant(aqi)
  const label = getAQILabel(aqi)
  
  return (
    <Badge variant={variant} className={className} {...props}>
      {showLabel ? label : aqi}
    </Badge>
  )
}

export { Badge, AQIBadge, badgeVariants, getAQIBadgeVariant, getAQILabel }