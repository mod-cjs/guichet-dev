# Spec M1 — Socle Technique (Sprint 0)

**Epic JIRA :** GUIC-1
**Sprint :** 0 · **Période :** 4–15 mai 2026
**Statut :** En cours

---

## Stories Sprint 0 (sous Epic GUIC-1)

| Ticket | Description | Statut |
|--------|-------------|--------|
| GUIC-15 | Setup Next.js SSR + design system v1 | in_progress |
| GUIC-16 | Intégrer client SSO (OAuth PKCE) au Guichet | in_progress |
| GUIC-17 | Migrer données Guichet (modèle de données unifié) | todo |

---

## Périmètre

Ce module pose les fondations sur lesquelles tous les autres modules s'appuient.
Rien de fonctionnel côté utilisateur final — tout est infrastructure et contrats techniques.

---

## Schéma Prisma — Décisions arrêtées

- ✅ **UserProfile** : `ProfilJeune` avec `competences`, `domainesInteret`, `diplomes` en `Json?` (MVP)
- ✅ **JSON vs colonnes** : colonnes JSON pour flexibilité MVP, normalisation sur signal réel
- ✅ **WebhookEvent idempotence** : Redis TTL 7j suffit. `InteropLog` pour audit uniquement.
- ✅ **Soft delete** : `deletedAt` sur `Utilisateur` et `Opportunite` (CDP + archivage)
- ✅ **Prisma v7** : `prisma.config.ts` à la racine + `@prisma/adapter-mariadb` dans `src/lib/prisma.ts`

---

## GUIC-15 — Setup Next.js SSR + design system v1

### Infrastructure
- [x] `prisma/schema.prisma` complet (tous les modèles M1–M14)
- [x] Design system v2 — tokens `gj-*`, composants UI, Header mobile-first
- [x] Routing App Router — segments explicites `admin/`, `jeune/`, `recruteur/`
- [ ] Migration initiale + seed de démonstration
- [ ] CI/CD GitHub Actions : tests → staging → production
- [ ] Docker Compose fonctionnel en local (MariaDB + Redis)
- [ ] Police Lexend chargée dans `src/app/layout.tsx`
- [ ] Tokens CSS sync (`design/html/tokens.css` ↔ `src/styles/tokens.css`)
- [ ] `/api/health` → 200 avec statuts DB + Redis

---

## GUIC-16 — Intégrer client SSO (OAuth PKCE)

- [x] `src/lib/sso-client.ts` — PKCE, exchangeCode, getUserInfo, refresh, revoke, verifyToken
- [x] `src/lib/auth.ts` — session cookie signée HS256 (jose), Edge-compatible
- [x] `/api/auth/login` — génération PKCE + redirect SSO
- [x] `/api/auth/logout` — révocation token + purge cookie
- [x] `src/app/(public)/auth/callback/route.ts` — flow PKCE complet
- [x] `src/middleware.ts` — protection routes par rôle (Edge runtime)
- [ ] Tests unitaires auth flow (Jest)
- [ ] Cookie httpOnly validé en local avec SSO de dev

---

## GUIC-17 — Migration Drupal

- [ ] Script `scripts/migrate-drupal.ts` : structure + mapping champs Drupal → Prisma
- [ ] Stratégie pour les 22 000 comptes (format export Drupal à confirmer)
- [ ] Validation mapping avec l'équipe CJS

---

## Contrats API créés par M1

```
GET  /api/health              → 200 { status: 'ok', version, db: 'ok', redis: 'ok' }
GET  /api/auth/login          → redirect OAuth SSO
GET  /api/auth/logout         → revoke + redirect /
GET  /auth/callback           → échange code PKCE → session cookie
GET  /api/profil              → profil du user connecté (M2)
```

---

## Critères done (GUIC-15)

- [ ] `npm run dev` démarre sans erreur
- [ ] `npm run build` passe sans erreur TypeScript
- [ ] `npm test` passe (Jest)
- [ ] MariaDB + Redis opérationnels via Docker Compose
- [ ] `/api/health` retourne 200 avec statuts DB + Redis
- [ ] Design tokens identiques entre `design/html/tokens.css` et `src/styles/tokens.css`

## Critères done (GUIC-16)

- [ ] Callback SSO fonctionnel en local (cookie httpOnly créé, session décodable)
- [ ] Refresh automatique avant expiry (< 5 min)
- [ ] Middleware bloque bien les routes non autorisées (403 si mauvais rôle)

---

## Questions ouvertes

1. **Format données Drupal** : quels champs sont disponibles dans l'export ? Y a-t-il un fichier de mapping ?
2. **Compétences/domaines** : tableau de strings (JSON) ou table de référence séparée ?
3. **Completion score** : calculé à la volée ou stocké + mis à jour via trigger Prisma ?
