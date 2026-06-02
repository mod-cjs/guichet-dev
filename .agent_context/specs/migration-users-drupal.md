# Spec — Migration utilisateurs Drupal → Guichet

**Ticket :** GUIC-200 (sous-tâche de GUIC-17)
**Module :** m13-data (avec impact m2-auth pour le rapprochement SSO ultérieur)
**Auteur :** mod-cjs · **Date :** 2026-06-02

---

## 1. Contexte

Le script `scripts/migrate-drupal.ts` (GUIC-17) suppose que les `Utilisateur` ont déjà été créés par un sync SSO préalable (`migrate:sso:create` + `migrate:sso:sync`), puis migre uniquement les *ProfilJeune*, opportunités, événements et ressources.

En pratique :
- **4290 opportunités** importées avec succès.
- **0 utilisateur** migré : ni le SSO sync ni un import direct n'a tourné en prod.
- Côté Drupal source : **22 778 comptes** (dont 22 746 actifs, uid > 1), 22 778 avec email, 12 doublons d'email, 3 282 avec téléphone (souvent au format local non E.164).

Le modèle `Utilisateur` du schéma Prisma possède déjà :
- `cjsUid String @id` — claim `sub` SSO, inter-plateformes
- `drupalUid Int? @unique @map("drupal_uid")` — déjà présent, donc **aucune migration Prisma à créer**.
- `email`, `telephone` (uniques, nullable)

## 2. Stratégie cjs_uid retenue — **Option 1 EAGER**

> Import direct des comptes Drupal dans `utilisateurs` avec :
> - `cjs_uid` = UUID v4 généré localement (préfixe `drupal-` retiré pour rester un cjs_uid valide ; valeur réelle 36 caractères UUID).
> - `drupal_uid` = uid Drupal original (rapprochement futur garanti, contrainte `@unique`).

**Justifications :**
- 100 % des comptes ont un email → réassociation future au SSO faisable par email canonique (méthode déjà utilisée dans `migrate-drupal.ts` via `byEmail` map).
- L'option lazy (créer à la 1re connexion SSO) impose que CHAQUE utilisateur se reconnecte avant que ses opportunités, candidatures, certificats Moodle, etc. ne soient liés. Or 22 000 utilisateurs ne reconnecteront pas tous immédiatement — pertes de données métier garanties.
- `drupal_uid @unique` permet, lors de la prochaine reconnexion SSO d'un user, de **mettre à jour** son `cjs_uid` avec le `sub` reçu (geste de réconciliation côté webhook SSO ; **hors périmètre de ce ticket**).

**Trade-off accepté :** des `cjs_uid` "orphelins" (non liés à un compte SSO réel) existent transitoirement. Tant que l'utilisateur n'a pas reconnecté, il ne peut pas se connecter via SSO ; mais ses données historiques sont préservées et requêtables côté admin/recruteur.

## 3. Mapping table par table

| Cible Prisma (`Utilisateur`) | Source Drupal                                                       | Transformation                                                                                  |
|------------------------------|---------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| `cjs_uid`                    | (généré)                                                            | `crypto.randomUUID()` — placeholder jusqu'à reconnexion SSO                                     |
| `drupal_uid`                 | `users.uid`                                                         | direct                                                                                          |
| `email`                      | `users_field_data.mail`                                             | `toLowerCase().trim()` ; skip si vide ou doublon dans batch                                     |
| `telephone`                  | `user__field_telephone.field_telephone_value`                       | `normalizePhone()` (E.164 `+221XXXXXXXXX`) ; NULL si non parsable                               |
| `nom`                        | `user__field_nom.field_nom_value` (souvent contient le nom complet) | `trim()`, fallback `'Inconnu'` si vide                                                          |
| `prenom`                     | `user__field_prenom.field_prenom_value`                             | `trim()`, fallback : 1er mot du `nom` si vide et `nom` contient un espace, sinon `''`           |
| `genre`                      | `user__field_sexe.field_sexe_value`                                 | `'homme'→'M'`, `'femme'→'F'`, sinon NULL                                                        |
| `dateNaissance`              | `user__field_date_de_naissance.field_date_de_naissance_value`       | parse ISO ; NULL si invalide ou < 1900 ou > today                                               |
| `region`                     | —                                                                   | NULL (champ absent côté Drupal, à enrichir plus tard depuis `field_emplacement` des opportunités) |
| `commune`                    | —                                                                   | NULL                                                                                            |
| `statut`                     | `users_field_data.status`                                           | `1 → 'actif'`, sinon `'inactif'`                                                                |
| `onboardingComplete`         | —                                                                   | `false` (le jeune devra compléter son profil après reconnexion)                                 |
| `createdAt`                  | `users_field_data.created`                                          | `new Date(ts * 1000)`                                                                           |

