# 04 — Canaux web & WhatsApp

## Principe : deux canaux, une logique métier unique

Yaye opère sur **WhatsApp** (Meta Cloud API) et le **chat web** intégré. La logique métier est **identique**. Ce qui diffère : le paradigme d'interaction et les capacités de rendu. Le web est un environnement React riche ; WhatsApp est un canal asynchrone avec des contraintes strictes imposées par Meta.

## Contraintes techniques dures de WhatsApp

| Contrainte | Valeur & impact |
|------------|-----------------|
| Messages texte | **4 096 caractères max** → tout contenu long doit être synthétisé |
| Boutons de réponse | **3 max** · libellé **20 caractères max** chacun |
| Listes interactives | **10 éléments max** · titre 24 car. max · 3 sections max |
| Templates | Pré-approuvés par Meta · non générables dynamiquement · délai 24-48h |
| Fenêtre de session | **24h** sans message entrant → seuls les templates approuvés peuvent être envoyés |
| Rendu | Aucun HTML · aucun composant React · aucun formulaire interactif · aucun streaming SSE |
| Documents | PDF transmissible en pièce jointe native · aperçu auto des liens (non contrôlable) |

## Divergences par fonctionnalité

| Fonctionnalité | Chat web | WhatsApp |
|----------------|----------|----------|
| **Résultats de recherche** | Cards React (titre, orga, type, deadline, boutons) | Liste numérotée ou liste interactive Meta · max 10 · sélection par numéro |
| **Badge CJS** | QR animé HD + bouton PDF dans le profil | Image QR + code alphanumérique 6 car. (fallback centres sans douchette) |
| **Réservation salle/véhicule** | Calendrier visuel · clic créneau · motif inline · confirmation bouton | Collecte séquentielle : date → créneaux listés → heure → durée → motif → récap → Confirmer/Modifier/Annuler |
| **Bibliothèque / emprunt** | Catalogue filtrable · fiche livre avec exemplaires + emplacements · bouton Emprunter | Recherche texte libre · résultats avec rayon-étagère-position · boutons Emprunter/Réserver |
| **Recommandation multi-entités KG** | Cards chaînées avec connecteurs visuels : opportunité → formation → centre → programme | Synthèse narrative 2-3 phrases (Groq) + lien vers version complète sur le Guichet |
| **Candidature assistée** | Formulaire **inline pré-rempli** depuis le profil SSO · bouton Soumettre | **Collecte séquentielle** ; champs déjà au profil non redemandés · récap → Confirmer. Confirmation WhatsApp + email dans les deux cas |
| **Escalade conseiller** | Passation transparente dans le même fil | Message de transition explicite · conseiller répond via module Meta Cloud API du panel admin |

## Formateur de sortie

Le formateur traduit la réponse **normalisée** (sans canal) en format adapté :

- `resultats_livres` → cards avec emplacement cliquable (web) | texte structuré rayon-étagère-position (WhatsApp)
- `badge` → QR animé (web) | image QR + code alphanumérique (WhatsApp)
- `disponibilite_salle` → calendrier picker (web) | liste créneaux numérotés (WhatsApp)

> **Groq ne connaît pas le canal** — le formateur adapte en **dernière étape**.

## Principe de bascule vers le web

Si un flux WhatsApp nécessite **plus de 5 échanges** ou dépasse les capacités du canal, Yaye envoie un **deep link** vers le point d'entrée correspondant sur le Guichet, **avec la session SSO déjà active**. L'utilisateur arrive au bon endroit sans recommencer.

## Identification cross-canal

- **Web** : session SSO via NextAuth → `cjs_uid`, rôle, `centre_id` transmis automatiquement.
- **WhatsApp** : un **lien magique** généré par le SSO relie le numéro au `cjs_uid`. Session stockée en Redis **7 jours**.
- Téléphone toujours au format **E.164** (`+221XXXXXXXXX`).

## État du code (existant) — vérifié

- ✅ `src/app/api/whatsapp/route.ts` — webhook Meta : GET (vérif `hub.challenge`) + POST (vérif HMAC `x-hub-signature-256` + idempotence `event_id` Redis TTL 7j, GUIC-240). Appelle déjà `generateAgentResponse`.
- ✅ `src/lib/whatsapp.ts` — `verifyWebhookSignature`, `sendTextMessage`, **`sendTemplateMessage`** (templates Meta déjà gérés, GUIC-21).
- ✅ `ConversationWhatsApp` + `MessageWhatsApp` (Prisma) — persistent téléphone↔cjs_uid, le `contexte` Groq (Json) et chaque message (`wamid`, `sens`, `contenu`).
- ✅ `src/app/jeune/yaye/YayeChat.tsx` + `src/components/ui/Yaye/*` — UI chat web (FAB, bubble, side panel, action cards, quick replies).
- 🔴 **`src/app/api/ia/route.ts` renvoie 501** — le backend du chat web n'est PAS câblé.
- 🟠 **`src/lib/ia/rag.ts` = un seul appel Groq sans function calling** — à réécrire pour les 11 outils.
- 🔴 Pas encore : formateur de sortie multi-canal, **boutons/listes interactives Meta**, collecte séquentielle, bascule deep-link. Voir [08-gap-analysis-existant.md](./08-gap-analysis-existant.md).
