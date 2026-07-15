#!/usr/bin/env bash
# GUIC-568/571 — Parseur DATABASE_URL partagé (deploy.sh, backup.sh, restore-drill.sh).
#
# Était dupliqué dans 3 scripts (dérive silencieuse possible) et avait déjà un vrai bug : un mot
# de passe contenant `@` ou `:` (fréquent) cassait l'extraction. Corrigé par une découpe au
# DERNIER `@` et au PREMIER `:`. Testé par tests/unit/db-url-parser.test.ts.
#
# Usage :
#   source "$(dirname "$0")/../lib/db-url.sh"
#   parse_db_url "mysql://user:pass@host:port/db"
#   # → variables : DB_USER DB_PASS DB_HOST DB_PORT DB_NAME
#
# NB : les caractères %-encodés ne sont pas décodés — stocker le mot de passe en clair dans
# DATABASE_URL (Prisma l'accepte).

parse_db_url() {
  local url="$1"
  local rest creds hostport
  rest="${url#mysql://}"
  creds="${rest%@*}"      # tout ce qui précède le DERNIER @ (mot de passe avec @ préservé)
  hostport="${rest##*@}"  # tout ce qui suit le dernier @
  DB_USER="${creds%%:*}"  # avant le PREMIER :
  DB_PASS="${creds#*:}"   # après le premier : (mot de passe avec : préservé)
  DB_NAME="${hostport##*/}"
  hostport="${hostport%%/*}"
  DB_HOST="${hostport%%:*}"
  DB_PORT="${hostport#*:}"
  [ "$DB_PORT" = "$DB_HOST" ] && DB_PORT=3306
}
