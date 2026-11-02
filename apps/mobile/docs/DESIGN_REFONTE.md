# Refonte UI SCPB Survey — livrable

## Choix visuels

- **Marque** : palette dérivée du logo (nov. 2026) — olive `#5E6328` / `#43471B` / `#EEF1DC` (logo `#707430`, `#93A537`), soleil `#F6AD22` / `#FEF3DC` en accent, ocre `#7A5200` pour le texte secondaire, fond ivoire `#F6F7F4`. Les clés de tokens (`vert`, `brun`, …) sont conservées ; nouveaux tokens : `soleil`, `outlineStrong`, `attentionFonce`, `scrim`.
- **Contraste** : toutes les paires texte/fond ≥ 4,5:1 (WCAG AA), bordures de champs ≥ 3:1 (`outlineStrong`). Ne pas écrire de texte en `soleil` ni en `attention` : utiliser `onSoleil` / `attentionFonce`.
- **Police** : Source Sans 3 (400/500/600/700) via `@expo-google-fonts/source-sans-3`, chargée dans `app/_layout.tsx`.
- **Thème unique** : `paperTheme` local branché sur `PaperProvider` (plus de double source `afrexiaTheme` pour Paper).
- **Tokens** : `colors`, `typography`, `spacing`, `radius`, `shadows`, `motion`, `layout` (`controlHeight` 48, `screenPadding` 16).
- **Icônes** : SemanticIcon / Material Community Icons ; tabs agent et durabilité unifiés.
- **Copy** : titres sentence-case, sans codes S21/S70 ; rôles via `formatRoleLabel`.

## Dépendance ajoutée

| Package | Justification |
|---------|---------------|
| `@expo-google-fonts/source-sans-3` | Famille unique lisible terrain, hors ligne après chargement |

## Fichiers clés

- Thème : `src/theme/*` (+ `layout.ts`)
- Root : `app/_layout.tsx`
- Composants : `AppHeader`, `PrimaryButton`, `SecondaryButton`, `AppScreen`, `SiteContextBar`, `SectionHeader`, `ListSearchBar`, `PriorityBadge`
- Utils : `src/utils/formatFr.ts`, `roleLabels.ts`
- Tabs : `(agent)/_layout.tsx`, `(durabilite)/_layout.tsx` (safe-area)
- Pilotes : `(agent)/index.tsx`, `site-form.tsx`, `(agent)/sync.tsx`
- Pass copy / tokens : écrans `app/**` (titres CAPS, `fontWeight` 800→700, hex→tokens sur hubs legacy)

## Écrans traités (clusters)

Public, agent (5 tabs + visites/lots), site/CRM, enquêtes (titres), sync, admin hubs, durabilité (titres + tabs), lots/mapping (copy), auditeur/admin stubs.

## Contrôles effectués

- Revue code des tokens, imports `colors`, titres AppHeader, tabs SemanticIcon.
- Pas de capture appareil réelle dans cette session (pas de simulateur lancé ici).
- Largeurs 320–430 et texte agrandi : à valider sur device / Expo Go.

## Limites restantes

- Visites / Lots / s69–s73 / recherche durabilité : **données encore mock** — UI soignée mais bannières / copy honnêtes (« bientôt », modules démo).
- Mapping GPS non implémenté (entrée « Bientôt disponible »).
- Miroirs Supabase détection/cas et chiffrement DB hors scope UI.
- `formatFr` prêt mais pas branché partout sur les écrans lots mock.
