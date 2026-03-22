# LeaseFrance — Guide Claude

## Présentation du projet

Application desktop Windows pour **propriétaires bailleurs privés en France**.
Gestion complète : locataires, baux, loyers, quittances, conformité légale française.

## Stack technique

| Couche | Technologie |
|---|---|
| Desktop runtime | **Electron** |
| Frontend framework | **React 18 + TypeScript** |
| Build tool | **electron-vite** (`electron.vite.config.ts`) |
| Styles | **Tailwind CSS v3** |
| Composants UI | **shadcn/ui** (source copiée dans `src/components/ui/`) |
| Animations | **Framer Motion** |
| Graphiques | **Recharts** |
| Icônes | **Lucide React** |
| Base de données | **SQLite** via `better-sqlite3` |
| PDF | **@react-pdf/renderer** |
| State management | **Zustand** |
| Formulaires | **React Hook Form + Zod** (pas encore utilisé) |
| Routing | **React Router v6** |

## Architecture des dossiers

```
lease-france/
├── electron/
│   ├── main.ts          # Processus principal Electron + IPC handlers
│   ├── preload.ts       # Bridge sécurisé renderer ↔ main (contextBridge)
│   ├── auth.ts          # Authentification : hash scrypt, auth.json dans %APPDATA%
│   └── db/
│       ├── database.ts   # Init DB + schéma SQLite embarqué dans initSchema()
│       └── queries/     # Requêtes SQL organisées par module
├── scripts/
│   ├── dev.mjs          # Lance electron-vite en supprimant ELECTRON_RUN_AS_NODE
│   ├── build.mjs        # Build production + obfuscation
│   └── obfuscate.mjs    # Obfuscation JS du main et preload
├── src/
│   ├── main.tsx         # Point d'entrée React
│   ├── App.tsx          # Router principal + flux auth (Login → Setup → App)
│   ├── env.d.ts         # Types TypeScript pour window.api
│   ├── components/
│   │   ├── ui/          # Composants shadcn/ui (Button, Input, Card, Badge…)
│   │   ├── layout/      # Sidebar, Topbar, Layout wrapper
│   │   └── shared/      # Composants réutilisables métier
│   ├── pages/
│   │   ├── Login/       # Écran de connexion (email + mot de passe)
│   │   ├── Setup/       # Inscription compte propriétaire (formulaire unique)
│   │   ├── Dashboard/   # Vue d'ensemble + KPIs + graphiques
│   │   ├── Settings/    # Profil, changement MDP, suppression compte
│   │   ├── Properties/  # CRUD biens immobiliers
│   │   ├── Tenants/     # CRUD locataires + liaison baux
│   │   ├── Leases/      # CRUD baux + révision IRL
│   │   ├── Payments/    # Suivi loyers, marquage payé, résumé
│   │   └── Documents/   # Génération PDF quittances
│   ├── stores/
│   │   └── useAuthStore.ts  # État auth : loading/setup/locked/unlocked
│   ├── hooks/           # Custom React hooks
│   ├── lib/
│   │   ├── utils.ts     # cn(), formatCurrency(), formatDate(), formatMonth()
│   │   ├── irl.ts       # Calcul révision IRL (INSEE)
│   │   └── pdf/         # Templates PDF
│   └── types/           # Types TypeScript globaux
├── public/
├── CLAUDE.md
├── electron.vite.config.ts   # Config electron-vite (NB: points, pas tirets)
├── electron-builder.yml      # Config packaging .exe (ASAR, NSIS)
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json        # Pour electron.vite.config.ts (CommonJS)
├── tsconfig.web.json         # Pour le renderer React (ESM + JSX)
├── postcss.config.cjs        # PostCSS en CommonJS (évite conflit ESM)
└── package.json              # Pas de "type":"module" (incompatible Electron)
```

## Design system

### Thème : Dark élégant (défaut)

```ts
// Palette principale
colors: {
  background:  '#0F0F13',   // Fond principal
  surface:     '#1A1A24',   // Cartes, panneaux
  surfaceHigh: '#22222F',   // Éléments surélevés, hover
  border:      '#2A2A3A',   // Séparateurs
  primary:     '#6366F1',   // Indigo — actions principales
  accent:      '#F59E0B',   // Ambre — highlights, badges
  success:     '#10B981',   // Vert — paiements OK
  warning:     '#F59E0B',   // Orange — retards
  danger:      '#EF4444',   // Rouge — impayés
  textPrimary: '#E2E8F0',   // Texte principal
  textMuted:   '#64748B',   // Texte secondaire
}
```

