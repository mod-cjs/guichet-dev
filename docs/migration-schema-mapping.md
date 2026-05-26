# Cartographie schéma Drupal réel → scripts ETL (GUIC-17)

**Établi le :** 2026-05-20 — répétition générale locale sur `db_old/guichet_drupal.sql`
**Objet :** les scripts `create-sso-accounts.ts` et `migrate-drupal.ts` ont été écrits
contre un schéma Drupal supposé. Ce document liste, table par table, l'écart avec le
dump de production réel et l'action de correction.

Dump réel : 274 tables · 22 780 `users` · contenus = `opportunites` (4290),
`actualite` (541), `ressources` (196), `centre` (6), `sondage` (96), `faq` (12),
`article` (5), `page` (15), `home_slider` (5). **Pas de type `evenement`.**

---

## 1. Utilisateurs — `create-sso-accounts.ts` (l.115) & `migrate-drupal.ts` profils (l.248)

Les deux scripts utilisent la même requête. Tables `users` / `users_field_data` OK.

| Champ attendu par le script | Table / colonne réelle | Statut | Action |
|---|---|---|---|
| `user__field_nom.field_nom_value` | identique | ✅ | — |
| `user__field_prenom.field_prenom_value` | identique | ✅ | — |
| `user__field_sexe.field_sexe_value` | identique — valeurs `homme` (1669) / `femme` (812) | ✅ | `mapGender` gère déjà `homme`/`femme` |
| `user__field_telephone.field_telephone_value` | identique | ✅ | — |
| `user__field_date_de_naissance.field_date_de_naissance_value` | identique | ✅ | — |
| `user__field_region.field_region_value` | **table absente** | ❌ | retirer le `LEFT JOIN r` → `region = NULL` |
| `user__field_commune.field_commune_value` | **table absente** | ❌ | retirer le `LEFT JOIN c` → `commune = NULL` |

> Region/commune ne sont **pas** des champs utilisateur dans ce Drupal. Disponible en
> revanche : `user__field_type_de_profile.field_type_de_profile_target_id` (non requis).
> Impact : les comptes SSO seront provisionnés sans `region`/`commune` — l'API doit
> accepter ces champs `null` (à confirmer côté `POST /users/provision/bulk`).

---

## 2. Opportunités — `migrate-drupal.ts` phase 2 (l.355)

Type de contenu : `opportunites` (4290 nœuds). La liste `TYPES` contient des types
inexistants (`offre_emploi`, `stage`, …) — sans effet (clause `IN`), mais à nettoyer.

| Champ attendu (alias) | Table / colonne réelle | Statut | Action |
|---|---|---|---|
| `node__body.body_value` AS body | identique (78 opp. seulement ont un body) | ✅ | — |
| `node__field_lien_externe.field_lien_externe_uri` AS lien | **table absente** | ❌ | remplacer par `node__field_envoyer_ma_candidature.field_envoyer_ma_candidature_uri` (1935 lignes) |
| `node__field_region.field_region_value` AS region | table existe mais `bundle = centre` uniquement | ❌ | remplacer par `node__field_emplacement.field_emplacement_value` (553 lignes, texte libre) |
| `node__field_domaine.field_domaine_target_id` AS domaine | colonne réelle = `field_domaine_value` | ❌ | corriger la colonne (`_value`, pas `_target_id`) — 24 lignes seulement |
| `node__field_type_opportunite.field_type_opportunite_value` AS type_opp | **table absente** | ❌ | remplacer par `node__field_type_de_contrat.field_type_de_contrat_value` (2130 lignes) |

**Valeurs observées :**
- `field_type_de_contrat_value` : `cdd` (1482), `cdi` (351), `prestation` (154), `stage` (121), + texte libre divers. `mapTypeOpportunite` → `stage`→Stage, le reste→Emploi. Cohérent.
- `field_emplacement_value` : texte libre ville (`Dakar`, `BIGNONA`, `En ligne`, `Liberté 6 extension`…). `mapRegion` ne reconnaît que les noms de régions → la plupart retomberont sur `null`. **Limite de qualité à acccepter ou enrichir** `mapRegion` avec un mapping ville→région.
- `field_domaine_value` : texte libre métier (`Finance`, `Informatique`, `Marketing`…), pas une taxonomie. `mapDomaine` fait du `includes()` → OK approximatif.

