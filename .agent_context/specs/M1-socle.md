# Spec M1 — Socle Technique (Sprint 0)

**Sprint :** 0 · **Période :** 4–15 mai 2026
**Statut :** En cours — structure initialisée, schéma Prisma à définir

---

## Périmètre

Ce module pose les fondations sur lesquelles tous les autres modules s'appuient.
Rien de fonctionnel côté utilisateur final — tout est infrastructure et contrats techniques.

---

## Schéma Prisma (à valider avant migration)

Questions ouvertes à résoudre avant d'écrire le schéma :
- [ ] Liste exacte des champs `UserProfile` (confirmer avec docs/metier.md)
- [ ] Champs JSON vs colonnes dédiées pour `competences`, `domaines_interet`, `diplomes`
- [ ] Table `WebhookEvent` pour idempotence : Redis suffit ou besoin de persistance DB ?
- [ ] Soft delete (`deletedAt`) sur quelles tables ?

## Tâches Sprint 0

### Infrastructure
- [ ] `GUIC-1` — `prisma/schema.prisma` complet (tous les modèles M1–M14)
- [ ] `GUIC-2` — Migration initiale + seed de démonstration
- [ ] `GUIC-3` — CI/CD GitHub Actions : tests → staging → production (workflows déjà créés, vérifier)
- [ ] `GUIC-4` — Docker Compose fonctionnel en local (MariaDB + Redis)

### SSO
- [ ] `GUIC-5` — `src/lib/auth.ts` : configuration next-auth v5 avec SSO CJS OIDC
- [ ] `GUIC-6` — `src/app/(public)/auth/callback/route.ts` : flow complet PKCE
- [ ] `GUIC-7` — Middleware protection routes groups (déjà scaffoldé — compléter)

### Design System
- [ ] `GUIC-8` — Vérifier que `src/styles/tokens.css` correspond à `design/html/tokens.css`
- [ ] `GUIC-9` — Composants UI de base fonctionnels (Button, Card, Input, Badge, Modal)
- [ ] `GUIC-10` — Police Lexend chargée et configurée dans `src/app/layout.tsx`

### Migration Drupal
- [ ] `GUIC-11` — Script `scripts/migrate-drupal.ts` : structure + mapping champs Drupal → Prisma
- [ ] `GUIC-12` — Stratégie pour les 22 000 comptes (voir questions ouvertes ci-dessous)

---

## Contrats API créés par M1

Ces routes doivent fonctionner avant que les autres modules puissent démarrer :

```
GET  /api/health              → 200 { status: 'ok', version, db: 'ok', redis: 'ok' }
POST /api/auth                → callback OAuth, création session
GET  /api/profil              → profil du user connecté (utilisé par M2)
```

---

## Critères done (acceptance)

- [ ] `npm run dev` démarre sans erreur
- [ ] `npm run build` passe sans erreur TypeScript
- [ ] `npm test` passe (Jest)
- [ ] MariaDB + Redis opérationnels via Docker Compose
- [ ] Callback SSO fonctionnel en local (cookie httpOnly créé)
- [ ] `/api/health` retourne 200 avec statuts DB + Redis
- [ ] Tous les composants UI de base rendus sans erreur dans Storybook ou page de test
- [ ] Design tokens identiques entre `design/html/tokens.css` et `src/styles/tokens.css`

---

## Questions ouvertes (bloqueuses pour Prisma schema)

1. **Format données Drupal** : quels champs sont disponibles dans l'export ? Y a-t-il un fichier de mapping ?
2. **Compétences/domaines** : tableau de strings (JSON) ou table de référence séparée ?
3. **Completion score** : calculé à la volée ou stocké + mis à jour via trigger Prisma ?
