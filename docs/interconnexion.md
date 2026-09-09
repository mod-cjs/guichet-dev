# API d'interconnexion et export Data Hub — Guichet Jeunesse CJS

## 1. Vue d'ensemble

Ce document décrit les deux types d'API exposées par le Guichet Jeunesse pour communiquer avec l'écosystème CJS :

1. **API d'export Data Hub** (`/api/v1/export/`) — endpoints REST versionnés pour extraire les données du Guichet vers des outils BI tiers (Power BI, Metabase, Tableau, Excel).

2. **API d'interconnexion** (`/api/interconnexion/`) — webhooks et endpoints pour recevoir et envoyer des données entre le Guichet et les autres plateformes CJS (BRM, Centres, Moodle, EduPop).

---

## 2. Sécurité : signature HMAC-SHA256

Toutes les requêtes machine-to-machine entre plateformes CJS utilisent une signature **HMAC-SHA256**. Le Bearer Token OAuth ne suffit pas pour ces appels — il faut les trois headers suivants :

| Header | Description |
|--------|-------------|
| `X-CJS-Api-Key` | Clé publique de la plateforme appelante |
| `X-CJS-Timestamp` | Timestamp Unix en secondes (rejeté si > ±5 min) |
| `X-CJS-Signature` | Signature HMAC-SHA256 en hexadécimal |

### Calcul de la signature

```
body_hash  = sha256(corps de la requête JSON, ou "" si vide)
message    = api_key + "\n" + timestamp + "\n" + body_hash
signature  = hmac_sha256(message, api_secret)
```

### Implémentation dans Next.js (vérification côté Guichet)

```typescript
// src/lib/verify-hmac.ts

import { createHmac, createHash, timingSafeEqual } from 'crypto'

export function verifyHmacSignature(
  apiKey: string,
  timestamp: string,
  signature: string,
  body: string,
  secrets: Record<string, string> // map apiKey → apiSecret
): boolean {
  // 1. Vérifier le timestamp (fenêtre ±5 min)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return false

  // 2. Récupérer le secret associé à la clé
  const secret = secrets[apiKey]
  if (!secret) return false

  // 3. Calculer la signature attendue
  const bodyHash = createHash('sha256').update(body).digest('hex')
  const message = `${apiKey}\n${timestamp}\n${bodyHash}`
  const expected = createHmac('sha256', secret).update(message).digest('hex')

  // 4. Comparaison en temps constant (anti timing attack)
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}
```

---

## 3. API d'export Data Hub — `/api/v1/export/`

> **Cette section ne décrit plus le contrat en détail — il est GÉNÉRÉ.**
>
> Source de vérité : [`docs/openapi/datahub-v1.yaml`](openapi/datahub-v1.yaml), dérivé du
> contrat d'export (`src/lib/datahub/streams.ts`) et de la documentation du schéma Prisma.
> Régénérer : `npm run datahub:openapi`. Une sentinelle de test échoue si le fichier
> committé diverge.
>
> La version précédente de cette section, écrite à la main, décrivait une API qui n'a
> jamais existé : pagination par numéro de page, colonnes inventées (`nb_candidatures`,
> `completion_profil`), endpoint `formations` non implémenté. C'est le sort de toute
> documentation d'API tenue séparément du code — d'où la génération.

### 3.1 Principes

**Consommateur unique** — le tap Meltano du Data Hub. Les outils BI lisent l'entrepôt
PostgreSQL, jamais cette API.

**Authentification** — `Authorization: Bearer <secret>`. Clés nommées via
`DATAHUB_API_KEYS` (`meltano:secret,bi:autre`), ce qui identifie le consommateur dans le
journal d'audit et permet une rotation sans coupure. `DATAHUB_API_KEY` reste accepté seul.
Aucune clé configurée = **tout accès refusé** (GUIC-631).

**Pagination par curseur, jamais par offset.** L'offset pagine par rang, et le rang bouge :
une insertion pendant l'extraction décale les pages suivantes et une ligne passe entre deux
pages sans jamais être lue, sans erreur. Le curseur pagine par position dans le tri
`(watermark, clé primaire)`.

**Recouvrement obligatoire côté consommateur.** Repartir du dernier point d'arrêt moins
quelques minutes : le watermark est posé à l'écriture applicative et non au commit, donc
une transaction committée en retard porte un horodatage antérieur et serait manquée. Les
doublons produits sont absorbés par l'upsert de l'entrepôt.

**Les suppressions logiques sortent**, avec leur date, pour que l'entrepôt les propage au
lieu de conserver des fantômes.

### 3.2 Endpoints

| Endpoint | Rôle |
|---|---|
| `GET /api/v1/export/{stream}` | Une page d'un flux. Paramètres `since`, `cursor`, `limit`. |
| `GET /api/v1/export/counts` | Comptage par flux sur une fenêtre — réconciliation après run. |

Les flux disponibles sont ceux déclarés au contrat ; l'OpenAPI en fait foi.

### 3.3 Vérifier qu'un run a tout extrait

« Le pipeline n'a pas planté » et « le pipeline a tout extrait » sont deux choses
différentes. Comparer `/counts?since=<début du run>` aux `COUNT(*)` de l'entrepôt sur la
même fenêtre est le seul moyen de trancher.

