#!/usr/bin/env bash
# GUIC-621 — Preflight de déploiement : vérifie les FAITS contre le serveur réel.
#
# Pourquoi ce script existe
# -------------------------
# Les valeurs d'infra (endpoint MinIO, préfixe ACL Redis, joignabilité de MariaDB) sont DÉJÀ des
# variables : S3_ENDPOINT, REDIS_KEY_PREFIX, SERVICES_NETWORK. Ce qui manquait n'était pas le
# mécanisme, c'était la VALEUR — et variabiliser une valeur inconnue ne supprime pas la
# dépendance : elle la déplace de « on ne peut pas écrire la config » vers « l'app tourne avec une
# mauvaise valeur ». Or ces échecs-là sont SILENCIEUX (un refus d'ACL Redis ne déclenche aucune
# alerte : le rate-limiting est mort et le service a l'air sain).
#
# On ne peut pas inventer les valeurs. On peut écrire ce qui les DÉCOUVRE, et refuser bruyamment.
# Même principe que src/lib/security/prod-guards.ts : mieux vaut un refus franc qu'un démarrage
# silencieux avec la porte ouverte.
#
# Où il tourne
# ------------
# Chaque sonde s'exécute DANS UN CONTENEUR sur le réseau partagé (avec host-gateway), jamais
# depuis l'hôte : ce n'est pas la même perspective réseau. C'est le motif déjà éprouvé par
# `backup_db` dans deploy.sh — l'app voit `host.docker.internal`, l'hôte non.
#
# Usage
# -----
#   ./scripts/deploy/preflight.sh          # seul (diagnostic — répond aux 3 inconnues d'infra)
#   appelé automatiquement par deploy.sh, EN PREMIER, avant tout effet de bord.
#
# Il n'y a VOLONTAIREMENT aucune variable d'échappement (pas de PREFLIGHT_SKIP) : on ne désarme
# pas un garde-fou. S'il refuse, c'est qu'il a trouvé quelque chose.
set -Eeuo pipefail

GUICHET_ENV_FILE="${GUICHET_ENV_FILE:-/etc/guichet/prod.env}"
SERVICES_NETWORK="${SERVICES_NETWORK:-cjs_services}"
MARIADB_IMAGE="${MARIADB_IMAGE:-mariadb:10.11}"
REDIS_IMAGE="${REDIS_IMAGE:-redis:7-alpine}"
CURL_IMAGE="${CURL_IMAGE:-curlimages/curl:latest}"

# Parseur DATABASE_URL partagé et testé (fournit parse_db_url).
# shellcheck source=../lib/db-url.sh
. "$(dirname "${BASH_SOURCE[0]}")/../lib/db-url.sh"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
ko()   { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; ECHECS=$((ECHECS + 1)); }
# GUIC-634 — AVERTISSEMENT : signale sans bloquer. Réservé à ce qui DÉGRADE sans casser, et à
# ce qui est légitimement absent au PREMIER déploiement (crontab, sauvegardes, observabilité).
# Bloquer là-dessus empêcherait un déploiement d'urgence — mais les taire les rendrait inutiles,
# d'où le décompte final, imprimé même quand tout le reste passe.
avert() { printf '  \033[33m!\033[0m %s\n' "$*"; AVERTS=$((AVERTS + 1)); }
info() { printf '\n\033[1m[preflight]\033[0m %s\n' "$*"; }

ECHECS=0
AVERTS=0

# Lit une variable dans le fichier de secrets. `|| true` : sous `set -e` + `pipefail`, un grep
# sans correspondance renverrait 1 et tuerait le script (piège déjà rencontré dans deploy.sh).
lire() {
  grep -E "^$1=" "$GUICHET_ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true
}

dans_conteneur() {
  docker run --rm --network "$SERVICES_NETWORK" --add-host host.docker.internal:host-gateway "$@"
}

