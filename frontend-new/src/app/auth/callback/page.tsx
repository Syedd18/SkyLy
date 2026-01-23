"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Processing authentication...")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("OAuth callback started")
        console.log("Full URL:", window.location.href)
        console.log("Hash:", window.location.hash)
        
        // Check if there's already a token in localStorage (from Supabase session)
        const existingToken = localStorage.getItem("auth_token")
        console.log("Existing token in localStorage:", existingToken ? "present" : "missing")
        
        // Get the Supabase access token from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const error = hashParams.get("error")
        const errorDescription = hashParams.get("error_description")

        console.log("Access Token:", accessToken ? `present (${accessToken.substring(0, 20)}...)` : "missing")
        console.log("Error:", error)

        if (error) {
          setStatus("error")
          setMessage(errorDescription || error)
          console.error("OAuth error:", error, errorDescription)
          return
        }

        if (!accessToken) {
          setStatus("error")
          setMessage("No access token found in callback URL")
          console.error("No access token in URL hash")
          return
        }

        // Exchange Supabase token with backend to create/get backend user and JWT
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
        console.log("Calling backend:", `${apiUrl}/api/auth/supabase-callback`)
        
        const response = await fetch(`${apiUrl}/api/auth/supabase-callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
          }),
        })

        console.log("Backend response status:", response.status)
        console.log("Backend response ok:", response.ok)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Failed to parse error" }))
          console.error("Backend error:", errorData)
          throw new Error(errorData.detail || "Failed to complete authentication")
        }

        const data = await response.json()
        console.log("Backend response data:", data)

        // Store backend JWT and user data with same keys as AuthContext
        if (data.access_token) {
          localStorage.setItem("auth_token", data.access_token)
        }
        if (data.user) {
          localStorage.setItem("user_data", JSON.stringify(data.user))
        }

        setStatus("success")
        setMessage("Authentication successful! Redirecting...")

        // Trigger a storage event to notify AuthContext
        window.dispatchEvent(new Event('storage'))

        // Redirect to home page after 1 second
        setTimeout(() => {
          router.push("/")
          router.refresh() // Force page refresh to update auth state
        }, 1000)
      } catch (error: any) {
        console.error("Auth callback error:", error)
        setStatus("error")
        setMessage(error.message || "Authentication failed")
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Authenticating..."}
            {status === "success" && "Success!"}
            {status === "error" && "Authentication Error"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center justify-center py-8 text-green-600">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center justify-center py-8 text-red-600">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
