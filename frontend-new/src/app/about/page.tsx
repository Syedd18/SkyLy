"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Wind, 
  Shield, 
  Users, 
  Globe, 
  Zap,
  BarChart3,
  Heart,
  Code,
  ArrowRight,
  CheckCircle2,
  Satellite,
  Activity
} from "lucide-react"
import Link from "next/link"

// Team members
const team = [
  {
    name: "Syed Muhammad Rizvi",
    role: "Full Stack Developer",
    description: "Backend architecture, API development, and data integration",
    icon: Code
  },
  {
    name: "Ishan Singh",
    role: "Frontend Developer",
    description: "UI/UX design, frontend development, and user experience",
    icon: Code
  }
]

// Data sources
const dataSources = [
  {
    name: "WAQI API",
    description: "World Air Quality Index real-time data",
    icon: Globe,
    type: "Primary"
  },
  {
    name: "Open-Meteo",
    description: "Satellite-based weather and air quality data",
    icon: Satellite,
    type: "Satellite"
  },
  {
    name: "Government Stations",
    description: "CPCB monitoring stations across India",
    icon: Activity,
    type: "Ground"
  }
]

// Features
const features = [
  {
    icon: Zap,
    title: "Real-time Updates",
    description: "Live AQI data refreshed every hour from monitoring stations"
  },
  {
    icon: BarChart3,
    title: "Historical Analytics",
    description: "Track trends and patterns in air quality over time"
  },
  {
    icon: Shield,
    title: "Health Insights",
    description: "Personalized recommendations based on AQI levels"
  },
  {
    icon: Heart,
    title: "Favorites & Alerts",
    description: "Track your favorite cities and stay informed"
  }
]

// How it works steps
const howItWorks = [
  {
    step: 1,
    title: "Data Collection",
    description: "We aggregate data from monitoring stations, satellite observations, and weather APIs to provide comprehensive coverage."
  },
  {
    step: 2,
    title: "Real-time Processing",
    description: "Advanced algorithms process and validate data in real-time to calculate accurate AQI values."
  },
  {
    step: 3,
    title: "Health Analysis",
    description: "We analyze air quality levels and generate personalized health recommendations for different groups."
  },
  {
    step: 4,
    title: "User Delivery",
    description: "Clean, intuitive interface delivers actionable insights to help you make informed decisions."
  }
]

// Feature card component
function FeatureCard({ 
  icon: Icon, 
  title, 
  description,
  delay = 0
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  delay?: number
}) {
  return (
    <Card 
      variant="interactive" 
      className="text-center animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8 sm:py-12 lg:py-16">
        <div className="space-y-16 sm:space-y-24">
          {/* Hero Section */}
          <section className="text-center space-y-6 animate-fade-in">
            <Badge variant="outline" className="px-4 py-1.5">
              <Wind className="h-3.5 w-3.5 mr-2" />
              About SkyLy
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Empowering Communities with
              <span className="block text-primary mt-2">Clean Air Awareness</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              SkyLy is dedicated to providing accurate, real-time air quality information 
              to help individuals and communities make informed decisions about their health.
            </p>
          </section>

          {/* Mission Card */}
          <section className="relative">
            <Card className="overflow-hidden border-none bg-linear-to-br from-primary/5 to-primary/10">
              <CardContent className="p-8 sm:p-12 lg:p-16">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-bold">Our Mission</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      We believe that access to clean air is a fundamental right. Our mission 
                      is to democratize air quality information and empower everyone to breathe 
                      better through transparency, education, and real-time monitoring.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Real-time monitoring for informed decisions",
                        "Health-focused insights for all ages",
                        "Open data for community awareness",
                        "Tools for environmental advocacy"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                      <div className="relative p-8 rounded-3xl bg-card border shadow-xl">
                        <Wind className="h-24 w-24 text-primary mx-auto" />
                        <p className="text-center mt-4 font-semibold">Breathe Better</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Features Grid */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">What We Offer</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Comprehensive tools and features to help you stay informed about air quality
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <FeatureCard key={feature.title} {...feature} delay={i * 100} />
              ))}
            </div>
          </section>

          {/* How It Works */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From data collection to actionable insights in four simple steps
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {howItWorks.map((step, i) => (
                <Card 
                  key={step.step}
                  variant="glass"
                  className="relative animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {step.step}
                      </span>
                      {i < howItWorks.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10" />
                      )}
                    </div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Data Sources */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Our Data Sources</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We aggregate data from trusted sources to ensure accuracy and reliability
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dataSources.map((source, i) => {
                const Icon = source.icon
                return (
                  <Card 
                    key={source.name}
                    variant="interactive"
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {source.type}
                        </Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* Team Section */}
          <section className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Meet the Team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The passionate developers behind SkyLy
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {team.map((member, i) => {
                const Icon = member.icon
                return (
                  <Card 
                    key={member.name}
                    variant="interactive"
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-sm text-primary font-medium">{member.role}</p>
                      <p className="text-sm text-muted-foreground mt-2">{member.description}</p>
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
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4">
                  Join Our Community
                </h2>
                <p className="text-muted-foreground mb-6">
                  Start monitoring air quality in your city today and make 
                  informed decisions for a healthier life.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/live">
                    <Button size="lg" className="gap-2 group w-full sm:w-auto">
                      Get Started
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link href="/insights">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}