import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Search, X } from "lucide-react"

const inputVariants = cva(
  // Base styles with smooth transitions and modern feel
  "flex w-full rounded-xl border bg-background text-foreground transition-all duration-200 ease-out placeholder:text-muted-foreground/60 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-border/50 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        filled:
          "border-transparent bg-muted/50 hover:bg-muted focus-visible:bg-background focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
        ghost:
          "border-transparent hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:border-primary",
        error:
          "border-destructive/50 bg-destructive/5 hover:border-destructive focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20",
        success:
          "border-aqi-good/50 bg-aqi-good/5 hover:border-aqi-good focus-visible:border-aqi-good focus-visible:ring-2 focus-visible:ring-aqi-good/20",
      },
      inputSize: {
        sm: "h-9 px-3 text-sm",
        default: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        xl: "h-14 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
  success?: string
  hint?: string
  label?: string
  onClear?: () => void
  showClearButton?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      inputSize,
      leftIcon,
      rightIcon,
      error,
      success,
      hint,
      label,
      onClear,
      showClearButton,
      value,
      ...props
    },
    ref
  ) => {
    // Determine variant based on error/success state
    const computedVariant = error ? "error" : success ? "success" : variant

    // Calculate padding adjustments for icons
    const hasLeftIcon = !!leftIcon
    const hasRightContent = !!rightIcon || !!error || !!success || (showClearButton && value)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground/90 pl-1">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Left Icon */}
          {hasLeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            type={type}
            className={cn(
              inputVariants({ variant: computedVariant, inputSize }),
              hasLeftIcon && "pl-10",
              hasRightContent && "pr-10",
              className
            )}
            ref={ref}
            value={value}
            {...props}
          />

          {/* Right Content Area */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Clear Button */}
            {showClearButton && value && (
              <button
                type="button"
                onClick={onClear}
                className="p-0.5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            {/* Status Icons */}
            {error && (
              <AlertCircle className="h-4 w-4 text-destructive animate-fade-in" />
            )}
            {success && !error && (
              <CheckCircle2 className="h-4 w-4 text-aqi-good animate-fade-in" />
            )}
            
            {/* Custom Right Icon */}
            {rightIcon && !error && !success && (
              <span className="text-muted-foreground/60">{rightIcon}</span>
            )}
          </div>
        </div>

        {/* Helper Text */}
        {(error || success || hint) && (
          <p
            className={cn(
              "text-xs pl-1 animate-fade-in",
              error && "text-destructive",
              success && !error && "text-aqi-good",
              !error && !success && "text-muted-foreground"
            )}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Search Input - Specialized variant for search functionality
interface SearchInputProps extends Omit<InputProps, "leftIcon" | "type"> {
  onSearch?: (value: string) => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ onSearch, onClear, showClearButton = true, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="h-4 w-4" />}
        showClearButton={showClearButton}
        onClear={onClear}
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { Input, SearchInput, inputVariants }