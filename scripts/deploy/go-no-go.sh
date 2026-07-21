#!/usr/bin/env bash
# GUIC-159 — Porte Go / No-Go avant mise en production.
#
# Pourquoi ce script existe
# -------------------------
# Le runbook porte une checklist Go/No-Go. Une checklist se COCHE — et à 3 h du matin, sous
# stress, on coche. Ce script en exécute la partie vérifiable et REFUSE quand elle échoue ; il ne
# demande à l'humain que ce qu'aucune commande ne peut savoir.
#
# La règle qui structure tout : si une machine peut le vérifier, elle le vérifie. On ne demande
# jamais à quelqu'un de confirmer un fait observable — c'est ainsi qu'une checklist devient
# décorative.
#
# Ce qu'il NE fait pas : déployer. Il répond à « peut-on y aller ? », rien d'autre.
#
# Usage
# -----
#   ./scripts/deploy/go-no-go.sh                 # interactif (avant une mise en prod)
#   ./scripts/deploy/go-no-go.sh --automatique   # contrôles machine seuls, sans question
#
# En mode --automatique, les points humains ne sont PAS supposés acquis : ils sont signalés comme
# non vérifiés et le script sort en code 3. Les taire reviendrait à les déclarer bons.
set -Eeuo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
AUTOMATIQUE=0
[[ "${1:-}" == "--automatique" ]] && AUTOMATIQUE=1

titre() { printf '\n\033[1m══ %s\033[0m\n' "$*"; }
ok()    { printf '  \033[32m✓\033[0m %s\n' "$*"; }
ko()    { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; BLOCAGES=$((BLOCAGES + 1)); }
note()  { printf '  \033[33m!\033[0m %s\n' "$*"; }

BLOCAGES=0
HUMAINS_NON_VERIFIES=0

# ── 1. Ce que la machine vérifie ────────────────────────────────────────────

controles_machine() {
  titre "Contrôles automatiques"

  # Le préflight couvre déjà l'infrastructure : secrets, SSO, WhatsApp, MariaDB, Redis, S3,
  # proxy, crontab, DNS, observabilité. On ne le réimplémente pas — on le lance.
  printf '\n  → préflight de déploiement\n'
  if "$ICI/preflight.sh"; then
    ok "préflight : aucun blocage"
  else
    ko "préflight en échec — voir ci-dessus. Rien ne part tant que ce n'est pas résolu."
  fi

  # Le cookie de session doit rester petit : c'est le problème rencontré sur le SSO derrière
  # Plesk (dépassement de la taille des en-têtes). Ici c'est une sentinelle, pas une surcharge
  # de buffers — on préfère apprendre qu'un cookie enfle plutôt que de masquer la dérive.
  printf '\n  → taille du cookie de session\n'
  if (cd "$RACINE" && npx jest tests/unit/session-taille-cookie.test.ts --no-coverage --silent >/dev/null 2>&1); then
    ok "cookie de session sous la limite, aucun token embarqué"
  else
    ko "le cookie de session a dépassé la limite ou embarque un token.
      C'est exactement ce qui a cassé le SSO derrière Plesk. NE PAS augmenter les buffers
      nginx : retirer la claim ajoutée. Détail : npx jest tests/unit/session-taille-cookie.test.ts"
  fi

  # Une sauvegarde jamais restaurée n'est pas une sauvegarde. Le runbook l'exige dans les 7 jours.
  printf '\n  → exercice de restauration récent\n'
  local drill
  drill="$(find "${BACKUP_DIR:-/var/backups/guichet}" -maxdepth 1 -name '.dernier-drill' -mtime -7 2>/dev/null | head -1 || true)"
  if [[ -n "$drill" ]]; then
    ok "restauration exercée il y a moins de 7 jours"
  else
    ko "aucun exercice de restauration depuis 7 jours (ou jamais).
      Lancer scripts/backup/restore-drill.sh. C'est une porte de sortie du runbook :
      sans restauration réussie au moins une fois, pas de go-live."
  fi
}

# ── 2. Ce qu'aucune machine ne peut savoir ──────────────────────────────────
#
# Trois questions seulement. Une liste plus longue serait cochée en bloc — et redeviendrait
# décorative, ce que ce script existe justement pour éviter.

demander() {
  local question="$1" aide="$2" reponse
  printf '\n  \033[1m%s\033[0m\n' "$question"
  printf '     %s\n' "$aide"
  read -r -p "     [o/N] " reponse
  [[ "$reponse" =~ ^[oOyY]$ ]]
}

controles_humains() {
  titre "Points humains — non vérifiables par une machine"

  if ((AUTOMATIQUE)); then
    note "mode --automatique : 3 points humains NON vérifiés (astreinte, fenêtre, contacts)."
    note "Ils ne sont pas supposés acquis. Relancer sans --automatique avant une vraie mise en prod."
    HUMAINS_NON_VERIFIES=3
    return 0
  fi

  demander "La personne d'astreinte est-elle joignable MAINTENANT ?" \
    "Pas « désignée » : joignable. Quelqu'un doit décrocher dans les 30 min qui suivent." \
    || ko "Astreinte injoignable — No-Go. Un incident sans personne pour y répondre est un incident plus long."

  demander "Sommes-nous hors pic d'usage, avec 30 min devant nous ?" \
    "Un rollback prend jusqu'à 15 min, et il faut ensuite constater que le service est revenu." \
    || ko "Fenêtre inadaptée — No-Go. Reporter coûte moins cher que déployer dans l'urgence."

  demander "Le tableau des contacts du runbook est-il rempli ?" \
    "docs/runbook-production.md §7. Il est vide par défaut, et marqué No-Go pour cette raison." \
    || ko "Contacts d'astreinte absents du runbook — No-Go. Un runbook sans contact joignable n'est pas un runbook."
}

# ── 3. Verdict ──────────────────────────────────────────────────────────────

main() {
  printf '\033[1m Go / No-Go — mise en production du Guichet\033[0m\n'
  controles_machine
  controles_humains

  titre "Verdict"
  if ((BLOCAGES > 0)); then
    printf '  \033[1;31mNO-GO\033[0m — %d point(s) bloquant(s).\n' "$BLOCAGES" >&2
    printf '  Rien n'"'"'a été déployé. Corriger, puis relancer ce script.\n' >&2
    exit 1
  fi
  if ((HUMAINS_NON_VERIFIES > 0)); then
    printf '  \033[1;33mINDÉTERMINÉ\033[0m — contrôles machine OK, mais %d point(s) humain(s) non vérifié(s).\n' "$HUMAINS_NON_VERIFIES"
    printf '  Relancer sans --automatique avant de déployer réellement.\n'
    exit 3
  fi
  printf '  \033[1;32mGO\033[0m — tous les contrôles passent.\n'
  printf '  Déployer : GUICHET_IMAGE=<image@sha256:…> ./scripts/deploy/deploy.sh\n'
}

main "$@"
