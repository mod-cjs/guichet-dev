# 11 — Fonctionnalités de Yaye (vue consolidée)

> Décrit les **7 fonctions** de la note (§4) de façon homogène. Pour chacune : *déclencheur · outils mobilisés · flux web vs WhatsApp · règles métier · événements loggés · état du code*. Complète les vues techniques ([03 outils](./03-outils-function-calling.md)) et canal ([04](./04-canaux-web-whatsapp.md)).
>
> ⚠️ **Une fonction ≠ un outil.** Une fonction orchestre **plusieurs** outils + un flux. Le mapping est explicité ci-dessous.

---

## F1 — Identification de l'utilisateur et de son rôle

- **Déclencheur** : début de toute session (web ou WhatsApp).
- **Outils** : aucun outil métier — étape d'infrastructure (cf. [01 flux](./01-architecture-technique.md) étapes 1-2).
- **Flux** : Web → session SSO NextAuth (`cjs_uid`, rôle, `centre_id`). WhatsApp → lien magique SSO liant le numéro au `cjs_uid`, session Redis 7 j.
- **Règles** : `cjs_uid` = claim `sub` SSO ; téléphone E.164 ; Yaye n'implémente **aucune** auth propre.
- **Événements** : `session_ouverte`.
- **État code** : 🟠 binding WhatsApp↔cjs_uid à confirmer côté SSO ; `Utilisateur.telephone` unique existe.

## F2 — Conseil & orientation active *(valeur différenciante)* — **inclut la recommandation d'opportunités**

C'est **la** fonction de recommandation : proposer à l'utilisateur des opportunités selon son **profil et ses besoins**. Elle opère en **deux modes complémentaires** :

### F2-a — Recommandation réactive (à la demande)
- **Déclencheur** : l'utilisateur demande (« trouve-moi un financement pour mon projet maraîcher »).
- **Outils** : `get_user_profile` → `query_knowledge_graph` (matching parcours à la volée) → reformulation Groq.
- **Matching** : éligibilité par niveau/expérience, **analyse d'écart de compétences**, reco collaborative, chaînage multi-entités (cf. [02 §5](./02-knowledge-graph-neo4j.md)).

### F2-b — Recommandation proactive (pré-calculée)
- **Déclencheur** : ouverture de session (« voici 3 opportunités pour toi »), ou push WhatsApp (v1.1).
- **Outils** : **`get_recommendations`** → lit `RecommandationIA` (scores pré-calculés, **sans appel LLM** = rapide).
- **Pipeline de scoring** : un job (batch + à la création/modif d'opportunité) calcule les scores via le graphe et **écrit `RecommandationIA`** (Prisma). Implémente `src/lib/ia/recommandation.ts` (stub aujourd'hui). Les scores **naissent en Prisma** (invariant read-model [02 §0](./02-knowledge-graph-neo4j.md)).

- **Flux commun** : lit le profil **avant** de répondre, adapte selon le rôle (bénéficiaire = insertion ; gestionnaire = opérationnel). Rendu : cards web / synthèse WhatsApp ([04](./04-canaux-web-whatsapp.md)).
- **Règles** : filtrage RBAC/centre obligatoire ; sortie reco collaborative **anonymisée** ([07](./07-securite-conformite.md)).
- **Événements** : `intention_detectee`, `graph_interroge`, `reponse_generee` ; conversion suivie via Data Hub (`recommandation → candidature`, [06](./06-agent-logs-tracabilite.md)).
- **État code** : 🟢 modèle `RecommandationIA` existe ; 🔴 `recommandation.ts` = stub `return []`, KG absent, scoring = chantier (Lot 1). Qualité dépend de R2 (normalisation compétences).

### Déclencheurs de proactivité F2-b (à acter — non spécifiés par la note)

| Déclencheur | Action | Périmètre |
|-------------|--------|-----------|
| Ouverture de session | Surfacer 1-3 matches pertinents du profil | v1 |
| Après une recherche | Suggérer formation/centre/événement liés | v1 |
| Consultation d'une opportunité | Afficher compétences manquantes + formation pour les combler | v1 |
| Deadline approchante / nouvelle opportunité au profil | Push WhatsApp | **v1.1** (note §10.2) |

> Sans cette matrice, « anticiper les besoins » reste flou. À valider PO.

## F3 — Badge numérique CJS

