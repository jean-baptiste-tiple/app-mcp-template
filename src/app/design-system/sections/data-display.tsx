import { CreditCard, FileText, TrendUp, Users } from "@phosphor-icons/react/dist/ssr"

import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Section } from "./section"

export function CardsSection() {
  return (
    <Section title="Cards">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Description de la card avec du contexte.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contenu de la card. Les cards sont utilisées pour grouper des informations liées.
            </p>
          </CardContent>
          <CardFooter>
            <Button size="sm">Action</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
              Facturation
            </CardTitle>
            <CardDescription>Gérer votre abonnement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">49€/mois</div>
            <p className="text-xs text-muted-foreground">Plan Professionnel</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm">
              Changer
            </Button>
            <Button size="sm">Renouveler</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { text: "Nouveau commentaire", time: "2min" },
              { text: "Déploiement réussi", time: "1h" },
              { text: "Invitation acceptée", time: "3h" },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{n.text}</span>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

export function StatCardsSection() {
  return (
    <Section title="Stat Cards">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Utilisateurs"
          value="2,340"
          trend={{ value: 12, positive: true }}
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Revenus"
          value="45,200€"
          trend={{ value: 8.2, positive: true }}
          icon={<TrendUp className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          label="Tickets"
          value="23"
          trend={{ value: -3, positive: false }}
          icon={<FileText className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard label="Conversion" value="3.2%" description="Sur les 30 derniers jours" />
      </div>
    </Section>
  )
}
