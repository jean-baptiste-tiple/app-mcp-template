# Story Done — Definition of Done

<!--
  Passée par dev (étape 7) avant de basculer une story en ✅ Done.
  RÈGLE DE MAINTENANCE : ne réénumère JAMAIS les rubriques de code-review.md ni les règles des
  conventions — elles sont confrontées au code par revue, qui route les fichiers par globs.
  Cette checklist ne vérifie que ce qui n'est vérifiable qu'à la fin : livraison et traçabilité.
-->

## Livraison

- [ ] Tous les AC de la story sont couverts par le code livré
- [ ] Tous les tests listés dans la section « Tests attendus » de la story existent et passent
- [ ] Les 4 checks passent : `check:framework`, `type-check`, `lint`, `test`
- [ ] Aucun test existant cassé (non-régression)

## Review

- [ ] Le skill `revue` a été passé : routing annoncé, conventions chargées en entier, findings sourcés
- [ ] Les findings HAUTE et MOYENNE sont corrigés, et les checks relancés après correction
- [ ] Les findings BASSE restants sont signalés à l'utilisateur, pas appliqués d'office

## Traçabilité

- [ ] Section « Post-implémentation » de la story remplie
- [ ] `docs/changelog.md` à jour
- [ ] `.method/conventions/component-registry.md` à jour si un composant, hook ou util réutilisable a été créé
- [ ] ADR créé dans `docs/decisions/` si un invariant d'architecture a été touché
- [ ] `.method/sprint/status.md` : story passée en ✅ Done
- [ ] (si référence UI ≠ `N/A`) Les écarts avec la référence sont documentés dans la story
- [ ] (story avec écran) Les captures `pnpm ui:shots` des routes touchées ont été lues et citées dans le rapport de review (`code-review.md § Preuve visuelle`)
