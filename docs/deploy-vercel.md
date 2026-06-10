# Déploiement Vercel — Guichet Jeunesse

## Migrations Prisma sur Vercel

Vercel détecte automatiquement le script `vercel-build` dans `package.json` et l'utilise
en priorité sur `build` quand il est défini. Notre `vercel-build` enchaîne :

1. `prisma migrate deploy` — applique toutes les migrations en attente (idempotent : skip celles déjà appliquées)
2. `next build` — build Next.js (mode standalone activé)
3. Copie `.next/static` et `public/` dans `.next/standalone/` pour que `node server.js` les serve correctement

### Pourquoi un script dédié ?

Avant GUIC-350 : Vercel exécutait `npm install` (qui déclenchait `postinstall` → `prisma generate`)
puis `next build`. **Aucun `prisma migrate deploy`** → les nouvelles migrations restaient en attente
sur Railway, ce qui provoquait des crashs `P2022` quand l'app utilisait des colonnes nouvelles.

Cas concret du bug du 2026-06-08 : la migration `20260608102921_add_opportunite_sections_structurees`
(GUIC-257) n'avait jamais été appliquée → `/opportunites/[slug]` crashait avec
`column profil_recherche does not exist`.

### Pourquoi pas dans `build` ?

Le script `build` local (`npm run build`) sert aux développeurs et au CI. Y mettre
`prisma migrate deploy` ferait que :
- Un dev qui builde en local pousserait des migrations vers la DB pointée par sa `DATABASE_URL`
- Risque de migration accidentelle sur prod si la `.env` est mal configurée

D'où la séparation : `build` (sans DB) pour le local, `vercel-build` (avec migrate) pour Vercel.

### Pourquoi pas dans `postinstall` ?

`postinstall` est exécuté à **chaque** `npm install`, y compris en local. Mettre
`prisma migrate deploy` là équivaudrait à appliquer les migrations à chaque
installation de dépendance — catastrophe garantie.

## Variables d'environnement requises sur Vercel

En plus des variables applicatives habituelles :

- `DATABASE_URL` — URL Prisma (pooler PgBouncer/Accelerate côté Railway)
- `DIRECT_URL` — URL directe vers la DB (requise pour `prisma migrate deploy` qui ne supporte pas le pooler en mode transaction)

Vérifier `prisma/schema.prisma` :
```prisma
datasource db {
  provider  = "mysql" // ou "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Comportement en cas d'échec migration

`prisma migrate deploy` retourne un code non-zéro si une migration échoue (conflit de schéma,
SQL invalide, contrainte violée…). Vercel interprète ça comme un build raté :
- **Le déploiement échoue fast** (pas de mise en ligne d'une app qui crasherait sur les requêtes)
- Les logs Vercel affichent le SQL erronné et le message Prisma exact
- L'ancien déploiement reste actif (rollback automatique côté Vercel)

Fix :
1. Reproduire l'erreur en local (`DATABASE_URL=<staging> prisma migrate deploy`)
2. Créer une migration corrective (`prisma migrate dev --name fix_xxx`)
3. Pusher → Vercel rejoue le build avec la migration corrective

## Build local sans toucher la DB

```bash
npm run build       # build standalone, ne touche pas la DB
npm run start:prod  # lance le serveur standalone
```

Pour appliquer manuellement les migrations en staging/local :
```bash
npm run db:deploy   # alias de `prisma migrate deploy`
```
