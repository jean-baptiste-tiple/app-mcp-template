import { Gear } from "@phosphor-icons/react/dist/ssr"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Section } from "./section"

export function TableSection() {
  return (
    <Section title="Table">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { name: "Alice Martin", email: "alice@example.com", role: "Admin", status: "Actif" },
              { name: "Bob Dupont", email: "bob@example.com", role: "Membre", status: "Actif" },
              { name: "Claire Moreau", email: "claire@example.com", role: "Membre", status: "Inactif" },
            ].map((u) => (
              <TableRow key={u.email}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "Admin" ? "default" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.status === "Actif" ? "success" : "outline"}>{u.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" aria-label={`Paramètres de ${u.name}`}>
                    <Gear className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  )
}

export function AvatarsSection() {
  return (
    <Section title="Avatars">
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>AM</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>BD</AvatarFallback>
        </Avatar>
        <Avatar className="h-12 w-12">
          <AvatarFallback className="text-lg">JB</AvatarFallback>
        </Avatar>
      </div>
    </Section>
  )
}
