# Readiness Gate — Prêt à coder ?

<!--
  Passée au gate de sortie de /plan, niveau Initial ou Évolution.
  Le niveau « Story seule » ne passe QUE story-ready.md ; le niveau « Refus » ne passe rien.

  Chaque item est ✅ **ou explicitement déclaré sans objet, avec sa raison**. Un « sans objet »
  assumé est une réponse valide : aucun artefact n'est obligatoire dans cette méthode
  (CLAUDE.md règle absolue n°6). Ce qui est interdit, c'est de laisser un item non traité.
-->

## Documents

- [ ] `docs/prd.md` est rempli, organisé par parcours utilisateur
- [ ] `docs/architecture.md` est rempli, modèle de données défini (ou « sans base de données », déclaré)
- [ ] `docs/design/system.md` a les tokens (couleurs, typo, spacing)
- [ ] Au moins 1 epic dans `docs/epics/` et 1 story 🟢 Ready dans `docs/stories/`
- [ ] (niveau Initial) `docs/brief.md` est rempli et validé — en Évolution sur un projet qui n'a jamais eu de brief, déclarer sans objet

## Parcours & Design

- [ ] Chaque parcours du PRD a un flow Mermaid
- [ ] Chaque parcours a une référence UI (maquette, description, **ou `N/A`**)
- [ ] (si maquettes) Les écrans existent dans `docs/design/screens/` et `_index.md` est à jour
- [ ] (si maquettes) Les composants partagés sont dans `docs/design/components/`

## Cohérence

- [ ] Chaque FR du PRD est dans un parcours et a une référence UI
- [ ] Chaque FR du PRD est couverte par au moins une story
- [ ] Chaque story référence les FR et le parcours qu'elle implémente
- [ ] Les stories ont des AC en Given/When/Then
- [ ] Le modèle de données couvre les entités nécessaires aux stories Ready
- [ ] (si base de données) Les RLS policies sont définies pour chaque table du modèle

## Conventions

- [ ] `.method/conventions/_index.md` est à jour : chaque tag a un fichier **et des globs qui matchent l'arborescence réelle**
- [ ] Chaque story 🟢 Ready a son champ **Conventions** renseigné

> `pnpm check:framework` n'est **pas** dans ce gate : `/plan` s'interdit toute commande
> système. Il est exécuté par `pnpm verify`, donc à chaque commit.

## Ce qui n'est PAS dans ce gate

L'infrastructure (`pnpm install`, `.env.local`, serveur qui démarre, clés Supabase, proxy
auth) **ne peut pas** être vérifiée ici : `/plan` s'interdit toute commande système et toute
création de fichier non-Markdown. Exiger ces points au gate de cadrage créait une dépendance
circulaire — le gate ne pouvait pas passer honnêtement.

Ces vérifications sont les **critères d'acceptation de la story de setup technique**, écrite en
phase de découpage et implémentée par `dev`.
