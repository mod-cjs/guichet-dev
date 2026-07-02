# GUIC-132/133 — Messagerie interne recruteur ↔ candidat

Épic **GUIC-9** / Story mère **GUIC-32** · Module **m9-recruteur** + espace jeune

## Décisions (validées 2026-07-02)
- **Ancrage candidature** : 1 conversation = 1 candidature. Le recruteur ne peut écrire
  qu'aux candidats de SES offres (consentement CDP naturel : le jeune a postulé).
- **Deux côtés complets** : inbox + thread côté recruteur ET côté jeune.
- **Pas de websocket** : envoi via server action + refresh. Realtime = futur.
- **Notification in-app** (`Notification`, type `Message`) au destinataire. Email différé.

## Modèle (migration `add_messagerie_interne`)
```
Conversation { id, candidatureId @unique (FK Candidature, cascade), recruteurUid,
               candidatUid, createdAt, updatedAt(=dernier message), messages[] }
Message      { id, conversationId (FK, cascade), senderUid, corps @Text, lu, luLe?, createdAt }
```
- `Candidature` : back-relation `conversation Conversation?`.
- Participants = strings cjsUid (comme `Opportunite.recruteurUid`). Index `(recruteurUid, updatedAt)`, `(candidatUid, updatedAt)`, `(conversationId, createdAt)`.
- `Message.lu` = lu par le destinataire (non-sender). Non-lus = messages `senderUid != moi AND lu=false`.

## Loaders (`src/lib/loaders/messagerie.ts`)
- `getInbox(cjsUid)` → conversations où je suis participant, tri `updatedAt desc` : {id, interlocuteur (prénom/nom), offreTitre, dernierMessage, nonLus}.
- `getConversation(cjsUid, id)` → participant check, messages triés, interlocuteur, offre. `null` si non-participant.
- `countUnreadMessages(cjsUid)` → total non-lus (badge nav).

## Actions (`src/app/(...)/messagerie/actions.ts`)
- `contacterCandidat(candidatureId)` (recruteur) : ownership via `offreWhere` → crée/ouvre la conversation → retourne `id`.
- `envoyerMessage(conversationId, corps)` : sender ∈ participants → crée Message, `updatedAt`, **Notification** au destinataire, audit `message.send`.
- `marquerConversationLue(conversationId)` : passe `lu=true` sur les messages reçus.

### Sécurité
- Toute action vérifie la **participation** (`recruteurUid` ou `candidatUid` == session).
- `contacterCandidat` vérifie en plus l'**ownership de l'offre** (offreWhere).
- Zod : corps non vide, max 5000.

## UI
- **Recruteur** : `/recruteur/messagerie` (inbox, remplace ComingSoon) + `/recruteur/messagerie/[id]` (thread + composer). Bouton **« Contacter »** sur `/recruteur/candidatures/[id]`.
- **Jeune** : `/jeune/(app)/messagerie` (inbox) + `/jeune/(app)/messagerie/[id]` (thread + composer).
- Composer : `<form>` + server action, refresh après envoi. Non-lus en gras + badge.

## Tests (TDD) — `tests/unit/messagerie-actions.test.ts`
envoyerMessage : non-participant→FORBIDDEN · corps vide→rejet · crée message + Notification ·
contacterCandidat : non-owner→FORBIDDEN · réutilise conversation existante.

## DoD
Migration appliquée · `npm run validate` vert · boucle complète 2 côtés · PR → dev · Jira GUIC-132/133 Revue.
