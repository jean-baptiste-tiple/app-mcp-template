import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Section } from "./section"

export function TabsSection() {
  return (
    <Section title="Tabs">
      <Tabs defaultValue="overview" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="analytics">Analytique</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Contenu de l&apos;onglet vue d&apos;ensemble. Les tabs permettent de naviguer entre
                différentes sections.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Contenu analytique avec graphiques et métriques.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Paramètres de configuration.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Section>
  )
}

export function AccordionSection() {
  return (
    <Section title="Accordion">
      <Accordion type="single" collapsible className="max-w-2xl">
        <AccordionItem value="item-1">
          <AccordionTrigger>Comment fonctionne la facturation ?</AccordionTrigger>
          <AccordionContent>
            La facturation est mensuelle. Vous pouvez changer ou annuler votre plan à tout moment
            depuis les paramètres.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Puis-je inviter mon équipe ?</AccordionTrigger>
          <AccordionContent>
            Oui, vous pouvez inviter des membres depuis la page Équipe. Chaque membre supplémentaire
            est facturé selon votre plan.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Comment exporter mes données ?</AccordionTrigger>
          <AccordionContent>
            Rendez-vous dans Paramètres &gt; Données &gt; Exporter. Vous pouvez exporter en CSV ou
            JSON.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Section>
  )
}
