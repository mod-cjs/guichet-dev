# Robustesse des tests — pourquoi les bugs graves échappent, et quoi faire

Note de méthode, tirée de la mise en prod (juillet 2026). Plusieurs bugs **critiques** ont
échappé à tous les tests unitaires **et** à `tsc`, et n'ont été trouvés qu'en **challengeant le
code contre le vrai système**. Cette note explique le mécanisme pour ne pas le répéter.

## Le mécanisme : le test partage l'hypothèse fausse du code

Un test unitaire remplace le monde extérieur par un **mock**. Si le mock encode la **même
croyance** que le code, le test ne vérifie rien — il se regarde dans un miroir.

| Bug | Pourquoi il a échappé |
|---|---|
| **C1** (GUIC-578) — `onRequestError` reçoit `headers` en OBJET SIMPLE, pas un `Headers` Web → `.get()` plantait la capture d'erreurs en prod | Le test mockait `headers` comme un `Headers`. Code et test partageaient la même hypothèse fausse → **faux-vert**. |
| **C-CD1** (GUIC-568) — nom d'image GHCR avec majuscules (`…-CJS/`) → push refusé → aucun déploiement | YAML de pipeline : ne s'exécute que sur les runners. Rien en local ne pouvait l'attraper. |
| **5 bugs shell** (GUIC-571, gap 5) — `set -e` tuait les scripts, grep sans match, ellipsis collée à une variable | Les tests manuels tournaient **sans `set -e`**. Le harnais (vrai script) les a trouvés. |

**Cause commune :** la réalité (types réels de Next, vrai nom d'org, `set -e`) n'était jamais
dans la boucle. La robustesse ne se mesure PAS au nombre de tests unitaires.

## Ce qui rend un système de test robuste

1. **Tester la vraie chose, pas un mock** — tests de contrat (GUIC-592) et E2E (GUIC-589) : le
   seul antidote à « le mock ment ». Un E2E aurait attrapé C1 (vraie requête → vraie 500 → pas de log).
2. **Exécuter le vrai artefact dans son vrai mode** — harnais shell (a trouvé les 5 bugs) ;
   smoke du pipeline CI (aurait attrapé C-CD1) ; intégration contre de vrais MariaDB/Redis/MinIO.
3. **Vérification adverse en garde-fou** — mutation testing (GUIC-593) révèle *automatiquement*
   les tests-miroirs ; le « challenge » d'une PR comme **habitude**, pas comme coup de chance.
4. **RED qui prouve** — un test doit être **vu échouer pour la bonne raison** avant qu'on lui
   fasse confiance. Un test né vert contre un mock ne protège de rien.

## Réflexe à appliquer sur toute PR de FRONTIÈRE

Code touchant : hooks Next, CI/CD, SSO, Meta/WhatsApp, stockage objet, interop HMAC, scripts shell.

> **Question à se poser :** « Quel est le VRAI format que le système externe m'envoie / attend ? »
> Puis le tester avec **cette** forme — jamais la forme idéale.

Et : quand une classe de bug est trouvée au challenge, la **figer en sentinelle** (ex.
`tests/unit/workflows-image-lowercase.test.ts` pour C-CD1) — transformer la découverte manuelle en
couche de test permanente.

## Limite assumée

Certains bugs (config CI/CD) **ne seront jamais attrapés autrement qu'en exécutant le pipeline
pour de vrai** → d'où le **staging** (GUIC-569) comme répétition générale. On mitige, on ne
prétend pas supprimer.
