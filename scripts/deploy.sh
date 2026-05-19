#!/usr/bin/env bash
# deploy.sh — Déploiement Guichet Jeunesse sur Plesk (Node.js + PM2)
# Usage : bash scripts/deploy.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "▶ [1/5] Installation des dépendances..."
npm ci --include=dev

echo "▶ [2/5] Génération Prisma + migrations..."
npx prisma generate
npx prisma migrate deploy

echo "▶ [3/5] Build Next.js standalone..."
npm run build

echo "▶ [4/5] Copie du .env vers le standalone..."
if [ -f .env.prod ]; then
  cp .env.prod .next/standalone/.env
elif [ -f .env ]; then
  cp .env .next/standalone/.env
else
  echo "⚠ Aucun fichier .env trouvé — assurez-vous que les variables sont injectées par Plesk."
fi

echo "▶ [5/5] Redémarrage PM2..."
if pm2 describe guichet-jeunesse > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
  pm2 save
fi

echo "✅ Déploiement terminé."
