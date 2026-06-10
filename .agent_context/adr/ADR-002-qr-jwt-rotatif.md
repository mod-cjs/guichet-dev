# ADR-002 — QR carte CJS : JWT HS256 rotatif 15 min

**Date** : 2026-06-09
**Statut** : Accepté (verrouille spec M4-centres-lot7.md §4.1)
**Décideurs** : PO 2026-06-09

## Contexte

La carte CJS (vue `card` du Lot 7) embarque un QR code utilisé par le personnel des centres pour identifier le porteur et déclencher un check-in (KPI fréquentation principal).

3 options évaluées :
- **(a)** QR statique avec `cjsUid` en clair → copiable trivialement
- **(b)** QR avec token JWT HS256 rotatif courte durée (15 min)
- **(c)** Hybride QR statique + révocation côté scanner

## Décision

**Option (b) — JWT HS256 rotatif 15 min.**

### Format

```
QR encode → https://guichetjeunesse.sn/checkin/v1/<jwt>
```

### Payload JWT

```jsonc
{
  "alg": "HS256",
  "kid": "cjs-checkin-v1"
}
{
  "sub":   "<cjsUid>",            // identifiant porteur
  "iat":   1717920000,            // unix timestamp émission
  "exp":   1717920900,            // iat + 900 secondes
  "scope": "checkin"              // limite usage à l'endpoint check-in
}
```

### Secret

- Variable env `CJS_CHECKIN_SECRET` (32 bytes random hex)
- Généré via `openssl rand -hex 32`
- Stocké uniquement côté serveur Vercel (jamais NEXT_PUBLIC)
- **Documenté** : `docs/lot7-env-vars.md` (W6)

### Endpoints

- **Génération** `GET /api/cjs-card/qr-token`
  - Auth requise (`getSession()`)
  - Rate-limit 10/min par cjsUid (anti-spam)
  - Réponse : `{ token, expiresAt }`
  - Côté client : auto-refresh toutes les 14 min via `setInterval`
- **Validation** `POST /api/v1/checkin/[token]`
  - Auth staff requise (rôle `conseiller` ou `admin_centre`)
  - Body : `{ centreId }`
  - Validation JWT (signature + exp + scope)
  - Anti-replay : Redis `SET NX checkin:processed:<jti>` TTL 1h
  - Crée `CheckIn(via='QrCard')` + event KPI `centre_checkin`

## Conséquences

### Positives
- ✅ Anti-spoof (signature HMAC)
- ✅ Anti-replay (exp court + Redis SET NX)
- ✅ Pas de PII en clair dans le QR
- ✅ Simple à implémenter (jose/jsonwebtoken lib)
- ✅ Pas de dépendance externe (clé privée locale)

### Négatives
- ❌ Connectivité requise côté carte (rafraîchir toutes les 14 min)
  - **Mitigation** : message UX "Connexion requise pour rafraîchir le QR"
- ❌ Promesse design "Hors-ligne" abandonnée
  - **Mitigation** : retirée des CTAs sur la vue `card` (cf §5 spec)

### Sécurité supplémentaire
- Rotation `kid` annuelle (rolling secret) si compromission suspectée
- Pour le scanner, vérification offline possible via clé publique (futur — HS256 → RS256 si scaling)

## Implémentation Wave 1 / Wave 6

- **W1** : composant `<QRBadge>` consomme `/api/cjs-card/qr-token` côté client, render via `qrcode` lib (génération SVG/canvas)
- **W6** : endpoints back, scanner web (`/checkin/v1/[token]` page), log KPI

## Alternatives rejetées

- **QR statique avec cjsUid en clair** : risque de fraude trivial (capture photo carte = accès illimité au centre). Inacceptable pour MVP.
- **QR statique signé long-terme + révocation scanner** : nécessite synchronisation continue scanner↔server, complexe.
- **TOTP-like (rotation 30s)** : trop court pour UX (le jeune doit re-scanner constamment).

## Liens

- Spec §4.1 (sécurité carte CJS)
- Tickets : GUIC-352 (W1 QRBadge), GUIC-357 (W6 endpoints)
- Secret env documenté dans `docs/lot7-env-vars.md` (W0 reporté W1)
