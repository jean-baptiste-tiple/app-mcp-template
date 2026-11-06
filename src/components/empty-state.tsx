import { cn } from "@/lib/utils/cn"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  heading: string
  description?: string
  action?: React.ReactNode
  /** 2 sous le h1 de la page, 3 sous un titre de section (h2) : aucun niveau sauté. */
  headingLevel?: 2 | 3
}

export function EmptyState({
  icon,
  heading,
  description,
  action,
  headingLevel = 2,
  className,
  ...props
}: EmptyStateProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2"
  return (
    <div
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <Heading className="text-lg font-semibold text-foreground">{heading}</Heading>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
