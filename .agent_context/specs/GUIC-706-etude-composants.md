# GUIC-706 — Étude des composants du panneau : avant, pendant, après

> Complément à `.agent_context/specs/GUIC-706-feature-flags.md` · Date : 2026-08-14
> Objet : comportement réel de chaque fonctionnalité au fil d'une bascule, zones grises,
> interdépendances non déclarées, et candidats supplémentaires.

Établi par lecture du schéma Prisma et des routes, pas par raisonnement sur les libellés.
Chaque constat porte sa référence de fichier.

## 1. Ce que le catalogue ne dit pas encore

Le catalogue déclare `dependsOn` (« ce flag exige tel autre »). Il ne déclare pas les
**couplages par la donnée** : deux fonctionnalités indépendantes à l'écran dont l'une
écrit ce que l'autre lit. Ce sont eux qui produisent les dégâts silencieux.

### 1.1 🔴 Pointage masqué ⇒ toutes les réservations comptées comme non honorées

**Le plus grave.** Le batch quotidien
(`src/app/api/cron/reservations-batch/route.ts:46`) clôt chaque réservation échue par :

```ts
const nextStatut = hasCheckIn ? 'Passee' : 'NonHonoree'
```

Si `m4.checkin` est masqué alors que `m4.reservations` reste ouvert, **plus personne ne
peut badger**. Toutes les réservations honorées basculent donc en `NonHonoree`, et le
`noShow` est écrit **en base**, pas calculé à l'affichage.

Conséquences en chaîne :
- des jeunes venus au rendez-vous sont enregistrés comme absents, définitivement ;
- le taux de no-show des centres (`src/lib/loaders/centres-analytics.ts:139`) devient faux
  et le reste après réouverture ;
- le flux Data Hub exporte `no_show` en tier `public` (`src/lib/datahub/streams.ts:189`) :
  la donnée fausse **sort de la plateforme** et ne peut plus être rappelée.

**Traitement** : `m4.reservations` doit déclarer `requires: ['m4.checkin']`. Si l'on veut
malgré tout masquer le pointage, le batch doit être neutralisé en même temps — c'est un
cas où couper un cron d'entretien devient obligatoire, contrairement à la règle générale
de §7.2 de la spec principale.

### 1.2 🟠 Carte CJS masquée ⇒ présence aux événements impossible

`POST /api/v1/checkin/[token]/presence` (GUIC-474) écrit `InscriptionEvenement.present`
à partir du **token de la carte**. Le marquage de présence à un événement dépend donc de
la carte, alors qu'il appartient fonctionnellement à l'agenda.

Masquer `m4.carte_cjs` prive donc l'agenda de son émargement, sans qu'aucune dépendance
déclarée ne le signale. Le conseiller constate que le scan « ne marche plus » sur un module
qu'il croit ouvert.

**Traitement** : `m5.agenda` déclare `requires: ['m4.carte_cjs']`, ou l'émargement devient
un flag propre (cf. §4).

### 1.3 🟠 Un jeton de carte survit 15 minutes à la fermeture

`src/app/api/cjs-card/qr-token/route.ts:32` — JWT à **TTL 15 minutes**, rafraîchi 1 minute
avant expiration. Masquer `m4.carte_cjs` ferme la route d'émission, mais **les jetons déjà
émis restent valides jusqu'à 15 minutes**.

Ce n'est pas un défaut : c'est le comportement souhaitable. Un jeune déjà devant le
comptoir termine son passage. Mais l'administrateur doit le savoir, sinon il conclut que la
bascule n'a pas pris.

**Traitement** : mention explicite dans la note de service (§8.6 de la spec principale).

### 1.4 🟡 `dwellMinutes` : une colonne que rien n'écrit

`CheckIn.dwellMinutes` existe au schéma (`prisma/schema.prisma:1866`) et part au Data Hub
(`streams.ts:208`, tier `public`) — mais **aucun code ne l'écrit**. Vérifié par recherche
sur l'ensemble de `src/`.

Autrement dit : **il n'y a pas de check-out aujourd'hui.** Le pointage est un événement
d'entrée, append-only. Il n'y a donc rien à piloter de ce côté, et il ne faut pas créer un
flag « check-out » qui laisserait croire à une fonctionnalité existante.

