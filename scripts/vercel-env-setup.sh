#!/bin/bash
# Script pour injecter les variables d'environnement sur Vercel
# Usage : bash scripts/vercel-env-setup.sh
# Nécessite : vercel login préalable

set -e

ENV="production"

add() {
  local key=$1
  local val=$2
  echo "$val" | vercel env add "$key" "$ENV" --force
  echo "✓ $key"
}

echo "=== Injection des variables Vercel ($ENV) ==="

add DATABASE_URL        "mysql://test_guichet:0C%5Ee3CsCiy%3Fwss4f@localhost:3306/dev_guichet"
add REDIS_URL           "redis://:HOzzsr33HhSzbzhGRm089DoLNoP2bxSw@redis-10691.crce282.eu-west-3-1.ec2.cloud.redislabs.com:10691/0"
add SESSION_SECRET      "pSpYyAlE1Y6VFm/tDkI6lUzlPgxHCn+bijibXMP0e3g="
add NEXTAUTH_SECRET     "pSpYyAlE1Y6VFm/tDkI6lUzlPgxHCn+bijibXMP0e3g="
add NEXTAUTH_URL        "https://devguichet.consortiumjeunessesenegal.org"
add SSO_BASE_URL        "https://auth.consortiumjeunessesenegal.org"
add SSO_CLIENT_ID       "2"
add SSO_CLIENT_SECRET   "lbZbb9n6Is6vJEXcOimXfjoCs9haWmbaExjccwReHsGbiveV7Wy32l6xJghEJxAz"
add SSO_API_KEY         "cjs_5ItUvDJssyeMZ40fifypuX9eGp7UtxE1"
add NODE_ENV            "production"
add NEXT_PUBLIC_APP_URL "https://devguichet.consortiumjeunessesenegal.org"

echo ""
echo "=== Toutes les variables sont configurées ==="
echo "Lance maintenant : vercel --prod"
