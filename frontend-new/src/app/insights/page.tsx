"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Heart, 
  Shield, 
  Activity, 
  AlertTriangle, 
  Baby,
  Users,
  Stethoscope,
  Wind,
  Sun,
  Moon,
  CheckCircle2,
  XCircle,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// AQI Categories with comprehensive information
const aqiCategories = [
  {
    range: "0-50",
    label: "Good",
    color: "bg-aqi-good",
    textColor: "text-aqi-good",
    bgLight: "bg-aqi-good/10",
    description: "Air quality is satisfactory, and air pollution poses little or no risk.",
    healthImplication: "None expected for the general population.",
    recommendation: "Enjoy outdoor activities freely.",
    icon: CheckCircle2
  },
  {
    range: "51-100",
    label: "Moderate",
    color: "bg-aqi-moderate",
    textColor: "text-aqi-moderate",
    bgLight: "bg-aqi-moderate/10",
    description: "Air quality is acceptable. However, there may be a risk for some people.",
    healthImplication: "Unusually sensitive individuals may experience respiratory symptoms.",
    recommendation: "Consider reducing prolonged outdoor exertion if sensitive.",
    icon: Shield
  },
  {
    range: "101-150",
    label: "Unhealthy for Sensitive Groups",
    color: "bg-aqi-sensitive",
    textColor: "text-aqi-sensitive",
    bgLight: "bg-aqi-sensitive/10",
    description: "Members of sensitive groups may experience health effects.",
    healthImplication: "Respiratory symptoms possible in sensitive groups; possible aggravation of heart or lung disease.",
    recommendation: "Sensitive groups should reduce prolonged outdoor exertion.",
    icon: AlertTriangle
  },
  {
    range: "151-200",
    label: "Unhealthy",
    color: "bg-aqi-unhealthy",
    textColor: "text-aqi-unhealthy",
    bgLight: "bg-aqi-unhealthy/10",
    description: "Everyone may begin to experience health effects.",
    healthImplication: "Increased likelihood of respiratory symptoms in general public.",
    recommendation: "Everyone should limit prolonged outdoor exertion.",
    icon: AlertTriangle
  },
  {
    range: "201-300",
    label: "Very Unhealthy",
    color: "bg-aqi-very-unhealthy",
    textColor: "text-aqi-very-unhealthy",
    bgLight: "bg-aqi-very-unhealthy/10",
    description: "Health alert: everyone may experience more serious health effects.",
    healthImplication: "Significant aggravation of respiratory symptoms; cardiovascular effects.",
    recommendation: "Everyone should avoid prolonged outdoor exertion.",
    icon: XCircle
  },
  {
    range: "300+",
    label: "Hazardous",
    color: "bg-aqi-hazardous",
    textColor: "text-aqi-hazardous",
    bgLight: "bg-aqi-hazardous/10",
    description: "Health emergency: the entire population is likely to be affected.",
    healthImplication: "Serious health effects and impaired daily activities.",
    recommendation: "Everyone should avoid all outdoor exertion; stay indoors.",
    icon: XCircle
  }
]

// Health insights by category
const healthInsights = [
  {
    category: "General Population",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
    insights: [
      "Monitor AQI levels daily before planning outdoor activities",
      "Stay hydrated to help your body flush out toxins",
      "Wear N95 masks during high pollution episodes",
      "Keep indoor air clean with HEPA air purifiers"
    ]
  },
  {
    category: "Sensitive Groups",
    icon: Shield,
    color: "text-aqi-sensitive",
    bgColor: "bg-aqi-sensitive/10",
    insights: [
      "Children and elderly are more vulnerable to pollution",
      "People with asthma should keep medications accessible",
      "Those with heart conditions need extra precautions",
      "Pregnant women should minimize exposure to poor air"
    ]
  },
  {
    category: "Children & Infants",
    icon: Baby,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    insights: [
      "Children breathe faster, inhaling more pollutants per body weight",
      "Keep infants indoors when AQI exceeds 100",
      "Avoid playgrounds near busy roads during rush hours",
      "Ensure schools have proper air filtration systems"
    ]
  },
  {
    category: "Medical Conditions",
    icon: Stethoscope,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    insights: [
      "Long-term exposure increases respiratory disease risk",
      "Cardiovascular problems linked to poor air quality",
      "Pollution can worsen existing allergies and asthma",
      "Regular health checkups are crucial in polluted areas"
    ]
  }
]

