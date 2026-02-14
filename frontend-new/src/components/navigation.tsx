"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { 
  Moon, 
  Sun, 
  Wind, 
  Menu, 
  X, 
  Home,
  Activity,
  Map,
  BarChart3,
  TrendingUp,
  GitCompare,
  MapPin,
  Brain,
  Heart,
  Info,
  ChevronDown
} from "lucide-react"
import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/auth-modal"
import Chatbot from "@/components/chatbot"
import { cn } from "@/lib/utils"

// Navigation link configuration for easy maintenance
const primaryNavLinks = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/live", label: "Live AQI", icon: Activity },
  { href: "/map", label: "India Map", icon: Map },
  { href: "/ranking", label: "Rankings", icon: BarChart3 },
]

const secondaryNavLinks = [
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/nearby", label: "Nearby", icon: MapPin },
  { href: "/predict", label: "Predict", icon: Brain },
  { href: "/insights", label: "Health", icon: Heart },
  { href: "/about", label: "About", icon: Info },
]

// NavLink component with active state indicator
function NavLink({ 
  href, 
  label, 
  icon: Icon, 
  isActive,
  onClick,
  showIcon = false,
  className
}: { 
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  isActive?: boolean
  onClick?: () => void
  showIcon?: boolean
  className?: string
}) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={cn(
        "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
        "hover:bg-foreground/5 active:scale-[0.98]",
        "flex items-center gap-2",
        isActive 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {showIcon && Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-scale-in" />
      )}
    </Link>
  )
}

// Mobile NavLink with icon
function MobileNavLink({ 
  href, 
  label, 
  icon: Icon, 
  isActive,
  onClick,
  delay = 0
}: { 
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive?: boolean
  onClick?: () => void
  delay?: number
}) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        "hover:bg-foreground/5 active:scale-[0.98]",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-foreground",
        "animate-fade-in-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={cn(
        "p-2 rounded-lg",
        isActive ? "bg-primary/20" : "bg-muted"
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="font-medium">{label}</span>
      {isActive && (
        <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
      )}
    </Link>
  )
}

// Theme toggle with smooth animation
function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative h-9 w-9">
        <span className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 rounded-lg hover:bg-foreground/5"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className={cn(
        "h-4 w-4 transition-all duration-300",
        resolvedTheme === "dark" 
          ? "rotate-90 scale-0 opacity-0" 
          : "rotate-0 scale-100 opacity-100"
      )} />
      <Moon className={cn(
        "absolute h-4 w-4 transition-all duration-300",
        resolvedTheme === "dark" 
          ? "rotate-0 scale-100 opacity-100" 
          : "-rotate-90 scale-0 opacity-0"
      )} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export function Navigation() {
  const pathname = usePathname()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Track scroll for navbar elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMoreMenuOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const isSecondaryActive = secondaryNavLinks.some(link => isActive(link.href))

  return (
    <>
      <nav 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          "border-b border-border/40",
          scrolled 
            ? "bg-background/80 backdrop-blur-xl shadow-sm" 
            : "bg-background/60 backdrop-blur-md",
          "supports-[backdrop-filter]:bg-background/60"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-2.5 group"
            >
              <div className={cn(
                "p-1.5 rounded-xl bg-gradient-to-br from-primary to-primary/80",
                "group-hover:shadow-lg group-hover:shadow-primary/25",
                "transition-all duration-300"
              )}>
                <Wind className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Sky<span className="text-primary">Ly</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {primaryNavLinks.map(link => (
                <NavLink
                  key={link.href}
                  {...link}
                  isActive={isActive(link.href)}
                />
              ))}

              {/* More dropdown for secondary links */}
              <div className="relative" ref={menuRef}>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg",
                    "transition-all duration-200",
                    "hover:bg-foreground/5",
                    isSecondaryActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setMoreMenuOpen(s => !s)}
                  aria-expanded={moreMenuOpen}
                  aria-label="More navigation options"
                >
                  <span>More</span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    moreMenuOpen && "rotate-180"
                  )} />
                </button>

                {/* Dropdown menu with animation */}
                {moreMenuOpen && (
                  <div className={cn(
                    "absolute right-0 mt-2 w-56 py-2",
                    "bg-card/95 backdrop-blur-xl",
                    "border border-border/50 rounded-xl",
                    "shadow-xl shadow-black/5",
                    "animate-fade-in-up",
                    "origin-top-right"
                  )}>
                    {secondaryNavLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg",
                          "text-sm transition-all duration-200",
                          "hover:bg-foreground/5",
                          isActive(link.href)
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setMoreMenuOpen(false)}
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Desktop actions */}
              <div className="hidden md:flex items-center gap-1">
                <Chatbot inline />
                <AuthModal />
                <ThemeToggle />
              </div>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                <span className="relative h-5 w-5">
                  <Menu className={cn(
                    "absolute inset-0 transition-all duration-200",
                    mobileMenuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                  )} />
                  <X className={cn(
                    "absolute inset-0 transition-all duration-200",
                    mobileMenuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                  )} />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile menu panel */}
      <div className={cn(
        "fixed top-16 left-0 right-0 bottom-0 z-40 lg:hidden",
        "bg-background border-t border-border/50",
        "transform transition-transform duration-300 ease-out",
        mobileMenuOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-4 py-6 pb-4">
            {/* Primary navigation */}
            <div className="space-y-1 mb-6">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Main
              </p>
              {primaryNavLinks.map((link, i) => (
                <MobileNavLink
                  key={link.href}
                  {...link}
                  isActive={isActive(link.href)}
                  onClick={closeMobileMenu}
                  delay={i * 50}
                />
              ))}
            </div>

            {/* Secondary navigation */}
            <div className="space-y-1 mb-6">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Explore
              </p>
              {secondaryNavLinks.map((link, i) => (
                <MobileNavLink
                  key={link.href}
                  {...link}
                  isActive={isActive(link.href)}
                  onClick={closeMobileMenu}
                  delay={(primaryNavLinks.length + i) * 50}
                />
              ))}
            </div>
          </div>

          {/* Bottom actions - always visible, not overlapping */}
          <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background safe-bottom">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Chatbot inline />
                <AuthModal />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}