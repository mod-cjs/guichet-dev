# CURRENT_TASK — GUIC-140 Auth WhatsApp magic link (M11)

**Branche** : `feature/GUIC-140-auth-whatsapp-magic-link` (depuis origin/dev)
**Spec** : `.agent_context/specs/M11-whatsapp.md`
**Parent** : GUIC-34 (v0.5) · **Priorité** : Highest · **Débloque** : GUIC-142, GUIC-143

## Objectif
Lier un numéro WhatsApp (E.164) ↔ `cjs_uid` via lien magique usage unique (TTL 10 min)
adossé au SSO CJS existant. Mécanique « code depuis WhatsApp » (validée PO 2026-07-10).
Modèle : réutiliser `ConversationWhatsApp` + champ `linkedAt` (pas de table `whatsapp_links`).

## Checklist (TDD strict RED→GREEN, Jest)
- [x] Migration Prisma `linked_at` sur `ConversationWhatsApp`
- [x] `src/lib/whatsapp/magic-link.ts` (createLinkToken / consumeLinkToken / bind / unbind)
- [x] `src/app/api/whatsapp/link/route.ts` (cookie httpOnly + redirect SSO + bind immédiat si session)
- [x] `src/app/api/whatsapp/link/confirm/route.ts` (binding + confirmation WA)
- [x] Webhook `route.ts` : branche non-liée → envoi lien magique (+ rate-limit) + opt-out STOP/DÉLIER
- [x] CDP : journalisation re-lien (uids hachés)
- [x] CDP : cascade droit-à-l'oubli (`onDelete: Cascade` + migration `whatsapp_erasure_cascade`)
- [x] Validation locale : jest 79/79 (WhatsApp+notifs) · tsc 0 · eslint 0 · `prisma validate` OK
- [ ] `npm run validate` complet (build) — à relancer en env avec node/npm
- [ ] Rebase sur `origin/dev` frais + push + PR (env avec gh + credentials git)

## Notes techniques (repo)
- Test runner = **Jest** (`npm run test`), pas vitest.
- Session : `getSession(request?)` de `src/lib/auth.ts` → `CJSSession | null`.
- SSO login : `/api/auth/login` → `getAuthorizationUrl()` ; callback `/auth/callback/route.ts`.
- Rate-limit : `rateLimit(request, { windowMs, max, keyPrefix })` de `src/lib/rate-limit.ts`.
- `git fetch` KO dans l'env agent → base = origin/dev en cache. **Rebase sur origin/dev frais avant PR.**
