#!/usr/bin/env bash
# GUIC-639 — Construire et pousser l'image du Guichet vers GHCR, À LA MAIN.
#
# Pourquoi ce script existe
# -------------------------
# Le CD (cd-deploy.yml) fait ça sur un runner GitHub — qui consomme des minutes Actions. Dépôt
# PRIVÉ : quota épuisé = CD bloqué. Ce script reproduit EXACTEMENT la même chaîne, en local, sans
# une seule minute Actions. Il ne remplace pas le CD, il le débloque quand le quota manque.
#
# Il ne fait QUE construire et pousser. Le déploiement reste `scripts/deploy/deploy.sh`, exécuté
# sur le serveur avec la référence par empreinte qu'affiche ce script.
#
# ⚠️ L'image doit contenir le correctif GUIC-637 (prisma.config.ts + toolchain) pour pouvoir
# migrer la base. Sans lui, deploy.sh échoue à l'étape migration.
#
# Usage
# -----
#   docker login ghcr.io -u <utilisateur> --password-stdin   # (jeton avec write:packages)
#   ./scripts/deploy/build-push.sh v1.0.0
#
# En sortie : la RÉFÉRENCE PAR EMPREINTE (…@sha256:…) à passer à deploy.sh. On déploie par
# empreinte, jamais par tag mutable : le serveur reçoit EXACTEMENT l'image construite ici.
set -Eeuo pipefail

log() { printf '\n\033[1m[build-push]\033[0m %s\n' "$*"; }
err() { printf '\n\033[1;31m[build-push:erreur]\033[0m %s\n' "$*" >&2; }

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  err "Version manquante. Usage : $0 <version>  (ex. v1.0.0)"
  exit 2
fi
# Un tag mutable comme `latest` seul n'a pas de sens comme version de release.
if [[ "$VERSION" == "latest" ]]; then
  err "« latest » n'est pas une version de release. Fournir un tag explicite (ex. v1.0.0)."
  exit 2
fi

# ── Nom d'image GHCR — MÊME dérivation que le CD (C-CD1) ─────────────────────
# GHCR exige un nom en MINUSCULES ; le dépôt contient des majuscules (…-CJS/guichet). Sans
# normalisation, `docker push` échoue (« repository name must be lowercase »).
# `tr` plutôt que ${VAR,,} : portable quelle que soit la version de bash (leçon des scripts M14).
REPO_SLUG="$(git config --get remote.origin.url \
  | sed -E 's#^git@[^:]+:##; s#^https://[^/]+/##; s#\.git$##' \
  | tr '[:upper:]' '[:lower:]')"
if [[ -z "$REPO_SLUG" ]]; then
  err "Impossible de déduire le dépôt depuis remote.origin.url."
  exit 2
fi
BASE="ghcr.io/${REPO_SLUG}"

# ── Garde-fous avant de construire ──────────────────────────────────────────
# Une release se taille sur un arbre PROPRE : sinon l'image ne correspond à aucun commit.
if [[ -n "$(git status --porcelain)" ]]; then
  err "Arbre de travail non propre. Committer ou remiser avant de construire une release."
  git status --short >&2
  exit 3
fi
COMMIT="$(git rev-parse --short HEAD)"

log "Dépôt   : $BASE"
log "Version : $VERSION  (commit $COMMIT)"

# ── Construction ────────────────────────────────────────────────────────────
# DATABASE_URL factice : le `postinstall`/`prisma generate` du build en a besoin comme chaîne,
# il ne s'y connecte jamais (aucune migration au build).
log "Construction de l'image…"
DOCKER_BUILDKIT=1 docker build \
  --build-arg DATABASE_URL='mysql://build:build@localhost:3306/build' \
  -t "${BASE}:${VERSION}" \
  -t "${BASE}:latest" \
  .

# ── Push ────────────────────────────────────────────────────────────────────
# Échec fréquent : pas authentifié auprès de GHCR. On le dit clairement plutôt que de laisser
# `docker push` cracher une 401 obscure.
log "Envoi vers GHCR…"
if ! docker push "${BASE}:${VERSION}"; then
  err "Push refusé. Authentifié auprès de GHCR ?
      echo \$GHCR_TOKEN | docker login ghcr.io -u <utilisateur> --password-stdin
      (le jeton doit avoir le scope write:packages)"
  exit 4
fi
docker push "${BASE}:latest"

# ── Référence par empreinte ─────────────────────────────────────────────────
# `RepoDigests` n'est renseigné qu'APRÈS un push réussi. On extrait l'empreinte de CETTE image.
DIGEST="$(docker inspect --format '{{index .RepoDigests 0}}' "${BASE}:${VERSION}" 2>/dev/null || true)"
if [[ -z "$DIGEST" ]]; then
  err "Empreinte introuvable après le push (RepoDigests vide) — vérifier que le push a abouti."
  exit 4
fi

log "Image poussée. À DÉPLOYER (par empreinte, sur le serveur) :"
printf '\n    GUICHET_IMAGE=%s \\\n      ./scripts/deploy/deploy.sh\n\n' "$DIGEST"
# Dernière ligne = l'empreinte seule, pour capture par un script appelant (`REF=$(build-push.sh …)`).
echo "$DIGEST"
