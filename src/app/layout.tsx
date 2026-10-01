import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

// Police du projet : une seule sans-serif, exposée en `--font-sans` sur <html>. Elle remplace
// la valeur par défaut de Tailwind, donc `font-sans` et le texte de base la suivent.
// Changer de police = changer cet import (docs/design/system.md, « Personnaliser le thème »).
const fontSans = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" })

export const metadata: Metadata = {
  title: {
    default: "Mon App",
    template: "%s | Mon App",
  },
  description: "Description du projet",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={fontSans.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Skip link : premier élément focusable, visible seulement au focus clavier
              (accessibility-patterns.md § Keyboard Navigation). Sa cible `#main-content` est
              portée par le <main> de chaque layout/page, APRÈS la navigation qu'il saute. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:ring-1 focus:ring-ring"
          >
            Aller au contenu principal
          </a>
          {children}
          {/* Sans ce Toaster monté à la racine, tout toast.success() est silencieux. */}
          <Toaster position="bottom-right" richColors visibleToasts={3} duration={5000} />
        </ThemeProvider>
      </body>
    </html>
  )
}