---

## 4. API d'interconnexion — `/api/interconnexion/`

Ces endpoints reçoivent des événements des plateformes CJS (webhooks entrants) et permettent la synchronisation bidirectionnelle.

### 4.1 Centres → Guichet

**Déclencheur** : Un agent CJS enrôle un jeune dans un centre physique.

**Endpoint** : `POST /api/interconnexion/centres`

**Body** :
```json
{
  "event": "jeune.enrolement",
  "centreId": 3,
  "gcId": 1247,
  "telephone": "+221771234567",
  "nom": "Diallo",
  "prenom": "Mamadou",
  "genre": "M",
  "region": "Dakar",
  "dateEnrolement": "2026-05-04T10:00:00Z"
}
```

**Traitement côté Guichet** :
1. Vérifier la signature HMAC-SHA256
2. Rechercher un utilisateur existant par `telephone` (format E.164)
3. Si trouvé : lier le `gcId` au compte existant, syncer les données
4. Si non trouvé : créer un compte via le SSO (appel server-to-server), puis créer le profil Guichet avec le `cjs_uid` retourné
5. Retourner `{ cjs_uid, status: "created" | "linked" }`

**Réponse** :
```json
{
  "data": {
    "cjs_uid": "550e8400-e29b-41d4-a716-446655440000",
    "status": "linked"
  }
}
```

### 4.2 Moodle → Guichet

**Déclencheur** : Un jeune obtient un certificat sur la plateforme e-learning.

**Endpoint** : `POST /api/interconnexion/moodle`

**Body** :
```json
{
  "event": "certification.obtenue",
  "cjsUid": "550e8400-e29b-41d4-a716-446655440000",
  "moodleUserId": 892,
  "formation": "Entrepreneuriat agricole",
  "codeCertificat": "CERT-2026-0892-AGR",
  "noteFinale": 87.5,
  "dateEmission": "2026-05-04",
  "moodleCertifId": 45
}
```

**Traitement** :
1. Vérifier signature HMAC
2. Vérifier que le `cjs_uid` existe dans la base Guichet
3. Créer ou mettre à jour la certification dans la table `certifications`
4. Mettre à jour le taux de completion du profil jeune
5. Si notifications actives : envoyer une notification WhatsApp au jeune

### 4.3 BRM ↔ Guichet

**Déclencheur (BRM → Guichet)** : Modification du statut d'un bénéficiaire dans le BRM.

**Endpoint** : `POST /api/interconnexion/brm`

**Events supportés** :
- `beneficiaire.programme.rejoint` — un jeune rejoint un programme
- `beneficiaire.programme.termine` — un jeune termine un programme
- `beneficiaire.decaissement.effectue` — un décaissement a été effectué

**Body (exemple)** :
```json
{
  "event": "beneficiaire.programme.rejoint",
  "cjsUid": "550e8400-e29b-41d4-a716-446655440000",
  "brmBeneficiaireId": 1234,
  "programme": "YEAH",
  "dateDebut": "2026-05-01",
  "responsableProgramme": "Alle Samba DIOUF"
}
```

**Endpoint Guichet → BRM** (appel sortant) :
Le Guichet peut pousser des données vers le BRM via son API (documentée séparément dans la documentation BRM).

### 4.4 EduPop → Guichet

**Déclencheur** : Synchronisation des statistiques d'usage de l'IA Fatou.

**Endpoint** : `POST /api/interconnexion/edupop`

**Body** :
```json
{
  "event": "usage.ia.mensuel",
  "periode": "2026-04",
  "nbSessions": 3421,
  "nbUtilisateurs": 892,
  "topThemes": ["entrepreneuriat", "agriculture", "citoyennete"]
}
```

Ces données alimentent le tableau de bord Data Hub de l'administrateur CJS.

---

## 5. Variables d'environnement pour l'interconnexion

```env
# Data Hub — export
DATAHUB_API_KEY=<clé à générer>

# Signatures HMAC par plateforme source
BRM_API_KEY=<clé publique fournie par l'équipe BRM>
BRM_API_SECRET=<secret partagé>

CENTRES_API_KEY=<clé publique fournie par MyDigitalPro>
CENTRES_API_SECRET=<secret partagé>

MOODLE_API_KEY=<clé publique Moodle>
MOODLE_API_SECRET=<secret partagé>

EDUPOP_API_KEY=<clé publique EduPop>
EDUPOP_API_SECRET=<secret partagé>
```

---

## 6. Monitoring et logs

Chaque appel entrant sur `/api/interconnexion/` est logué avec :
- Timestamp
- Plateforme source (identifiée via `X-CJS-Api-Key`)
- Événement reçu
- Résultat du traitement (succès / erreur)
- Durée de traitement

En cas d'échec de signature HMAC : log de sécurité + alerte Slack canal `#alertes-sécurité`.

---

## 7. Rejeu des événements manqués

En cas d'indisponibilité temporaire du Guichet, les plateformes sources peuvent rejouer les événements non acquittés. Le Guichet implémente une idempotence basique :

- Chaque event entrant porte un `eventId` unique
- Si un `eventId` déjà traité est reçu, la réponse est `200 OK` avec `{ status: "already_processed" }`
- Les `eventId` traités sont conservés en Redis pendant 7 jours
