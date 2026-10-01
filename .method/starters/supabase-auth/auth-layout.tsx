export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // <main id="main-content"> : cible du lien d'évitement rendu par src/app/layout.tsx.
    <main id="main-content" className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-6">{children}</div>
    </main>
  )
}
