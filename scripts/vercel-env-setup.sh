#!/bin/bash
# Injection des variables d'environnement sur Vercel.
#
# ⚠️ GUIC-625 — SÉCURITÉ. Ce script contenait AUPARAVANT les valeurs des secrets EN CLAIR
# (SESSION_SECRET, SSO_CLIENT_SECRET, mots de passe Redis Cloud et MariaDB), et il était suivi
# par git depuis le 2026-05-07. Toute personne ayant cloné le dépôt les a dans son historique.
#
# Ces secrets sont désormais COMPROMIS et DOIVENT être rotés (cf. le commit qui accompagne ce
# fichier). Le script ne porte plus aucune valeur : il LIT un fichier hors dépôt.
#
# Usage :
#   1. copier scripts/vercel-env-setup.env.example → un fichier HORS du dépôt, ex. ~/.guichet.env
#   2. y renseigner les valeurs (secrets ROTÉS, jamais les anciens)
#   3. VERCEL_ENV_FILE=~/.guichet.env bash scripts/vercel-env-setup.sh
#
# Prérequis : `vercel login`.
set -euo pipefail

ENV="${VERCEL_TARGET_ENV:-production}"
ENV_FILE="${VERCEL_ENV_FILE:-}"

if [[ -z "$ENV_FILE" ]]; then
  echo "✗ VERCEL_ENV_FILE non défini." >&2
  echo "  Ce script ne contient AUCUN secret (GUIC-625). Fournir un fichier hors dépôt :" >&2
  echo "    cp scripts/vercel-env-setup.env.example ~/.guichet.env   # puis remplir" >&2
  echo "    VERCEL_ENV_FILE=~/.guichet.env bash scripts/vercel-env-setup.sh" >&2
  exit 2
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ Fichier introuvable : $ENV_FILE" >&2
  exit 2
fi

# Refus de lire un fichier laissé lisible par tous : un fichier de secrets se protège.
perms="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || stat -f '%OLp' "$ENV_FILE" 2>/dev/null || echo '?')"
if [[ "$perms" != "600" && "$perms" != "400" ]]; then
  echo "✗ Permissions $perms sur $ENV_FILE — attendu 600. Corriger : chmod 600 $ENV_FILE" >&2
  exit 2
fi

echo "=== Injection des variables Vercel ($ENV) depuis $ENV_FILE ==="

# Lit KEY=VALUE ligne par ligne, ignore commentaires et lignes vides. La valeur n'est jamais
# imprimée — seul le nom de la clé l'est.
injecte=0
while IFS='=' read -r key val; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  # Retire d'éventuels guillemets encadrants.
  val="${val%\"}"; val="${val#\"}"
  printf '%s' "$val" | vercel env add "$key" "$ENV" --force >/dev/null
  echo "  ✓ $key"
  injecte=$((injecte + 1))
done < "$ENV_FILE"

echo "=== $injecte variable(s) injectée(s) ==="
echo "Vérifier puis déployer : vercel --prod"
