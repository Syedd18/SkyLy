import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "cta"
  size?: "default" | "sm" | "lg" | "xl" | "icon"
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
          "ring-offset-background transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.98]",
          // Variants
          {
            // Default - Primary with subtle hover lift
            "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:shadow-sm": variant === "default",
            
            // Destructive - Red
            "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md": variant === "destructive",
            
            // Outline - Border with transparent bg
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 shadow-sm": variant === "outline",
            
            // Secondary - Subtle background
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm": variant === "secondary",
            
            // Ghost - No background
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
            
            // Link - Text only
            "text-primary underline-offset-4 hover:underline": variant === "link",
            
            // CTA - Call-to-action with elevated presence (replaces old glow)
            "bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.04] active:shadow-md": variant === "cta",
          },
          // Sizes
          {
            "h-10 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-11 rounded-lg px-6": size === "lg",
            "h-12 rounded-xl px-8 text-base": size === "xl",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        {!isLoading && leftIcon && (
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            {leftIcon}
          </span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }