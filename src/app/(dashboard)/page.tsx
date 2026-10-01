import { SquaresFour } from "@phosphor-icons/react/dist/ssr"
import { PageContainer } from "@/components/page-container"
import { EmptyState } from "@/components/empty-state"

export default function DashboardPage() {
  return (
    <PageContainer heading="Dashboard" description="Bienvenue sur votre espace.">
      <EmptyState
        icon={<SquaresFour className="h-6 w-6" />}
        heading="Prêt à démarrer"
        description="Ce dashboard sera personnalisé selon votre projet."
      />
    </PageContainer>
  )
}
