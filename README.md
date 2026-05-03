# Guichet Jeunesse — CJS

Plateforme numérique du Consortium Jeunesse Sénégal (CJS). Refonte complète de l'ancien Drupal vers une stack Next.js 16 / Prisma / MariaDB.

## Prérequis

- Node.js 20+
- Docker et Docker Compose
- Git

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/cjs/guichet-jeunesse.git
cd guichet-jeunesse

# Copier les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local (demander les clés au Lead développeur)

# Lancer l'infrastructure locale (MariaDB + Redis)
docker-compose up -d

# Installer les dépendances
npm install

# Appliquer les migrations Prisma
npx prisma migrate dev

# Générer le client Prisma
npx prisma generate

# (Optionnel) Alimenter la base avec des données de démo
npx prisma db seed

# Lancer le serveur de développement
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
guichet-jeunesse/
├── CLAUDE.md               # Instructions pour Claude Code (lire en premier)
├── docs/                   # Documentation technique détaillée
├── prisma/                 # Schéma et migrations Prisma
├── public/                 # Assets statiques
├── scripts/                # Scripts utilitaires (migration Drupal, seed)
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/         # Composants React
│   ├── lib/                # Logique métier et clients externes
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # State management
│   ├── types/              # Types TypeScript
│   └── styles/             # CSS global et tokens de design
└── tests/                  # Tests unitaires, intégration et E2E
```

Pour comprendre l'architecture en détail, lire dans cet ordre :
1. `CLAUDE.md` — vue d'ensemble technique
2. `docs/metier.md` — comprendre le domaine CJS
3. `docs/architecture.md` — décisions techniques
4. `docs/sso.md` — comprendre l'authentification
5. `docs/conventions.md` — conventions de code

## Commandes

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Démarrer en mode production
npm run lint         # Linter ESLint
npm run test         # Tests unitaires Jest
npm run test:e2e     # Tests E2E Playwright
npx prisma studio    # Interface graphique de la base de données
```

## Environnements

| Environnement | URL | Branche |
|---------------|-----|---------|
| Développement | http://localhost:3000 | develop |
| Staging | https://staging.guichet.cjs.sn | main |
| Production | https://guichet.cjs.sn | tags vX.Y.Z |

## Workflow Git

Voir `CONTRIBUTING.md` pour les règles détaillées.

En résumé : créer une branche depuis `develop`, ouvrir une PR, faire une revue de code, merger après CI verte.

## Support

- Slack CJS — canal `#guichet-jeunesse-dev`
- Product Owner : Abdou Khadre DIOP
