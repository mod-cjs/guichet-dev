# 07 — Sécurité & conformité

## RBAC et isolation des données

- Le **rôle** et le **`centre_id` de portée** sont lus depuis le token SSO à **chaque requête**.
- Les requêtes Cypher **intègrent des clauses de filtrage** par rôle et par centre.
- Un bénéficiaire ne voit que **ses** données. Un gestionnaire ne voit que **son** centre. Un bibliothécaire accède uniquement aux données bibliothèque.

> Invariant : **aucune** requête Neo4j ou Route Handler ne doit retourner de données hors-portée du token SSO. Le filtrage est appliqué côté serveur, jamais côté client.

### Isolation inter-bénéficiaires (graphe enrichi)

Le graphe enrichi contient des nœuds `:Beneficiaire` reliés à des données personnelles (`MAITRISE`, `A_POSTULE`, `A_OBTENU`, `A_EXERCE`, `INSCRIT_A`). Certaines requêtes (reco collaborative) **traversent** les arêtes d'autres bénéficiaires. Règles **dures** :

- Un bénéficiaire ne peut matcher **son propre** nœud `:Beneficiaire` (par `cjsUid` du token) — jamais celui d'un autre en lecture directe.
- Les requêtes qui traversent d'autres bénéficiaires (reco collaborative) ne retournent qu'une **sortie agrégée/anonymisée** : jamais `autre.cjsUid`, jamais ses propriétés, jamais le nœud `:Beneficiaire` lui-même. Seuls des résultats dérivés (titre d'opportunité, `count` de popularité) sortent.
- **Whitelist de la clause `RETURN`** par template : un template ne peut renvoyer que des champs explicitement autorisés — un `:Beneficiaire` tiers n'est jamais dans la liste blanche.
- Le **scope** `{cjsUid, role, centreId}` est injecté dans chaque template (jamais fourni par le LLM ni le client).

## Badge & signature HMAC

- Payload QR = `cjs_uid + timestamp_unix + HMAC-SHA256`.
- Clé de signature en **variable d'env chiffrée**, jamais en base.
- Rotation à minuit · vérification temps réel à chaque scan · compte suspendu = badge invalide immédiat.
- *(Réconciliation avec le JWT rotatif existant : voir [05-badge-numerique.md](./05-badge-numerique.md).)*

## Webhooks WhatsApp

- Chaque webhook entrant vérifié par **HMAC-SHA256** dans `/api/whatsapp/webhook` (repo : `/api/whatsapp`). Rejet **HTTP 401** si signature invalide.
- Idempotence `event_id` Redis (TTL 7 jours) avant tout traitement — **déjà implémenté** (GUIC-240).
- Rate limiting Redis sur l'endpoint (cf. `src/lib/rate-limit.ts`, GUIC-240/91).

## Mode hors-ligne (centres ruraux)

- Page de scan accessible depuis navigateur mobile → stocke les scans en **IndexedDB** quand le réseau est absent.
- Synchronisation **automatique** au retour de connexion.
- Indicateur visible des scans en attente.

## Données en Redis

- **Uniquement** : contexte de conversation + `cjs_uid`.
- **Aucune** donnée sensible, aucun token, aucun document.
- Expiration auto : **30 min web**, **7 jours WhatsApp**.

## Conformité CDP (Commission de Protection des Données — Sénégal)

- Logs `agent_logs` conservés selon la politique de données CJS, avec **rétention définie + purge auto** (cf. [10-risques.md](./10-risques.md) R5).
- **Droit à l'oubli** propagé depuis le SSO → invalide immédiatement le badge + **anonymise** les entrées dans les tables visites, emprunts **et `agent_logs`** (qui contient le plus de PII via `payload` — ne pas l'oublier).
- **Minimisation** : masquer/tronquer les PII (téléphone, email) dans `agent_logs.payload`.
- Accès aux logs **restreint aux rôles autorisés**.

## Rappels invariants repo (CLAUDE.md)

- Token SSO : cookie **httpOnly SameSite=Strict** — jamais localStorage, jamais exposé client.
- API machine (BRM/Centres/Moodle/EduPop) : HMAC-SHA256 via `src/lib/verify-hmac.ts`.
- Rate limiting Redis sur **tous** les endpoints publics via `src/lib/rate-limit.ts`.
- `cjs_uid` = claim `sub` du token SSO = seul identifiant inter-plateformes.
- Jamais de login local, jamais de mot de passe, jamais de formulaire d'auth dans ce projet.
