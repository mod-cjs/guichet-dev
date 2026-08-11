# Spec — Découplage Partenaires / Recruteurs & consolidation de la console

> **Statut** : proposition issue du brainstorm (2026-08-10). Décision de découplage **validée** par le lead. **Rien n'est implémenté** — cette spec est écrite pour arbitrage **avant toute ligne de code**.
> Brainstorm formalisé (cartographie, verdict, modèle) : artifact `150f1fbf-e4ee-46a1-a643-1b6cb7ce6e66`.

---

## 1. Décision & principe directeur

**Découpler le Partenaire (Organisation) du Compte recruteur (personne).** Une Organisation porte **0 à N** comptes recruteurs. Correction, pas spéculation : le 1:1 `Organisation.cjsUid` est **déjà violé en base** (orgs pointant sur un `cjsUid` sans utilisateur → `recruteurStatut = inconnu`).

**Pivot métier :** *l'offre appartient à l'Organisation, pas à la personne.* Désactiver/anonymiser un recruteur ne masque **jamais** une offre déjà publiée — seule la **suspension de l'org** les masque.

---

## 2. Frontière SSO (contraintes dures — vérifiées dans `cjs_auth`)

| | |
|---|---|
| Compte + **rôle recruteur** | **cjs_auth** (table `platform_roles`, admin SSO). Aucune API pour attribuer le rôle depuis le Guichet. |
| Le Guichet PEUT (M2M) | `GET /users/find?email=\|phone=` · `POST /users/provision` (**force `beneficiaire`**, par téléphone) · `POST /users/{uuid}/anonymize` |
| Le Guichet consomme | webhook `user.provisioned` / `user.updated` / `user.anonymized` |