---

## 3. Événements — `migrate-drupal.ts` phase 3 (l.420)

**Il n'existe pas de type de contenu `evenement`.** Les événements sont des nœuds
`actualite` marqués par le champ booléen `field_event` :
`node__field_event.field_event_value = 1` → **455 événements** (et `= 0` → 179 actualités/news).

| Champ attendu (alias) | Table / colonne réelle | Statut | Action |
|---|---|---|---|
| `n.type IN ('evenement', …)` | type = `actualite` + filtre `field_event_value = 1` | ❌ | `JOIN node__field_event ev ON ev.entity_id = n.nid AND ev.field_event_value = 1` |
| `node__body.body_value` AS body | identique | ✅ | — |
| `node__field_date_debut.field_date_debut_value` AS date_debut | **absente** | ❌ | `node__field_date.field_date_value` |
| `node__field_date_fin.field_date_fin_value` AS date_fin | **absente** | ❌ | `node__field_date.field_date_end_value` (même table) |
| `node__field_lieu.field_lieu_value` AS lieu | **absente** | ❌ | aucun champ lieu sur `actualite` → garder le défaut `'Non renseigné'`, ou exposer `node__field_lien_evenement.field_lien_evenement_uri` (111 lignes) |
| `node__field_region.field_region_value` AS region | n'appartient pas à `actualite` | ❌ | retirer le JOIN |

> `mapTypeEvenement('actualite')` → défaut `Forum`. Acceptable, ou ajouter une règle.
> `node__field_date` : 459 lignes sur `actualite`, valeurs type `2024-05-22` → `2024-05-24`.

---

## 4. Ressources — `migrate-drupal.ts` phase 4 (l.510)

Type de contenu : `ressources` (196 nœuds). `TYPES` contient des types inexistants — sans effet.

| Champ attendu (alias) | Table / colonne réelle | Statut | Action |
|---|---|---|---|
| `node__body.body_value` AS body | identique (196/196 ont un body) | ✅ | — |
| `node__field_lien.field_lien_uri` AS lien | **absente** (`node__field_lien_1` existe mais 0 ligne) | ❌ | aucun champ lien exploitable → `lien = NULL` |
| `node__field_domaine.field_domaine_target_id` AS domaine | n'appartient pas à `ressources` (bundle = `opportunites`) | ❌ | retirer le JOIN |

> Disponible : `node__field_categorie_ressource.field_categorie_ressource_target_id`
> (196 lignes, référence taxonomie) — utilisable pour catégoriser si besoin.
> `mapTypeRessource('ressources')` → défaut `Lien`. Toutes les ressources prendront le
> type `Lien` alors qu'aucune n'a de lien — incohérence à arbitrer.

---

## 5. Bug Python (mineur)

`scripts/extract-sso-map.py` utilise la syntaxe PEP 585 (`list[str]`, `dict[str, str]`)
incompatible Python 3.8. Ajouter `from __future__ import annotations` en tête de fichier
(contourné en local via un shim `python3.12`).

---

## Synthèse des actions

1. **users** : retirer JOINs `field_region` / `field_commune` (2 scripts).
2. **opportunités** : 4 corrections de tables/colonnes (lien, emplacement, domaine, type).
3. **événements** : redéfinir entièrement la source (`actualite` + `field_event=1`),
   3 champs à re-mapper.
4. **ressources** : retirer 2 JOINs morts ; arbitrer le type par défaut.
5. **extract-sso-map.py** : compat Python 3.8.
6. Arbitrages produit à valider : `mapRegion` ville→région, type par défaut des ressources.
