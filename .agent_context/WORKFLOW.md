# Workflow Agent — Guichet Jeunesse CJS

---

## 1. Démarrage de session

```
1. Lire CLAUDE.md                    → règles + protocoles (auto-chargé)
2. Lire CURRENT_TASK.md              → reprendre si tâche en cours
3. Lire SPRINT_STATUS.md             → prochaine tâche si CURRENT_TASK vide
4. Charger uniquement les fichiers du module actif
```

---

## 2. Architecture du système documentaire

```
CLAUDE.md                          ← Tier 1 : toujours chargé (~700 tokens)
.agent_context/
  CURRENT_TASK.md                  ← Tier 2 : état tâche active (~200 tokens)
  DECISIONS.md                     ← ADR — si décision archi nécessaire
  rules/
    nextjs.md                      ← règles Next.js opérationnelles
    security.md                    ← invariants sécurité
  specs/
    M1-socle.md                    ← Tier 3 : module actif uniquement
    M2-auth.md                     ← (à créer avant Sprint 1)
    ...

docs/                              ← Référence complète — chargée à la demande
  architecture.md                  → décisions techniques, diagrammes
  conventions.md                   → nommage, TypeScript, Prisma, design tokens gj-*
  metier.md                        → entités CJS, rôles, régions, flux
  sso.md                           → flow OAuth PKCE, session Next.js, endpoints SSO
  interconnexion.md                → HMAC, webhooks entrants, Data Hub API
  design/README.md                 → design system GJ V5, tokens, composants

design/html/                       ← Source de vérité visuelle

../cjs_auth/                       ← SSO CJS — LECTURE SEULE, jamais modifier
  .agent_context/CONTEXT.md        → vue d'ensemble SSO
  .agent_context/GUICHET_CONCEPTION_TECHNIQUE.md → conception Guichet côté SSO
  routes/api.php                   → endpoints SSO exposés
  app/Services/WebhookService.php  → events webhooks émis vers le Guichet
```

---

## 3. Protocole démarrage module (spec-first)

### Étape 1 — Validation ticket JIRA (MCP)

```
→ Fetch ticket JIRA : titre, description, acceptance criteria, story points
→ Évaluer :
    - Description suffisante pour implémenter sans ambiguïté ?
    - Critères d'acceptance mesurables ?
    - Dépendances identifiées ?
→ Si manques → proposer les mises à jour → validation PO → appliquer via MCP
```

### Étape 2 — Définition de spec

```
→ Vérifier .agent_context/specs/MX-nom.md
→ Si absent ou incomplet :
    1. Chercher dans docs/ et ../cjs_auth/ ce qui est déjà documenté
    2. Identifier les trous restants → poser max 3 questions ciblées
    3. Attendre réponses → rédiger spec complète → valider avec l'humain
→ Ne jamais coder sans spec validée
```

**Format spec minimal :**
```markdown
# Spec MX — Nom
## Schéma Prisma (modèles + champs + relations)
## Règles métier
## Contrats API (routes + payloads + réponses ApiResponse<T>)
## Critères done
## Questions ouvertes
```

### Étape 3 — Implémentation

```
→ Créer CURRENT_TASK.md
→ git checkout dev && git pull origin dev
→ git checkout -b feature/GUIC-<n>-<description>
→ Ordre : types → lib/services → API routes → composants → pages
→ Mettre à jour CURRENT_TASK.md après chaque fichier complété
```

---

## 4. Matrice d'autonomie

| Action | Autonomie |
|--------|-----------|
| Lire fichiers (guichet + ../cjs_auth/) | Totale |
| Écrire code, créer fichiers | Totale dans le scope sprint |
| Migrations Prisma en local | Totale |
| Mettre à jour CURRENT_TASK.md / DECISIONS.md | Totale |
| Proposer mise à jour ticket JIRA | Proposer → validation → MCP |
| Commiter | Confirmation avant |
| Pusher / créer PR | Confirmation avant |
| Merger, déployer, modifier .env | Humain uniquement |
| Modifier ../cjs_auth/ | **Jamais** |

---

## 5. Fin de session

```
1. CURRENT_TASK.md → vider si terminé, noter étape si en cours
2. SPRINT_STATUS.md → cocher tâches, noter blocages
3. Commit atomique par module
4. DECISIONS.md → ajouter si décision non évidente prise
```

---

## 6. Checklist avant PR

```
□ npm run lint + npm run test passent
□ Aucun console.log (utiliser src/lib/logger.ts)
□ cjs_uid dans toutes les tables utilisateur
□ Cookie : httpOnly + Secure + SameSite=Strict
□ Rate limiting sur endpoints publics
□ Webhook : HMAC + idempotence event_id Redis 7 jours
□ Composants : src/components/ui/ uniquement
□ Tokens : gj-* (pas de hex en dur)
□ Design : fidèle à design/html/ de référence
□ ApiResponse<T> sur toutes les routes API
□ SPRINT_STATUS.md + CURRENT_TASK.md mis à jour
```
