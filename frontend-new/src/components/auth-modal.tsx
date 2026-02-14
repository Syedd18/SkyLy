"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, LogIn, AlertCircle, Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight, Loader2, CheckCircle2, Wind } from "lucide-react"
import { ProfileModal } from "@/components/profile-modal"
import { cn } from "@/lib/utils"

export function AuthModal() {
  const { user, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [success, setSuccess] = useState("")

  const clearMessages = () => { setError(""); setSuccess("") }

  if (isAuthenticated) {
    return (
      <ProfileModal 
        trigger={
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <User className="w-4 h-4" />}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
          </div>
        }
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { clearMessages(); setMode('login') } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden border-border/50">
        <DialogHeader className="sr-only">
          <DialogTitle>{mode === 'login' ? 'Sign In' : 'Create Account'}</DialogTitle>
          <DialogDescription>Sign in to save favorites and access personalized features.</DialogDescription>
        </DialogHeader>

        {/* Branding header */}
        <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent" />
          <div className="relative">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login' 
                ? 'Sign in to your SkyLy account' 
                : 'Join SkyLy for personalized air quality insights'}
            </p>
          </div>
        </div>

        {/* Form content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Google login */}
          <SocialLogin onError={setError} />
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">or</span>
            </div>
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <LoginForm 
              onSuccess={() => { setSuccess("Welcome back!"); setTimeout(() => setIsOpen(false), 600) }} 
              onError={setError} 
            />
          ) : (
            <RegisterForm 
              onSuccess={() => { setSuccess("Account created!"); setTimeout(() => setIsOpen(false), 600) }} 
              onError={setError} 
            />
          )}

          {/* Error/Success messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Mode switch */}
          <div className="text-center pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearMessages() }}
                className="ml-1 font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Login Form ─────────────────────────────────────────── */

function LoginForm({ onSuccess, onError }: { onSuccess: () => void; onError: (error: string) => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { onError("Please fill in all fields"); return }
    setLoading(true)
    onError("")
    const success = await login(email, password)
    if (success) { onSuccess() } else { onError("Invalid email or password. Please try again.") }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={emailRef}
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className="w-full h-11 pl-10 pr-11 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full h-11 rounded-lg font-medium text-sm text-white bg-primary transition-all",
          "hover:bg-primary/90 active:scale-[0.98]",
          "disabled:opacity-60 disabled:pointer-events-none",
          "flex items-center justify-center gap-2"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>Sign in <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
    </form>
  )
}

/* ─── Register Form ──────────────────────────────────────── */

function RegisterForm({ onSuccess, onError }: { onSuccess: () => void; onError: (error: string) => void }) {
  const { register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const passwordStrength = password.length === 0 ? 0 
    : password.length < 6 ? 1 
    : password.length < 8 ? 2 
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 
    : 3

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { onError("Please fill in all fields"); return }
    if (password.length < 6) { onError("Password must be at least 6 characters"); return }
    setLoading(true)
    onError("")
    const success = await register(name, email, password)
    if (success) { onSuccess() } else { onError("Registration failed. Email may already be in use.") }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-name" className="text-sm font-medium">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={nameRef}
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            autoComplete="name"
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-sm font-medium">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            autoComplete="new-password"
            className="w-full h-11 pl-10 pr-11 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {/* Password strength indicator */}
        {password.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    passwordStrength >= level ? strengthColor[passwordStrength] : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {strengthLabel[passwordStrength]}
            </p>
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full h-11 rounded-lg font-medium text-sm text-white bg-primary transition-all",
          "hover:bg-primary/90 active:scale-[0.98]",
          "disabled:opacity-60 disabled:pointer-events-none",
          "flex items-center justify-center gap-2"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>Create account <UserPlus className="h-4 w-4" /></>
        )}
      </button>
    </form>
  )
}

/* ─── Social Login ───────────────────────────────────────── */

function SocialLogin({ onError }: { onError: (error: string) => void }) {
  const { loginWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      await loginWithGoogle()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sign in with Google"
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={cn(
        "w-full h-11 rounded-lg border border-border bg-background text-sm font-medium transition-all",
        "hover:bg-muted/50 active:scale-[0.98]",
        "disabled:opacity-60 disabled:pointer-events-none",
        "flex items-center justify-center gap-3"
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  )
}