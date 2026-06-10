# ADR-001 — Réutiliser `AgentCentre` + `RoleAgent` au lieu de créer `CentreStaff`

**Date** : 2026-06-09
**Statut** : Accepté (verrouille spec M4-centres-lot7.md §3.1)
**Décideurs** : PO + lead orchestrateur

## Contexte

La spec initiale proposait un nouveau modèle Prisma `CentreStaff(cjsUid, centreId, role)` + enum `RoleStaffCentre(Admin, Conseiller)` pour gérer le backoffice staff centre (Wave 5).

Découverte lors de l'audit pré-W0 du schéma `prisma/schema.prisma` :
- `model AgentCentre` existe déjà (ligne 505) : `id, cjsUid, centreId, role, createdAt`
- `enum RoleAgent` existe déjà (ligne 218) : `conseiller`, `directeur`, `admin_centre`

Créer un nouveau modèle dupliquerait la même responsabilité métier (lier un user à un centre avec un rôle).

## Décision

**Réutiliser `AgentCentre` + `RoleAgent` pour l'ensemble du backoffice centre.**

Mapping des rôles SSO futurs ↔ enum existant :
- `centre_admin` (claim SSO) → `RoleAgent.admin_centre` (ou `directeur` selon arbitrage PO)
- `centre_conseiller` (claim SSO) → `RoleAgent.conseiller`

Pas de nouveau modèle `CentreStaff`, pas de nouvel enum `RoleStaffCentre`.

## Conséquences

### Positives
- Pas de duplication de modèle
- Réutilisation directe des données existantes
- Migration Lot 7 W0 allégée

### À ajuster
- Briefs des waves 5+ doivent utiliser `prisma.agentCentre` et `RoleAgent`
- Routes backoffice W6 : `/centre-staff/*` URL OK (cohérent UX) mais code utilise `AgentCentre`

## Liens

- Spec : `.agent_context/specs/M4-centres-lot7.md` (§3.1)
- Tickets : GUIC-357 (W6 backoffice)