# ── 1. Fichier de secrets ───────────────────────────────────────────────────
verifier_fichier() {
  info "Fichier de secrets"
  if [[ ! -f "$GUICHET_ENV_FILE" ]]; then
    ko "Fichier de secrets introuvable : $GUICHET_ENV_FILE"
    return 1   # inutile de continuer : tout le reste en dépend
  fi
  ok "présent : $GUICHET_ENV_FILE"

  # Les secrets ne se lisent pas par-dessus l'épaule : 600 attendu (rw pour le propriétaire seul).
  local perms
  perms="$(stat -c '%a' "$GUICHET_ENV_FILE" 2>/dev/null || stat -f '%OLp' "$GUICHET_ENV_FILE" 2>/dev/null || echo '?')"
  if [[ "$perms" != "600" ]]; then
    ko "Permissions $perms sur $GUICHET_ENV_FILE — attendu 600 (fuite de secrets). Corriger : chmod 600 $GUICHET_ENV_FILE"
  else
    ok "permissions 600"
  fi
}

# ── 2. Variables requises ───────────────────────────────────────────────────
verifier_variables() {
  info "Variables requises"
  local manquantes=()
  local v
  for v in DATABASE_URL REDIS_URL S3_ENDPOINT S3_BUCKET NEXTAUTH_URL; do
    [[ -z "$(lire "$v")" ]] && manquantes+=("$v")
  done
  # Les clés S3 acceptent deux nommages (GUIC-565) : l'infra fournit S3_ACCESS_KEY, le code lit
  # aussi S3_ACCESS_KEY_ID. Une seule des deux suffit.
  [[ -z "$(lire S3_ACCESS_KEY)" && -z "$(lire S3_ACCESS_KEY_ID)" ]]     && manquantes+=("S3_ACCESS_KEY")
  [[ -z "$(lire S3_SECRET_KEY)" && -z "$(lire S3_SECRET_ACCESS_KEY)" ]] && manquantes+=("S3_SECRET_KEY")

  if ((${#manquantes[@]} > 0)); then
    ko "Variables manquantes dans $GUICHET_ENV_FILE : ${manquantes[*]}"
  else
    ok "toutes présentes"
  fi
}

# ── 2 bis. SSO — sans lui, PERSONNE ne peut se connecter ────────────────────
# GUIC-634 — il n'y a AUCUN login local sur cette plateforme : le SSO est la seule porte
# d'entrée. `sso-client.ts` lit `SSO_BASE_URL!` et `SSO_CLIENT_ID!` avec l'assertion non-nulle,
# donc SANS validation : une variable absente ne lève pas au démarrage, elle produit une URL
# « undefined/oauth/token » au premier clic sur « Se connecter ».
#
# Constaté : ces deux variables sont VIDES dans .env.prod. Le déploiement passerait au vert et
# les 22 000 utilisateurs seraient devant une porte close, sans qu'aucune sonde ne le voie —
# /api/health ne teste que MariaDB et Redis.
verifier_sso() {
  info "SSO (seule porte d'entrée — aucun login local)"
  local manquantes=()
  local v
  for v in SSO_BASE_URL SSO_CLIENT_ID; do
    [[ -z "$(lire "$v")" ]] && manquantes+=("$v")
  done

  # La session est signée par SESSION_SECRET, avec NEXTAUTH_SECRET en repli (cf. src/lib/auth.ts).
  # L'une des deux suffit ; aucune des deux et l'application lève « SESSION_SECRET manquant ».
  if [[ -z "$(lire SESSION_SECRET)" && -z "$(lire NEXTAUTH_SECRET)" ]]; then
    manquantes+=("SESSION_SECRET (ou NEXTAUTH_SECRET)")
  fi

  if ((${#manquantes[@]} > 0)); then
    ko "SSO inutilisable — manquant : ${manquantes[*]}
      Sans SSO_BASE_URL/SSO_CLIENT_ID, l'URL d'autorisation devient « undefined/oauth/token » :
      AUCUN utilisateur ne peut se connecter, et /api/health n'en verra rien."
  else
    ok "SSO configuré"
  fi

  # HMAC sortant vers le SSO : dégradation, pas panne totale — d'où un avertissement.
  if [[ -z "$(lire SSO_API_KEY)" || -z "$(lire SSO_API_SECRET)" ]]; then
    avert "SSO_API_KEY / SSO_API_SECRET absentes : les appels machine signés vers le SSO échoueront (le login interactif, lui, fonctionnera)."
  fi
}

# ── 2 ter. WhatsApp — une configuration PARTIELLE est le cas dangereux ──────
# GUIC-634 — `WHATSAPP_APP_SECRET` est absente de .env.example, .env.prod et de toute la doc.
# Le code la lit en fail-closed : sans elle, la vérification de signature refuse chaque webhook.
# Meta retente, puis DÉSACTIVE l'abonnement. Tout le canal entrant meurt en silence.
#
# On ne l'exige pas inconditionnellement : WhatsApp peut légitimement être désactivé. Mais une
# configuration PARTIELLE est pire que pas de configuration — l'envoi marche, la réception non,
# et on croit le canal opérationnel.
verifier_whatsapp() {
  info "WhatsApp (cohérence de la configuration)"
  local presentes=() manquantes=()
  local v
  for v in WHATSAPP_TOKEN WHATSAPP_PHONE_NUMBER_ID WHATSAPP_APP_SECRET WHATSAPP_VERIFY_TOKEN; do
    if [[ -n "$(lire "$v")" ]]; then presentes+=("$v"); else manquantes+=("$v"); fi
  done

  if ((${#presentes[@]} == 0)); then
    ok "WhatsApp non configuré (canal désactivé — délibéré)"
    return 0
  fi
  if ((${#manquantes[@]} == 0)); then
    ok "WhatsApp complet"
    return 0
  fi

  ko "Configuration WhatsApp PARTIELLE — manquant : ${manquantes[*]}
      Le danger est là : l'envoi fonctionne, la RÉCEPTION non. Sans WHATSAPP_APP_SECRET, la
      vérification de signature refuse chaque webhook entrant ; Meta retente puis DÉSACTIVE
      l'abonnement. Le canal meurt en silence, et on le croit opérationnel.
      Soit compléter la configuration, soit la retirer entièrement."
}

# ── 3. Garde dev-login (miroir de src/lib/security/prod-guards.ts) ──────────
# `/api/dev/login` pose une session SANS SSO. L'app refuse déjà de démarrer dans ce cas ; on le
# dit ICI, avant la sauvegarde et la migration, plutôt que de le découvrir après la bascule.
verifier_dev_login() {
  info "Garde dev-login (connexion sans SSO)"
  local app_env allow url hote
  app_env="$(lire APP_ENV)"; allow="$(lire ALLOW_DEV_LOGIN)"; url="$(lire NEXTAUTH_URL)"

  if [[ "$app_env" != "local" || "$allow" != "true" ]]; then
    ok "connexion sans SSO désactivée"
    return 0
  fi

  hote="$(printf '%s' "$url" | sed -E 's#^[a-z]+://##; s#[:/].*$##')"
  case "$hote" in
    localhost|127.0.0.1|0.0.0.0|host.docker.internal|'[::1]')
      ok "connexion sans SSO activable, mais l'URL publique est locale ($hote) — toléré" ;;
    *)
      ko "REFUS : connexion sans SSO (/api/dev/login) activable (APP_ENV=local, ALLOW_DEV_LOGIN=true) alors que NEXTAUTH_URL « $url » n'est PAS locale. Retirer ces deux variables. L'application refuserait de démarrer (prod-guards)." ;;
  esac
}

# ── 4. MariaDB, depuis un conteneur ─────────────────────────────────────────
verifier_mariadb() {
  info "MariaDB (depuis un conteneur, comme l'application)"
  local url
  url="$(lire DATABASE_URL)"
  [[ -z "$url" ]] && { ko "DATABASE_URL absent — sonde MariaDB impossible"; return 0; }

  parse_db_url "$url"
  if dans_conteneur -e MYSQL_PWD="$DB_PASS" "$MARIADB_IMAGE" \
      mariadb -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1; then
    ok "joignable : $DB_HOST:$DB_PORT (base $DB_NAME)"
  else
    ko "MariaDB INJOIGNABLE depuis un conteneur du réseau « $SERVICES_NETWORK » ($DB_HOST:$DB_PORT).
      Ce n'est pas variabilisable : vérifier côté serveur
        1. bind-address de MariaDB (Plesk) — doit écouter sur une interface joignable depuis le bridge Docker ;
        2. le GRANT de l'utilisateur « $DB_USER » pour l'hôte d'où vient le conteneur ;
        3. le pare-feu entre le bridge Docker et l'hôte."
  fi
}

# ── 5. Redis : le refus d'ACL est SILENCIEUX en prod (constat B5) ───────────
verifier_redis() {
  info "Redis (écriture réelle sous le préfixe ACL)"
  local url prefixe sortie cle
  url="$(lire REDIS_URL)"
  [[ -z "$url" ]] && { ko "REDIS_URL absent — sonde Redis impossible"; return 0; }

  # Doit correspondre au défaut du code (src/lib/redis.ts:26) : une divergence ici serait un
  # faux-vert — le preflight testerait un préfixe que l'app n'utilise pas.
  prefixe="${REDIS_KEY_PREFIX:-$(lire REDIS_KEY_PREFIX)}"
  prefixe="${prefixe:-guichet:}"
  cle="${prefixe}preflight"

  sortie="$(dans_conteneur "$REDIS_IMAGE" redis-cli -u "$url" set "$cle" ok EX 60 2>&1 || true)"
  case "$sortie" in
    *NOPERM*)
      ko "Redis REFUSE l'écriture sur « $cle » (NOPERM) — l'utilisateur ACL n'a pas ce préfixe.
      C'est le piège silencieux (constat B5) : en production, rate-limiting et idempotence des
      webhooks meurent SANS aucune alerte. Demander le motif exact au lead :
        ACL GETUSER <utilisateur>   → ligne « keys »
      puis aligner REDIS_KEY_PREFIX (aucune modification de code : src/lib/redis.ts:26)." ;;
    *OK*)
      ok "écriture acceptée sous « $prefixe »" ;;
    *)
      ko "Redis injoignable ou réponse inattendue : ${sortie:-<vide>}" ;;
  esac
}

# ── 6. S3/MinIO : les deux pièges déjà rencontrés ───────────────────────────
verifier_s3() {
  info "S3 / MinIO (l'endpoint parle-t-il vraiment S3 ?)"
  local endpoint corps
  endpoint="$(lire S3_ENDPOINT)"
  [[ -z "$endpoint" ]] && { ko "S3_ENDPOINT absent — sonde S3 impossible"; return 0; }

  # GET non signé : l'API S3 répond en XML (403 AccessDenied) ; la console web répond en HTML.
  # Aucun secret n'est nécessaire pour faire cette distinction — c'est le point.
  corps="$(dans_conteneur "$CURL_IMAGE" -s --max-time 10 "$endpoint/" 2>&1 || true)"

  case "$corps" in
    *'invalid hostname'*|*'InvalidRequest'*)
      # GUIC-620 — prouvé en local : MinIO rejette tout Host contenant un underscore.
      ko "MinIO REFUSE ce nom d'hôte : « $endpoint ».
      Cause quasi certaine : un UNDERSCORE dans le nom d'hôte (invalide, RFC 1123 — MinIO
      l'applique strictement et renvoie 400 « invalid hostname »). La convention de nommage des
      conteneurs CJS utilise l'underscore (redis_cjs).
      Correctif NON destructif — poser un alias réseau sans underscore :
        docker network connect --alias minio $SERVICES_NETWORK <conteneur-minio>
      puis S3_ENDPOINT=http://minio:9000   (cf. GUIC-620)" ;;
    *'<!DOCTYPE html'*|*'<html'*)
      ko "« $endpoint » sert la CONSOLE WEB (HTML), pas l'API S3.
      Déjà rencontré sur https://store.consortiumjeunessesenegal.org. L'API S3 est un AUTRE port
      (9000 par défaut ; la console est en 9001). Demander au lead le nom du conteneur MinIO :
        S3_ENDPOINT=http://<conteneur>:9000" ;;
    *AccessDenied*|*'<Error>'*|*'<?xml'*)
      ok "API S3 active sur $endpoint (403/XML attendu sans signature)" ;;
    '')
      ko "Aucune réponse de « $endpoint » — service arrêté, mauvais nom d'hôte, ou hors du réseau « $SERVICES_NETWORK »." ;;
    *)
      # Sûr par défaut : une réponse qu'on ne sait pas interpréter n'est pas une réponse saine.
      ko "Réponse inattendue de « $endpoint » (ni XML S3, ni HTML de console) : $(printf '%s' "$corps" | head -c 120)" ;;
  esac
}

# ── 7. Chaîne d'exploitation — AVERTISSEMENTS, jamais bloquants ─────────────
#
# GUIC-634 — ces contrôles couvrent ce qui s'oublie le plus facilement parce que ça se
# configure AILLEURS que dans le dépôt : Plesk, la crontab système, le DNS. Aucun ne casse
# l'application — d'où l'avertissement plutôt que le refus. Bloquer un déploiement d'urgence
# parce que Grafana est arrêté serait absurde.
#
# Mais ce sont précisément les oublis les plus COÛTEUX, parce qu'ils sont silencieux : une
# sauvegarde qui ne tourne plus, un SPF absent qui envoie toutes les alertes en spam, un
# `X-Request-Id` manquant qui rend les logs incorrélables le jour d'un incident.

# Le proxy pose-t-il bien X-Request-Id ? Sans lui, les logs de l'app et ceux de nginx ne se
# recoupent plus — c'est toute la valeur de GUIC-544 qui tombe, sans le moindre symptôme.
verifier_proxy() {
  info "Reverse proxy — corrélation des logs"
  local url entete
  url="$(lire NEXTAUTH_URL)"
  [[ -z "$url" ]] && { avert "NEXTAUTH_URL absente : impossible de vérifier le proxy."; return 0; }

  entete="$(dans_conteneur "$CURL_IMAGE" -s --max-time 10 -o /dev/null -D - "$url/api/health" 2>/dev/null | grep -i '^x-request-id:' || true)"
  if [[ -n "$entete" ]]; then
    ok "X-Request-Id présent dans la réponse"
  else
    avert "Aucun X-Request-Id sur $url/api/health.
      Les logs de l'application et ceux du proxy ne se recouperont pas — la question « que
      s'est-il passé pour cette requête ? » restera sans réponse le jour d'un incident.
      Corriger : docs/observabilite.md §6 (log_format en contexte http + proxy_set_header
      dans les directives nginx additionnelles de Plesk)."
  fi
}

# Les tâches planifiées vivent dans la crontab SYSTÈME, hors du dépôt : rien dans le code ne
# révèle leur absence. Or l'une d'elles est la purge des CV, qui porte la rétention CDP.
verifier_crontab() {
  info "Tâches planifiées et sauvegardes (crontab système)"
  local lignes
  # Commande injectable : sans ça, ce contrôle interroge la vraie machine et le test devient
  # dépendant de l'environnement — le défaut même qu'on traque ailleurs.
  lignes="$(${CRONTAB_CMD:-crontab -l} 2>/dev/null | grep -c 'GUICHET-' || true)"
  if [[ "${lignes:-0}" -gt 0 ]]; then
    ok "$lignes tâche(s) GUICHET- installée(s)"
  else
    avert "Aucune tâche GUICHET- dans la crontab de $(whoami).
      Conséquences silencieuses : plus de sauvegarde, et surtout plus de PURGE DES CV — donc
      un manquement à la rétention CDP que rien ne signalerait.
      Installer : scripts/cron/generate-crontab.sh et scripts/backup/README.md
      (NB : la crontab est par utilisateur — vérifier sous quel compte tournent les tâches.)"
  fi

  # Une sauvegarde qui ne PLANTE pas mais ne TOURNE PLUS est la panne la plus dangereuse du
  # système : rien n'échoue, donc rien n'alerte, et on le découvre le jour où il faut restaurer.
  local recent
  # BACKUP_DIR est déjà surchargeable (cf. deploy.sh) : le test peut donc pointer un dossier
  # qu'il contrôle, au lieu de dépendre de /var/backups de la machine hôte.
  recent="$(find "${BACKUP_DIR:-/var/backups/guichet}" -maxdepth 1 -name '*.sql.gz' -mtime -2 2>/dev/null | head -1 || true)"
  if [[ -n "$recent" ]]; then
    ok "sauvegarde de moins de 48 h présente"
  else
    avert "Aucune sauvegarde de moins de 48 h dans ${BACKUP_DIR:-/var/backups/guichet}.
      Soit la tâche ne tourne plus, soit c'est le premier déploiement. Le déploiement en créera
      une avant de migrer — mais l'absence de sauvegardes PLANIFIÉES reste un risque à part."
  fi
}

# SPF, DKIM et DMARC se configurent dans le DNS — nulle part dans le dépôt. Sans eux,
# l'application fonctionne parfaitement et personne ne reçoit rien.
verifier_dns_mail() {
  info "Délivrabilité des e-mails (SPF / DMARC)"
  local domaine url
  url="$(lire NEXTAUTH_URL)"
  domaine="$(printf '%s' "$url" | sed -E 's#^[a-z]+://##; s#[:/].*$##; s#^[^.]+\.##')"
  [[ -z "$domaine" ]] && { avert "Domaine indéterminable depuis NEXTAUTH_URL."; return 0; }

  # ⚠️ DISTINGUER « absent » de « pas pu vérifier ». Une première version confondait les deux :
  # sans accès réseau sortant, la requête échouait et le script CONCLUAIT à l'absence de SPF.
  # J'ai ainsi annoncé une découverte fausse — le domaine porte bien SPF et DMARC (p=reject).
  # Une alerte qui crie au loup finit par ne plus être lue : on préfère dire « indéterminé ».
  local reponse
  interroger_dns() {
    reponse="$(dans_conteneur "$CURL_IMAGE" -s --max-time 10 "https://dns.google/resolve?name=$1&type=TXT" 2>/dev/null || true)"
    # Une réponse DoH valide contient toujours "Status" ; son absence = requête ratée.
    printf '%s' "$reponse" | grep -q '"Status"'
  }

  if interroger_dns "$domaine"; then
    printf '%s' "$reponse" | grep -q 'v=spf1' \
      && ok "SPF présent sur $domaine" \
      || avert "Aucun SPF sur $domaine — les e-mails (notifications, alertes d'astreinte) partiront en SPAM. Cf. GUIC-577."
  else
    avert "SPF sur $domaine : INDÉTERMINÉ (résolveur DNS injoignable depuis le conteneur). Ce n'est PAS une absence — vérifier manuellement : dig TXT $domaine"
  fi

  if interroger_dns "_dmarc.$domaine"; then
    printf '%s' "$reponse" | grep -q 'v=DMARC1' \
      && ok "DMARC présent sur $domaine" \
      || avert "Aucun DMARC sur _dmarc.$domaine. Cf. GUIC-577."
  else
    avert "DMARC sur $domaine : INDÉTERMINÉ (résolveur DNS injoignable). Vérifier : dig TXT _dmarc.$domaine"
  fi
}

# La supervision ne se voit pas depuis l'application : si Loki est arrêté, les logs partent
# dans le vide et personne ne s'en aperçoit avant d'en avoir besoin.
verifier_observabilite() {
  info "Pile d'observabilité (Loki)"
  local reponse
  reponse="$(dans_conteneur "${OBSERVABILITE_NETWORK:+--network=$OBSERVABILITE_NETWORK}" "$CURL_IMAGE" -s --max-time 5 "${LOKI_URL:-http://loki:3100}/ready" 2>/dev/null || true)"
  if printf '%s' "$reponse" | grep -qi 'ready'; then
    ok "Loki prêt"
  else
    avert "Loki injoignable (${LOKI_URL:-http://loki:3100}).
      Les logs ne sont plus agrégés : plus de recherche par requestId, et les alertes
      Grafana (GUIC-576) ne se déclencheront pas. Démarrer :
      docker compose -f docker-compose.observabilite.yml up -d"
  fi
}

main() {
  info "Vérification de la configuration de déploiement — $GUICHET_ENV_FILE"

  verifier_fichier || { printf '\n\033[1;31m[preflight] REFUS\033[0m — fichier de secrets absent.\n' >&2; exit 2; }
  verifier_variables
  verifier_sso
  verifier_whatsapp
  verifier_dev_login
  verifier_mariadb
  verifier_redis
  verifier_s3
  verifier_proxy
  verifier_crontab
  verifier_dns_mail
  verifier_observabilite

  if ((ECHECS > 0)); then
    printf '\n\033[1;31m[preflight] REFUS : %d contrôle(s) en échec.\033[0m Le déploiement est interrompu AVANT tout effet de bord.\n' "$ECHECS" >&2
    printf 'Aucune sauvegarde, aucune migration, aucune bascule n%s ont été tentées.\n' "'" >&2
    exit 1
  fi

  if ((AVERTS > 0)); then
    printf '\n\033[1;32m[preflight] preflight OK\033[0m — aucun blocage, mais \033[33m%d avertissement(s)\033[0m à traiter.\n' "$AVERTS"
    printf 'Ils ne cassent rien aujourd hui ; ce sont les oublis SILENCIEUX de demain.\n'
  else
    printf '\n\033[1;32m[preflight] preflight OK\033[0m — tous les contrôles passent.\n'
  fi
}

main "$@"
