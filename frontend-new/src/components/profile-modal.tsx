"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import { 
  User, MapPin, Bell, BellOff, Mail, Calendar, LogOut, ChevronDown, Star,
  Monitor, Sun, Moon, Languages, Globe
} from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface FavoriteCity {
  city: string
}

interface ProfileDropdownProps {
  trigger: React.ReactNode
}

export function ProfileModal({ trigger }: ProfileDropdownProps) {
  const { user, token, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteCity[]>([])
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowFavorites(false)
        setShowPreferences(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchFavorites = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites(data.favorites || [])
      }
    } catch { /* silently fail */ }
  }, [token])

  useEffect(() => {
    if (isOpen && token && !favorites.length) {
      fetchFavorites()
    }
  }, [isOpen, token, favorites.length, fetchFavorites])

  // Load notification preferences
  useEffect(() => {
    const prefs = localStorage.getItem('notification_prefs')
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs)
        setEmailNotifications(parsed.email ?? true)
      } catch { /* ignore */ }
    }
  }, [])

  const toggleNotifications = () => {
    const newValue = !emailNotifications
    setEmailNotifications(newValue)
    localStorage.setItem('notification_prefs', JSON.stringify({ email: newValue }))
  }

  // Get account creation date from user data or when stored
  const getAccountInfo = () => {
    // Try to get from localStorage where we store it on register/login
    const stored = localStorage.getItem('user_account_info')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch { /* ignore */ }
    }
    return { createdAt: null, id: user?.id }
  }

  const accountInfo = getAccountInfo()
  const memberSince = accountInfo.createdAt 
    ? new Date(accountInfo.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'Recently'

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </button>

      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          onClick={() => { setIsOpen(false); setShowFavorites(false); setShowPreferences(false) }}
        />
      )}

      {isOpen && (
        <div className={cn(
          "z-50",
          // Mobile: fixed positioning relative to viewport
          "fixed top-14 left-3 right-3",
          // Desktop: absolute dropdown from button
          "sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2",
          "sm:w-72",
          "bg-background border border-border rounded-xl shadow-xl",
          "overflow-hidden animate-fade-in-up",
          "max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-100px)] flex flex-col"
        )}>
          {showPreferences ? (
            /* Preferences view */
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <button 
                  onClick={() => setShowPreferences(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                <h3 className="text-sm font-medium">Preferences</h3>
                <div className="w-12" />
              </div>
              <div className="overflow-y-auto flex-1">
                <div className="p-4 space-y-4">
                  {/* Theme preference */}
                  {mounted && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Appearance
                      </h4>
                      <div className="space-y-1">
                        {[
                          { value: 'light', label: 'Light', icon: Sun },
                          { value: 'dark', label: 'Dark', icon: Moon },
                          { value: 'system', label: 'System', icon: Monitor },
                        ].map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            onClick={() => setTheme(value)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                              theme === value 
                                ? "bg-primary/10 text-primary border border-primary/20" 
                                : "hover:bg-muted/50 border border-transparent"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{label}</span>
                            {theme === value && (
                              <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notifications */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Notifications
                    </h4>
                    <button
                      onClick={toggleNotifications}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {emailNotifications ? (
                          <Bell className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <BellOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">Email Alerts</span>
                      </div>
                      <div className={cn(
                        "w-9 h-5 rounded-full transition-colors flex items-center px-0.5",
                        emailNotifications ? "bg-primary" : "bg-muted-foreground/30"
                      )}>
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white shadow transition-transform",
                          emailNotifications ? "translate-x-4" : "translate-x-0"
                        )} />
                      </div>
                    </button>
                  </div>

                  {/* Data & Privacy */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Data & Privacy
                    </h4>
                    <div className="space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Location Services</span>
                        <span className="ml-auto text-xs text-muted-foreground">On</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
                        <Languages className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Language</span>
                        <span className="ml-auto text-xs text-muted-foreground">English</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : showFavorites ? (
            /* Favorites view */
            <>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <button 
                  onClick={() => setShowFavorites(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
                <h3 className="text-sm font-medium">Favourites</h3>
                <span className="text-xs text-muted-foreground">{favorites.length}</span>
              </div>
              <div className="overflow-y-auto flex-1">
                {favorites.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No favourites yet</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {favorites.map((fav) => (
                      <div 
                        key={fav.city}
                        className="px-4 py-2.5 hover:bg-muted/50 flex items-center gap-2 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate">{fav.city}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Main menu */
            <>
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {user?.name ? getInitials(user.name) : <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{memberSince}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 flex-shrink-0" />
                    <span>{favorites.length} saved</span>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1 overflow-y-auto flex-1">
                <button
                  onClick={() => setShowFavorites(true)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">Favourite Cities</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{favorites.length}</span>
                </button>

                <button
                  onClick={() => setShowPreferences(true)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                >
                  {mounted && theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : mounted && theme === 'light' ? (
                    <Sun className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">Preferences</span>
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-border py-1 flex-shrink-0">
                <button
                  onClick={() => { logout(); setIsOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Log out</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
