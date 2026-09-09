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
# prisma.config.ts (Prisma 7) exige DATABASE_URL au `generate`. VALEUR PAR DÉFAUT
# indispensable : le CD (docker/build-push-action) ne passe AUCUN build-arg → sans défaut,
# la chaîne serait vide et `prisma generate` échouerait. Chaîne factice — aucune connexion,
# aucune migration au build ; surchargeable via --build-arg pour un build manuel.
ARG DATABASE_URL=mysql://build:build@localhost:3306/build
ENV DATABASE_URL=${DATABASE_URL}
# `next build` collecte les données des routes → importe des modules dont les garde-fous
# d'env (Redis, secrets) throwent si absents. Valeurs FACTICES, stage builder UNIQUEMENT :
# elles ne franchissent pas la frontière multi-stage (le runner repart de `base`) et
# aucune n'est `NEXT_PUBLIC_*`, donc rien n'est inliné dans le bundle client. Les vraies
# valeurs viennent de --env-file au runtime.
ENV REDIS_URL=redis://localhost:6379 \
    SESSION_SECRET=build-only-not-a-secret \
    NEXTAUTH_SECRET=build-only-not-a-secret \
    NEXTAUTH_URL=http://localhost:3000 \
    JWT_CJS_CARD_SECRET=build-only \
    STAFF_SESSION_SECRET=build-only \
    SSO_BASE_URL=http://localhost \
    SSO_CLIENT_ID=build \
    CONSULTATION_HASH_KEY=build-only-not-a-secret
# GUIC-662 — Clé Google Maps : var `NEXT_PUBLIC_*` → INLINÉE dans le bundle client au `next build`.
# Contrairement aux factices ci-dessus, celle-ci DOIT recevoir la vraie valeur AU BUILD
# (--build-arg NEXT_PUBLIC_GOOGLE_MAPS_KEY=...) ; la mettre au runtime (env-file) n'a AUCUN effet.
# Vide par défaut → la carte retombe sur la liste a11y (le code gère l'absence). Restreins la clé
# par referer/domaine côté console GCP : une clé NEXT_PUBLIC_* est publique côté navigateur.
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY=
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_KEY}
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