// Daily tips
const dailyTips = [
  {
    icon: Sun,
    title: "Morning Activities",
    description: "Check AQI before morning exercise. Early mornings often have better air quality in summer, but worse in winter due to inversions."
  },
  {
    icon: Activity,
    title: "Exercise Safely",
    description: "Exercise indoors when AQI exceeds 100. If outdoors, choose less polluted routes away from traffic."
  },
  {
    icon: Wind,
    title: "Ventilation",
    description: "Open windows when outdoor AQI is low. Use air purifiers with HEPA filters during high pollution days."
  },
  {
    icon: Moon,
    title: "Sleep Quality",
    description: "Keep bedroom air clean for better sleep. Poor air quality can affect sleep and recovery."
  }
]

// Insight Card Component
function InsightCard({ 
  category, 
  icon: Icon, 
  color, 
  bgColor, 
  insights,
  delay = 0
}: {
  category: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  insights: string[]
  delay?: number
}) {
  return (
    <Card 
      variant="interactive" 
      className="h-full animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className={cn("p-2 rounded-xl", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          {category}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {insights.map((insight, index) => (
            <li 
              key={index} 
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", color.replace('text-', 'bg-'))} />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8 sm:py-12 lg:py-16">
        <div className="space-y-12 sm:space-y-16">
          {/* Hero Section */}
          <section className="text-center space-y-4 animate-fade-in">
            <Badge variant="outline" className="px-4 py-1.5">
              <Heart className="h-3.5 w-3.5 mr-2" />
              Health & Safety
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Health Insights
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understanding how air quality affects your health and what you can do to protect yourself and your loved ones.
            </p>
          </section>

          {/* AQI Scale Section */}
          <section className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold mb-2">AQI Health Scale</h2>
              <p className="text-muted-foreground">
                Learn what each AQI level means for your health
              </p>
            </div>

            <div className="grid gap-4">
              {aqiCategories.map((cat, index) => {
                const Icon = cat.icon
                return (
                  <Card 
                    key={cat.range}
                    className={cn(
                      "overflow-hidden border-l-4 animate-fade-in-up",
                      cat.color.replace('bg-', 'border-')
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* AQI Badge */}
                        <div className={cn(
                          "shrink-0 w-24 py-2 rounded-lg text-center font-bold text-white",
                          cat.color
                        )}>
                          {cat.range}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className={cn("font-semibold text-lg", cat.textColor)}>
                              {cat.label}
                            </h3>
                            <Icon className={cn("h-4 w-4", cat.textColor)} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cat.description}
                          </p>
                          <div className="grid sm:grid-cols-2 gap-3 pt-2">
                            <div className={cn("p-3 rounded-lg", cat.bgLight)}>
                              <p className="text-xs font-medium mb-1">Health Implication</p>
                              <p className="text-xs text-muted-foreground">
                                {cat.healthImplication}
                              </p>
                            </div>
                            <div className={cn("p-3 rounded-lg", cat.bgLight)}>
                              <p className="text-xs font-medium mb-1">Recommendation</p>
                              <p className="text-xs text-muted-foreground">
                                {cat.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* Health Insights Grid */}
          <section className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold mb-2">Who&apos;s at Risk?</h2>
              <p className="text-muted-foreground">
                Different groups have different vulnerabilities to air pollution
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {healthInsights.map((insight, index) => (
                <InsightCard
                  key={insight.category}
                  {...insight}
                  delay={index * 100}
                />
              ))}
            </div>
          </section>

          {/* Daily Tips Section */}
          <section className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold mb-2">Daily Tips</h2>
              <p className="text-muted-foreground">
                Practical advice for living with air quality in mind
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dailyTips.map((tip, index) => {
                const Icon = tip.icon
                return (
                  <Card 
                    key={tip.title}
                    variant="glass"
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 75}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-4">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tip.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center py-8 sm:py-12">
            <Card variant="gradient" className="max-w-2xl mx-auto">
              <CardContent className="p-8 sm:p-12">
                <h2 className="text-2xl font-bold mb-4">
                  Check Your Local Air Quality
                </h2>
                <p className="text-muted-foreground mb-6">
                  Stay informed about the air quality in your city and make healthier decisions every day.
                </p>
                <Link href="/live">
                  <Button size="lg" className="gap-2 group">
                    View Live AQI
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}