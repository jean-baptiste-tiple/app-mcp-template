"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NAV_ITEMS, isNavItemActive } from "@/components/nav-items"
import { cn } from "@/lib/utils/cn"

interface SidebarNavProps {
  /** Appelé au clic sur un lien : le menu mobile s'en sert pour se refermer. */
  onNavigate?: () => void
}

/** Liens du sidebar, partagés par le sidebar desktop et le menu mobile. Item actif = fond
 * `sidebar-accent` + icône pleine + `aria-current`. Client pour usePathname (état actif).
 * Items : `@/components/nav-items`. */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Navigation principale" className="flex flex-1 flex-col overflow-y-auto p-3 pt-4">
      <div className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(href, pathname)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" weight={active ? "fill" : "regular"} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
