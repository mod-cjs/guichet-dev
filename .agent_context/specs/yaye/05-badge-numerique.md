# 05 — Badge numérique CJS

## Concept (selon la note)

Chaque personne disposant d'un `cjs_uid` a un badge numérique. C'est un **QR code** dont le payload encode :

```
cjs_uid + timestamp_unix + signature HMAC-SHA256   (générée par le serveur SSO)
```

- Se **rafraîchit à minuit** (rotation de signature).
- Un compte **suspendu** dans le SSO **invalide immédiatement** le badge — vérification en **temps réel à chaque scan**.
- 4 formats : QR animé (web), image QR + code 6 caractères (WhatsApp), PDF téléchargeable, code alphanumérique (fallback SMS Orange).

## Flux

```
1. Bénéficiaire demande son badge (web: profil · WA: "mon badge")
2. SSO Laravel génère le payload signé (cjs_uid + timestamp + HMAC-SHA256)
3. Badge généré (QR animé web · image + code 6 car. WA · PDF)
4. Scan au centre (douchette / caméra mobile) → Route Handler vérifie la signature HMAC → identifie cjs_uid
   └─ Mode offline : stockage IndexedDB, synchro au retour réseau
5. Action déclenchée selon le contexte du scan :
   • Entrée centre      → enregistrement visite + raison de présence
   • Check-in événement → marquage présence
   • Retrait réservation→ validation mise à dispo salle/véhicule
   • Emprunt / Retour   → enregistrement emprunt ou retour exemplaire
```

Confirmation immédiate → WhatsApp (si compte lié) ou notification web.

## Sécurité

- Clé de signature en **variable d'environnement chiffrée**, **jamais en base**.
- Un tiers interceptant le QR ne peut rien faire sans la clé.
- Rotation à minuit · vérification temps réel à chaque scan.

## ⚠️ Conflit / réconciliation avec l'existant

Le repo implémente **déjà** un badge sous une forme différente, décidée en ADR :

| Aspect | Note Yaye (cible) | Existant repo (`cjs-card`) |
|--------|-------------------|----------------------------|
| Format crypto | **HMAC-SHA256**, payload `cjs_uid+timestamp` | **JWT HS256 rotatif** (TTL 15 min), `sub`+`nonce`+`scope` |
| Rotation | à minuit | toutes les 15 min (auto-refresh client à 14 min) |
| Anti-replay | vérif temps réel SSO | `nonce` UUID + Redis SET NX côté scanner |
| Route | `/api/users/[cjs_uid]/badge` | `/api/cjs-card/qr-token` |
| Secret | `JWT_CJS_CARD_SECRET` (32 bytes hex) | idem |
| Décision | — | `.agent_context/adr/ADR-002-qr-jwt-rotatif.md` |
| Scan / check-in | actions multiples au scan | `CheckIn` model + `jwt_nonce` unique + `/checkin` + `/api/v1/checkin` |

**Action requise** : ne PAS réimplémenter un badge HMAC sans arbitrage. Deux options à soumettre au PO :
1. **Conserver le JWT rotatif existant** (ADR-002) et mapper l'outil `get_badge` dessus — la note décrit l'intention, l'implémentation JWT est plus sûre (TTL court). *(recommandé)*
2. Migrer vers HMAC strict conforme à la note (rupture avec ADR-002 + scanner W6.2 déjà livré).

> À trancher avant tout code sur le badge. Voir aussi `.agent_context/specs/M4-centres-lot7.md` (Wave 6 / GUIC-386) et `src/app/api/cjs-card/qr-token/route.ts`.
