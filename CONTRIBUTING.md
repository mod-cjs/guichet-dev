# Guide de contribution — Guichet Jeunesse CJS

## 1. Workflow Git + Jira

Ce projet utilise **Jira** (projet `GJ`) comme gestionnaire de tâches. Le lien entre GitHub et Jira est **automatique** — à condition que les conventions de nommage soient respectées.

### Convention de nommage des branches

La clé Jira **doit apparaître dans le nom de la branche**. C'est ce qui déclenche l'automatisation.

```
<type>/GJ-<numéro>-<description-courte>
```

| Type | Quand |
|------|-------|
| `feature` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `chore` | Maintenance, config, dépendances |
| `docs` | Documentation uniquement |
| `refactor` | Réécriture sans changement de comportement |
| `test` | Ajout ou correction de tests |

**Exemples valides :**
```
feature/GJ-12-tunnel-onboarding-3-etapes
fix/GJ-5-sso-callback-token-expire
chore/GJ-1-setup-nextjs-prisma
docs/GJ-8-documenter-api-export
```

**Exemples invalides :**
```
feature/tunnel-onboarding        ❌ pas de clé Jira
GJ-12                            ❌ pas de type ni de description
ma-feature                       ❌ rien du tout
```

### Convention de nommage des Pull Requests

Le **titre de la PR doit contenir la clé Jira**. Un check GitHub Actions valide ce point et bloque le merge si absent.

```
GJ-<numéro> <type>: <description courte en français>
```

**Exemples valides :**
```
GJ-12 feat: tunnel d'onboarding 3 étapes après authentification SSO
GJ-5 fix: corriger la redirection après expiration du token SSO
GJ-1 chore: setup Next.js 15 avec SSR et design system v1
```

---

## 2. Ce que Jira détecte automatiquement

Quand la clé `GJ-XX` est présente dans la branche ou le titre de la PR, Jira reconnaît automatiquement (via l'app **GitHub for Jira**) :

- ✅ Les **branches** liées au ticket
- ✅ Les **commits** contenant la clé
- ✅ Les **Pull Requests** liées
- ✅ Les **déploiements** (quand configuré)

Ces informations apparaissent directement dans le panneau de détail du ticket Jira.

---

## 3. Flux Git et transitions de statut automatiques

### Deux branches cibles — deux rôles distincts

```
feature/GJ-XX  ──PR──►  develop  ──PR──►  main
                (devs)              (PO / release)
```

| Branche cible | Qui merge | Signification |
|--------------|-----------|---------------|
| `develop` | Lead développeur | Code validé techniquement — en attente de validation PO |
| `main` | Product Owner | Validation PO confirmée — story livrée en production |

### Transitions automatiques (GitHub Actions — `.github/workflows/jira.yml`)

| Événement GitHub | Branche cible | Statut Jira |
|-----------------|---------------|-------------|
| PR ouverte en **draft** | `develop` | → **En cours** |
| PR ouverte / **Ready for review** | `develop` | → **En review** |
| PR repassée en **draft** | `develop` | → **En cours** |
| Review **demande des changements** | `develop` | → **En cours** |
| Review **approuvée** | `develop` | *(pas de transition — le statut avance au merge)* |
| PR **mergée** | `develop` | → **À valider** |
| PR **fermée sans merge** | `develop` | → **Dans affaires** |
| PR **mergée** | `main` | → **Fini** |

Un commentaire est automatiquement posté sur le ticket Jira à l'ouverture de la PR feature → develop.

---

## 4. Secrets GitHub à configurer

Pour que l'intégration fonctionne, configurer ces 3 secrets dans **Settings → Secrets and variables → Actions** du repo GitHub :

| Secret | Description |
|--------|-------------|
| `JIRA_BASE_URL` | URL de l'instance Jira, ex: `https://cjs.atlassian.net` |
| `JIRA_USER_EMAIL` | Email du compte de service Jira |
| `JIRA_API_TOKEN` | Token API Jira (générer sur id.atlassian.com) |

---

## 5. Statuts Jira attendus dans le projet GJ

Le workflow GitHub utilise ces noms de transition. Ils doivent correspondre exactement aux transitions configurées dans le board Jira :

```
Dans affaires → En cours → En review → À valider → Fini
                    ↑           ↑
          (draft ou      (changes_requested)
         PR fermée sans merge → Dans affaires)
```

Si les noms de transition diffèrent dans Jira, les mettre à jour dans `.github/workflows/jira.yml`.

---

## 6. Cycle de vie complet d'une story

```
1. Prendre la story dans Jira
   Statut : "Dans affaires"

2. Créer la branche depuis develop
   git checkout develop && git pull
   git checkout -b feature/GJ-12-tunnel-onboarding

   → Jira détecte la branche automatiquement

3. Développer — commits conventionnels
   git commit -m "feat(M2): ajouter la première étape du tunnel onboarding"
   → Les commits apparaissent dans Jira

4. Ouvrir la PR en draft si le travail n'est pas terminé
   → Ticket : "En cours"

5. Marquer la PR "Ready for review"
   → Ticket : "En review"

6. Le Lead développeur fait la revue de code
   - Request changes → Ticket : "En cours" (retour au dev)
   - Approve → pas de transition (en attente du merge)

7. Merger la PR feature sur develop (squash merge)
   → Ticket : "À valider"
   → Le PO est notifié que le code est sur develop

8. Le PO valide sur l'environnement staging

9. Le PO merge develop → main (ou crée la PR de release)
   → Ticket : "Fini"
   → Le déploiement en production est déclenché (cd-deploy.yml)
```

---

## 7. Conventions de commits

Format **Conventional Commits** (la clé Jira est optionnelle dans le commit, elle est obligatoire dans la branche et le titre de PR) :

```
<type>(<scope>): <description en français>

[corps optionnel]

[Closes GJ-XX]  ← optionnel mais recommandé sur le commit final
```

**Types** : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`

**Exemples :**
```
feat(M2): ajouter la barre de progression du tunnel onboarding

fix(sso): corriger la redirection après expiration du token

chore(prisma): migration pour la table candidatures

Closes GJ-12
```

---

## 8. Pull Requests — checklist

### Avant d'ouvrir

- [ ] Le titre contient la clé Jira : `GJ-XX feat: description`
- [ ] La branche contient la clé Jira : `feature/GJ-XX-description`
- [ ] `npm run lint && npm run test` passent en local
- [ ] Aucun `any` TypeScript non justifié
- [ ] Les migrations Prisma sont incluses si le schéma a changé
- [ ] Pas de secret en dur dans le code

### Template de description

```markdown
## Story Jira
[GJ-XX](https://cjs.atlassian.net/browse/GJ-XX) — Titre de la story

## Ce que fait cette PR
Description courte des changements.

## Captures d'écran (si UI)
(ajouter des captures)

## Points d'attention pour la revue
Signaler les choix techniques non évidents.

## Checklist
- [ ] Lint et tests passent
- [ ] Composants UI depuis le design system uniquement
- [ ] cjs_uid utilisé comme identifiant croisé
- [ ] Aucun secret en dur
- [ ] Migration Prisma incluse si besoin
```

---

## 9. Definition of Done

Une story est "Done" quand :
1. Le code est mergé sur `develop`
2. Les tests passent en CI
3. La feature est démontrée sur staging
4. La revue de code est validée
5. Le ticket Jira est passé à **Done** (automatique au merge)
