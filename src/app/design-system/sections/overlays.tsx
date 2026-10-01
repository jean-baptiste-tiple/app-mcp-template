import {
  CaretRight,
  CreditCard,
  Gear,
  MagnifyingGlass,
  Plus,
  Trash,
  UploadSimple,
  User,
} from "@phosphor-icons/react/dist/ssr"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Section } from "./section"

export function OverlaysSection() {
  return (
    <Section title="Overlays">
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Ouvrir Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer l&apos;action</DialogTitle>
              <DialogDescription>
                Voulez-vous vraiment effectuer cette action ? Cette opération peut être annulée.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Annuler</Button>
              <Button>Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Ouvrir Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Panneau latéral</SheetTitle>
              <SheetDescription>
                Utilisé pour les détails, formulaires d&apos;édition ou navigation secondaire.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sheet-name">Nom</Label>
                <Input id="sheet-name" placeholder="Entrez un nom..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sheet-email">Email</Label>
                <Input id="sheet-email" placeholder="email@example.com" />
              </div>
              <Button className="w-full">Sauvegarder</Button>
            </div>
          </SheetContent>
        </Sheet>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Dropdown Menu
              <CaretRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" aria-hidden="true" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Gear className="mr-2 h-4 w-4" aria-hidden="true" /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" /> Facturation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash className="mr-2 h-4 w-4" aria-hidden="true" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Rechercher">
              <MagnifyingGlass className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Rechercher (Ctrl+K)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </Section>
  )
}

export function EmptyStateSection() {
  return (
    <Section title="Empty State">
      <EmptyState
        icon={<UploadSimple className="h-6 w-6" aria-hidden="true" />}
        heading="Aucun fichier"
        description="Commencez par importer vos premiers fichiers pour les voir apparaître ici."
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Importer
          </Button>
        }
      />
    </Section>
  )
}
