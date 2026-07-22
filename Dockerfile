FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Dépendances
FROM base AS deps
COPY package.json package-lock.json* ./
# Le postinstall de @prisma/client lance `prisma generate` → il lui faut le schéma.
COPY prisma ./prisma
RUN npm ci

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# next build dépasse la heap Node par défaut (~2 Go) → OOM. On l'élargit (Docker a 8 Go).
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# Runner
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public                       ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder /app/prisma                       ./prisma
# GUIC-637 — node_modules COMPLET, APRÈS la standalone (dont le node_modules tracé, 22 paquets,
# est un sous-ensemble). Le runtime fonctionne avec le sur-ensemble ; surtout, le CLI Prisma et
# TOUTE sa chaîne de dépendances (`prisma/config` → `@prisma/config` → `effect` …) sont présents
# pour `migrate deploy`. Copier prisma seul échouait sur ces deps transitives (whack-a-mole).
# Coût : image plus lourde. Suivi GUIC-638 pour un stage `migrator` dédié qui garderait le
# runtime slim — hors périmètre du déblocage go-live.
COPY --from=deps /app/node_modules                    ./node_modules
# GUIC-637 — Migrations dans ce conteneur (deploy.sh : `prisma migrate deploy`).
#
# Trouvé par la répétition locale de deploy.sh de bout en bout — la migration échouait, APRÈS la
# sauvegarde et avant la bascule, pour DEUX raisons cumulées que le build standalone masquait :
#   1. prisma.config.ts absent → « The datasource.url property is required » (Prisma 7 lit l'URL
#      là, le schéma ne porte que `provider = "mysql"`) ;
#   2. le package `prisma` élagué du build standalone → `prisma.config.ts` importe `prisma/config`,
#      introuvable → « Cannot find module 'prisma/config' ».
#
# On rétablit donc le fichier de config ET le CLI Prisma. Coût assumé (~200 Mo) : c'est le prix
# d'un déploiement qui migre sa propre base de façon reproductible, sans `npx` qui re-télécharge
# une version dérivée à chaque déploiement. La sentinelle tests/integration/deploy-scripts.test.ts
# et la répétition couvrent ce chemin.
COPY --from=builder /app/prisma.config.ts             ./prisma.config.ts

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
