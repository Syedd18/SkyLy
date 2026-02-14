"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Sparkles, CalendarDays, TrendingUp, BarChart3, AlertTriangle } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

function getAQICategory(aqi: number) {
  if (aqi <= 50) return { label: "Good", cssVar: "--aqi-good", color: "#22c55e" }
  if (aqi <= 100) return { label: "Moderate", cssVar: "--aqi-moderate", color: "#eab308" }
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", cssVar: "--aqi-unhealthy-sensitive", color: "#f97316" }
  if (aqi <= 200) return { label: "Unhealthy", cssVar: "--aqi-unhealthy", color: "#ef4444" }
  if (aqi <= 300) return { label: "Very Unhealthy", cssVar: "--aqi-very-unhealthy", color: "#a855f7" }
  return { label: "Hazardous", cssVar: "--aqi-hazardous", color: "#7f1d1d" }
}

interface ForecastPoint {
  city: string
  target_date: string
  predicted_aqi: number | null
  category?: string
  confidence?: { low: number; high: number }
  model_version?: string
  data_source?: string
  latest_aqi?: number | null
  weather?: { temp: number; humidity: number; wind_speed: number }
  cluster_id?: number
  error?: string
}

// ================================================
// Tab: ML-Based City Forecast
// ================================================
function ForecastTab() {
  const [city, setCity] = useState("")
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [forecasts, setForecasts] = useState<ForecastPoint[]>([])
  const [error, setError] = useState<string | null>(null)

  const popularCities = [
    "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata",
    "Hyderabad", "Pune", "Ahmedabad", "Lucknow", "Jaipur",
  ]

  const handleForecast = async () => {
    if (!city.trim()) {
      setError("Please enter a city name")
      return
    }

    setLoading(true)
    setError(null)
    setForecasts([])

    try {
      const params = new URLSearchParams({
        city: city.trim(),
        days: days.toString(),
      })
      const res = await fetch(`${API_BASE_URL}/api/intelligence/forecast?${params}`)
      if (res.ok) {
        const data = await res.json()
        setForecasts(data.forecasts || [])
      } else {
        const err = await res.json().catch(() => ({ detail: "Forecast failed" }))
        setError(err.detail || "Forecast failed. Please try again.")
      }
    } catch (err) {
      console.error("Forecast error:", err)
      setError("Error connecting to server. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const chartData = forecasts
    .filter((f) => f.predicted_aqi !== null)
    .map((f) => ({
      date: new Date(f.target_date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      aqi: f.predicted_aqi,
      low: f.confidence?.low ?? 0,
      high: f.confidence?.high ?? 0,
      category: f.category ?? "",
    }))

  const maxAqi = Math.max(...chartData.map((d) => d.high || d.aqi || 0), 100)
  const avgAqi =
    chartData.length > 0
      ? Math.round(chartData.reduce((s, d) => s + (d.aqi ?? 0), 0) / chartData.length)
      : null

  return (
    <div className="space-y-6">
      {/* City Input */}
      <Card className="shadow-lg">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
            <CalendarDays className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <span>City & Forecast Range</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">City Name</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Delhi, Mumbai, Bangalore..."
                className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                onKeyDown={(e) => e.key === "Enter" && handleForecast()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Days</label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                {[3, 5, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick city chips */}
          <div className="flex flex-wrap gap-2">
            {popularCities.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  city === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleForecast}
              disabled={loading}
              className="w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm md:text-base"
            >
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              <span>{loading ? "Forecasting..." : "Get Forecast"}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Chart */}
      {chartData.length > 0 && (
        <Card className="shadow-xl border-2 border-primary/20 animate-in fade-in duration-500">
          <CardHeader className="px-4 md:px-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg md:text-xl">
                {city} — {days}-Day AQI Forecast
              </CardTitle>
              {avgAqi !== null && (
                <Badge
                  className="text-white text-sm px-3 py-1"
                  style={{
                    backgroundColor: getAQICategory(avgAqi).color,
                  }}
                >
                  Avg: {avgAqi} ({getAQICategory(avgAqi).label})
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, Math.ceil(maxAqi * 1.1)]} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload
                      const cat = getAQICategory(d.aqi)
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-semibold mb-1">{label}</p>
                          <p>
                            AQI: <strong style={{ color: cat.color }}>{d.aqi}</strong>
                          </p>
                          <p className="text-muted-foreground">
                            Range: {d.low} – {d.high}
                          </p>
                          <p style={{ color: cat.color }}>{cat.label}</p>
                        </div>
                      )
                    }}
                  />
                  {/* Confidence band */}
                  <Area
                    type="monotone"
                    dataKey="high"
                    stroke="none"
                    fill="url(#confidenceGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    stroke="none"
                    fill="transparent"
                  />
                  {/* Main AQI line */}
                  <Area
                    type="monotone"
                    dataKey="aqi"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#aqiGradient)"
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 6 }}
                  />
                  {/* Threshold lines */}
                  <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <ReferenceLine y={100} stroke="#eab308" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <ReferenceLine y={150} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day-by-day cards */}
      {forecasts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {forecasts
            .filter((f) => f.predicted_aqi !== null)
            .map((f, i) => {
              const cat = getAQICategory(f.predicted_aqi!)
              const dateStr = new Date(f.target_date).toLocaleDateString("en-IN", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
              return (
                <Card key={i} className="overflow-hidden">
                  <div
                    className="h-1.5"
                    style={{ backgroundColor: cat.color }}
                  />
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">{dateStr}</p>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-3xl font-bold"
                        style={{ color: cat.color }}
                      >
                        {f.predicted_aqi}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                        style={{ backgroundColor: cat.color + "20", color: cat.color }}
                      >
                        {cat.label}
                      </Badge>
                    </div>
                    {f.confidence && (
                      <p className="text-xs text-muted-foreground">
                        Range: {f.confidence.low} – {f.confidence.high}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}

      {/* Model info footer */}
      {forecasts.length > 0 && forecasts[0] && (
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            Model: {forecasts[0].model_version || "xgb-v2"} · 
            {forecasts[0].data_source === "database" ? (
              <span className="text-green-600 font-medium">Using live AQI + weather data from Supabase</span>
            ) : (
              <span>Historical CSV data (live data unavailable)</span>
            )}
            {forecasts[0].cluster_id !== undefined && ` · Cluster ${forecasts[0].cluster_id}`}
          </p>
          {forecasts[0].latest_aqi && (
            <p className="text-xs text-muted-foreground">
              Current AQI (highest station): <span className="font-semibold text-foreground">{forecasts[0].latest_aqi}</span>
              {forecasts[0].weather && (
                <> · Temp: {forecasts[0].weather.temp}°C, Humidity: {forecasts[0].weather.humidity}%, Wind: {forecasts[0].weather.wind_speed} m/s</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ================================================
// Tab: Pollutant-Based Predictor (legacy)
// ================================================
function PollutantTab() {
  const [pm25, setPm25] = useState("")
  const [pm10, setPm10] = useState("")
  const [no2, setNo2] = useState("")
  const [so2, setSo2] = useState("")
  const [co, setCo] = useState("")
  const [o3, setO3] = useState("")
  const [predicted, setPredicted] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePredict = async () => {
    if (!pm25 && !pm10 && !no2 && !so2 && !co && !o3) {
      alert("Please enter at least one pollutant value")
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        pm25: pm25 || "0",
        pm10: pm10 || "0",
        no2: no2 || "0",
        so2: so2 || "0",
        co: co || "0",
        o3: o3 || "0",
      })
      const res = await fetch(`${API_BASE_URL}/predict?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPredicted(data.predicted_aqi)
      } else {
        alert("Prediction failed. Please try again.")
      }
    } catch (err) {
      console.error("Prediction error:", err)
      alert("Error connecting to server")
    } finally {
      setLoading(false)
    }
  }

  const category = predicted ? getAQICategory(predicted) : null

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="flex items-center space-x-2 text-base md:text-lg">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <span>Enter Pollutant Values</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              { label: "PM2.5 (μg/m³)", value: pm25, set: setPm25 },
              { label: "PM10 (μg/m³)", value: pm10, set: setPm10 },
              { label: "NO₂ (ppb)", value: no2, set: setNo2 },
              { label: "SO₂ (ppb)", value: so2, set: setSo2 },
              { label: "CO (ppm)", value: co, set: setCo },
              { label: "O₃ (ppb)", value: o3, set: setO3 },
            ].map(({ label, value, set }) => (
              <div key={label} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-6 md:mt-8">
            <button
              onClick={handlePredict}
              disabled={loading}
              className="w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm md:text-base"
            >
              <Brain className="h-4 w-4 md:h-5 md:w-5" />
              <span>{loading ? "Calculating..." : "Predict AQI"}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {predicted !== null && (
        <Card className="shadow-xl border-2 border-primary/20 animate-in fade-in duration-500">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-center text-lg md:text-xl lg:text-2xl">Prediction Result</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 md:space-y-6 py-4 md:py-8">
              <div className="text-center space-y-3 md:space-y-4">
                <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wide">
                  Predicted AQI
                </p>
                <div
                  className="text-6xl md:text-7xl lg:text-8xl font-bold"
                  style={{ color: category ? `rgb(var(${category.cssVar}))` : undefined }}
                >
                  {predicted}
                </div>
                <Badge
                  className="text-white text-base md:text-lg px-4 md:px-6 py-1.5 md:py-2"
                  style={{ backgroundColor: category ? `rgb(var(${category.cssVar}))` : undefined }}
                >
                  {category?.label}
                </Badge>
              </div>

              <div className="w-full max-w-md pt-4 md:pt-6 border-t">
                <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="font-semibold">Weighted Formula</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Note:</span>
                    <span className="font-semibold text-muted-foreground text-xs">Based on pollutant weights</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ================================================
// Main Page
// ================================================
export default function PredictPage() {
  const [tab, setTab] = useState<"forecast" | "pollutant">("forecast")

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-6 md:py-12">
        <div className="space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 md:space-y-3">
            <div className="flex items-center justify-center space-x-2 mb-2 md:mb-4">
              <Brain className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                AQI Predictor
              </h1>
            </div>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              {tab === "forecast"
                ? "Get AI-powered AQI forecasts for any Indian city using our trained XGBoost model"
                : "Enter pollutant values to estimate Air Quality Index"}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-border p-1 bg-muted/50">
              <button
                onClick={() => setTab("forecast")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === "forecast"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                ML Forecast
              </button>
              <button
                onClick={() => setTab("pollutant")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === "pollutant"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Pollutant Based
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {tab === "forecast" ? <ForecastTab /> : <PollutantTab />}
        </div>
      </main>
    </div>
  )
}