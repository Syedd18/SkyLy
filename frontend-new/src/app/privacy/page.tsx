"use client"

import { Shield, Eye, Database, Lock, UserCheck, Bell, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const sections = [
  {
    icon: Eye,
    title: "Information We Collect",
    items: [
      "City search queries and location data when you use the 'Locate Me' feature",
      "Account information (name, email) when you register",
      "Favorite cities you save to your profile",
      "Usage analytics such as pages visited and features used",
    ],
  },
  {
    icon: Database,
    title: "How We Use Your Data",
    items: [
      "To display real-time and historical air quality information",
      "To personalize your experience with saved cities and preferences",
      "To improve our services, models, and user experience",
      "To send relevant air quality alerts if you opt in",
    ],
  },
  {
    icon: Lock,
    title: "Data Security",
    items: [
      "All data is transmitted over encrypted HTTPS connections",
      "Passwords are hashed using industry-standard algorithms",
      "We do not sell or share personal data with third parties",
      "Database access is restricted to authorized personnel only",
    ],
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    items: [
      "Access and download your personal data at any time",
      "Request deletion of your account and associated data",
      "Opt out of analytics tracking and email communications",
      "Update or correct your personal information",
    ],
  },
  {
    icon: Bell,
    title: "Cookies & Tracking",
    items: [
      "Essential cookies for authentication and session management",
      "Optional analytics cookies to understand usage patterns",
      "No third-party advertising cookies are used",
      "You can manage cookie preferences through your browser settings",
    ],
  },
  {
    icon: Mail,
    title: "Contact Us",
    items: [
      "For privacy-related inquiries, email us at privacy@skyly.app",
      "We respond to data access or deletion requests within 30 days",
      "Our data practices comply with applicable privacy regulations",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-10 xl:px-16 2xl:px-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Privacy Policy
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
              We value your privacy. This policy explains what data we collect, how we use it, and what rights you have.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Last updated: February 2026
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-10 xl:px-16 2xl:px-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Card key={section.title} className="border-border/40 bg-card/50">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="font-semibold text-sm sm:text-base">{section.title}</h2>
                </div>
                <ul className="space-y-2.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
