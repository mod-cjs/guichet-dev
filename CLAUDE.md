# CLAUDE.md — Guichet Jeunesse CJS

Plateforme jeunesse · 22 000 utilisateurs · Sénégal · Programme YEAH · Conformité CDP

**Stack :** Next.js 16 (App Router) · TypeScript 5 · Prisma 7 · MariaDB 11 · Redis 7
**Auth :** SSO CJS OAuth2/OIDC (Laravel Passport) · next-auth v5
**IA :** Groq llama-3.3-70b · **WhatsApp :** Meta Cloud API v19 · **Agent :** Aïssatou

---

## Règles absolues

**Identité**
- `cjs_uid` = claim `sub` du token SSO = seul identifiant inter-plateformes — présent dans toutes les tables
- Jamais de login local, jamais de mot de passe, jamais de formulaire d'auth dans ce projet
- Téléphone : format E.164 obligatoire (`+221XXXXXXXXX`)

**Données**
- Toujours Prisma (`src/lib/prisma.ts`) — SQL brut interdit sauf exception dans `DECISIONS.md`
- Toute modification de schéma = `prisma migrate dev` — jamais de modif directe en base

**Sécurité**
- Token SSO : cookie httpOnly SameSite=Strict — jamais localStorage, jamais exposé côté client
- API machine (BRM/Centres/Moodle/EduPop) : HMAC-SHA256 via `src/lib/verify-hmac.ts`
- Rate limiting Redis sur tous les endpoints publics via `src/lib/rate-limit.ts`
- Webhooks : vérifier HMAC + idempotence `event_id` Redis (TTL 7 jours) avant tout traitement

**Interface**
- Composants : `src/components/ui/` exclusivement — jamais de HTML Tailwind brut dans une page
- Tokens couleur : préfixe `gj-*` (`gj-teal`, `gj-yellow`, `gj-red`...) — jamais de hex en dur
- `gj-indigo` réservé au chatbot Aïssatou — jamais utilisé ailleurs
- Police : system-ui (sans webfont — critique 3G) — configurée dans `src/styles/tokens.css`
- **`design/html/`** = source de vérité visuelle — lire le fichier HTML avant toute nouvelle page

**API**
- Type de réponse : `ApiResponse<T>` de `src/types/api.ts` — `{ data?, meta?, error? }`
- Payload max 50KB · pagination 20 items/page · images WebP via `<Image />`
- Routes Data Hub : `/api/v1/export/` · Routes interop : `/api/interconnexion/`

---

## Protocole avant démarrage d'un module (OBLIGATOIRE)

1. **Fetch ticket JIRA** (MCP) → lire, identifier ce qui est incomplet ou obsolète
2. **Proposer les mises à jour** du ticket → attendre validation humaine avant de continuer
3. **Charger la spec** `.agent_context/specs/MX-nom.md` — si absente, la créer
4. **Si informations manquantes** → poser max 3 questions ciblées → attendre réponses
5. **Valider la spec** avec l'humain → **seulement ensuite : écrire du code**
6. Créer `CURRENT_TASK.md` · créer branche `feature/GUIC-<n>-<description>` depuis `dev`

---

## Chargement contextuel (juste-à-temps — ne pas tout charger)

→ **Tâche active** : `.agent_context/CURRENT_TASK.md` (si présent — lire en premier)
→ **Règles Next.js** : `.agent_context/rules/nextjs.md`
→ **Sécurité** : `.agent_context/rules/security.md`
→ **Spec module actif** : `.agent_context/specs/MX-nom.md`
→ **SSO** : `docs/sso.md` · **Conventions** : `docs/conventions.md` · **Métier** : `docs/metier.md`
→ **Interop** : `docs/interconnexion.md` · **Architecture** : `docs/architecture.md`
→ **SSO source** : `../cjs_auth/` (lecture seule — contrats, webhooks, flows auth)

---

## Git & JIRA

**Règle absolue :** Jamais de push direct sur `main`, `dev` ou `staging`.
Toujours : `git checkout dev && git pull` → créer branche feature → PR vers `dev`.

**Projet JIRA :** `GUIC` · https://consortiumjeunesse.atlassian.net/jira/software/projects/GUIC/boards/199

```
Branche  : feature/GUIC-<n>-<description-kebab>   ← depuis dev obligatoirement
PR titre : GUIC-<n> feat|fix|chore: <description courte en français>
Commit   : feat|fix|perf|security|chore|test(module): [GUIC-<n>] description
           Closes GUIC-<n>
```

| Moment | Statut ticket |
|--------|--------------|
| Branche créée | En cours |
| PR ouverte | En review |
| Mergée sur develop | À valider |
| develop → main | Fini |

Modules : `m1-socle` `m2-auth` `m3-opportunites` `m4-centres` `m5-agenda` `m6-ressources` `m7-seo` `m8-admin` `m9-recruteur` `m10-interop` `m11-whatsapp` `m12-ia` `m13-data` `m14-prod`

---

## Modes : CODING · SECURITY · REVIEW · TEST · MIGRATION
