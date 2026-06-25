# M4 — Bibliothèque physique des centres (+ outils Yaye)

> Lot 3 Yaye. Epic **GUIC-274** · sous-tâches **GUIC-341** (modèle), **342** (recherche), **343** (emprunt/retour scan), **344** (front), **345** (tests).
> ⚠️ Dérogation assumée à la règle « Yaye ne branche que de l'existant » : ici on **crée d'abord le backend métier** (m4-centres) puis on y branche Yaye (m12-ia). Décision PO 2026-06-25.
> Branche : `feature/GUIC-341-bibliotheque-yaye` (depuis `dev`).

## 1. Objectif
Catalogue mutualisé de livres avec exemplaires physiques individuellement identifiés et localisés (rayon/étagère/position) dans un centre. Recherche par titre/auteur/thème/niveau. Emprunt **initié** en ligne (web ou Yaye) → **confirmé au passage au centre** (scan badge) ; retour par scan. Historique des emprunts et dates de retour.

## 2. Modèle de données (Prisma) — GUIC-341
```
enum StatutExemplaire { disponible  emprunte  reserve  indisponible }
enum StatutEmprunt    { initie  en_cours  rendu  en_retard  annule }

model Livre {
  id           String  @id @default(uuid())
  titre, auteur, theme, langue : String
  isbn         String? (index)
  niveau       String?
  resume       String? @db.Text
  couvertureUrl String?
  exemplaires  Exemplaire[]
  // index : titre, theme, isbn
  @@map("livres")
}

model Exemplaire {
  id        String @id @default(uuid())
  livreId   -> Livre
  centreId  -> Centre              // localisation = un centre
  codeBarre String @unique         // identifiant physique scannable
  rayon, etagere, position : String  // emplacement précis (Rayon = champs, pas un modèle séparé)
  statut    StatutExemplaire @default(disponible)
  emprunts  Emprunt[]
  // index : livreId, (centreId, statut)
  @@map("exemplaires")
}

model Emprunt {
  id            String @id @default(uuid())
  cjsUid        -> Utilisateur
  exemplaireId  -> Exemplaire
  statut        StatutEmprunt @default(initie)
  initieA       DateTime @default(now())
  confirmeA     DateTime?     // au scan badge
  confirmePar   String?       // cjs_uid du bibliothécaire (staff)
  dateRetourPrevue DateTime?
  renduA        DateTime?
  // index : (cjsUid, statut), exemplaireId
  @@map("emprunts")
}
```
Migration `prisma migrate dev` → `20260625xxxxxx_add_bibliotheque`.

## 3. API (ApiResponse<T>, conventions repo — FR comme `/api/reservations`)
| Route | Méthode | Ticket | Rôle | Rôle métier |
|---|---|---|---|---|
| `/api/bibliotheque/livres` | GET `?q&theme&niveau&centreId&page` | 342 | recherche livres + exemplaires dispo (+ emplacement) | tous connectés |
| `/api/bibliotheque/livres/[id]` | GET | 342/344 | fiche livre + exemplaires dispo par centre | tous connectés |
| `/api/bibliotheque/emprunts` | POST `{exemplaireId, confirm?}` | 343 | **initie** un emprunt (statut `initie`) — récap si `confirm=false` | bénéficiaire |
| `/api/bibliotheque/emprunts` | GET `?statut` | 343 | **mes** emprunts en cours + dates retour | bénéficiaire |
| `/api/bibliotheque/emprunts/[id]/confirmer` | POST | 343 | confirme au centre (statut `en_cours`, exemplaire `emprunte`) | **bibliothécaire/staff** |
| `/api/bibliotheque/emprunts/[id]/retour` | POST | 343 | retour (exemplaire `disponible`, `renduA`) | **bibliothécaire/staff** |

Garde-fous : rate-limit Redis (publics), RBAC (bénéficiaire = ses emprunts ; bibliothécaire = son centre), exemplaire déjà emprunté → 409, anti-doublon emprunt initié.

## 4. Outils Yaye (m12-ia) — branchés sur le backend ci-dessus via passerelle in-process (pattern `reservations-gateway.ts`)
- `search_library` → GET `/api/bibliotheque/livres` (titre/auteur/thème + exemplaires dispo + emplacement)
- `borrow_book` → POST `/api/bibliotheque/emprunts` (récap `confirm=false` → `confirm=true`), statut **initié** jusqu'au scan
- `get_active_loans` → GET `/api/bibliotheque/emprunts` (emprunts en cours + dates de retour)
- Fallback lien web hors contexte authentifié (WhatsApp).

## 5. Frontend — GUIC-344
- `/jeune/bibliotheque` : catalogue filtrable (recherche, filtres thème/niveau/centre) + fiche livre (exemplaires dispo + emplacement) + bouton **Emprunter**.
- UI staff bibliothécaire (confirmation/retour au scan + gestion catalogue) : **à arbitrer** (minimal vs complet).
- Composants `src/components/ui/` exclusivement, tokens `gj-*`, `<Icon>`.

## 6. Neo4j (Lot 3 spec §09) — additif, fail-soft
Nœuds/relations `Livre`/`Exemplaire` : `CONTIENT` (Livre→Exemplaire), `A_EXEMPLAIRE`, `EST_LOCALISE_EN` (Exemplaire→Centre). Événements `emprunt_initie`, `retour_enregistre` (agent_logs). **À arbitrer** : inclure maintenant ou phase ultérieure.

## 7. CDP / sécurité (spec 07)
- Droit à l'oubli : anonymiser/purger les `emprunts` par `cjs_uid` (à ajouter au webhook SSO existant — cohérent avec la rétention `agent_logs`).
- Bibliothécaire = accès données bibliothèque uniquement (RBAC).

## 8. Tests — GUIC-345
Cycle complet : recherche → emprunt initié → confirmation scan → retour → statuts d'exemplaire + historique. + tests outils Yaye (récap/confirm/fallback/erreurs).

## 9. Découpage de livraison
1. **341** Modèle Prisma + migration + seed minimal.
2. **342** Routes recherche + fiche.
3. **343** Routes emprunt (initier/confirmer/retour) + RBAC.
4. **Yaye** 3 outils + passerelle.
5. **344** Front catalogue + fiche + emprunter.
6. **345** Tests + (optionnel) sync Neo4j + droit à l'oubli.
