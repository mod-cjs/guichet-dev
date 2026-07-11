# M11 — WhatsApp · Agent Yaye (Épic GUIC-11)

> Source de vérité du module WhatsApp. Chargée au démarrage de tout ticket M11.
> Story parente v0.5 : **GUIC-34** (auth + recherche + candidature). Priorité Highest.

## État du module (2026-07-10)

| Brique | Ticket | Statut |
|---|---|---|
| Webhook Meta GET/POST + HMAC + idempotence Redis 7j | GUIC-240 | ✅ `src/app/api/whatsapp/route.ts`, `src/lib/whatsapp.ts` |
| Client outbound (texte, boutons, listes, templates) | GUIC-317 | ✅ `src/lib/whatsapp.ts` |
| Formateur multi-canal (blocs Yaye → WhatsApp) | GUIC-263/303 | ✅ `src/lib/ia/format-whatsapp.ts` |
| Dispatcher notifications + canal WhatsApp | GUIC-83 | ✅ `src/lib/notifications/channels/whatsapp.ts` |
| Feedback pouce + CSAT | GUIC-437 | ✅ |
| **Auth magic-link (binding téléphone ↔ cjs_uid)** | **GUIC-140** | 🔴 **À faire — ce document** |
| Recherche opportunités (intent SEARCH) | GUIC-142 | ⛔ bloqué par 140 |
| Candidature (intent APPLY) | GUIC-143 | ⛔ bloqué par 140 |
| Contraintes dures Meta (4096 car., découpage) | GUIC-267 | ⛔ à durcir |
| Deep link SSO de bascule web | GUIC-269 | 🟡 amorcé (`shouldSuggestWeb`) |
| Tests d'intégration flow complet | GUIC-145/323 | ⛔ |

---

## GUIC-140 — Auth WhatsApp magic link

### Objectif
Lier un numéro WhatsApp (E.164) à un `cjs_uid` de façon sûre, pour que Yaye
puisse agir au nom de l'utilisateur (recherche, candidature). **Aucun login local** :
la preuve d'identité passe par le **SSO CJS existant**.

### Mécanique retenue — « code depuis WhatsApp » (validé 2026-07-10)
1. Un utilisateur **non lié** écrit sur WhatsApp.
2. Le webhook génère un **lien magique à usage unique** (TTL 10 min) et l'envoie
   par message WhatsApp.
3. L'utilisateur ouvre le lien → **SSO CJS** (`/api/auth/login`, PKCE serveur déjà
   en place) → au retour de callback, on connaît le `cjs_uid`.
4. Le téléphone (porté par le token) est **lié** au `cjs_uid` → confirmation
   renvoyée sur WhatsApp → l'utilisateur peut désormais utiliser Yaye.

### Décision de modèle (écart ticket proposé au PO)
Le ticket suggère une table `whatsapp_links(phone, user_id, linked_at)`.
**Proposition : réutiliser `ConversationWhatsApp` (déjà porteuse de `cjsUid`)** et
lui ajouter `linkedAt DateTime?` — évite de dupliquer l'état de binding.
Migration Prisma : `add_whatsapp_linked_at`.

```prisma
model ConversationWhatsApp {
  // … existant …
  cjsUid    String?  @map("cjs_uid") @db.VarChar(36)
  linkedAt  DateTime? @map("linked_at")   // ← nouveau : horodatage du binding
}
```

### Flux détaillé & fichiers

