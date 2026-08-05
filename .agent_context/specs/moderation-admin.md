# Spec — Écran Modération (refonte console admin · §5.2)

> Écran par écran vs maquette `admin-console.html` (Artifact 8324bc87). Principe : l'admin **modère** les offres en attente (brouillon → publiée/archivée), supervise, trace. Backend déjà mature (GUIC-462/471/547) → cette refonte est surtout **frontend + heuristique + loader**.

## 0. Décisions verrouillées (2026-08-04)
- **D1 — Flag « Signalée » = heuristique CALCULÉE** (pur, testé, 0 migration). Signal advisoire, l'admin décide.
- **D2 — Assignation / routage par centre : ABANDONNÉS** (aucun champ, modération = admin national).
- **D3 — « Demander correction » = renvoi au recruteur** (modale message → `notifyRecruteur`, statut reste `brouillon`, audit `opportunite.correction_demandee`). Pas de nouvel état enum.
- **D4 — Modération = écran autonome** `/admin/opportunites` (nav validée). Curation/Journal inchangés. Onglets « Gouvernance » = plus tard, optionnel.

## 1. Données (tout ancré, 0 migration)
- File = `Opportunite` `statut='brouillon', deletedAt=null`.
- **Source dérivée** : `recruteurUid` renseigné → `Recruteur` ; relation `itemsCuration` (CurationPubliee) non vide → `Veille` ; sinon `Admin`.
- **Ancienneté** : `createdAt` (pastille rouge si > 48 h = objectif SLA).
- **Partenaire** : `org.estVerifie` (carte détail + « vérifiés »).
- **Historique modération** (panneau détail) : `AuditLog` où `targetId = offre`.
- **Heuristique signaux** (D1) : lue sur `titre` + `description` + `remuneration` + `org.estVerifie`.

## 2. Heuristique `detecterSignaux(offre)` — `src/lib/moderation/signaux.ts` (pur)
Retourne `Signal[]` = `{ niveau: 'crit'|'soft', motif: string }`. Advisoire (jamais bloquant).
- **crit — Frais demandés** : `/frais.{0,20}(inscription|dossier|adh[ée]sion)/i` OU `/(versement|avance|caution).{0,20}(avant|obligatoire)/i` dans description/remuneration.
- **crit — N° personnel dans la description** : motif E.164/local sénégalais (`/(\+221|00221)?\s?(7[05678])\s?\d{3}\s?\d{2}\s?\d{2}/`) présent dans `description` (contournement du canal officiel).
- **crit — Motifs arnaque** : `/(argent facile|gagnez .* par jour|travail .* domicile r[ée]mun)/i`.
- **soft — Partenaire non vérifié** : `!org || !org.estVerifie`.
- **soft — Rémunération « trop belle »** : montant élevé + « attractive/rapide » (heuristique légère, faux-positifs tolérés car soft).
Niveau carte = `crit` si ≥1 crit (chip rouge « Signalée »), sinon `soft` si ≥1 soft (chip orange « À vérifier »), sinon aucun.

## 3. Loader `src/lib/loaders/admin-moderation.ts`
- `PAGE_SIZE_M=20`. `FILTRES = ['tout','signalees','nouvelles','recruteur','veille']`.
- `buildModerationWhere({q, filtre})` : base `{statut:'brouillon', deletedAt:null}` + q sur titre/organisationLibelle + `recruteur`/`veille` via recruteurUid/itemsCuration ; `signalees`/`nouvelles` = post-filtre calculé (heuristique/âge) après fetch borné.
- `getModerationData({q, filtre, page})` : findMany **select** (id, slug, titre, type, typeRef.libelle, organisation, organisationLibelle, organisationId, recruteurUid, region, createdAt, description, remuneration, `org:{estVerifie,nom}`, `itemsCuration:{select:{id}, take:1}`) → map en `ModerationRow` (source, ancienneté label, signaux, niveau) + counts par filtre (KPIs des chips) + total.
- `mapModerationRow` : calcule source/âge/signaux ; **ne renvoie pas** la description brute au client au-delà d'un extrait (le détail complet passe par le loader détail).

