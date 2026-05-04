# CLAUDE.md — Guichet Jeunesse CJS

Plateforme jeunesse CJS · 22 000 utilisateurs · Sénégal · Programme YEAH · Conformité CDP

**Stack :** Next.js 16 (App Router) · TypeScript 5 · Prisma 7 · MariaDB 11 · Redis 7
**Auth :** SSO CJS OAuth2/OIDC (Laravel Passport) · next-auth v5
**IA :** Groq llama-3.3-70b · **WhatsApp :** Meta Cloud API v19

---

## Règles absolues

**Identité**
- `cjs_uid` = claim `sub` du token SSO = seul identifiant inter-plateformes — présent dans toutes les tables
- Jamais de login local, jamais de mot de passe, jamais de formulaire d'auth dans ce projet
- Téléphone : format E.164 obligatoire (`+221XXXXXXXXX`)

**Données**
- Toujours Prisma (`src/lib/prisma.ts`) — SQL brut interdit sauf exception documentée dans `DECISIONS.md`
- Toute modification de schéma = `prisma migrate dev` — jamais de modif directe en base
- `cjs_uid` présent dans toutes les tables liées à un utilisateur

**Sécurité**
- Token SSO : cookie httpOnly SameSite=Strict — jamais localStorage, jamais exposé côté client
- API machine (BRM/Centres/Moodle) : HMAC-SHA256 — voir `docs/interconnexion.md`
- Rate limiting Redis sur tous les endpoints publics — via `src/lib/rate-limit.ts`
- Webhooks : vérifier HMAC + idempotence `event_id` avant tout traitement

**Interface**
- Composants : `src/components/ui/` exclusivement — jamais de HTML Tailwind brut dans une page
- Couleurs : `src/styles/tokens.css` et `src/styles/design-tokens.ts` — jamais de valeurs hex en dur
- Police : Lexend uniquement
- **Design de référence : `design/html/`** — lire le fichier HTML avant toute nouvelle page/composant
- Si aucun fichier HTML de référence → signaler au PO, ne pas inventer le design

**API**
- Structure réponse obligatoire : `{ data, meta, error }`
- Payload max 50KB · pagination 20 items · images WebP via `<Image />`
- Routes Data Hub : `/api/v1/export/` · Routes interop : `/api/interconnexion/`

---

## Protocole avant démarrage d'un module (OBLIGATOIRE)

1. **Fetch ticket JIRA** (MCP) → lire description et critères d'acceptance
2. **Évaluer la complétude** — les tickets peuvent être incomplets ou obsolètes
3. **Proposer les mises à jour** (description, acceptance criteria, story points) → attendre validation humaine
4. **Charger la spec** `.agent_context/specs/MX-nom.md` si elle existe
5. **Si spec absente ou insuffisante** → poser les questions manquantes (max 3 à la fois) → attendre réponse
6. **Compléter/valider la spec** avec l'humain → **seulement ensuite : écrire du code**
7. Créer `.agent_context/CURRENT_TASK.md` · créer branche · implémenter

---

## Chargement contextuel (juste-à-temps — ne pas tout charger)

→ **Tâche active** : `.agent_context/CURRENT_TASK.md` (si présent — lire en premier)
→ **Règles Next.js** : `.agent_context/rules/nextjs.md`
→ **Sécurité** : `.agent_context/rules/security.md`
→ **Spec module actif** : `.agent_context/specs/MX-nom.md`
→ **SSO** : `docs/sso.md` · **Conventions** : `docs/conventions.md` · **Interop** : `docs/interconnexion.md`
→ **Architecture** : `docs/architecture.md` (si décision structurelle uniquement)

---

## JIRA & Git

**Projet :** `GUIC` · **Board :** https://consortiumjeunesse.atlassian.net/jira/software/projects/GUIC/boards/199

| Moment | Statut ticket |
|--------|--------------|
| Branche créée | En cours |
| PR ouverte / ready_for_review | En review |
| PR mergée sur develop | À valider |
| PR develop → main | Fini |

```
Branche  : feature/GUIC-<n>-<description-kebab>
PR titre : GUIC-<n> feat|fix|chore: <description courte en français>
Commit   : feat|fix|perf|security|chore|test(module): [GUIC-<n>] description
           Closes GUIC-<n>
```

Modules : `m1-socle` `m2-auth` `m3-opportunites` `m4-centres` `m5-agenda` `m6-ressources` `m7-seo` `m8-admin` `m9-recruteur` `m10-interop` `m11-whatsapp` `m12-ia` `m13-data` `m14-prod`

---

## Modes actifs : CODING · SECURITY · REVIEW · TEST · MIGRATION
