"use client"

import { FileText, CheckCircle2, XCircle, AlertTriangle, Scale, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const sections = [
  {
    icon: CheckCircle2,
    title: "What You Can Do",
    items: [
      "Use SkyLy to view air quality data for personal, non-commercial purposes",
      "Save favorite cities and access personalized dashboards",
      "Share air quality information with proper attribution to SkyLy",
      "Use predictions and analytics for personal health decisions",
      "Access the AI chatbot for air quality-related questions",
    ],
  },
  {
    icon: XCircle,
    title: "What You Cannot Do",
    items: [
      "Scrape, crawl, or bulk-download data without prior written consent",
      "Use SkyLy data for commercial purposes without a license agreement",
      "Attempt to reverse-engineer our prediction models or algorithms",
      "Create misleading content by misrepresenting SkyLy data",
      "Interfere with or disrupt the service or its infrastructure",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Disclaimers",
    items: [
      "AQI data is sourced from third-party APIs and may have delays or inaccuracies",
      "Predictions are model-generated estimates and not guaranteed to be accurate",
      "Health advisories are general guidance — consult a doctor for medical decisions",
      "SkyLy is not liable for actions taken based on displayed data",
      "Service availability is provided on an 'as-is' basis without guarantees",
    ],
  },
  {
    icon: Scale,
    title: "Intellectual Property",
    items: [
      "The SkyLy brand, logo, and UI design are protected intellectual property",
      "Open-source components are used under their respective licenses",
      "User-generated content (e.g., saved preferences) remains your property",
      "Third-party data sources retain their own licensing terms",
    ],
  },
  {
    icon: RefreshCw,
    title: "Account & Changes",
    items: [
      "You are responsible for keeping your login credentials secure",
      "We reserve the right to suspend accounts that violate these terms",
      "Terms may be updated periodically — continued use implies acceptance",
      "We will notify registered users of significant changes via email",
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-10 xl:px-16 2xl:px-24">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Terms of Service
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
              By using SkyLy, you agree to the following terms. Please read them carefully.
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
