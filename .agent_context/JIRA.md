# Guichet Jeunesse — Intégration JIRA

---

## 1. Configuration JIRA

| Paramètre | Valeur |
|-----------|--------|
| Projet clé | `GUICHET` (à confirmer) |
| URL instance | À renseigner |
| Board | Scrum — 4 sprints (10 semaines) |
| Lien PR/Commit | Automatique via GitHub integration JIRA |

**À configurer :** renseigner l'URL JIRA et confirmer la clé projet avant Sprint 0.

---

## 2. Format Commit (OBLIGATOIRE)

```
type(module): [GUICHET-XXX] description courte en français

Corps optionnel si clarification nécessaire.

Closes GUICHET-XXX
```

### Types valides

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `perf` | Amélioration de performance |
| `test` | Ajout ou modification de tests |
| `chore` | CI/CD, dépendances, config |
| `docs` | Documentation uniquement |
| `security` | Correction de sécurité |
| `refactor` | Refactorisation sans changement de comportement |

### Modules valides

| Code | Module |
|------|--------|
| `m1-socle` | Socle technique, CI/CD |
| `m2-auth` | Authentification, profil jeune |
| `m3-opportunites` | Catalogue opportunités, candidatures |
| `m4-centres` | Réseau centres, réservations |
| `m5-agenda` | Événements, inscriptions |
| `m6-ressources` | Bibliothèque ressources |
| `m7-seo` | SEO, sitemap, schéma.org |
| `m8-admin` | Dashboard administrateur CJS |
| `m9-recruteur` | Espace recruteur |
| `m10-interop` | Webhooks, interopérabilité |
| `m11-whatsapp` | Agent WhatsApp |
| `m12-ia` | Recommandations IA |
| `m13-data` | Data Hub, exports |
| `m14-elearning` | Intégration Moodle (post-scope) |
| `sso` | Intégration SSO (cross-module) |
| `db` | Migrations base de données |

### Exemples

```
feat(m2-auth): [GUICHET-12] Tunnel onboarding 3 étapes post-callback SSO

feat(m3-opportunites): [GUICHET-23] Catalogue paginé avec filtres type/region/q

fix(m4-centres): [GUICHET-34] Fallback cache Redis si App Centres timeout 5s

perf(m3-opportunites): [GUICHET-45] Index fulltext MySQL sur titre et description

security(m2-auth): [GUICHET-56] Cookie session SameSite=Strict + token refresh auto

feat(m12-ia): [GUICHET-78] Algorithme scoring recommandations top-5 par profil

chore(m1-socle): [GUICHET-3] Pipeline CI/CD GitHub Actions → OVH

Closes GUICHET-78
```

---

## 3. Nommage des Branches

```
feature/GUICHET-XXX-description-courte
fix/GUICHET-XXX-description-courte
perf/GUICHET-XXX-description-courte
security/GUICHET-XXX-description-courte
```

Exemples :
```
feature/GUICHET-12-onboarding-tunnel
feature/GUICHET-23-catalogue-opportunites
fix/GUICHET-34-centres-timeout-fallback
security/GUICHET-56-cookie-samesite
```

---

## 4. Convention Pull Request

**Titre PR :** `[GUICHET-XXX] Description courte`

**Corps PR :**
```markdown
## Résumé
- Point 1
- Point 2

## Module
M2 — Authentification et profil jeune

## Tests
- [ ] Feature tests Laravel
- [ ] Composant tests Nuxt (si applicable)
- [ ] Test manuel flow complet

## JIRA
Closes GUICHET-XXX
```

---

## 5. Mapping Tickets → Sprints

| Sprint | Modules | Tickets JIRA attendus |
|--------|---------|----------------------|
| Sprint 0 (S1-S2) | M1 Socle | GUICHET-1 à GUICHET-10 |
| Sprint 1 (S3-S4) | M2, M3 | GUICHET-11 à GUICHET-30 |
| Sprint 2 (S5-S6) | M4, M5, M6, M7 | GUICHET-31 à GUICHET-60 |
| Sprint 3 (S7-S8) | M8, M9 | GUICHET-61 à GUICHET-80 |
| Sprint 4 (S9-S10) | M10, M11, M12, M13 | GUICHET-81 à GUICHET-120 |

---

## 6. Statuts Ticket JIRA

| Statut | Signification |
|--------|--------------|
| `To Do` | Non démarré |
| `In Progress` | Branche créée, développement actif |
| `In Review` | PR ouverte, en attente de review |
| `Done` | Mergé sur dev, tests passés |

Règle : changer le statut au moment de l'action (branche créée → In Progress, PR ouverte → In Review, mergé → Done).

---

## 7. MCP JIRA (optionnel — à configurer)

Pour permettre à l'agent de lire les tickets JIRA directement depuis Claude Code :

```json
// .claude/settings.json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@smithery/cli@latest", "run", "@aptbytes/mcp-server-jira"],
      "env": {
        "JIRA_URL": "https://votre-instance.atlassian.net",
        "JIRA_EMAIL": "ryhow99@gmail.com",
        "JIRA_API_TOKEN": "$JIRA_API_TOKEN"
      }
    }
  }
}
```

Activer avec `/update-config` une fois les credentials JIRA disponibles.
