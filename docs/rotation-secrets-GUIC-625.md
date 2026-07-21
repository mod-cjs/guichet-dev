# Rotation des secrets compromis — GUIC-625

> **Incident.** `scripts/vercel-env-setup.sh` a porté des secrets **en clair**, suivis par git du
> **2026-05-07** (commit `974ce3c`) au 2026-07-20. Toute personne ayant cloné le dépôt les a dans
> son historique local — les retirer du dépôt ne les protège donc **pas**.
>
> **Le code est nettoyé** (ce ticket) ; la **rotation** ci-dessous est manuelle et se fait hors du
> dépôt. Tant qu'elle n'est pas faite, les secrets restent valides et exploitables.

## Ce qui a fuité, par gravité

| Secret | Pourquoi c'est grave | Où le roter |
|---|---|---|
| `SESSION_SECRET` / `NEXTAUTH_SECRET` | **Le plus grave.** Signent les cookies de session : quiconque les détient peut **forger la session de n'importe qui, admin compris**, sans passer par le SSO. | Générer une nouvelle valeur (`openssl rand -base64 32`), la poser dans l'env de prod. **Effet : déconnecte toutes les sessions en cours** — normal. |
| `REDIS_URL` (mot de passe Redis Cloud) | L'instance `redis-10691…redislabs.com:10691` est **publiquement joignable** : le mot de passe seul suffit à y accéder. | Console Redis Cloud → régénérer le mot de passe → mettre à jour l'env. |
| `SSO_CLIENT_SECRET` / `SSO_API_KEY` | Identité de la plateforme auprès du SSO CJS : permettent d'usurper le client OAuth du Guichet. | **Demander au responsable SSO** (`../cjs_auth`) de régénérer le secret du client `guichet` et la clé API. |
| `DATABASE_URL` (mot de passe MariaDB) | Accès base — mais l'instance n'est pas exposée publiquement, donc exploitation conditionnée à un accès réseau. | Changer le mot de passe de l'utilisateur MariaDB → mettre à jour l'env. |

## Procédure

1. **Roter** chaque secret ci-dessus, en commençant par `SESSION_SECRET`.
2. **Déposer** les nouvelles valeurs dans le fichier hors dépôt, puis injecter :
   ```bash
   cp scripts/vercel-env-setup.env.example ~/.guichet.env
   # remplir ~/.guichet.env avec les valeurs ROTÉES (jamais les anciennes)
   chmod 600 ~/.guichet.env
   VERCEL_ENV_FILE=~/.guichet.env bash scripts/vercel-env-setup.sh
   ```
   (Pour le serveur OVH/Plesk, mettre à jour `/etc/guichet/prod.env`, `chmod 600`.)
3. **Vérifier** que l'application redémarre et que la connexion SSO fonctionne avec les nouvelles
   valeurs.
4. **Confirmer** que les anciennes valeurs sont mortes : ancienne session forgée rejetée, ancien
   mot de passe Redis refusé.

## Réécriture de l'historique git — à décider

Les secrets restent dans l'historique de tous les clones existants. Deux options, à arbitrer :

- **Ne rien réécrire** (recommandé si la rotation est faite) : une fois les secrets rotés, ceux de
  l'historique sont **inertes**. C'est le plus simple, sans risque pour les clones et forks.
- **Réécrire** (`git filter-repo`) : purge les valeurs de l'historique, mais **casse tous les
  clones et forks existants** et exige une coordination d'équipe. À ne faire que si une exigence
  de conformité l'impose — et **après** la rotation, pas à sa place.

⚠️ **La réécriture ne remplace jamais la rotation.** Un secret purgé de l'historique mais non roté
reste valide chez quiconque l'a déjà copié.

## Empêcher la récidive

`tests/unit/pas-de-secret-en-dur.test.ts` échoue désormais si un secret en clair réapparaît dans un
fichier suivi — vérifié par mutation contre les valeurs exactes de cet incident. La documentation
ne suffisait pas ; l'invariant, si.

## Portée — vérifié

La fuite se limite à `scripts/vercel-env-setup.sh` : recherche des valeurs exactes sur l'ensemble
des fichiers suivis, aucune autre occurrence. Les autres scripts n'utilisent que des **références**
d'environnement (`$DB_PASS`, `${MARIADB_ROOT_PASSWORD:-root}`), jamais de valeur littérale.