À signaler séparément : un champ exporté et jamais alimenté est une promesse faite au
consommateur du flux.

## 2. Cycle de vie d'une bascule, par nature de fonctionnalité

### 2.1 Les fonctionnalités de consultation — `sec`

Catalogue, ressources, agenda, centres, recherche.

| Phase | Comportement |
|---|---|
| Avant | Rien à préparer, la donnée existe déjà |
| Pendant | Propagation < 1 s (compteur de version). Les pages déjà rendues restent affichées jusqu'à navigation |
| Après | 404 indiscernable d'une route inexistante. Aucune donnée touchée |
| Reprise | Restitution intégrale et immédiate |

**Zone grise** : le sitemap garde jusqu'à 2 h de retard (double cache, §7.2). Google peut
donc continuer d'envoyer du trafic sur des pages en 404 — d'où l'intérêt du compteur de
refus, qui rend cette fuite visible.

### 2.2 Les fonctionnalités d'engagement — `drain`

Réservations, bibliothèque, candidatures, agenda (inscriptions).

| Phase | Comportement |
|---|---|
| Avant | Décompte des engagements actifs affiché avant confirmation |
| Pendant | L'**entrée** ferme immédiatement — plus de nouvelle demande. La **sortie** reste ouverte |
| Après | Le titulaire d'un engagement le voit encore ; personne d'autre ne voit rien |
| Reprise | Les engagements en sommeil redeviennent visibles de tous. **Aucune perte** |

**Zone grise** : la durée du drain n'est pas bornée. Un emprunt en retard peut maintenir la
fonctionnalité à demi ouverte indéfiniment. Le panneau doit afficher le reste-à-écouler,
sinon l'administrateur croit la fermeture achevée.

### 2.3 Les fonctionnalités à coût externe — `sec`

Yaye, WhatsApp, canaux e-mail et SMS, Data Hub.

| Phase | Comportement |
|---|---|
| Avant | Vérifier qu'aucun envoi n'est planifié |
| Pendant | Coupure immédiate. Les conversations WhatsApp en cours reçoivent `200` + silence |
| Après | Coût nul. Aucun appel au fournisseur |
| Reprise | **Démarrage à froid** : caches vides, graphe non projeté, aucune recommandation précalculée |

**Zone grise, la plus coûteuse** : les crons Yaye court-circuités pendant la fermeture n'ont
rien préparé. Rouvrir l'assistant le jour J donne un agent sans recommandations et sans
graphe à jour. D'où le bouton « Préchauffer » du lot 6.

### 2.4 Les espaces professionnels — `sec`

Recruteur, conseiller, centre-staff.

| Phase | Comportement |
|---|---|
| Avant | Prévenir les personnes concernées : ce sont des postes de travail |
| Pendant | Session en cours non invalidée — la personne perd l'accès à la navigation suivante |
| Après | 404 sur tout l'espace. Le travail en cours non enregistré est perdu |
| Reprise | Immédiate |

