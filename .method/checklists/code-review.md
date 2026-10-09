# Checklist de review — transverse uniquement

<!--
  Lue par le skill revue, APRÈS le chargement des conventions routées par globs.

  RÈGLE DE MAINTENANCE : ce fichier ne contient QUE ce qui n'appartient à aucune convention.
  Sécurité, tests, Next.js, Supabase, performance, a11y, naming, types → ces règles vivent
  dans `.method/conventions/` et sont confrontées au code directement. Les recopier ici
  créerait une seconde source de vérité qui divergerait. Ne pas le faire.
-->

## Périmètre du diff

- [ ] Chaque fichier modifié trace à la demande (story, bug rapporté, demande utilisateur)
- [ ] Aucun cleanup adjacent, reformatage opportuniste ou refacto non demandé
- [ ] Le diff ne contient pas de changement de comportement non demandé
- [ ] (si refacto) Les tests sont **identiques** avant/après — un test modifié = un comportement modifié = ce n'est plus un refacto
- [ ] (si bugfix) Un test reproduit le bug et échouait avant le fix

## Hygiène

- [ ] Pas de `console.log` / `debugger` oublié
- [ ] Pas de TODO / FIXME / HACK sans explication ni ticket
- [ ] Pas de code mort ajouté (fonction, import, variable, prop non utilisée)
- [ ] Aucun fichier sensible dans le diff (`.env`, credentials, clés, dumps)
- [ ] Pas de dépendance ajoutée sans nécessité (vérifier `package.json` dans le diff) — sa justification relève de § Arbitrage de complexité

## Arbitrage de complexité

Point de contrôle de `CLAUDE.md § Justifier une surface nouvelle` — ne pas y redire la règle.

- [ ] Chaque surface nouvelle du diff (fichier, composant, hook, util, abstraction, prop optionnelle, option de config, table, colonne, flag, dépendance) porte, dans le récap ou le rapport de review, **ce qui casse sans elle aujourd'hui**
- [ ] Aucune surface justifiée au futur (« on pourrait vouloir », « pour rester générique », « ce sera utile quand ») — une telle surface est **à retirer**, pas à documenter
- [ ] (hors Micro) Le récap **nomme l'option d'un cran plus simple écartée** et la raison de l'écarter. Une seule solution présentée = aucun arbitrage rendu

## Preuve visuelle

Due dès qu'un fichier du périmètre active le tag `ui` (`.method/conventions/_index.md`). Les
règles de composition sont dans `ui-patterns.md` ; cette rubrique ne vérifie que la preuve.

- [ ] `pnpm ui:shots <routes touchées>` a tourné et le rapport cite les chemins des captures lues (375, 768, 1280 ; clair et sombre). Diff UI sans capture citée = review incomplète, verdict ❌
- [ ] Ce que les captures montrent est écrit en une phrase par largeur : débordement, lisibilité en sombre, bouton principal visible, titres sur deux lignes maximum
- [ ] La lecture de design (plan ou story) correspond à ce que les captures montrent ; un écart est un finding sourcé `ui-patterns.md § Lecture de design`

## Conformité à la demande

- [ ] (mode story) Tous les AC de la story sont couverts par le code livré
- [ ] (mode story) Tous les tests listés dans « Tests attendus » existent
- [ ] (mode libre) Ce qui est livré correspond à ce qui a été demandé — ni moins, ni plus
- [ ] Les hypothèses prises face à une ambiguïté sont explicitées à l'utilisateur
- [ ] (si référence UI fournie) L'écart avec la référence est documenté — **si `N/A`, ne pas pénaliser l'absence de maquette**

## Documentation de méthode

- [ ] `docs/changelog.md` mis à jour
- [ ] `.method/conventions/component-registry.md` mis à jour si nouveau composant réutilisable
- [ ] (mode story) Section « Post-implémentation » de la story remplie
- [ ] ADR créé dans `docs/decisions/` si un invariant d'architecture a été touché
- [ ] Si une règle a dû être inventée pendant l'implémentation → elle est écrite dans la convention concernée **et annoncée** (fichier, section, règle en une phrase), pas laissée implicite
