# Spec — Cluster Curation & Veille (refonte console admin · §5.3 + gestion sources)

> Périmètre élargi (décision 2026-08-05) : **gestion complète Curation & Veille = 3 écrans** + la collecte manuelle (manque #1). Séquencé en 3 sous-lots. Backend mature réutilisé (GUIC-600/601/602).
>
> - **Lot 1 — Curation** (`/admin/curation` + `[id]`) : validation des items (cartes registre, signaux, → Modération combiné).
> - **Lot 2 — Sources de veille** (`/admin/sources-veille`) : CRUD registre + **collecte manuelle** (run par source + globale) — NOUVEAU backend.
> - **Lot 3 — Monitoring** (`/admin/curation/monitoring`) : refonte registre (résumé, alertes, taux, erreurs).
>
> Ci-dessous : le détail du **Lot 1** ; Lots 2-3 en fin de doc (§8).

## 0. Décisions verrouillées (2026-08-05)
- **D1 — Score = « Complétude »** (le vrai `scoreCompletude`), pas « Pertinence Yaye » (fabriqué).
- **D2 — Signaux dérivés** du `payloadExtrait` (champs extraits présents) + statut doublon + source.
- **D3 — « Fusionner » = ignorer le doublon** (`rejeterItem` du doublon ; la repromotion existante gère le canonique).
- **D5 — « → Modération » = geste combiné** `approuverItem` + `publierItem` → crée un **brouillon** → arrive en Modération.
- Écran **autonome** ; onglets Gouvernance = plus tard.

## 1. Données (0 migration)
- File = `ItemCuration` `statut = a_valider` (+ onglets en_attente/approuvee/rejetee conservés).
- **Score** : `scoreCompletude` (Int, 0-100).
- **Source** : `source.nom` (+ `source.url` → « officielle » si `gouv.sn`).
- **Doublon** : `statut='doublon'` ou `doublonDeId` renseigné.
- **Champs extraits** : `payloadExtrait` (titre/description/organisation/region/domaine/typeId/deadline).
- **Bandeau veille** : `SourceVeille` (nom, actif, derniereVerifLe) + dernière `ExecutionVeille`.

## 2. Heuristique `signauxCuration(item)` — `src/lib/curation/signaux.ts` (pur)
Retourne `SignalCuration[]` = `{ ok: boolean, label }`.
- ✓ `Type identifié` si `payload.typeId`.
- ✓ `Région : X` si `payload.region`.
- ✓ `Organisation` si `payload.organisation`.
- ✓ `Source officielle` si url source contient `gouv.sn`.
- ⚠ `Titre manquant` si `!titre`.
- ⚠ `Doublon détecté` si statut doublon / `doublonDeId`.

## 3. Loader `src/lib/loaders/admin-curation.ts`
- `PAGE_SIZE_C=20`. Onglets `a_valider|en_attente|approuvee|rejetee`.
- `getCurationData({onglet, source, scoreMin, page})` : findMany select ciblé + map en `CurationRow` (titre, extrait, typeLabel, sourceNom, score, signaux, estDoublon) + **bandeau veille** (sources actives + dernière collecte) + KPIs chips (suggérées=count a_valider, score élevé=count score≥70, doublons=count doublon).
- Helpers purs testables : `chipsCuration`, `mapCurationRow`.

## 4. Actions — `src/app/admin/curation/actions.ts` (réutilise l'existant)
- Réutilisées : `approuverItem`, `rejeterItem`, `mettreEnAttenteItem`, `editerItem`, `publierItem`.
- **Nouvelle `versModeration(id)`** (D5) : `approuverItem(id)` puis `publierItem(id)` (transactionnel/séquentiel, fail-safe) → `{opportuniteId}`. Audit hérité.
- **`ignorerDoublon(id)`** (D3) : `rejeterItem(id, 'Doublon d'une offre déjà en file')`.

## 5. Composants
- **`CurationList.tsx`** (refonte) : bandeau veille (sources + dernière collecte) + chips (Suggérées/Score élevé/Doublons) + filtres (source, scoreMin) + **grille de cartes registre** (tag type, pill source, titre, extrait, **barre Complétude %**, **signaux** ✓/⚠, actions **→ Modération / Éditer / Ignorer** ; doublon → **Fusionner / Ignorer**) + état vide + pagination.
- **`ItemEditModal.tsx`** (si absent) : édition rapide avant envoi (réutilise `editerItem`).

## 6. Plan (TDD strict)
- **Étape 0** — seed items curation couvrant les états (a_valider scores variés, doublon, champ manquant, sources diverses) + SourceVeille + ExecutionVeille pour le bandeau.
- **PR-A** — `signaux.ts` + `admin-curation.ts` loader + `CurationList` refonte (cartes/bandeau/chips/score/signaux, actions rendues).
- **PR-B** — `versModeration` + `ignorerDoublon` + câblage actions + édition.

## 7. Garde-fous
Garde admin ; états loading/vide/erreur ; audit (hérité) ; **jamais de publication directe** (approbation → brouillon → Modération) ; tokens registre ; `<Icon>` ; tests verts + tsc + rendu avant push.

## 8. Lots 2-3 (après Lot 1)

### Lot 2 — Sources de veille (`/admin/sources-veille`)
- **Existant** : liste (nom/url/fréquence/actif/derniereVerif), créer/éditer (`SourceFormModal`), activer/désactiver (PATCH), supprimer (DELETE) — via API `api/admin/sources-veille`.
- **Refonte** : table/cartes registre + **santé par source** (dernière collecte OK/échec + nb items — depuis `ExecutionVeille`).
- **NOUVEAU — Collecte manuelle** (manque #1) : action serveur `lancerCollecte(sourceId?)` réutilisant `executerVeille`+`executerExtraction`+`executerDedup` sous `avecVerrouVeille` ; bouton **« Lancer la collecte »** par ligne source + un global. Garde admin + audit `veille.collecte_manuelle`. Fail-soft, borné (timeout).

### Lot 3 — Monitoring veille (`/admin/curation/monitoring`)
- **Existant** (GUIC-602) : résumé (nbSources/nbEnAlerte), sources en alerte, taux approbation/rejet, erreurs récentes, tableau par source.
- **Refonte** : registre (KPIs cockpit + tableau `ExecutionVeille` : collectes, durée, nbLiens/nouveautés/erreurs, statut succès/échec) + lien vers la source.

### Manques différés (hors cluster, notés)
Re-tenter une extraction échouée (`nbTentatives`) · bulk items · vue source→ses items.
