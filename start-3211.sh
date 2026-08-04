#!/usr/bin/env bash
# Serveur de test design v5 sur le port 3211, branché sur le SSO CJS local
# (cjs_app, port 80). Le port 3000 est laissé à la session refonte admin.
#
# .env.local fournit déjà SSO_BASE_URL / SSO_CLIENT_ID / SSO_CLIENT_SECRET.
# Seul NEXTAUTH_URL doit pointer sur ce port : `src/lib/sso-client.ts` en dérive
# la redirect_uri (`${NEXTAUTH_URL}/auth/callback`), qui doit correspondre à une
# URI enregistrée sur le client OAuth 42.
set -euo pipefail
cd "$(dirname "$0")"

export NEXTAUTH_URL="http://localhost:3211"
export PORT=3211
export APP_ENV=local
export ALLOW_DEV_LOGIN=true

# `/jeune/ma-carte` refuse de signer le QR sans secret dédié — comportement
# voulu : le code ne retombe jamais sur une valeur par défaut. Le secret est lu
# de l'environnement ou de `.env.local`, jamais écrit ici (fichier suivi par git,
# cf. la sentinelle `tests/unit/pas-de-secret-en-dur.test.ts`).
if [ -z "${JWT_CJS_CARD_SECRET:-}" ] && [ -f .env.local ]; then
  ligne=$(grep -m1 '^JWT_CJS_CARD_SECRET=' .env.local || true)
  [ -n "$ligne" ] && export JWT_CJS_CARD_SECRET="${ligne#*=}"
fi
if [ -z "${JWT_CJS_CARD_SECRET:-}" ]; then
  echo "⚠  JWT_CJS_CARD_SECRET absent : /jeune/ma-carte renverra une erreur de QR." >&2
  echo "   Renseignez-le dans .env.local ou exportez-le avant de lancer ce script." >&2
fi

exec npm run start
