# Étude — Gestion de bibliothèque côté conseiller (Lot 8)

**Epic parent :** [GUIC-470](https://consortiumjeunesse.atlassian.net/browse/GUIC-470) · **Statut :** étude (2026-07-04) · **Type :** réemploi d'un module existant

---

## 1. Objectif & valeur

Chaque centre CJS dispose d'une petite bibliothèque physique. Le conseiller/personnel de centre en est de fait le **bibliothécaire** : il **valide les retraits** (le jeune réserve en ligne, retire au centre), **enregistre les retours**, **suit les retards** et **maintient le catalogue** de son centre. Aujourd'hui ces gestes existent pour le rôle `centre-staff` (auth cookie MVP) et pour l'`admin` — mais **pas dans l'espace conseiller SSO**. L'objectif est d'y apporter cette gestion, **scopée au centre du conseiller**.

## 2. Existant réutilisable (ne rien recréer)

Le module bibliothèque est **déjà construit** — cette fonctionnalité est un **branchement**, pas une reconstruction.

| Brique | Emplacement | Réutilisable tel quel |
|--------|-------------|-----------------------|
| Modèles | `Livre`, `Exemplaire` (centreId, statut, code-barre, rayon/étagère/position), `Emprunt` (cycle + `confirmePar`) | ✅ **0 migration** |
| Enums | `StatutExemplaire` (disponible/emprunté/réservé/indisponible) · `StatutEmprunt` (initié→en_cours→rendu / en_retard / annulé) | ✅ |
| Service métier | `src/lib/bibliotheque/service.ts` : `getCatalogueCentre(centreId)`, `getEmpruntsCentre(centreId, statuts)`, `confirmerEmprunt({empruntId, staffCentreId})`, `retournerEmprunt(...)`, `searchLivres`, CRUD livres/exemplaires | ✅ (fonctions déjà **scopées centreId**) |
| Écrans de référence | `centre-staff/bibliotheque` (onglets « à confirmer » / « à rendre »), `admin/bibliotheque/gestion` (catalogue + emprunts) | ✅ (mirror) |
| API | `/api/bibliotheque/emprunts/[id]/confirmer` + `/retour`, `/livres`, `/admin/exemplaires` | ⚠️ auth **cookie staff** — à adapter (cf. §6) |

**Cycle métier** (déjà implémenté) : le jeune **initie** un emprunt en ligne (`initie`) → retrait au centre confirmé par le bibliothécaire au **scan du badge** (`en_cours`) → **retour** enregistré (`rendu`) ; batch quotidien marque `en_retard`.

## 3. Rôle du conseiller

Le conseiller **est** le bibliothécaire de son centre : `Emprunt.confirmePar = cjs_uid du bibliothécaire`. Il agit **uniquement sur son/ses centre(s)** de rattachement `AgentCentre` (même périmètre que le reste de l'espace).

## 4. User stories proposées

- **US-B1** — En tant que conseiller, je vois le **catalogue de mon centre** (livres, exemplaires, disponibilité, localisation rayon/étagère).
- **US-B2** — Je vois les **emprunts à confirmer** (réservations `initie` de mon centre) et je **valide le retrait** en un geste (scan badge ou manuel).
- **US-B3** — Je vois les **emprunts en cours / à rendre** et j'**enregistre un retour**.
- **US-B4** — Je vois les **retards** (`en_retard`) pour relancer les jeunes.
- **US-B5** — Je **maintiens le catalogue** de mon centre : ajouter/éditer un livre et ses exemplaires (localisation, code-barre), retirer un exemplaire. *(à valider : création réservée à l'admin ?)*
- **US-B6** — Je vois des **indicateurs** bibliothèque de mon centre (nb livres, emprunts actifs, retards) — carte sur le dashboard ou en tête de section.

## 5. Écrans (nouvelle section sidebar « Bibliothèque »)

Route racine : `/conseiller/bibliotheque`.

1. **Emprunts** (par défaut) — onglets **À confirmer** (`initie`) · **À rendre** (`en_cours`) · **En retard** (`en_retard`) · **Historique** (`rendu`). Chaque ligne : jeune, livre, exemplaire (code-barre), date, action (Confirmer / Enregistrer le retour). *Mirror de `BiblioStaffTabs`.*
2. **Catalogue** — recherche + liste des livres du centre (couverture, titre/auteur, thème, exemplaires dispo/total, localisation). *Mirror de `getCatalogueCentre`.*
3. **Fiche livre** — détail + exemplaires + statut. Bouton « Ajouter un exemplaire » (US-B5).
4. **(option) Scan** — réutilise le scanner QR déjà livré (US-6) pour identifier le jeune au retrait/retour.

Identité teal foncé conseiller, composants `src/components/ui/`, cartes façon design v4.

## 6. Architecture & point à adapter (auth)

**Réemploi direct** du service `bibliotheque/service.ts` (déjà scopé `centreId`) : les loaders/actions conseiller appellent `getCatalogueCentre(ctx.centreId)`, `getEmpruntsCentre(ctx.centreId, [...])`, `confirmerEmprunt({empruntId, staffCentreId: ctx.centreId})`, `retournerEmprunt(...)`.

**Seul point à traiter** : les **routes API `confirmer`/`retour` sont gardées par le cookie staff**. Deux options :
- **(a) Recommandé** — créer des **server actions conseiller** (`confirmerEmpruntConseiller`, `retournerEmpruntConseiller`) qui vérifient SSO + `AgentCentre` puis appellent le service avec `ctx.centreId`. Contenu, cohérent avec le reste de l'espace, **pas de refonte** des routes existantes.
- **(b)** — généraliser l'auth des routes via l'**opérateur unifié** (`getCheckinOperator`, déjà créé pour le check-in : staff OU conseiller SSO). Plus DRY mais touche des routes partagées.

→ **Retenu : (a)** pour livrer sans risque de régression ; (b) en refactor ultérieur.

## 7. Données & sécurité

- **0 migration** — tout existe.
- Périmètre : toutes les requêtes filtrent `centreId ∈ centres du conseiller` ; `confirmerEmprunt` vérifie déjà que l'exemplaire appartient au `staffCentreId` fourni.
- `confirmePar = session.cjsUid` (traçabilité du bibliothécaire).
- Audit (`recordAudit`) sur confirmer/retour.

## 8. Découpage proposé (phases, TDD)

- **Phase B1** — Section + **Emprunts** (à confirmer / à rendre / retard) + actions `confirmerEmpruntConseiller` / `retournerEmpruntConseiller` (le cœur de valeur). *~1 écran + 2 actions, réemploi service.*
- **Phase B2** — **Catalogue** + fiche livre (lecture). *réemploi `getCatalogueCentre`/`getLivre`.*
- **Phase B3** — **Gestion catalogue** (ajout/édition livre + exemplaires) — sous réserve décision « création réservée admin ».
- **Phase B4** — **KPI/dashboard** bibliothèque + intégration scan au retrait/retour.

## 9. Points à trancher (décision produit)

1. **Création de livres/exemplaires** : autorisée au conseiller (US-B5) ou **réservée à l'admin** (cohérent avec « création réservée » de l'epic) ? → par défaut : **conseiller gère les exemplaires de son centre, admin gère le référentiel `Livre`**.
2. **Confirmation au retrait** : scan badge obligatoire ou validation manuelle possible (jeune sans smartphone) ? → prévoir les deux (comme le staff).
3. **Réservation** : le conseiller peut-il initier un emprunt **pour** un jeune au comptoir (walk-in) ? → utile terrain, à confirmer.

## 10. Estimation

Faible/moyenne — l'essentiel du travail (modèles, service, cycle métier) existe. Le gros du travail = **UI conseiller (mirror staff)** + **2 server actions SSO**. Phase B1 seule ≈ 1 écran + 2 actions + tests.

## 11. Réutilisation UI

Mirror `centre-staff/bibliotheque/biblio-staff-tabs.tsx` et `admin/bibliotheque/gestion/*`. Composants `ui/`, tokens `gj-*`, `<Icon>`. Nouvelle entrée sidebar « Bibliothèque » (section « Activité du centre » ou « Gestion »).
