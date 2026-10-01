import { ThemeToggle } from "@/components/theme-toggle"
import { PageContainer } from "@/components/page-container"
import { TooltipProvider } from "@/components/ui/tooltip"

import { ColorsSection, TypographySection, SpacingRadiusSection } from "./sections/foundations"
import { ButtonsSection, BadgesSection, FormsSection } from "./sections/controls"
import { CardsSection, StatCardsSection } from "./sections/data-display"
import { TableSection, AvatarsSection } from "./sections/tables"
import { AlertsSection, FeedbackSection } from "./sections/feedback"
import { TabsSection, AccordionSection } from "./sections/navigation"
import { OverlaysSection, EmptyStateSection } from "./sections/overlays"

export default function DesignSystemPage() {
  return (
    <TooltipProvider>
      {/* Cible du lien d'évitement du root layout (hors du route group, pas de sidebar ici). */}
      <main id="main-content">
        <PageContainer
          heading="Design System"
          description="Composants et tokens du thème neutre — la marque se pose dans le bloc « THÈME PROJET » de globals.css."
        >
          <div className="mb-6 flex items-center justify-end">
            <ThemeToggle />
          </div>

          <div className="space-y-12">
            <ColorsSection />
            <TypographySection />
            <SpacingRadiusSection />
            <ButtonsSection />
            <BadgesSection />
            <FormsSection />
            <CardsSection />
            <StatCardsSection />
            <TableSection />
            <AvatarsSection />
            <AlertsSection />
            <FeedbackSection />
            <TabsSection />
            <AccordionSection />
            <OverlaysSection />
            <EmptyStateSection />
          </div>
        </PageContainer>
      </main>
    </TooltipProvider>
  )
}
