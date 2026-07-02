# Spec — Événements cours/sessions au centre + présence par badge

**Ticket :** GUIC-474 (Événements cours/sessions au centre avec suivi de présence par badge · Medium)
**Module :** m5-agenda × m4-centres · **Complète** le cluster C (le writer de `InscriptionEvenement.present` que GUIC-472 lit déjà).
**Décisions :** étendre le scan badge existant + fallback admin manuel · ajouter `Cours` à `TypeEvenement` (migration) · walk-ins autorisés (upsert).

---

## 1. Contexte & état réel
- Le badge = JWT MyCJSCard (`scope:checkin`, `sub:cjsUid`), scanné par le staff sur `/checkin/v1/[token]` → `POST /api/v1/checkin/[token]` crée un `CheckIn`. **Aucune notion d'événement.**
- `StatutInscription.present` existe et est **lu** (analytics GUIC-472, détail admin) mais **jamais écrit**.
- Création d'événement admin existe ([actions.ts](../../src/app/admin/evenements/actions.ts) + [EvenementFormModal](../../src/app/admin/evenements/EvenementFormModal.tsx)) mais **ne capture pas `centreId`** → un cours ne peut être attaché à un centre.
- `TypeEvenement` = Formation/Atelier/Forum/Webinar/Conference (pas de `Cours`).
- Infra réutilisable : `verifyCJSCardToken` (→ `payload.sub` = cjsUid), `getStaffSession` (→ `{email, centreId}`).

## 2. Objectifs (acceptance)
1. Admin crée un événement **type `Cours`** attaché à un **centre** (`centreId`) + `dateFin` optionnelle.
2. **Présence par badge** : sur la page de scan staff, les cours/sessions **en cours** du centre s'affichent avec « Marquer présent » → écrit `InscriptionEvenement.present` (upsert walk-in).
3. **Fallback admin** : sur le détail événement, bouton « Marquer présent / absent » par participant.
4. Ces présences alimentent les indicateurs (taux de présence GUIC-472 : « qui est venu, combien »).
5. Traçabilité audit `evenement.presence`.

## 3. Migration Prisma
Ajouter `Cours` à `enum TypeEvenement`.
```sql
ALTER TABLE `evenements` MODIFY `type`
  ENUM('Formation','Atelier','Forum','Webinar','Conference','Cours') NOT NULL;
```
Migration `..._add_type_cours_evenement`. `prisma generate`. (Aucune autre colonne : `centreId`/`dateFin` existent déjà sur `Evenement`.)

## 4. Couche audit
Étendre `AuditAction` : `| 'evenement.presence'`. Étendre `ACTION_META` (journal-audit) : libellé + ton + icône.

## 5. Création d'événement — extension
[actions.ts](../../src/app/admin/evenements/actions.ts) `evenementSchema` + `toData` : ajouter `centreId?` (string nullable, vérifié existant si fourni) et `dateFin?` (date nullable). [EvenementFormModal](../../src/app/admin/evenements/EvenementFormModal.tsx) : ajouter `Cours` aux `TYPE_OPTIONS`, un `Select` centre (« — aucun » + centres), un `dateFin` (datetime-local). Threader la liste des centres : page → `AdminEvenementsTable` → modal.

## 6. Présence — primitives
**Action admin** ([actions.ts](../../src/app/admin/evenements/actions.ts)) :
```ts
marquerPresenceEvenement(evenementId, cjsUid, present: boolean)
```
- `assertAdmin` (session pour audit). `present=true` → `upsert` InscriptionEvenement `{cjsUid_evenementId}` (create `present` / update `present`) ; `present=false` → si existe, repasse `inscrit`.
- `recordAudit(session.cjsUid, 'evenement.presence', { targetType:'evenement', targetId, meta:{present, via:'admin'} })`. `revalidatePath('/admin/evenements/'+id)`.

**Endpoint badge** `POST /api/v1/checkin/[token]/presence` (body `{ evenementId }`) :
- `getStaffSession()` sinon 401. `verifyCJSCardToken(token)` (catch `expired`→410, null→401) → `cjsUid = payload.sub`.
- Charger l'événement ; 404 si absent ; **403 si `centreId !== staff.centreId`**.
- `upsert` InscriptionEvenement → `present` (idempotent, walk-in créé). Pas de consommation de nonce (idempotent, pas de rejeu à risque).
- `recordAudit(staff.email, 'evenement.presence', { targetType:'evenement', targetId, meta:{via:'badge'} })`. Renvoie `{ data:{ ok:true, titre } }`.

## 7. UI
- **Scan** [checkin/v1/[token]/page.tsx](../../src/app/checkin/v1/[token]/page.tsx) : charger les événements `statut='en_cours'` du `staff.centreId` (id/titre/type) → passer à `CheckInClient`. [checkin-client.tsx](../../src/app/checkin/v1/[token]/checkin-client.tsx) : section « Cours/sessions au centre » avec bouton « Marquer présent » par événement → `POST /api/v1/checkin/<token>/presence`.
- **Admin détail** [[id]/page.tsx](../../src/app/admin/evenements/[id]/page.tsx) + `AdminEvenementDetail` : par participant, un composant client `PresenceToggle` (Présent ↔ Absent) appelant `marquerPresenceEvenement`.

## 8. Sécurité & règles
Endpoint badge : staff + garde centre (l'événement doit appartenir au centre du staff). Action admin : `assertAdmin`. Pas de SQL brut. Idempotence upsert.

## 9. Tests (TDD RED→GREEN)
- **Action admin** (unit) : garde admin ; present→upsert present ; absent→inscrit ; audit.
- **Endpoint badge** (unit) : 401 sans staff ; 410 token expiré ; 403 si événement d'un autre centre ; 200 + upsert present ; walk-in (pas d'inscription préalable) créé.
- **Form** : `Cours` proposé, centre sélectionnable ; `creerEvenement` reçoit `centreId`.
- **Détail admin** : bouton Présent appelle l'action.

## 10. Hors périmètre
- Refonte du scanner (caméra in-app). Présence à la sortie / dwell time. Notifications.

## 11. Découpage (commits TDD)
1. `test`→`feat` migration `Cours` + audit action
2. `test`→`feat` action admin présence + endpoint badge
3. `test`→`feat` form (centreId/Cours/dateFin) + UI scan + toggle admin
4. `chore` validation

PR unique vers `dev` · `GUIC-474 feat: cours/sessions au centre + présence par badge` · `Closes GUIC-474`.