**Téléphone unique :** la contrainte `@unique` sur `telephone` peut rejeter quelques imports (numéros partagés/famille). Stratégie : si conflit, **garder le premier**, mettre NULL sur le second et logger.

**Email unique :** 12 doublons détectés en source. Stratégie : trier par `uid ASC`, garder le premier import, skip les suivants avec compteur `skippedEmailDup`.

## 4. Filtre des rôles

Rôles présents en source :
- `invite` (20 338) — **inclus**
- `chercheur_d_emploi` (1909) — **inclus**
- `employeur` (242) — **exclu** (ce sont des recruteurs, futur module M9, modèle `Organisation`)
- `administrator` (6), `admin_dashboard` (2), `content_editor` (6) — **exclus** (staff Drupal, ne sont pas des jeunes)

→ On importe uniquement les `uid` qui n'ont **aucun** rôle parmi `[administrator, admin_dashboard, content_editor, employeur]`.

## 5. Idempotence

Une exécution multiple ne doit pas créer de doublons :
- Pré-charger `Utilisateur.findMany({ select: { drupalUid: true, email: true } })`.
- Skip si `drupalUid` ou `email` (lowercase) déjà présent → compteur `alreadyExists`.

## 6. Sortie attendue (DRY-RUN local sur Docker drupal_source)

Compte théorique max après filtres rôles : **~22 247** (22 256 - 6 admin - 2 admin_dashboard - 6 editor + recouvrements) → on retiendra **20 000–22 000** importables.

## 7. Livrables

1. **`scripts/migrate-drupal-users.ts`** — script TypeScript autonome (n'utilise pas le mapping SSO).
   - Flags : `--apply` (sinon DRY_RUN par défaut), `--limit=N`, `--batch=N` (défaut 1000).
   - Logs structurés : `migrated`, `skippedRole`, `skippedEmailDup`, `skippedPhoneDup`, `alreadyExists`, `errors`.
2. **`tests/integration/migrate-drupal-users.test.ts`** — 5 cas (succès, dup email, bad phone, rôle exclu, NULL email).
3. **Entrée `package.json`** : `migrate:drupal:users` / `migrate:drupal:users:apply`.
4. **Pas de migration Prisma** (colonne `drupal_uid` déjà existante).
5. **Branche** : `feature/GUIC-200-migration-users-drupal` → PR vers `dev`.

## 8. Plan de réconciliation SSO (hors périmètre, à tracer)

Une fois la migration eager faite, le webhook SSO (`/api/webhooks/sso/*`) ou un script `reconcile-cjs-uid.ts` (futur ticket) devra :
1. À chaque login SSO réussi, chercher un `Utilisateur` par email canonique.
2. Si trouvé avec `drupal_uid` renseigné et `cjs_uid` actuel non SSO → UPDATE `cjs_uid = sub_du_token`.
3. Logger l'opération dans `InteropLog`.

Ce comportement sera spécifié dans le ticket GUIC-201 (à créer après merge GUIC-200).
