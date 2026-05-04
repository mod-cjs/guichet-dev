# Workflow Agent — Guichet Jeunesse CJS

---

## 1. Démarrage de session

```
1. Lire CLAUDE.md                        → règles + protocoles (auto-chargé)
2. Lire CURRENT_TASK.md                  → reprendre si tâche en cours
3. Lire SPRINT_STATUS.md                 → identifier la prochaine tâche si CURRENT_TASK vide
4. Charger uniquement les fichiers du module actif
```

Ne jamais charger l'ensemble du codebase ni tous les fichiers de specs.

---

## 2. Protocole démarrage module (spec-first)

### Étape 1 — Validation ticket JIRA

```
→ Fetch ticket JIRA via MCP (outil jira_get_issue ou équivalent)
→ Lire : titre, description, critères d'acceptance, story points, priorité
→ Évaluer :
    - Description suffisamment précise pour implémenter ?
    - Critères d'acceptance mesurables et complets ?
    - Dépendances identifiées ?
→ Si manques détectés → rédiger les mises à jour proposées → attendre validation humaine
→ Appliquer les mises à jour validées via MCP avant de continuer
```

### Étape 2 — Spec module

```
→ Vérifier si .agent_context/specs/MX-nom.md existe
→ Si oui : lire, vérifier complétude (schéma DB, règles métier, contrats API, critères done)
→ Si non ou incomplet :
    - Identifier les questions bloquantes (max 3 à la fois)
    - Poser les questions, attendre les réponses
    - Rédiger la spec complète
    - Valider avec l'humain
→ Ne jamais écrire du code avant que la spec soit validée
```

### Étape 3 — Implémentation

```
→ Créer CURRENT_TASK.md avec état initial
→ Créer branche : feature/GUIC-<n>-<description-kebab>
→ Implémenter selon ordre : types → lib/services → API routes → composants → pages
→ Mettre à jour CURRENT_TASK.md après chaque fichier complété
→ Tests : écrire les tests Jest/Playwright pour chaque comportement critique
```

---

## 3. Matrice d'autonomie

| Action | Autonomie |
|--------|-----------|
| Lire des fichiers, analyser, chercher | Totale |
| Écrire du code, créer des fichiers | Totale dans le scope du sprint |
| Créer des migrations Prisma | Totale (dev uniquement) |
| Mettre à jour CURRENT_TASK.md / DECISIONS.md | Totale |
| Mettre à jour un ticket JIRA via MCP | Proposer → validation → exécuter |
| Commiter du code | Confirmation avant commit |
| Pusher / créer une PR | Confirmation avant |
| Déployer (staging/production) | Humain uniquement |
| Migration des 22 000 comptes Drupal | Humain uniquement |
| Modifier des secrets / .env | Humain uniquement |

---

## 4. Fin de session

```
1. Mettre à jour CURRENT_TASK.md
   → Si tâche terminée : vider le fichier (remettre le template vide)
   → Si tâche en cours : noter le fichier en cours + prochaine étape

2. Mettre à jour SPRINT_STATUS.md
   → Cocher les tâches terminées
   → Documenter les blocages

3. Commiter (atomique par module)
   feat(m2-auth): [GUIC-12] description
   Closes GUIC-12

4. Mettre à jour DECISIONS.md si décision non évidente prise
```

---

## 5. Checklist avant PR

```
□ Tests écrits pour chaque feat/fix/security
□ Comportement attendu ET cas limite couverts
□ Aucun console.log committé (utiliser src/lib/logger.ts)
□ cjs_uid présent dans toutes les tables utilisateur
□ Cookie session : httpOnly + Secure + SameSite=Strict
□ Rate limiting en place sur endpoints publics
□ Webhook : HMAC + idempotence event_id
□ Composants : src/components/ui/ uniquement
□ Design : fidèle au fichier HTML de référence dans design/html/
□ npm run lint et npm run test passent
□ SPRINT_STATUS.md mis à jour
□ CURRENT_TASK.md vidé
```

---

## 6. Stratégie de tests

**Jest (unitaires) :** lib/services, calculs de scoring, validation Zod
**Playwright (E2E) :** flows critiques — auth callback, candidature, réservation
**Tests d'intégration :** API routes avec vraie base de données (pas de mocks)

Règle : écrire le test avant ou pendant l'implémentation, jamais après.
