# GUIC-231 — Cleanup CV orphelins Vercel Blob

## Contexte

Les candidatures (M3) stockent le CV du jeune sur **Vercel Blob** (`cv/<uuid>.pdf`).
L'URL du blob est ensuite référencée dans `Candidature.cvUrl` (uniquement — le schéma
Prisma actuel n'expose pas de `cvUrl` sur `ProfilJeune`).

**GUIC-229** a réglé 90 % des orphelins via **lazy upload** : le blob n'est créé
qu'au moment où la candidature est effectivement submise. Restent les cas marginaux :

- Le POST candidature échoue après l'upload (timeout, validation serveur).
- L'utilisateur change de CV après un submit raté.

**GUIC-231** ajoute un **cron quotidien** pour purger ces blobs orphelins.

## Architecture

- **`src/lib/cleanup-cv-orphans.ts`** — routine partagée (`cleanupCvOrphans()`).
  - `list({ prefix: 'cv/' })` paginé.
  - Charge `Candidature.cvUrl` en mémoire (Set).
  - Pour chaque blob : si non référencé **et** `uploadedAt < now - 24h` → orphelin.
  - En mode `apply=true` : `del(url)`.
  - Retourne `{ scanned, orphans, deleted, errors, durationMs, orphanUrls }`.
- **`scripts/cleanup-cv-orphans.ts`** — CLI : `tsx scripts/cleanup-cv-orphans.ts [--apply]`.
  Dry-run par défaut.
- **`src/app/api/cron/cleanup-cv/route.ts`** — `GET /api/cron/cleanup-cv`, auth
  `Authorization: Bearer ${CRON_SECRET}`, appelle la routine en `apply=true`.
- **`vercel.json`** — `{ path: "/api/cron/cleanup-cv", schedule: "0 3 * * *" }`
  (3 h UTC = 3 h Sénégal).

## Garde-fous

- **Âge minimum 24 h** avant suppression : laisse le temps à un upload récent de
  finir son flow candidature.
- **`maxDuration: 300 s`** sur la route cron (Vercel Pro requis si > 60 s).
- Logs structurés via `logger` (`src/lib/logger.ts`).
- Erreurs `del()` individuelles → comptabilisées (`errors++`), pas de throw.

## Configuration Vercel post-merge

1. Dans Vercel Project Settings → Environment Variables, vérifier que
   `BLOB_READ_WRITE_TOKEN` et `CRON_SECRET` sont définis pour `Production` (et
   `Preview` si besoin).
2. Le cron est déclaré dans `vercel.json` ; Vercel l'active automatiquement au
   prochain déploiement.
3. Pour tester manuellement après déploiement :
   ```
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://<deploy-url>/api/cron/cleanup-cv
   ```

## Évolutions futures

- Si `ProfilJeune.cvUrl` est ajouté un jour, l'inclure dans
  `loadReferencedCvUrls()` (single point of change).
- Métriques : pousser `orphans` / `deleted` vers la table audit ou un compteur
  Redis pour suivi long terme.
