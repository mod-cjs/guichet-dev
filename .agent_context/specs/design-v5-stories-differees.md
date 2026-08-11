# Design v5 — les trois stories différées (É-18, É-19, É-30)

> Écrit le 2026-08-11, après le réaudit du registre d'écarts.
>
> Ces trois écarts ont été **délibérément non livrés** pendant les vagues v5 :
> la maquette dessine des contrôles que la donnée ne permet pas d'alimenter.
> Les livrer tels quels aurait reproduit le défaut corrigé quatre fois sur ce
> projet — un bouton, un filtre ou une note qui ment.
>
> Ce document ne code rien. Il établit **ce qui existe réellement en base**, ce
> qui manque, et les décisions qui vous appartiennent. Chaque chiffre a été
> mesuré, pas estimé.

---

## Vue d'ensemble

| Story | Ce qui bloque | Décisions attendues | Poids |
|---|---|---|---|
| **É-18** — Filtres « Format » et « Lieu » de l'agenda | Un champ absent du modèle | 2 | Petit |
| **É-19** — Notation et attestation d'événement | Fonctionnalité entièrement à créer | 5 | Gros, à scinder |
| **É-30** — Checklist « Profil recherché — où en es-tu ? » | La donnée existe mais **personne ne la saisit** | 2 | Moyen |

Une constante : **aucune des trois n'est bloquée par un problème technique.**
Chacune attend un arbitrage produit.

---

## É-18 — Filtres « Format » et « Lieu » de l'agenda

Référence : `events-web.jsx:98-153`.

### Mesuré en base

| Fait | Valeur |
|---|---|
| Événements | 16 |
| …rattachés à un centre | **16** |
| …sans centre | 0 |

### Ce qui existe

`Evenement` porte `lieu` (texte libre, 200 caractères) et `centreId` optionnel.
`Centre` porte `region`.

### Ce qui manque

**Aucun champ « format ».** Présentiel / en ligne est une invention de la
maquette : rien dans le modèle ne distingue les deux. Un filtre branché sur
rien serait un contrôle mort.

Le filtre « Lieu » est plus subtil. La région est atteignable **par le centre**,
et aujourd'hui les 16 événements en ont un — le filtre marcherait. Mais rien
n'impose ce rattachement : un webinaire n'a pas de centre, et son `lieu` en
texte libre (« En ligne », « Zoom », « Grand Théâtre ») ne se filtre pas.

### Décisions attendues

**D-1 — Que signifie « format » pour le CJS ?**
Proposition : `ModeEvenement { Presentiel, EnLigne, Hybride }` sur `Evenement`.
Un hybride est-il un cas réel chez vous, ou deux valeurs suffisent-elles ?

**D-2 — Que fait-on des 16 événements existants ?**
Ils ont tous un centre : `Presentiel` est une valeur de reprise défendable.
Mais une reprise automatique inscrit une affirmation en base — si un de ces
16 était en ligne, il devient faux. L'alternative est un champ nullable et une
reprise à la main par les conseillers.

### Ce que ça implique

- Migration additive (`mode` + `region` dénormalisée, ou jointure sur le centre)
- Champ dans les deux formulaires (admin `EvenementFormModal`, conseiller
  `PublicationForm`) — sinon le filtre reste vide à mesure que la base grossit
- Filtre serveur **réellement lu** : la sentinelle anti-filtre décoratif de
  GUIC-689 (É-24) fait échouer la CI si un paramètre est exposé sans être lu

---

## É-19 — Notation et attestation d'événement

Référence : `events-web.jsx:370, 400-401, 455`.

### Mesuré en base

| Fait | Valeur |
|---|---|
| Événements passés | 11 |
| Lignes d'inscription | **0** |
| Profils renseignant des compétences | 46 |

### Ce qui existe

`InscriptionEvenement.statut` comprend déjà la valeur **`present`** : la
présence à un événement *est* modélisée. Elle n'est simplement jamais
alimentée — zéro inscription en base.

(`CheckIn` existe et fonctionne, mais il enregistre une venue **au centre**,
pas la participation à un événement précis. Les deux ne se confondent pas.)

