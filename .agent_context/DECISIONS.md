# Décisions d'architecture — Guichet Jeunesse CJS

Format : date · contexte · décision · pourquoi

---

## 2026-05-05 — Architecture navigation : deux contextes distincts

**Contexte :** Audit mobile a révélé que le Header mélangeait pages publiques et app authentifiée. Sur mobile, le nav débordait horizontalement (overflow-x-auto) et le bouton Se connecter était inaccessible.

**Décision :**
- **Pages publiques** (`/`, `/opportunites`, `/evenements`, `/ressources`, `/centres`, `/auth/*`) → Header marketing uniquement. Mobile : logo + bouton Se connecter. Pas de bottom-nav.
- **App jeune** (`/jeune/*`) → AppTopbar + BottomNav fixe 5 items sur mobile. Desktop : header standard. Padding-bottom obligatoire sur le contenu.
- **Admin / Recruteur** → Sidebar desktop. Mini topbar + drawer hamburger mobile. Pas de bottom-nav.

**Pourquoi deux barres sur /jeune/* :** Pattern natif iOS/Android (WhatsApp, Instagram, LinkedIn). Top bar = identité/contexte/actions utilitaires. Bottom nav = navigation principale, zone pouce "Easy". Coût vertical acceptable (15% sur 667px).

**Règle icônes nav :** SVG inline uniquement — jamais d'emojis (rendu incohérent cross-platform, non colorisable via CSS).

**Spec complète :** `.agent_context/specs/layout-navigation.md`

---

## 2026-05-04 — Clé projet JIRA : GUIC

**Contexte :** `jira.yml` utilisait `GJ-[0-9]+`, URL board et CLAUDE.md récent utilisaient `GUIC-XX`.
**Décision :** Standardisé sur `GUIC-XX`. jira.yml mis à jour pour matcher `GUIC-[0-9]+`.

---

## 2026-05-04 — Système agent 3 niveaux (token efficiency)

**Contexte :** Contexte fixe par session ~7 700 tokens avec l'ancien système.
**Décision :** Architecture 3 niveaux :
- Tier 1 (toujours) : `CLAUDE.md` ≤ 700 tokens
- Tier 2 (tâche active) : `CURRENT_TASK.md` ~200 tokens
- Tier 3 (à la demande) : `specs/`, `rules/`, `docs/`

`docs/` = référence documentaire. `.agent_context/` = couche opérationnelle. Pas de duplication.
**Gain :** ~80% de réduction des tokens de contexte fixe.

---

## 2026-05-04 — Tokens couleur : préfixe gj-* canonique

**Contexte :** `docs/conventions.md` référençait `cjs-vert/or/rouge`. Le `tailwind.config.ts` réel utilise `gj-teal/yellow/red` comme tokens primaires. Les `cjs-*` sont des aliases de compatibilité.
**Décision :** Préfixe canonique `gj-*` dans tout le nouveau code. Aliases `cjs-*` tolérés uniquement en legacy.
**Source de vérité :** `src/styles/tokens.css` + `tailwind.config.ts`.

---

## 2026-05-04 — Police : Lexend (implémentation) vs Segoe UI (prototype HTML)

**Contexte :** `docs/design/README.md` mentionnait `Segoe UI` (prototype HTML V5 sans webfont). `src/app/layout.tsx` charge Lexend via `next/font/google`.
**Décision :** Lexend pour l'implémentation. `design/html/` reste la référence visuelle sans être modifié.

---

## 2026-05-04 — Format réponse API : ApiResponse<T> unifié

**Contexte :** Ambiguïté dans les exemples de code entre structures séparées succès/erreur et structure unifiée.
**Décision :** Type canonique `ApiResponse<T>` dans `src/types/api.ts` :
```typescript
{ data?: T, meta?: ApiMeta, error?: { code: string; message: string } }
```
Succès : `data` + `meta` renseignés. Erreur : `error` renseigné, `data` absent.

---

## 2026-05-04 — Projet SSO cjs_auth : lecture seule

**Contexte :** Le projet SSO est dans `../cjs_auth/`. Il contient les contrats d'auth, webhooks et flows OIDC.
**Décision :** L'agent lit `../cjs_auth/` pour retrouver des informations de contrat. Ne jamais modifier ce projet.
**Fichiers utiles :**
- `../cjs_auth/.agent_context/CONTEXT.md` — vue d'ensemble SSO
- `../cjs_auth/.agent_context/GUICHET_CONCEPTION_TECHNIQUE.md` — conception Guichet côté SSO
- `../cjs_auth/routes/api.php` — endpoints exposés par le SSO
- `../cjs_auth/app/Services/WebhookService.php` — events webhooks émis

---

## 2026-05-22 — Exception SQL brut : recherche plein-texte opportunités (GUIC-20)

**Contexte :** `src/lib/opportunites-loader.ts` doit faire une recherche plein-texte sur `opportunites(titre, description)`. La recherche natural-language de MariaDB applique un seuil de 50 % et `ft_min_word_len` — inopérante sur un petit jeu de données (50 opportunités seedées : une requête courante peut ne rien renvoyer). Prisma `where: { titre: { search } }` ne pilote pas le mode.

**Décision :** la liste du catalogue (fonction `queryList`) passe par `prisma.$queryRaw`, requête entièrement paramétrée via `Prisma.sql` / `Prisma.join` (aucune interpolation de chaîne). Exception assumée à « toujours Prisma » pour **deux limites de MariaDB que Prisma ne pilote pas** :
1. **Recherche plein-texte** `MATCH(...) AGAINST (? IN BOOLEAN MODE)`. BOOLEAN MODE supprime le seuil de 50 %. `ft_min_word_len`/`innodb_ft_min_token_size` reste actif : les mots < 4 caractères sont ignorés par l'index → repli automatique sur `LIKE` quand aucun mot du terme n'atteint 4 caractères.
2. **Tri par échéance NULLS LAST** : `ORDER BY deadline IS NULL, deadline ASC` — MariaDB n'a pas `NULLS LAST`, et Prisma `orderBy { nulls }` n'est pas supporté sur MySQL.

**Pourquoi :** sans ça, une recherche courte ne renvoie rien et les opportunités sans échéance remontent en tête du tri « échéance proche ». Le détail (`getOpportuniteDetail`) et le reste du code restent en Prisma standard.
