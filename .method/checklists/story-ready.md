# Story Ready — Definition of Ready

<!--
  Vérifiée par dev avant d'implémenter une story.
  Les items marqués « (story fonctionnelle) » ne s'appliquent pas à une story technique
  (setup, migration d'outillage, dette) : celle-ci n'a ni parcours ni FR à référencer, et ses
  AC ne sont pas tous vérifiables par un test automatisé. Les déclarer sans objet, avec la
  raison — pas les cocher de force, pas les ignorer.
-->

- [ ] La story a le statut 🟢 Ready
- [ ] Les critères d'acceptation sont en Given/When/Then
- [ ] La section « Implémentation » liste les fichiers à créer ou modifier
- [ ] La section « Tests attendus » liste les tests à écrire
- [ ] La référence UI est renseignée (fichier JSX, lien, description texte, **ou `N/A`**)
- [ ] (story avec écran) Les champs **Lecture de design**, **Sous `md`** et **États UI** sont renseignés, et au moins un AC porte sur le viewport 375 px et un sur le thème sombre ; sinon `N/A` avec la raison (`ui-patterns.md § Lecture de design`)
- [ ] Les stories prérequises sont ✅ Done
- [ ] (échelle Standard ou Module) La section « **Rayon d'impact** » est remplie : appelants avec commande citée, doublons avec verdict, effet produit, refacto proposé ou écarté — et tout refacto proposé a été **posé en question** via `AskUserQuestion`, pas laissé en note
- [ ] Le champ **Conventions** est renseigné dans la section Meta — utile surtout pour les tags que les globs ne peuvent pas déduire (`datetime`, `i18n`, `flags`), voir `.method/conventions/_index.md`
- [ ] (story fonctionnelle) Chaque AC est vérifiable par un test automatisé
- [ ] (story fonctionnelle) Les refs PRD (parcours + FR) et architecture sont renseignées

Si un item bloque, le signaler et s'arrêter : implémenter une story non prête produit un
travail que la review ne pourra pas juger.
