import { Section } from "./section"

export function ColorsSection() {
  return (
    <Section title="Couleurs">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { name: "Primary", cls: "bg-primary text-primary-foreground" },
          { name: "Primary Dark (texte)", cls: "bg-background text-primary-dark border" },
          { name: "Secondary", cls: "bg-secondary text-secondary-foreground" },
          { name: "Accent", cls: "bg-accent text-accent-foreground" },
          { name: "Muted", cls: "bg-muted text-muted-foreground" },
          { name: "Destructive", cls: "bg-destructive text-destructive-foreground" },
          { name: "Success", cls: "bg-success text-success-foreground" },
          { name: "Warning", cls: "bg-warning text-warning-foreground" },
          { name: "Card", cls: "bg-card text-card-foreground border" },
          { name: "Popover", cls: "bg-popover text-popover-foreground border" },
          { name: "Sidebar", cls: "bg-sidebar text-sidebar-foreground border" },
          { name: "Background", cls: "bg-background text-foreground border" },
          { name: "Border", cls: "bg-border text-foreground" },
        ].map((c) => (
          <div
            key={c.name}
            className={`flex h-20 items-end rounded-lg p-3 text-xs font-medium ${c.cls}`}
          >
            {c.name}
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-medium text-muted-foreground">Chart Colors</h3>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-10 w-10 rounded-md bg-chart-${i}`}
            style={{ backgroundColor: `var(--chart-${i})` }}
          />
        ))}
      </div>
    </Section>
  )
}

export function TypographySection() {
  return (
    <Section title="Typographie">
      <div className="space-y-3">
        {/* Spécimens en <p> : la page a déjà son h1 (un seul h1 par page, seo-patterns). */}
        <p className="text-4xl font-bold tracking-tight">Heading 1 : Bold</p>
        <p className="text-3xl font-semibold tracking-tight">Heading 2 : Semibold</p>
        <p className="text-2xl font-semibold tracking-tight">Heading 3 : Semibold</p>
        <p className="text-xl font-medium">Heading 4 : Medium</p>
        <p className="text-base leading-7">
          Body text : Regular, police du projet (variable --font-sans, Inter par défaut). Le thème
          neutre fournit des tokens cohérents pour couleurs, spacing et radius ; la marque se
          pose dans le bloc « THÈME PROJET » de globals.css.
        </p>
        <p className="text-sm text-muted-foreground">
          Texte secondaire : Small, muted. Utilisé pour les descriptions et les labels.
        </p>
        <p className="text-xs text-muted-foreground">
          Caption : Extra small, muted. Métadonnées, timestamps.
        </p>
      </div>
    </Section>
  )
}

export function SpacingRadiusSection() {
  return (
    <Section title="Spacing & Radius">
      <div className="flex flex-wrap items-end gap-4">
        {[1, 2, 3, 4, 6, 8, 10, 12, 16].map((s) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <div
              className="bg-primary/20 border border-primary/40"
              style={{ width: `${s * 4}px`, height: `${s * 4}px` }}
            />
            <span className="text-xs text-muted-foreground">{s * 4}px</span>
          </div>
        ))}
      </div>
      <h3 className="mt-6 text-sm font-medium text-muted-foreground">Border Radius</h3>
      <div className="flex flex-wrap items-end gap-4">
        {[
          { name: "sm", cls: "rounded-sm" },
          { name: "md", cls: "rounded-md" },
          { name: "lg", cls: "rounded-lg" },
          { name: "xl", cls: "rounded-xl" },
          { name: "full", cls: "rounded-full" },
        ].map((r) => (
          <div key={r.name} className="flex flex-col items-center gap-1">
            <div className={`h-16 w-16 border-2 border-primary bg-primary/10 ${r.cls}`} />
            <span className="text-xs text-muted-foreground">{r.name}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}