### Principes UI

- **Densité moyenne** : pas trop compact, pas trop aéré
- **Coins arrondis** : `rounded-xl` pour les cartes, `rounded-lg` pour les boutons
- **Ombres subtiles** : `shadow-lg shadow-black/20`
- **Animations** : transitions douces Framer Motion (durée 200-300ms)
- **Glassmorphism** ponctuel : `backdrop-blur` sur modals et overlays
- Chaque page doit avoir un **header clair** avec titre + action principale (bouton CTA)

### Layout

```
┌──────────────┬──────────────────────────────────────┐
│   Sidebar    │  Topbar (recherche globale + notifs)  │
│   240px      ├──────────────────────────────────────┤
│              │                                      │
│  Navigation  │   Contenu principal                  │
│  principale  │   padding: 24px                      │
│              │                                      │
│  (icône +    │                                      │
│   label)     │                                      │
└──────────────┴──────────────────────────────────────┘
```

## Domaine métier : règles France

### Bail (contrat de location)
- **Bail vide** : durée minimale 3 ans (loi ALUR)
- **Bail meublé** : durée minimale 1 an (9 mois si étudiant)
- **Bail mobilité** : 1 à 10 mois, non renouvelable
- Dépôt de garantie : max 1 mois de loyer HC (vide), 2 mois (meublé)

### Révision de loyer (IRL)
- Révision annuelle basée sur l'**Indice de Référence des Loyers** (INSEE)
- Formule : `nouveau_loyer = ancien_loyer × (IRL_nouveau / IRL_référence)`
- IRL mis à jour trimestriellement (T1/T2/T3/T4)
- L'app doit alerter quand une révision est applicable

### Quittance de loyer
- Obligation légale de délivrer sur demande du locataire (gratuit)
- Doit contenir : période, montant HC, charges, total TTC, adresse, parties

### Encadrement des loyers
- Applicable à Paris, Lyon, Bordeaux, Montpellier, etc.
- Afficher un avertissement si le bien est en zone tendue

### Déclaration fiscale
- Revenus fonciers : **formulaire 2044** (régime réel) ou micro-foncier (<15 000€/an)
- Export des données pour faciliter la déclaration

## Conventions de code

### TypeScript
- Types stricts : `strict: true` dans tsconfig
- Pas de `any` sauf cas exceptionnels documentés
- Interfaces pour les entités métier, `type` pour les unions/helpers

### Composants React
- Functional components uniquement
- Props typées avec interface nommée `{ComponentName}Props`
- Fichier par composant, export nommé (pas default pour les composants partagés)

### Nommage
- Fichiers composants : `PascalCase.tsx`
- Fichiers utilitaires : `camelCase.ts`
- Stores Zustand : `use{Name}Store.ts`
- Hooks : `use{Name}.ts`

### Base de données (SQLite)
- Toutes les requêtes dans `electron/db/queries/`
- Utiliser des requêtes préparées (jamais de concaténation SQL)
- Migrations numérotées : `001_init.sql`, `002_add_irl.sql`

### Communication Electron
- Toujours passer par `ipcRenderer`/`ipcMain` via `preload.ts`
- Exposer uniquement les fonctions nécessaires dans `contextBridge`
- Nommage des canaux IPC : `module:action` (ex: `tenants:getAll`, `payments:create`)

## Entités principales (schéma SQLite)

```sql
-- Biens immobiliers
properties (id, name, address, city, zip, type, area_m2, created_at)

-- Locataires
tenants (id, first_name, last_name, email, phone, created_at)

-- Baux
leases (id, property_id, tenant_id, type, start_date, end_date,
        rent_amount, charges_amount, deposit_amount, irl_reference_index,
        irl_reference_quarter, status, created_at)

-- Paiements
payments (id, lease_id, period_month, period_year, rent_amount,
          charges_amount, payment_date, payment_method, status, notes)

-- Documents générés
documents (id, lease_id, type, generated_at, file_path)

-- Indices IRL
irl_indices (id, year, quarter, value, published_at)
```

## Système d'authentification

### Flux d'écrans
```
init()
  ├── hasPassword = false  →  status: 'setup'   →  Login (+ bouton "Créer un compte" → Setup)
  └── hasPassword = true   →  status: 'locked'  →  Login
                                                       └── login OK → status: 'unlocked' → App
```

