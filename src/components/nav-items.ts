import type { Icon } from "@phosphor-icons/react"
import { PlugsConnected, SquaresFour } from "@phosphor-icons/react"

// Navigation de l'app — source UNIQUE des liens du sidebar (desktop et menu mobile).
// PERSONNALISER par projet : ajouter les routes du produit (icônes Phosphor).
export interface NavItem {
  href: string
  label: string
  icon: Icon
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: SquaresFour },
  // Onboarding du canal MCP (mcp-patterns §9) : URL du serveur + guide par host.
  { href: "/connect", label: "Connecter l'assistant", icon: PlugsConnected },
]

/** Item actif : correspondance exacte pour la racine, segment entier sinon
 * (`/projets` est actif sur `/projets/42`, pas sur `/projets-archives`). */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
