# Guide de lecture des maquettes JSX

> Ce guide explique comment interpréter les fichiers `.jsx` dans `docs/design/screens/` et `docs/design/components/`.
> Ces fichiers sont des **specs visuelles**, pas du code de production.

## Principes

1. **Les JSX sont des specs, pas du code.** Ils décrivent CE QUE l'écran affiche, pas COMMENT le coder.
2. **Les composants utilisés sont sémantiques**, pas des imports réels. `<Card>`, `<Button>`, `<Input>` décrivent l'intention, pas l'implémentation.
3. **Les attributs `data-*` portent les métadonnées** : variantes, actions, navigation, état.

## Composants disponibles

### Layout

| Composant | Description | Props clés |
|-----------|-------------|------------|
| `<Screen>` | Conteneur d'écran | `title`, `route` |
| `<Section>` | Section logique | `title` |
| `<Sidebar>` | Navigation latérale | — |
| `<Header>` | En-tête de page | — |

### Contenu

| Composant | Description | Props clés |
|-----------|-------------|------------|
| `<Heading>` | Titre | `level` (1-4) |
| `<Text>` | Paragraphe | — |
| `<Badge>` | Label/tag | `data-variant` |
| `<Avatar>` | Image utilisateur | `name`, `src` |

### Formulaires

| Composant | Description | Props clés |
|-----------|-------------|------------|
| `<Form>` | Formulaire | `data-action` (Server Action cible) |
| `<Input>` | Champ texte | `name`, `type`, `label`, `required`, `placeholder` |
| `<Textarea>` | Champ texte long | `name`, `label`, `rows` |
| `<Select>` | Liste déroulante | `name`, `label`, `options` |
| `<Checkbox>` | Case à cocher | `name`, `label` |
| `<Switch>` | Toggle on/off | `name`, `label` |

### Actions

| Composant | Description | Props clés |
|-----------|-------------|------------|
| `<Button>` | Bouton d'action | `data-variant` (primary/secondary/destructive), `type` |
| `<Link>` | Lien de navigation | `data-navigate` (route cible) |
| `<IconButton>` | Bouton icône | `icon`, `data-action` |

### Data display

| Composant | Description | Props clés |
|-----------|-------------|------------|
| `<Card>` | Carte | `data-variant`, `data-max-width` |
| `<Table>` | Tableau de données | `data-columns`, `data-source` |
| `<List>` | Liste d'items | `data-source`, `data-empty` |
| `<Stat>` | Chiffre clé | `label`, `value` |
| `<EmptyState>` | État vide | `message`, `action` |

### Feedback

| Composant | Description | Props clés |
|-----------|-------------|------------|
| `<Toast>` | Notification | `data-variant` (success/error/info) |
| `<Dialog>` | Modal | `title`, `data-trigger` |
| `<Alert>` | Message inline | `data-variant` (info/warning/error) |
| `<Skeleton>` | Placeholder loading | — |

## Attributs `data-*`

| Attribut | Description | Exemple |
|----------|-------------|---------|
| `data-variant` | Variante visuelle | `"primary"`, `"destructive"`, `"centered"` |
| `data-action` | Server Action cible | `"auth/login"`, `"menu/create-item"` |
| `data-navigate` | Navigation vers route | `"/dashboard"`, `"/settings"` |
| `data-source` | Source de données | `"menu-items"`, `"orders"` |
| `data-empty` | Message état vide | `"Aucun élément"` |
| `data-max-width` | Largeur max | `"sm"`, `"md"`, `"lg"` |
| `data-flow` | Données transmises | `"user"`, `"order-id"` |
| `data-auth` | Condition d'auth | `"required"`, `"guest-only"` |
| `data-loading` | État de chargement | `"skeleton"`, `"spinner"` |
| `data-mobile` | Comportement sous `md` d'une zone multi-colonnes | `"stack"`, `"scroll"`, `"sheet"`, `"hidden"` |
| `data-density` | Densité de l'écran (`system.md § Direction`) | `"airy"`, `"standard"`, `"dense"` |
| `data-error` | Ce que l'état en erreur affiche | `"Alert inline"`, `"toast"` |

`data-mobile` est dû sur tout `<Section>`, `<Table>` ou `<Card>` disposé en colonnes : une
maquette sans lui laisse le collapse mobile au hasard, et la story ne peut pas le reprendre
dans son champ **Sous `md`**.

## Exemple complet

```jsx
// docs/design/screens/login.jsx
// Spec visuelle — NE PAS utiliser en production

export default function LoginScreen() {
  return (
    <Screen title="Connexion" route="/login" data-auth="guest-only">
      <Card data-variant="centered" data-max-width="sm">
        <Heading level={2}>Connexion</Heading>
        <Form data-action="auth/login">
          <Input name="email" type="email" label="Email" required />
          <Input name="password" type="password" label="Mot de passe" required />
          <Button data-variant="primary" type="submit">Se connecter</Button>
        </Form>
        <Link data-navigate="/forgot-password">Mot de passe oublié ?</Link>
        <Text>Pas de compte ? <Link data-navigate="/signup">Créer un compte</Link></Text>
      </Card>
    </Screen>
  )
}
```

## Comment lire un écran JSX

1. **`<Screen>`** → la page, sa route, ses conditions d'accès
2. **Structure imbriquée** → le layout (quoi est dans quoi)
3. **`data-action`** → les Server Actions à implémenter
4. **`data-navigate`** → les liens entre écrans (flow)
5. **`data-source`** → les données à fetcher
6. **Props `name` des inputs** → les champs du formulaire (= champs du schema Zod)
7. **`data-variant`** → les variantes visuelles (= tokens du design system)

## Du JSX spec au code production

| JSX spec | Code production |
|----------|----------------|
| `<Screen>` | Page Next.js dans `app/` |
| `<Card>` | Composant Shadcn `<Card>` |
| `<Form data-action="auth/login">` | `<form action={loginAction}>` avec React Hook Form |
| `<Input name="email">` | Shadcn `<Input>` + schema Zod `email: z.string().email()` |
| `<Button data-variant="primary">` | Shadcn `<Button variant="default">` |
| `<Link data-navigate="/x">` | Next.js `<Link href="/x">` |
| `<Table data-source="items">` | Server Component qui fetch + Shadcn `<Table>` |