### Ce qui manque

Tout le reste : aucun modèle de note ni d'avis, aucune génération
d'attestation. Ce sont **deux fonctionnalités distinctes** qu'il faut cesser
de traiter comme une seule.

### Décisions attendues

**D-3 — Une note est-elle publique ?**
Une moyenne affichée sur la fiche change le comportement des jeunes et expose
les organisateurs. Note interne (pilotage) et note publique (réputation) ne se
conçoivent pas pareil.

**D-4 — Qui peut noter ?**
Proposition : les seuls `statut = present`, et seulement après la date de fin.
Sans cette règle, on note un événement auquel on n'est pas allé.

**D-5 — Modère-t-on les commentaires ?**
Un champ libre publié sans relecture est un risque éditorial. Si oui, la file
de modération existante est-elle le bon endroit ?

**D-6 — Que certifie l'attestation, et qui l'engage ?**
« A participé » est une affirmation opposable. Elle suppose une présence
fiable — donc que l'émargement soit réellement fait — et une autorité
signataire (le centre ? le CJS ?). C'est une décision institutionnelle avant
d'être technique.

**D-7 — Conservation (CDP).**
Une attestation nominative stockée est une donnée personnelle : durée de
conservation, droit d'effacement, accès.

### Ce que ça implique

Modèle `AvisEvenement` (note 1-5, commentaire optionnel, unicité
`[cjsUid, evenementId]`), API, écran ; puis génération PDF + stockage MinIO +
route de téléchargement authentifiée.

**Prérequis dur** : sans émargement réellement pratiqué, l'attestation n'a
aucune base. Les 0 inscriptions actuelles disent que le circuit n'est pas
encore en service.

---

## É-30 — Checklist « Profil recherché — où en es-tu ? »

Référence : Lot 3.

### Mesuré en base

| Fait | Valeur |
|---|---|
| Compétences au référentiel (`skills`) | **37** |
| Rattachements opportunité ↔ compétence | **0** |
| Profils renseignant des compétences | 46 |

### Le vrai blocage

Ce n'est **pas** l'algorithme d'appariement. Le modèle est complet : la table
`OpportuniteSkill` existe, avec un drapeau `requise`. Le référentiel est semé.

Mais **aucune opportunité n'a jamais été rattachée à une compétence.** La
checklist s'afficherait vide sur les 42 offres du catalogue.

Second obstacle, plus discret : les compétences du profil sont stockées en
`Json` — du texte libre saisi par le jeune (« Excel », « excel », « Maraîchage
bio ») — alors que les compétences requises pointent vers un référentiel
contrôlé. Rapprocher les deux suppose une règle de normalisation.

### Décisions attendues

**D-8 — Qui renseigne les compétences requises d'une offre ?**
Trois candidats, non exclusifs : le recruteur au dépôt, l'admin à la
validation, ou l'extraction automatique de la curation. Sans réponse, la table
restera vide et la checklist muette.

**D-9 — Comment rapprocher le texte libre du référentiel ?**
Deux voies : convertir les compétences du profil en références au référentiel
(saisie assistée + reprise des 46 profils), ou apparier par libellé normalisé
(accepte les fautes de frappe, mais rapproche parfois à tort).

### Garde-fou

Tant que D-8 n'est pas tranchée, **la checklist ne doit pas être livrée**. Un
« 0 sur 0 compétences » ou une liste vide se lit comme « tu ne corresponds à
rien » — un message décourageant produit par une table vide.

---

## Ce que je recommande

1. **É-18 d'abord.** Deux décisions, un périmètre net, un gain immédiat sur
   l'agenda. C'est la seule des trois livrable dans la foulée.
2. **É-30 ensuite**, mais en commençant par D-8 : sans saisie des compétences
   requises, tout le reste est décoratif. Une passe de rattachement sur les 42
   offres existantes vaut mieux qu'un algorithme.
3. **É-19 en dernier**, scindée en deux : la notation est faisable ;
   l'attestation dépend d'un émargement qui n'est pas encore pratiqué et d'une
   décision institutionnelle. Les mener ensemble bloquerait la première sur la
   seconde.
