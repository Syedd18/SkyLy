"use client"

import Link from "next/link"
import { Wind, Github, Linkedin, Mail, Heart, ExternalLink } from "lucide-react"

const footerLinks = {
  product: [
    { name: "Live AQI", href: "/live" },
    { name: "City Comparison", href: "/compare" },
    { name: "Nearby Stations", href: "/nearby" },
    { name: "Predictions", href: "/predict" },
    { name: "Rankings", href: "/ranking" },
  ],
  resources: [
    { name: "Health Insights", href: "/insights" },
    { name: "About Us", href: "/about" },
    { name: "API Documentation", href: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/docs` : "/docs", external: true },
    { name: "Data Sources", href: "/about#data-sources" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ],
}

const socialLinks = [
  { name: "GitHub", icon: Github, href: "https://github.com/Syedd18/SkyLy" },
  { name: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/in/syed-muhammad-rizvi-477b85234/" },
  { name: "Email", icon: Mail, href: "mailto:skylycontactme@gmail.com" },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden border-t border-border/40 bg-background/80 backdrop-blur-xl">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="absolute -left-40 -bottom-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24">
        {/* Main footer content */}
        <div className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand section */}
          <div className="lg:col-span-2">
            <Link href="/" className="group inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                <Wind className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">SkyLy</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
              Your trusted companion for real-time air quality monitoring. 
              Stay informed, breathe better, live healthier.
            </p>
            
            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target={social.name === "Email" ? undefined : "_blank"}
                  rel={social.name === "Email" ? undefined : "noopener noreferrer"}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-all hover:bg-primary hover:text-white hover:scale-105"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            {/* Contact box */}
            <div className="mt-6 rounded-lg border border-border/40 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>Contact Us</span>
              </div>
              <a 
                href="mailto:skylycontactme@gmail.com"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                skylycontactme@gmail.com
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Product
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                    {link.external && <ExternalLink className="h-3 w-3" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 py-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {currentYear} SkyLy. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="h-4 w-4 fill-red-500 text-red-500" /> for a cleaner world
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
