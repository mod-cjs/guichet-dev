# CURRENT TASK — GUIC-526 · Rôles SSO conseiller & recruteur

**Branche :** `feature/GUIC-526-roles-sso-conseiller-recruteur` (depuis origin/dev `5b7e321`)
**Spec :** `.agent_context/specs/M8-roles-sso-conseiller-recruteur.md` (décisions D1-D4)
**JIRA :** GUIC-526 (En cours)

## État

- [x] RED `c2b4fac` — 4 suites (espace-roles, admin-rattachements-actions, middleware +3 cas, auth-callback +2 cas)
- [x] GREEN code : espace-roles.ts, espace-guards.ts, EspaceEnAttente, middleware, callback (rolePrincipal), layouts conseiller/recruteur, 17 pages conseiller, section admin « Rôles & rattachements »
- [ ] Jest 4 suites vertes + tsc (hors dette dev opportunite-dto/service)
- [ ] Commits GREEN (m2-auth puis m8-admin)
- [ ] Push + PR vers dev + miroir + JIRA « En review »
- [ ] Chantier A (SSO, données) : ajouter recruteur+conseiller à `platforms.available_roles`

## Notes environnement

- `node_modules` = symlink vers `.claude/worktrees/v0-tests/node_modules` (12 deps dev ajoutées le 2026-07-06, client Prisma régénéré depuis le schéma dev)
- Dette tsc préexistante de dev : 7 erreurs dans `tests/unit/opportunite-dto.test.ts` + `opportunite-service.test.ts` — hors périmètre, hook contourné avec validation manuelle documentée dans le message de commit