- **Toujours afficher Login en premier** — même si aucun compte n'existe encore
- Login demande : **email + mot de passe** (l'email est vérifié contre le profil stocké)
- Setup (inscription) : formulaire unique avec nom, email, mot de passe, confirmation
- Après inscription réussie → directement `status: 'unlocked'`

### Stockage
- `electron/auth.ts` stocke les données dans `%APPDATA%/LeaseFrance/auth.json`
- Mot de passe haché avec `crypto.scryptSync` + sel aléatoire (32 bytes)
- Comparaison avec `timingSafeEqual` (protection timing attacks)
- Format : `{ hash, salt, name, email, createdAt }`

### Canaux IPC auth
| Canal | Description |
|---|---|
| `auth:hasPassword` | Vérifie si un compte existe |
| `auth:getProfile` | Retourne `{ name, email, createdAt }` |
| `auth:setup` | Crée le compte (pwd, name, email) |
| `auth:verify` | Vérifie le mot de passe |
| `auth:change` | Change le mot de passe (old, new) |
| `auth:updateProfile` | Met à jour nom et email |
| `auth:delete` | Supprime le compte (nécessite le mot de passe) |

### Store Zustand (`useAuthStore`)
```ts
status: 'loading' | 'setup' | 'locked' | 'unlocked'
profile: { name, email, createdAt } | null
```

## Sécurité & protection du code

### Mesures en place
| Mesure | Où | Effet |
|---|---|---|
| DevTools désactivés | `electron/main.ts` | Bloque F12, Ctrl+Shift+I en production |
| Menu contextuel bloqué | `electron/main.ts` | Pas de clic droit en production |
| Menu applicatif supprimé | `electron/main.ts` | Pas d'accès via la barre de menu |
| ASAR packaging | `electron-builder.yml` | Code empaqueté, non lisible directement |
| Obfuscation JS | `scripts/obfuscate.mjs` | Main + preload rendus illisibles |
| Minification Vite | automatique en build | Renderer minifié |

### Principe : isDev
```ts
const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined
```
Toutes les protections sont actives uniquement quand `isDev === false` (production).
En développement, DevTools restent accessibles normalement.

### Commandes build
```bash
npm run build   # compile + obfuscate (sans packager)
npm run dist    # build + electron-builder → génère le .exe installable
```

### Note VSCode / Claude Code (CRITIQUE)
L'environnement VSCode/Claude Code définit `ELECTRON_RUN_AS_NODE=1`, ce qui désactive les APIs Electron.
- `require('electron')` retourne un string (chemin) au lieu de l'API
- `process.type` est `undefined` au lieu de `'browser'`
- **Solution** : `scripts/dev.mjs` supprime (pas vide — supprime) la variable avant de lancer electron-vite
- `cross-env ELECTRON_RUN_AS_NODE=` (vide) ne fonctionne pas — il faut `delete env.ELECTRON_RUN_AS_NODE`

### Contraintes esbuild (preload.ts)
Les fonctions arrow dans `preload.ts` doivent être sur **une seule ligne** — esbuild rejette les annotations de type multilignes avant `=>`.

## Commandes de développement

```bash
# Installer les dépendances
npm install

# Développement (Vite + Electron en parallèle)
npm run dev

# Build production (.exe Windows)
npm run build

# Linter
npm run lint

# Type check
npm run typecheck
```

## Priorités de développement

1. **Phase 1** ✅ — Structure & Layout : sidebar, routing, thème dark
2. **Phase 1b** ✅ — Authentification : login, inscription, paramètres compte, suppression
3. **Phase 2** ✅ — Propriétés (`/properties`) : CRUD biens immobiliers
4. **Phase 3** ✅ — Locataires (`/tenants`) : CRUD + liaison aux baux
5. **Phase 4** ✅ — Baux (`/leases`) : création, révision IRL (calcul INSEE, modal, alertes Dashboard)
6. **Phase 5** ✅ — Paiements (`/payments`) : saisie, historique, marquage payé, résumé
7. **Phase 6** ✅ — Documents PDF (`/documents`) : quittances via @react-pdf/renderer
8. **Phase 7** ✅ — Dashboard (`/dashboard`) : KPIs réels, graphiques Recharts, alertes IRL
9. **Phase 8** — Export fiscal : données pour déclaration 2044

### Fonctionnalités restantes
- Alertes d'expiration de bail sur le Dashboard
- Flux "Mot de passe oublié"
- Recherche globale dans la Topbar
- Encadrement des loyers (avertissements zones tendues)
- Export données (CSV/Excel)
- Graphiques statistiques enrichis
- Système de notifications
