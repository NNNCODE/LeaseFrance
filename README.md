# LeaseFrance

Application desktop Windows pour propriétaires bailleurs privés en France.
面向法国个人房东的 Windows 桌面管理应用。

## Fonctionnalités / 功能

- 🔐 Authentification locale sécurisée (email + mot de passe)
- 🏠 Gestion des biens immobiliers
- 👤 Gestion des locataires
- 📄 Gestion des baux (ALUR, meublé, mobilité)
- 💶 Suivi des paiements et loyers
- 📊 Tableau de bord avec KPIs
- 📑 Génération de quittances PDF
- 📈 Révision des loyers selon l'IRL (INSEE)

## Stack technique

- **Electron** + **React 18** + **TypeScript**
- **Tailwind CSS v3** — thème dark élégant
- **SQLite** via `better-sqlite3` — données 100% locales
- **Framer Motion** — animations fluides
- **Zustand** — state management
- **electron-vite** — build tool

## Installation

```bash
npm install
npm run dev
```

## Build (Windows .exe)

```bash
npm run dist
```

## Sécurité / 安全

- Données stockées localement, aucun serveur externe
- Mot de passe haché avec `scrypt` + sel aléatoire
- Code obfusqué en production
- DevTools désactivés en production

## Licence

Privé — usage personnel uniquement.
