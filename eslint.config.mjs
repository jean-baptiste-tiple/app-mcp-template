import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importX from "eslint-plugin-import-x";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Sans cette liste, `eslint .` parcourt la sortie de build : après un premier `pnpm build`,
  // `pnpm lint` remonte des milliers d'erreurs sur du code généré et minifié, ce qui rend le
  // gate de commit-push impassable.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    // Ces règles remplacent des sections de prose supprimées de coding-standards.md.
    // Une règle appliquée par l'outillage n'a pas à être relue par un humain ou une IA à
    // chaque review : elle est vérifiée à chaque `pnpm lint`, sans exception ni oubli.
    // `import-x` et non `import` : sous ESLint 10, `import/order` d'eslint-plugin-import 2.32
    // (enregistré par eslint-config-next) plante dès la première violation
    // (« sourceCode.getTokenOrCommentBefore is not a function »).
    plugins: { "import-x": importX },
    rules: {
      // Complexité — remplace la table « File Size & Complexity » et la section « Early Returns »
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "max-depth": ["error", 3],
      "no-empty": ["error", { allowEmptyCatch: false }],

      // Remplace « Enums : préférer as const » (typescript-patterns.md)
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Utiliser un objet `as const` + type inféré plutôt qu'un enum TypeScript.",
        },
      ],

      // Schémas en `zod/v4` (forms-patterns.md § Principe) : le même schéma sert le formulaire,
      // le tool MCP et, plateforme Otomata activée, la fonction ERP, qui refuse un schéma zod 3.
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "zod", message: "Importer `* as z from \"zod/v4\"` : un seul chemin d'import pour les schémas partagés (formulaire, tool MCP, fonction ERP, ADR-001)." }] },
      ],

      // Remplace l'ordre d'imports décrit en prose dans coding-standards.md
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [
            { pattern: "{react,react-dom/**,next,next/**}", group: "builtin", position: "before" },
            { pattern: "@/components/**", group: "internal", position: "before" },
            { pattern: "@/lib/**", group: "internal" },
            { pattern: "@/types/**", group: "internal", position: "after" },
          ],
          pathGroupsExcludedImportTypes: ["react", "next"],
          // Pas d'alphabétisation ni de contrainte de ligne vide : la convention porte sur
          // l'ORDRE DES GROUPES, rien de plus. Aller au-delà imposerait de reformater les
          // composants Shadcn à chaque régénération.
          "newlines-between": "ignore",
        },
      ],
    },
  },
  {
    // Composants Shadcn : générés par la CLI, réécrits à chaque `shadcn add`. Fichiers générés,
    // exemptés de la complexité (coding-standards.md § Complexité) : calendar.tsx dépasse 150 lignes.
    files: ["src/components/ui/**"],
    rules: { "import-x/order": "off", "max-lines-per-function": "off" },
  },
  {
    // Les pages catalogue sont des inventaires plats : la limite de lignes n'y a pas de sens.
    files: ["src/app/design-system/**", "tests/**"],
    rules: { "max-lines": "off", "max-lines-per-function": "off" },
  },
]);
