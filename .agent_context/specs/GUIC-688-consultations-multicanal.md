# Spec — Consultations multicanal (web · IA · WhatsApp)

**Ticket :** [GUIC-688](https://consortiumjeunesse.atlassian.net/browse/GUIC-688) (Story)
**Modules :** `m13-data` (socle) × `m3-opportunites` `m4-centres` `m5-agenda` `m6-ressources` `m12-ia` `m11-whatsapp`
**Branche :** `feature/GUIC-688-consultations-multicanal` (depuis `dev`)

---

## 1. Contexte & état réel

La visualisation d'un élément du Guichet par un bénéficiaire n'est tracée que partiellement, et uniquement sur le web :

| Entité | Compteur actuel | Dédoublonnage | Nominatif | IA | WhatsApp |
|---|---|---|---|---|---|
| Opportunité | `Opportunite.vues` | Redis IP 30 min | non | non | non |
| Ressource | `Ressource.vues` | **aucun** | non | non | non |
| Événement | aucun | — | — | non | non |
| Centre | `CentreEvent` (`centre_viewed`) | aucun | `cjsUid` optionnel | non | non |
| Livre | aucun | — | — | non | non |

Trois défauts structurels :
1. `incrementRessourceVues` ([ressources.ts:277](../../src/lib/loaders/ressources.ts)) incrémente à **chaque rendu** — chiffre gonflé, non comparable à celui des opportunités.
2. Deux modèles mentaux incompatibles cohabitent : compteur dénormalisé (`vues`) vs événementiel (`CentreEvent`). On ne peut rien agréger.
3. `RecommandationIA.vuePar` n'est **jamais écrit en production** (seul le seed le renseigne) → `recosVues` / `tauxConversionReco` de [outcomes.ts](../../src/lib/ia/metrics/outcomes.ts) sont structurellement à zéro.

Côté IA/WhatsApp, `AgentLog.nodesReturned` ne stocke qu'un **compteur** ([agent.ts:395](../../src/lib/ia/agent.ts)) : on sait « 5 offres retournées », jamais lesquelles. Les liens envoyés sur WhatsApp sont des URLs nues ([format-whatsapp.ts:29](../../src/lib/ia/format-whatsapp.ts)) : un clic retombe dans le trafic web organique, sans attribution.

## 2. Objectifs (acceptance)

1. Un helper unique appelé depuis les **3 canaux** pour les **5 entités consultables** par un bénéficiaire (opportunité, ressource, événement, centre, livre).
2. Distinction **impression** (l'élément a été affiché — card Yaye, liste WhatsApp) vs **consultation** (l'élément a été ouvert).
3. Dédoublonnage **identique sur les 3 canaux** (30 min), sinon les volumes restent incomparables.
4. Aucune adresse IP en clair en base.
5. Tracking strictement **fail-soft** : jamais de throw au callsite, jamais de blocage de la réponse.
6. `RecommandationIA.vuePar` renseigné quand la consultation provient d'une recommandation.

## 3. Décisions

| Sujet | Décision |
|---|---|
| Nominatif | `cjsUid` renseigné pour les connectés, `sujetHash` seul pour les anonymes |
| Fenêtre de dédoublonnage | 30 min (aligne sur l'existant opportunités) |
| Compteurs `vues` | Conservés comme **cache dénormalisé**, alimentés par le même helper — aucun dashboard à réécrire |
| `CentreEvent.centre_viewed` | Double écriture transitoire (nouvelle table + ancienne), retrait dans un lot ultérieur |
| Rétention / purge / anonymisation | **Hors périmètre — décision PO : on conserve tout, sans limite de durée** |
| `Programme` / `Organisation` | Enum prévu, **pas d'instrumentation** : aucune page consultable par un bénéficiaire aujourd'hui (admin only) |

## 4. Modèle de données

```prisma
enum EntiteConsultable { opportunite ressource evenement centre livre programme organisation }
enum TypeConsultation  { impression consultation }
enum CanalConsultation { web ia_web whatsapp }

model Consultation {
  id         BigInt            @id @default(autoincrement())
  typeEntite EntiteConsultable @map("type_entite")
  entiteId   String            @map("entite_id") @db.VarChar(36)
  typeEvent  TypeConsultation  @map("type_event")
  canal      CanalConsultation
  cjsUid     String?           @map("cjs_uid") @db.VarChar(36)
  sujetHash  String            @map("sujet_hash") @db.Char(64)
  origine    String?           @db.VarChar(30)
  sessionId  String?           @map("session_id") @db.VarChar(36)
  createdAt  DateTime          @default(now()) @map("created_at")

  @@index([typeEntite, entiteId, createdAt])
  @@index([cjsUid, createdAt])
  @@index([canal, typeEvent, createdAt])
  @@map("consultations")
}
```

Pas de FK polymorphe (non supporté par Prisma) — l'intégrité repose sur l'applicatif, comme `CentreEvent`.
`sessionId` corrèle avec `AgentLog.sessionId` côté IA/WhatsApp.
`origine` ∈ `reco_ia | recherche | favoris | notification | direct | ia | wa`.

Volumétrie estimée (22 000 utilisateurs) : ~2–5 M lignes/an. Les 3 index composites couvrent les requêtes du lot restitution à venir.

## 5. Socle — `src/lib/analytics/consultations.ts`

Calqué sur [centre-events.ts](../../src/lib/analytics/centre-events.ts) (whitelist Zod, fail-soft, cap).

- `hashSujet(subject: string): string` — SHA-256 salé par `CONSULTATION_HASH_SALT` (fallback documenté si absent).
- `trackConsultation(input): Promise<void>` :
  1. Validation Zod (`ConsultationInputSchema`)
  2. Sujet = `cjsUid` si présent, sinon IP ; hashé dans tous les cas
  3. Garde Redis `consult:<typeEvent>:<typeEntite>:<entiteId>:<sujetHash>` `SET NX EX 1800` → sortie si déjà vu
  4. `prisma.consultation.create`
  5. Si `typeEvent = consultation` et l'entité porte un compteur (`opportunite`, `ressource`) → `increment` du cache
  6. Si `origine = reco_ia` et `cjsUid` présent → `RecommandationIA.vuePar = now()` sur les recos non vues de cette paire
  7. Tout est enveloppé : aucune erreur ne remonte (`logger.warn`)
- `trackImpressions(items, common)` — helper de commodité pour les blocs IA/WhatsApp (N entités d'un coup).
- `canalFromSrc(src?: string): CanalConsultation` — `ia` → `ia_web`, `wa` → `whatsapp`, sinon `web`.

## 6. Canal web

| Page | Entité | Remarque |
|---|---|---|
| [opportunites/[slug]](../../src/app/(public)/opportunites/[slug]/page.tsx) | `opportunite` | remplace `incrementVue` |
| [opportunites/@modal/(.)[slug]](../../src/app/(public)/opportunites/@modal/(.)[slug]/page.tsx) | `opportunite` | idem, modale d'interception |
| [ressources/[id]](../../src/app/(public)/ressources/[id]/page.tsx) | `ressource` | remplace `incrementRessourceVues` — **ajoute la garde Redis manquante** |
| [agenda/[id]](../../src/app/(public)/agenda/[id]/page.tsx) | `evenement` | nouveau |
| [centres/[slug]](../../src/app/(public)/centres/[slug]/page.tsx) | `centre` | nouveau + double écriture `centre_viewed` |
| [jeune/bibliotheque/[id]](../../src/app/jeune/(app)/bibliotheque/[id]/page.tsx) | `livre` | nouveau |

`incrementVue` / `incrementRessourceVues` sont conservés comme façades minces déléguant au helper (les tests existants et l'API `/api/opportunites/[slug]` continuent de fonctionner).

Le `searchParams.src` est lu sur chaque page détail → `canal` + `origine`.

⚠️ **Effet visible attendu** : le compteur `Ressource.vues` va mécaniquement ralentir sa progression (il comptait chaque rendu). À annoncer au PO — ce n'est pas une régression.

## 7. Canal IA

- [tools.ts](../../src/lib/ia/tools.ts) : à chaque production d'un bloc (`opportunites`, `ressources`, `evenements`, `centres`, `livres`), émission de N `impression` (canal `ia_web` ou `whatsapp` selon `ctx.canal`).
- [agent.ts](../../src/lib/ia/agent.ts) : `nodesReturned` enrichi des identifiants (`{ count, ids }`) — [rollups.ts](../../src/lib/ia/metrics/rollups.ts) lit `count`, le champ reste rétro-compatible.
- Les liens des cards portent `?src=ia` → le clic est attribué au canal IA côté web.

Les **livres** n'ont pas de bloc dédié : l'outil bibliothèque les surface dans un bloc `action` dont les boutons pointent vers `/jeune/bibliotheque/<id>`. Les identifiants sont récupérés depuis ces liens plutôt que d'introduire un type de bloc et une card — le rendu de Yaye reste inchangé.

Les cards issues de `get_recommendations` portent `origine: 'reco'` : leur lien ajoute `from=reco`, ce qui rattache la **consultation** à la reco (l'impression, elle, l'est déjà via le nom de l'outil). Même marquage sur le carrousel de recommandations du tableau de bord jeune ([dashboard.ts](../../src/lib/loaders/dashboard.ts)), qui est l'autre surface de reco.

## 8. Canal WhatsApp

[format-whatsapp.ts](../../src/lib/ia/format-whatsapp.ts) : les URLs émises portent `?src=wa`, y compris les liens de **notification** (les liens externes sont laissés intacts — le clic n'atterrit pas chez nous). Les impressions sont déjà émises par `tools.ts` (canal `whatsapp` via le contexte agent), pas de double comptage.

## 9. Tests (TDD RED → GREEN)

**Socle** (`consultations.test.ts`) : insertion nominale · dédoublonnage 30 min · sujet anonyme haché (aucune IP en clair) · fail-soft Prisma down · incrément du cache uniquement pour opportunité/ressource et uniquement en `consultation` · `vuePar` écrit quand `origine = reco_ia` · `canalFromSrc`.
**Web** : chaque page détail appelle le helper avec le bon `typeEntite` ; `src=ia` produit `canal = ia_web`.
**IA** : un bloc de N items produit N impressions ; `nodesReturned` contient les ids.
**WhatsApp** : les liens formatés contiennent `?src=wa`.

## 10. Hors périmètre

Dashboards, exports CSV, rollup journalier, retrait de `CentreEvent.centre_viewed`, purge/rétention.
