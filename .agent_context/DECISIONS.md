# Décisions d'architecture — Guichet Jeunesse CJS

Format : date · contexte · décision · pourquoi · alternatives rejetées

---

## 2026-05-04 — Clé projet JIRA : GUIC (pas GJ)

**Contexte :** Le fichier `.github/workflows/jira.yml` utilise le pattern `GJ-[0-9]+` mais la section 12 du CLAUDE.md et l'URL du board JIRA utilisent `GUIC`.

**Décision :** Standardiser sur `GUIC-XX` — c'est la clé visible dans l'URL JIRA (`/projects/GUIC/`) et dans les exemples de branches du CLAUDE.md.

**Action requise :** Mettre à jour `.github/workflows/jira.yml` pour remplacer `GJ-[0-9]+` par `GUIC-[0-9]+` (ticket GUIC à créer).

---

## 2026-05-04 — Système agent 3 niveaux (token efficiency)

**Contexte :** L'ancien CLAUDE.md (~2 500 tokens) + chargement de 5 fichiers .agent_context/ = ~7 700 tokens de contexte fixe par session.

**Décision :** Architecture 3 niveaux :
- Tier 1 (toujours) : CLAUDE.md ≤ 650 tokens
- Tier 2 (tâche active) : CURRENT_TASK.md ~200 tokens
- Tier 3 (à la demande) : specs/, rules/, docs/ selon besoin

Le contenu de docs/ (architecture, conventions, sso, interconnexion) n'est plus dupliqué dans .agent_context/ — référencé directement.

**Gain estimé :** ~80% de réduction des tokens de contexte fixe.

---
