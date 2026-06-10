# Lot 7 — Variables d'environnement Centres CJS

> Référence : `.agent_context/specs/M4-centres-lot7.md` · ADR-002 · ADR-004
>
> Toute variable doit être déclarée dans `.env.example` et documentée ici
> avant d'être référencée par le code.

---

## `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

**Usage** : Clé API Google Maps JavaScript utilisée par `<CentresMapGoogle>`
pour les vues `all` desktop / mobile et le mock landing mobile.

**Type** : `string` (clé publique, exposée côté client — préfixe `NEXT_PUBLIC_`
obligatoire pour bundle navigateur)

**Source** : Fournie par le PO le 2026-06-09. Stockée dans GCP Console
(projet : Guichet Jeunesse).

**Restrictions GCP obligatoires** (à appliquer avant déploiement) :
- **HTTP referrers** :
  - `*.guichetjeunesse.sn/*`
  - `*.vercel.app/*`
  - `localhost:3000/*` (dev)
- **APIs activées** : Maps JavaScript API uniquement
- **Quota free tier** : 28 000 chargements/mois

**Comportement si absente** :
- Console warn `[CentresMapGoogle] NEXT_PUBLIC_GOOGLE_MAPS_KEY manquante`
- Composant rend le fallback liste a11y + message "Carte indisponible"
- Pas de rupture de service — dégradation gracieuse

**Monitoring** :
- Alerte si quota mensuel > 80% (cf. ADR-004)
- Si erreur 403/quota → fallback `<SenegalMap>` SVG statique

---

## `CJS_CHECKIN_SECRET`

**Usage** : Secret HMAC HS256 utilisé pour signer les JWT rotatifs du QR de
check-in carte CJS (cf. ADR-002).

**Type** : `string` — 32 bytes en hex (64 caractères hex)

**Génération** :
```bash
openssl rand -hex 32
```

**Sécurité** :
- **Server-side uniquement** — JAMAIS de préfixe `NEXT_PUBLIC_`
- Stocké dans Vercel Environment Variables (Production + Preview)
- Jamais commité dans le repo (ni dans `.env.example`, mettre un placeholder)
- Rotation `kid` annuelle recommandée si compromission suspectée

**Utilisé par** :
- `GET /api/cjs-card/qr-token` — génération JWT (auth requise, rate-limit 10/min)
- `POST /api/v1/checkin/[token]` — validation JWT côté scanner staff

**Payload JWT signé** :
```jsonc
// Header
{ "alg": "HS256", "kid": "cjs-checkin-v1" }
// Body
{ "sub": "<cjsUid>", "iat": 1717920000, "exp": 1717920900, "scope": "checkin" }
```

**Anti-replay** : Redis `SET NX checkin:processed:<jti>` TTL 1h après usage.

---

## Récapitulatif `.env.example` à compléter

```dotenv
# Lot 7 — Centres CJS
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
CJS_CHECKIN_SECRET=
```
