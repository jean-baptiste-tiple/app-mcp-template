// Logo de l'app — PLACEHOLDER neutre (carré arrondi + anneau) dessiné avec les tokens du thème
// (`--primary` / `--primary-foreground`) : il suit la marque posée dans globals.css sans
// retouche. À remplacer par le vrai logo à la story de setup, avec la favicon `src/app/icon.svg`.
// Décoratif (`aria-hidden`) : chaque appelant affiche le nom du produit en texte juste à côté.

interface AppLogoProps {
  /** Taille en px (carré). */
  size?: number
}

export function AppLogo({ size = 32 }: AppLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <circle
        cx="32"
        cy="32"
        r="14"
        fill="none"
        strokeWidth="8"
        className="stroke-primary-foreground"
      />
    </svg>
  )
}
