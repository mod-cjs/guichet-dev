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
# Sans ce secret, /jeune/ma-carte refuse de signer le QR (comportement voulu).
export JWT_CJS_CARD_SECRET="dev-local-secret-pour-tests-uniquement-32c"

exec npm run start