## 4. Loader détail `getModerationDetail(id)` (panneau slide-over)
Offre complète + `org` (nom, estVerifie, count opportunites publiées) + historique `AuditLog` (action `opportunite.*`, targetId=id, ordonné). Retour typé `ModerationDetail`.

## 5. Actions serveur — `src/app/admin/opportunites/actions.ts`
- **Réutilisées telles quelles** : `approuverOpportunite`, `rejeterOpportunite(motif)`, `publierOpportunite`. Idempotentes, audit, notif recruteur.
- **Nouvelle `demanderCorrection(id, message)`** (D3) : garde admin ; offre reste `brouillon` ; `notifyRecruteurDecisionOpportunite`-like en canal « correction » (réutilise l'infra notif, message libre) ; `recordAudit(session, 'opportunite.correction_demandee', {targetId:id, meta:{message}})`. Refuse si non-brouillon.
- **Bulk** : `approuverPlusieurs(ids)` — boucle `approuverOpportunite` bornée, ignore les non-brouillon ; retourne `{ok, ignores}`.
- Ajouter `'opportunite.correction_demandee'` à l'enum `AuditAction`.

## 6. Composants (nouveau langage visuel §2.1)
- **`AdminModerationList.tsx`** (refonte) : filtres chips + counts, recherche, en-tête SLA « Objectif < 48 h », cartes enrichies (tag type, pill source, pastille âge, flag chip crit/soft, toggle détail inline), actions **Approuver / Corriger / Rejeter**, quick-action « Approuver les vérifiés · N », bulkbar (Approuver/Rejeter/Annuler), état vide « File à jour », toast, pagination, cartes mobile. `import type` du loader ; helper `estJeune`-style local si besoin.
- **`ModerationDetailPanel.tsx`** (slide-over) : key-values, description, **carte organisation** (estVerifie + stats), **historique** timeline. Réutilise le pattern slide-over de Candidatures (GUIC-692).
- **`RejetMotifModal.tsx`** : `<select>` motifs préréglés (Offre payante/arnaque · Contenu inapproprié · Doublon · Organisme non identifié · Autre) + `<textarea>` → `rejeterOpportunite`.
- **`CorrectionModal.tsx`** : `<textarea>` message → `demanderCorrection`.

## 7. Plan d'implémentation (TDD strict — RED puis GREEN par PR)
- **Étape 0 (chore)** — seed modération : brouillons couvrant tous les états (recruteur vérifié, recruteur non vérifié → soft, issu de veille via CurationPubliee, offre « frais d'inscription + n° perso » → crit, ancienne > 48 h). Préserve les comptes/offres réels.
- **PR-A** — Heuristique + loader + liste enrichie (lecture) :
  - `signaux.ts` (+ test unit : chaque règle crit/soft, 0 faux-positif sur offre saine).
  - `admin-moderation.ts` loader (+ test unit : source dérivée, filtres, counts).
  - `AdminModerationList.tsx` refonte + `page.tsx` (+ test unit rendu : chips, cartes, flag, source, âge, empty).
- **PR-B** — Panneau détail + modales :
  - `getModerationDetail` + `ModerationDetailPanel.tsx` (+ test : org card, historique).
  - `RejetMotifModal.tsx` (+ test) — remplace le `window.prompt`.
- **PR-C** — Correction + sélection groupée :
  - `demanderCorrection` + enum audit + `CorrectionModal.tsx` (+ test RED/GREEN).
  - bulkbar + `approuverPlusieurs` + quick-action « vérifiés » (+ test bulk).

## 8. Garde-fous (checklist transverse §6)
Garde `role=admin` route + action ; états loading/vide/erreur ; audit sur toute décision ; pas de décision recruteur ; responsive cartes < 820px ; 0 hex en dur (tokens `gj-*`/vars) ; `<Icon>` sprite ; tests verts + tsc + rendu Playwright 0 erreur avant push.
