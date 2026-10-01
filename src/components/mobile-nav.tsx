"use client"

import { useState } from "react"
import { List } from "@phosphor-icons/react"

import { AppLogo } from "@/components/logo"
import { SidebarNav } from "@/components/sidebar-nav"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

/** Menu de la barre mobile (< md) : ouvre dans un Sheet le même `SidebarNav` que le sidebar
 * desktop. Se referme au clic sur un lien ; focus piégé puis restauré par Radix. */
export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
          <List className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      {/* Pas de description : `aria-describedby={undefined}` le déclare à Radix. */}
      <SheetContent
        side="left"
        aria-describedby={undefined}
        className="flex w-64 flex-col bg-sidebar p-0 text-sidebar-foreground"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <AppLogo size={26} />
          <SheetTitle className="text-base font-semibold text-sidebar-foreground">Mon App</SheetTitle>
        </div>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