**Conséquences :**
- Le Guichet **crée l'Organisation** (autonome) et **rattache un recruteur existant** (retrouvé via `/users/find`).
- L'attribution du rôle recruteur reste un geste **SSO-admin**.
- « Ajouter un partenaire + inviter le recruteur en un geste » → **futur chantier cjs_auth** (étendre `provision` avec rôle + e-mail, ou flux d'invitation). **Non bloquant.**

---

## 3. Modèle cible (schéma)

### 3.1 `Organisation` (le partenaire)
```prisma
model Organisation {
  // … champs existants (nom, description, secteur, region, adresse, telephone, email, siteWeb, logoUrl) …
  cjsUid     String?           // ⚠ DEVIENT NULLABLE (legacy — migré vers MembreOrganisation). Null = partenaire sans compte.
  estVerifie Boolean  @default(false)   // badge « de confiance » — orthogonal, PAS un gate
  statut     StatutOrganisation @default(active)   // NOUVEAU : active | suspendue (levier org-level)
  membres    MembreOrganisation[]       // NOUVEAU (Phase 2b)
  opportunites Opportunite[]
}
enum StatutOrganisation { active  suspendue }
```

### 3.2 `MembreOrganisation` (le rattachement) — **nouveau (Phase 2b)**
```prisma
model MembreOrganisation {
  id             String   @id @default(uuid())
  organisationId String
  cjsUid         String                 // Utilisateur (SSO) rattaché
  role           RoleMembre @default(recruteur)  // titulaire | recruteur
  statut         StatutMembre @default(actif)    // actif | revoke
  createdAt      DateTime @default(now())
  organisation   Organisation @relation(fields: [organisationId], references: [id], onDelete: Cascade)
  @@unique([organisationId, cjsUid])
  @@index([cjsUid])
}
enum RoleMembre  { titulaire  recruteur }
enum StatutMembre { actif  revoke }
```

### 3.3 `Opportunite`
Inchangé : `organisationId` (lien primaire, **déjà nullable**) + `recruteurUid` (attribution **historique**, jamais réécrite). `organisationLibelle` reste en **fallback d'affichage** quand `organisationId` est null (offre curée non promue).

---

## 4. Règles métier (matrice des statuts)

**Gate de PUBLICATION** (un recruteur peut publier pour une org) — les trois vrais :
`Organisation.statut = active` **ET** `MembreOrganisation.statut = actif` **ET** `Utilisateur.statut = actif`.

**Gate de VISIBILITÉ jeune** (une offre est visible) :
`Opportunite.statut = publiee` **ET** `Organisation.statut = active`.
→ La désactivation/anonymisation d'une **personne** ne masque **pas** ses offres déjà publiées.

| Axe | État | Effet |
|---|---|---|
| Organisation | `suspendue` | toutes ses offres masquées · aucun membre ne publie · éditable admin · réversible |
| Organisation | `estVerifie` | badge affiché au jeune — orthogonal |
| Membre | `revoke` | ce recruteur ne publie plus pour cette org · ses offres publiées **restent** · autres membres OK |
| Personne | `inactif` | compte SSO coupé → ne publie plus **partout** |
| Personne | `anonymise` | membre **délié**, org + offres **persistent** |

**Trois leviers = trois gestes distincts** (résolution de l'incohérence « suspendre » dupliquée) :
- **Suspendre le partenaire** → org-level, console Partenaires.
- **Révoquer un membre** → membre-level, fiche org (admin ou titulaire).
- **Désactiver / anonymiser la personne** → global CDP, console Utilisateurs (`changerStatutUtilisateur`, **canonique**).

---

## 5. Écrans & actions

### 5.1 Console Partenaires (liste — déjà refondue GUIC-704)
Header 4 KPI (maquette : Partenaires + trend / Vérifiés / Comptes recruteurs actifs / Offres publiées) · chips statut (Tous/Vérifiés/Non vérifiés/**Suspendus**) · filtre secteur · tri · cartes (offres publiées + candidatures + badges vérifié/suspendu). **+ bouton « Ajouter un partenaire ».**

### 5.2 Fiche partenaire `[id]`
Présentation + coordonnées · **Membres (0..N)** : liste (rôle, statut), **Rattacher un membre** (recherche via `/users/find`), **Révoquer** · **Offres** (publiées, statut) · action **Suspendre / réactiver l'org**.

### 5.3 Promotion curation → partenaire
Sur une offre curée (`organisationLibelle` texte, `organisationId` null) — à la **Modération** (`ModerationDetailPanel`) ou depuis Partenaires : **« Rattacher à un partenaire »** → recherche floue (dédup suggérée, réutilise `empreinteContenu`/normalisation de la dédup curation) → **lier** à une Organisation existante **ou créer** un partenaire **sans compte**. Backfill optionnel des autres offres au même libellé.

### 5.4 Actions serveur (cible)
- `creerPartenaire({ nom, ... })` — org **autonome**, `cjsUid` null (sans compte). *(remplace le `creerOrganisationPourRecruteur` couplé)*
- `rattacherMembre({ organisationId, cjsUid, role })` · `revoquerMembre(membreId)`
- `basculerStatutOrganisation(id, statut)` — suspendre/réactiver (org-level)
- `verifierPartenaire` · `modifierPartenaire` (existants)
- `promouvoirEmployeur({ opportuniteId, organisationId? , nom? })` — lie/crée + organisationId
- **Supprimé** : `basculerStatutRecruteur` (doublon). Désactivation personne = `changerStatutUtilisateur` (Utilisateurs, un seul nom d'audit).

---

## 6. Plan d'implémentation (TDD) — **3 étages, valeur croissante / risque migration croissant**

> Affinement du plan 2-phases du brainstorm : le « sans compte » exige `cjsUid` nullable → on isole une **petite** migration (2a) avant le **gros** modèle membres (2b).

### Phase 1 — Consolidation, **zéro migration** (shippable dans le pivot)
- Header 4 KPI (conformité maquette) — loader `resume` + tuiles.
- Relocaliser « Créer un partenaire » dans la console Partenaires (réutilise l'action existante, **pour un recruteur existant** tant que `cjsUid` est requis).
- **Unifier les noms d'audit** de suspension ; corriger le commentaire trompeur « pas de création admin ».

### Phase 2a — **Petite migration** : `Organisation.cjsUid` nullable + `Organisation.statut`
Débloque l'essentiel du découplage avec un risque minime :
- **Partenaire sans compte** (création autonome) + **promotion curation** (§5.3).
- **Suspension org-level** (§4) + gate de visibilité jeune sur `Organisation.statut`.
- Migration : ajout colonne `statut` (défaut active) + passage `cjs_uid` en nullable. **Sur dev**, pas dans le stack local.

### Phase 2b — **Grosse migration** : `MembreOrganisation` (0..N)
- Table membres + rôles + révocation + **backfill** (org avec `cjsUid` valide → membre `titulaire` ; orphelines → 0 membre).
- Gestion des membres sur la fiche (§5.2), multi-recruteurs, gate de publication complet (§4).
- `Organisation.cjsUid` déprécié (lecture legacy → membership).

Chaque étage = commits RED→GREEN, garde-fous (charte qualité), vérif labo réelle avant dev.

---

## 7. Reste à trancher (détails Phase 2)
- **Q5 — Fusion d'organisations** : « GIZ » curé vs « GIZ Sénégal » recruteur → action admin de fusion (réaffecte offres + membres, garde un canonique). À spécifier au moment de 2b.
- **Q8 — Backfill** : script idempotent, testé en labo ; gérer les orphelines (`inconnu`) comme partenaires sans membre.

## 8. Décisions actées (rappel)
- Q1 rattachement via `/users/find` (rôle = cjs_auth). · Q2 rôles titulaire/recruteur. · Q3 matrice ci-dessus. · Q4 promotion pilotée admin. · Q6 recruteur peut renommer son org (estVerifie admin-only, renommage audité). · Q7 ne pas réécrire `recruteurUid` historique.

## 9. Fichiers concernés (repérage)
- `prisma/schema.prisma` (Organisation, MembreOrganisation, enums)
- `src/lib/loaders/admin-partenaires.ts` (resume KPI, membres, statut org)
- `src/app/admin/partenaires/` (AdminPartenairesTable, PartenaireSheet, actions, `[id]/page.tsx`, nouveau formulaire création)
- `src/app/admin/utilisateurs/actions.ts` (retirer la création d'org, garder `changerStatutUtilisateur` canonique)
- `src/app/admin/opportunites/ModerationDetailPanel.tsx` (action « Rattacher à un partenaire »)
- `src/lib/curation/dedup/empreinte.ts` (réutilisé pour la dédup de promotion)

---

## 10. Stratégie de merge de la migration (Phase 2a) — **cadrée**

**Constat (2026-08-11)** : `origin/dev` a `Organisation.cjsUid` **non-nullable**, **pas de `statut`** ; et **`origin/dev` n'est PAS ancêtre du stack** (dev ≈ 69 migrations, stack 65 → dev a 4+ migrations d'avance). Le stack a divergé — source du drift (cf. `programme_id`).

**Principe** : on **sépare le schéma (dev, tôt) de l'UI (pivot groupé, plus tard)**. On n'écrit **jamais** cette migration sur le stack divergé (elle s'insèrerait avant les migrations dev manquantes → timeline cassée).

**Plan (7 temps)** :
1. Brancher depuis **`origin/dev` frais** : `feature/GUIC-<n>-organisation-decouplage-schema` *(n° de ticket à créer — placeholder ici)*.
2. Migration **additive** : `cjsUid` → nullable + `statut StatutOrganisation @default(active)`. `prisma migrate dev` → s'ajoute après les migrations dev → timeline propre.
3. **Rétro-compat sûre** : lignes existantes gardent `cjsUid` (seules les futures « sans compte » = null ; lecteurs tolèrent déjà null → `inconnu`) ; `statut` défaut `active` → zéro changement de comportement ; **aucun backfill** (backfill = 2b).
4. **Test labo** MariaDB (migrate deploy base fraîche + flux recruteur + idempotence).
5. **PR vers dev** → **le lead (mod-cjs) merge** (jamais de push direct). PR petite/isolée/additive → review + rollback faciles.
6. **Garde-fou déploiement** : le build doit exécuter `prisma migrate deploy` (piège vercel.json/Dockerfile — sinon colonne au schéma mais absente en base = erreur runtime type `programme_id`).
7. **Le stack rebase sur dev migré** → `schema.prisma` du stack aligné (cjsUid nullable + statut) → **tue le drift**. Le code Phase 2a se construit sur ce schéma aligné.

**Séquencement** : la migration atterrit sur dev **avant** le code ; le code Phase 2a reste dans le stack et part dans le **pivot groupé**. Le rebase (étape 7) est le moment naturel pour la **passe de réconciliation schéma** du stack (retirer le hack local `programme_id`, aligner sur dev).