**Zone grise** : un formulaire ouvert au moment de la bascule échoue à l'envoi, avec un 404
qui ne dit pas pourquoi (règle d'invisibilité). Pour un espace professionnel, c'est
excessif : l'invisibilité protège d'une divulgation à un public, elle n'a pas de sens
face à un agent connu. **À arbitrer** : autoriser un message explicite sur les espaces
professionnels.

## 3. Interdépendances à ajouter au catalogue

| Flag | Ajout | Motif |
|---|---|---|
| `m4.reservations` | `requires: ['m4.checkin']` | sinon `NonHonoree` en masse (§1.1) |
| `m5.agenda` | `requires: ['m4.carte_cjs']` | émargement par badge (§1.2) |
| `m8.validation_reservations` | `dependsOn` déjà correct | — |
| `m12.reco` | `requires: ['m3.opportunites']` | un score de recommandation sans catalogue n'a pas d'objet |
| `x.notif_whatsapp` | `dependsOn: ['m11.whatsapp']` déjà présent | — |

## 4. Candidats supplémentaires

| Candidat | Verdict |
|---|---|
| **Check-out / durée de présence** | ❌ **N'existe pas.** `dwellMinutes` n'est jamais écrit (§1.4). Créer le flag laisserait croire à une fonctionnalité présente |
| **Émargement par badge** (`/api/v1/checkin/[token]/presence`) | ✅ Candidat sérieux — appartient à l'agenda, pas au pointage de centre. Le séparer lève le couplage §1.2 |
| **Justificatif de réservation** (`/api/reservations/justif/upload`) | ✅ Candidat — dépôt de pièce jointe, coût de stockage, surface d'attaque propre. Se ferme sans fermer la réservation |
| **Annulation par le jeune** (`/api/reservations/[id]`, `AnnuleeParJeune`) | ⚠️ Techniquement séparable, **à ne pas faire** : retirer l'annulation oblige le jeune à ne pas venir, ce qui le fait compter en no-show. On ne masque pas une porte de sortie |
| **Réservation spontanée vs sur créneau** | ❌ Pas de distinction en base |
| **Carte CJS** | ✅ Déjà fait (`m4.carte_cjs`), séparé du pointage |

## 5. Les onglets et conteneurs — une surface à part entière

> « Il ne faut aucune trace de la fonctionnalité, même pas un onglet. » — PO, 2026-08-14

Le champ du catalogue s'appelait `navIds`, ce qui invitait à ne traiter que les barres de
navigation. Or **un onglet « Ressources » sur la page des favoris est une trace au même
titre qu'un lien de menu**. Renommé `uiIds`, il couvre désormais toute affordance nommant
une fonctionnalité.

### 5.1 Inventaire — 11 barres d'onglets hors administration

| Fichier | Ce qui peut nommer un module masqué |
|---|---|
| `src/components/jeune/MesFavoris.tsx:117` | chips de type — **Opportunités / Ressources** |
| `src/components/evenements/MesInscriptionsClient.tsx:76` | onglets d'inscriptions (agenda) |
| `src/components/centres/ReservationsTabs/index.tsx:90` | onglets de réservations |
| `src/app/(public)/agenda/agenda-client.tsx:208` | affichage des événements |
| `src/components/jeune/NotificationsClient.tsx:168` | onglets de notifications |
| `src/components/features/NotificationsDrawer/index.tsx:150` | idem, en tiroir |
| `src/app/conseiller/reservations/page.tsx:61` | filtres de réservations |
| `src/app/conseiller/bibliotheque/page.tsx:80` | filtres d'emprunts |
| `src/app/conseiller/agenda/page.tsx:103` | vues jour/semaine/mois |
| `src/app/centre-staff/(protected)/bibliotheque/biblio-staff-tabs.tsx` | onglets bibliothèque |
| `src/app/recruteur/modeles-emails/ModelesEmailsClient.tsx` | onglets de modèles |

S'y ajoutent les **sections titrées** : `CentreEvenementsSection` sur la fiche centre
nomme l'agenda ; `CentreServicesGrid` nomme les services du centre.

### 5.2 La règle du conteneur

Filtrer les items ne suffit pas — **le contenant est lui-même une trace** :

- une section dont tout le contenu est masqué disparaît **avec son titre** ;
- un groupe de navigation vidé disparaît **avec son intitulé** ;
- **un tablist réduit à un seul choix disparaît** : un onglet unique n'est plus un choix,
  c'est un titre, et sa présence signale qu'on a retiré quelque chose à côté.

Ce dernier point est le moins intuitif et le plus révélateur. Sur la page des favoris,
retirer « Ressources » laisserait « Tout » et « Opportunités » — deux onglets au contenu
identique, ce qui *montre* l'absence au lieu de la cacher.

### 5.3 Vérification

Le lot 5 vérifie par test, pour chaque flag masqué, qu'aucun de ses `uiIds` n'apparaît dans
le rendu **et** qu'aucun conteneur vide ne subsiste. La seconde assertion est celle qui
manque partout ailleurs : on teste facilement qu'un élément a disparu, rarement que son
étiquette est partie avec.

## 6. Ce qui reste à trancher

1. **Message explicite sur les espaces professionnels** plutôt que 404 muet (§2.4).
2. **Reste-à-écouler affiché** pour les fermetures `drain` (§2.2).
3. Le champ `dwell_minutes` exporté et jamais alimenté — anomalie hors périmètre, à
   signaler au responsable du Data Hub.