- **Déclencheur** : « mon badge » (WA) / ouverture profil (web) ; ou scan au centre.
- **Outils** : `get_badge`.
- **Flux** : génération QR signé + code 6 car. ; scan au centre → vérification → action contextuelle (entrée, événement, retrait réservation, emprunt/retour).
- **Règles** : compte suspendu = badge invalide ; voir le **conflit JWT vs HMAC** non tranché ([05](./05-badge-numerique.md)) et la **contradiction offline/temps réel** ([10 risques](./10-risques.md)).
- **Événements** : `badge_genere`.
- **État code** : 🟠 socle existant (`/api/cjs-card/qr-token` JWT + `CheckIn`) — arbitrage requis.

## F4 — Réservation de ressources (salles + véhicules)

- **Déclencheur** : « réserver une salle / demander un véhicule ».
- **Outils** : `get_realtime_data` (dispo) → `reserve_resource` → confirmation.
- **Flux** : Web → calendrier visuel, clic créneau, confirmation bouton. WhatsApp → **collecte séquentielle** (date→créneau→durée→motif→récap→Confirmer).
- **Règles** : salle **auto-validée** si créneau libre + profil valide ; véhicule = **validation manuelle gestionnaire** (`StatutReservation.EnAttente`) + **restriction géo** (région bénéficiaire = zone centre) appliquée **avant** la demande. **Confirmation obligatoire avant écriture** (cf. [10](./10-risques.md)).
- **Événements** : `reservation_soumise`.
- **État code** : 🟠 `Reservation`/`RessourceCentre` existent ; **champ zone véhicule à créer** ; collecte séquentielle WhatsApp = machine à états (Lot 2).

## F5 — Bibliothèque physique (catalogue, emprunt, retour)

- **Déclencheur** : « cherche un livre sur… » / « mes emprunts ».
- **Outils** : `search_library` → `borrow_book` ; `get_active_loans`.
- **Flux** : recherche par titre/auteur/thème → exemplaires disponibles + **emplacement physique** (rayon-étagère-position). Web = fiche + bouton Emprunter ; WhatsApp = texte structuré + boutons.
- **Règles** : emprunt en statut **« initié »** → effectif **au scan du badge** au centre ; retour par scan → exemplaire repasse disponible.
- **Événements** : `emprunt_initie`, `retour_enregistre`.
- **État code** : 🔴 **entièrement à créer** (modèles `Livre`/`ExemplaireLibre`/`Rayon`/`Emprunt` + routes) — Lot 3.

## F6 — Candidature assistée

- **Déclencheur** : « je veux candidater à … » (depuis une opportunité).
- **Outils** : `get_user_profile` (pré-remplissage) → **`submit_application`** (nouvel outil, cf. [03](./03-outils-function-calling.md)).
- **Flux** : Web → formulaire **inline pré-rempli** depuis le profil SSO. WhatsApp → **collecte séquentielle** ; les champs déjà au profil ne sont **pas** redemandés. Confirmation **WhatsApp + email** dans les deux cas.
- **Règles** : soumission via API ; confirmation obligatoire avant écriture ; CV réutilisé depuis le profil (`ProfilJeune.cvUrl`).
- **Événements** : `api_appelee` (POST candidature), `contenu_transmis` (confirmation).
- **État code** : 🟢 route `/api/candidatures` (POST) **existe déjà** (GUIC-21) ; 🔴 **outil `submit_application` manquant** (trou comblé) + flux WhatsApp à bâtir.

## F7 — Escalade vers un conseiller humain

- **Déclencheur** : échec de Yaye, intention non résolue, demande explicite, ou seuil d'échecs atteint.
- **Outils** : `escalate_to_advisor`.
- **Flux** : Web → passation transparente dans le même fil. WhatsApp → message de transition + le conseiller répond via le module Meta Cloud API du panel admin.
- **Règles** : **journaliser la raison** ; l'escalade est la **soupape de sécurité** des garde-fous d'intention ([10 R4](./10-risques.md)).
- **Événements** : `escalade_conseiller`.
- **État code** : 🟠 `Notification`+`TypeNotification.Yaye` + `src/lib/notifications/` existent ; module conseiller temps réel à bâtir (Lot 6).

---

## Récapitulatif fonction → outils

| Fonction | Outils mobilisés |
|----------|------------------|
| F1 Identification | — (infra) |
| F2 Orientation active / **recommandation** | `get_user_profile` · `query_knowledge_graph` (réactif) · `get_recommendations` (proactif) |
| F3 Badge | `get_badge` |
| F4 Réservation | `get_realtime_data` · `reserve_resource` |
| F5 Bibliothèque | `search_library` · `borrow_book` · `get_active_loans` |
| F6 Candidature | `get_user_profile` · `submit_application` |
| F7 Escalade | `escalate_to_advisor` |

> **11 outils** au total = les 9 de la note + `submit_application` (F6) + `get_recommendations` (F2-b). Les deux derniers sont requis par des fonctions de la note absentes de son tableau §6.3.