| Étape | Fichier | Contenu |
|---|---|---|
| Génération token | `src/lib/whatsapp/magic-link.ts` (nouveau) | `createLinkToken(telephone)` → 32 octets hex, Redis `guichet:whatsapp:link:<token>` = `{telephone}` TTL 600s (usage unique : `DEL` à la consommation). `consumeLinkToken(token)` → telephone \| null. |
| Entrée du lien | `src/app/api/whatsapp/link/route.ts` (nouveau) | `GET ?token=` → valide token → pose cookie httpOnly `wa_link_phone` (SameSite=Lax, TTL 10 min, signé/opaque) → redirige vers `/api/auth/login?callbackUrl=/api/whatsapp/link/confirm`. Token invalide/expiré → page d'erreur amicale. |
| Confirmation post-SSO | `src/app/api/whatsapp/link/confirm/route.ts` (nouveau) | Lit session (`auth-server`) + cookie `wa_link_phone`. Upsert `ConversationWhatsApp { telephone, cjsUid, linkedAt: now }`. Efface le cookie. Envoie confirmation WhatsApp (`sendTextMessage`). Redirige vers `/jeune` (succès). |
| Déclenchement | `src/app/api/whatsapp/route.ts` (modif) | Branche non-liée : au lieu du texte statique APP_URL, appeler `createLinkToken` + envoyer le lien magique. |

### Règles de sécurité (CLAUDE.md)
- Token **usage unique**, TTL **10 min**, aléatoire cryptographique (`crypto.randomBytes`).
- **Rate-limit** la demande de lien : max N/heure par téléphone (`src/lib/rate-limit.ts`, Redis) — anti-spam / anti-abus.
- Cookie `wa_link_phone` : **httpOnly**, `SameSite=Lax` (survit à la redirection SSO), TTL 10 min, effacé après consommation.
- Téléphone **E.164** obligatoire (`+221XXXXXXXXX`) — valider avant stockage.
- **1 téléphone → 1 cjs_uid.** Re-lien : si téléphone déjà lié à un autre `cjs_uid`, écraser (dernier gagne) et journaliser (`audit`). Si déjà lié au même → no-op idempotent.
- Ne jamais exposer le token dans les logs ; jamais en query persistée.
- Fail-soft webhook : un échec de génération ne doit pas renvoyer 500 à Meta.

### Critères d'acceptation
- [ ] Migration `linked_at` appliquée, `cjsUid`+`linkedAt` peuplés au binding.
- [ ] Un utilisateur non lié qui écrit reçoit un lien magique unique (TTL 10 min).
- [ ] Ouverture du lien → SSO → binding effectif → confirmation WhatsApp reçue.
- [ ] Token rejoué / expiré → refusé proprement (page erreur, pas de binding).
- [ ] Rate-limit actif sur la demande de lien.
- [ ] Re-lien vers un autre compte écrase et journalise ; même compte = idempotent.
- [ ] Après binding, `runAgent` reçoit bien le `cjsUid` (débloque 142/143).

### Tests (TDD — RED d'abord)
- `magic-link.test.ts` : create/consume, usage unique, expiration, token invalide.
- `link-route.test.ts` : cookie posé + redirection SSO ; token KO → erreur.
- `link-confirm.test.ts` : upsert binding, effacement cookie, confirmation envoyée, re-lien.
- `whatsapp-route.test.ts` (maj) : branche non-liée envoie un lien magique (mock Meta).

### Ajouts CDP livrés avec GUIC-140 (au-delà du strict binding)
- **Droit à l'oubli** : `ConversationWhatsApp.utilisateur` et `MessageWhatsApp.conversation`
  passent en `onDelete: Cascade` (migration `whatsapp_erasure_cascade`). La suppression
  d'un compte purge sa conversation + messages (téléphone/verbatim = PII) au lieu de la
  détacher (ancien `SET NULL`, qui laissait la PII en base).
- **Déliaison self-service (opt-out)** : mots-clés WhatsApp `STOP` / `DÉLIER` →
  `unbindWhatsAppNumber` (cjsUid + linkedAt à NULL, conversation conservée). Norme Meta.

### Hors périmètre GUIC-140 (follow-ups)
- Recherche (142) / candidature (143) : tickets suivants, débloqués par le binding.
- **UI de déliaison web** (`/jeune/paramètres`) : l'opt-out WhatsApp est livré ; l'écran
  web reste à faire (nécessite design/PO).
- Confirmation par template Meta : non requise ici (message envoyé dans la fenêtre de
  service 24 h, l'utilisateur venant d'écrire).
