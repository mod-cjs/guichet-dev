# Spec — Rôles SSO `conseiller` & `recruteur` attribués via le SSO (comme `admin`)

**Statut :** validée cadrage 2026-07-06 (3 décisions PO ci-dessous) — en attente validation finale avant code
**Modules :** m2-auth · m8-admin
**Réfs :** `.agent_context/specs/M8-espace-conseiller.md` · `src/lib/auth/admin-roles.ts` (pattern admin, audit E2)

---

## Objectif

Aligner `conseiller` et `recruteur` sur le modèle admin : le rôle s'attribue dans
l'**UI admin du SSO** (`platform_roles`), voyage dans le claim **`cjs_roles`**,
et Guichet le consomme via `session.roles`. Le **périmètre de données** reste
défini côté Guichet (`AgentCentre` pour le centre, `Organisation.cjsUid` pour
l'organisation) — le SSO dit *qui a le rôle*, Guichet dit *sur quoi il porte*.

## Décisions de cadrage (PO 2026-07-06)

| # | Question | Décision |
|---|----------|----------|
| D1 | Rôle SSO `conseiller` sans rattachement centre | **Écran d'attente dédié** dans `/conseiller` : « Compte conseiller en attente de rattachement à un centre — contactez l'administrateur ». Pas de redirect silencieux. |
| D2 | Rétrocompat AgentCentre existants sans rôle SSO | **Double porte transitoire : rôle SSO OU AgentCentre.** Le rôle SSO est la voie officielle ; passage en strict plus tard, quand tous les comptes seront migrés. |
| D3 | UI admin de rattachement | **Incluse dans ce chantier.** Fiche utilisateur admin → section « Rôles & rattachements » : AgentCentre (conseiller↔centre) + Organisation (recruteur). |
| D4 | Rôle SSO `recruteur` sans organisation liée | **Écran d'attente symétrique à D1** dans `/recruteur` : « Compte recruteur en attente de liaison à une organisation ». Remplace le dashboard vide actuel. |

## État actuel (audité 2026-07-06)

- **Recruteur** : chaîne SSO déjà câblée — `src/middleware.ts:12` (`/recruteur/*` ⇒ `roles.includes('recruteur')`), redirect post-login callback:150, guard layout. Manque : `available_roles` SSO + UI de liaison Organisation.
- **Conseiller** : AUCUN câblage SSO. Accès = présence d'une ligne `AgentCentre` (layout `getConseillerContext` → sinon `redirect('/')`). Aucun writer applicatif d'`AgentCentre` (seeds uniquement). Pas de pattern middleware, pas de redirect post-login.
- **Webhook** `user.updated` (`src/app/api/webhooks/sso/route.ts`) : reçoit `roles[]` (zod l.80) mais **ne le persiste pas** dans `Utilisateur.role`.
- **SSO** : `platforms.available_roles` (liste blanche JSON, contrôlée par `addPlatformRole`) et `default_role='beneficiaire'`. UI admin d'attribution déjà en place (`routes/web.php:107`). `rolesForPlatform()` : platform_roles > default_role > roles globaux.

## Chantier A — SSO (données uniquement, zéro code, zéro déploiement)

Ajouter `recruteur` et `conseiller` à `available_roles` de la plateforme Guichet
(ligne `platforms` dont `oauth_client_id` = client de l'env visé — dev ET prod) :

```sql
-- à exécuter sur la base SSO (adapter l'id) :
UPDATE platforms
SET available_roles = JSON_ARRAY('beneficiaire','recruteur','conseiller','admin','moderator','super_admin')
WHERE oauth_client_id = '<client_id_guichet>';
```

Attribution ensuite via l'UI admin SSO existante (fiche user → rôles plateforme).
⚠️ Un rôle explicite désactive `default_role` : donner `conseiller` retire `beneficiaire` (voulu).
⚠️ Effet à la **prochaine connexion** (claim lu au callback OAuth).

## Chantier B — Guichet (code, TDD strict RED→GREEN)

### B1. Rôles & routing
- `src/lib/auth/roles.ts` (nouveau, à côté d'`admin-roles.ts`) : `isConseillerRole(roles)`, `isRecruteurRole(roles)` — source unique (même principe que l'audit E2 admin).
- `src/middleware.ts` : PAS de gate strict `/conseiller/*` par rôle pendant la transition D2 (le middleware edge ne peut pas lire AgentCentre) → gate = authentifié seulement ; le layout fait le check fin. Commentaire datant le passage en strict.
- Callback + middleware `destination` : ordre admin > recruteur > **conseiller → `/conseiller`** > beneficiaire.

### B2. Guard layout conseiller (D1 + D2)
```
session absente            → redirect /auth/connexion
ctx AgentCentre présent    → accès (rétrocompat D2, rôle SSO non requis)
rôle SSO conseiller, 0 ctx → écran d'attente (D1) — shell minimal, pas la sidebar
ni rôle ni ctx             → redirect /
```
Composant `ConseillerEnAttente` (page pleine, `<Icon>`, ton informatif, contact admin).

### B3. Sync cache rôle (webhook)
`user.updated` : si `roles[]` présent → mettre à jour `Utilisateur.role` (priorité
admin > recruteur > conseiller > beneficiaire, aligné `deriveRole`). Idempotent,
ne touche rien si `roles` absent.

### B4. UI admin « Rôles & rattachements » (D3)
Fiche utilisateur admin (`/admin/utilisateurs/[cjsUid]`) — nouvelle section :
- **Rattachements centre** : liste des lignes `AgentCentre` (centre + rôle agent) ; ajouter (select centre + rôle, défaut `conseiller`) ; retirer. Server actions + `recordAudit`.
- **Organisation (recruteur)** : afficher l'organisation liée (`Organisation.cjsUid`) ; lier à une organisation existante ou en créer une (nom minimal) ; délier. Server actions + `recordAudit`.
- Admin = provisioning/supervision (conforme `feedback_roles_candidatures` : pas de décision métier ici).
- Rappel visible : « le rôle SSO s'attribue dans l'admin SSO ; prend effet à la reconnexion ».

### B5. Tests (RED commit séparé avant GREEN)
- unit : `roles.ts` (matrice), guard layout conseiller (4 chemins), destination callback (conseiller), webhook sync rôle (present/absent/idempotent).
- intégration : actions AgentCentre (ajout/doublon `@@unique`/retrait), actions Organisation (lier/créer/délier), audit enregistré.
- e2e (si env dispo) : login conseiller sans rattachement → écran d'attente ; avec rattachement → dashboard.

## Hors périmètre
- Passage en strict du guard conseiller (ticket de suite, après migration des comptes).
- Multi-centre UI (le modèle le permet déjà, MVP = premier centre).
- Attribution du rôle SSO depuis Guichet (reste dans l'admin SSO — c'est le but).

## Risques
- Env Vercel dev : vérifier que le client OAuth pointe la bonne ligne `platforms` (root cause du bug platform_roles de mai).
- `Utilisateur.role` cache : ne jamais l'utiliser comme source d'autorisation (les guards lisent `session.roles`/AgentCentre) — il ne sert qu'à l'affichage admin.
