# Runbook — ouvrir et masquer une fonctionnalité

> GUIC-706 · Panneau : **Admin → Système → Fonctionnalités**
> Spec : `.agent_context/specs/GUIC-706-feature-flags.md`

## En deux phrases

Le catalogue en code (`src/lib/flags/catalog.ts`) est la source de vérité ; la table
`feature_flags` ne porte que les **écarts**. Masquer ne supprime aucune donnée : rouvrir
restitue l'état antérieur à l'identique, ce qui rend la bascule utilisable en incident
autant qu'au lancement.

## Ce que masquer veut dire

| | |
|---|---|
| **Les utilisateurs** | route en 404 indiscernable d'une adresse inventée, liens et items de nav retirés, URL sortie du sitemap |
| **L'administration** | **rien ne change** — elle voit la vraie page et continue de préparer le contenu |
| **Le conseiller, le recruteur** | selon le champ `closes` : la face « préparation » reste souvent ouverte |
| **Les données** | intactes. Aucune suppression, jamais |

## Masquer une fonctionnalité

1. Ouvrir le panneau, trouver la fonctionnalité (onglet ou recherche).
2. Basculer. **Si d'autres en dépendent, une confirmation liste la séquence complète** —
   l'ordre est imposé par le graphe, tout est appliqué d'un bloc ou rien.
3. Lire le décompte d'engagements s'il y en a : « 47 emprunts en cours, conservés pour
   leurs titulaires ». Ces personnes gardent l'accès à ce qui les concerne ; personne
   d'autre ne voit quoi que ce soit.
4. Confirmer. L'effet est visible en quelques secondes sur toutes les instances.

### Ce qui peut refuser

- **« X en dépend »** — masquer d'abord X, ce que la cascade propose de faire pour vous.
- **« X l'exige »** — dépendance inverse : aucune cascade ne la lève, il faut modifier le
  code qui l'exige.
- **Fonctionnalité verrouillée** — socle, jamais masquable.

## Ouvrir une fonctionnalité

Même geste. La confirmation affiche en plus une **checklist** :

- **tâches planifiées à l'arrêt** — elles n'ont rien préparé pendant le masquage.
  Les déclencher avant d'ouvrir, sinon le module s'ouvre sur des données périmées ;
- **aucun contenu publié** — le pire scénario d'ouverture : la fonctionnalité marche, elle
  est simplement vide, et l'utilisateur en conclut qu'elle ne sert à rien ;
- **dépendance encore masquée** — quoi ouvrir d'abord.

La checklist **n'est pas bloquante**. « Ouvrir quand même » existe ; ce qu'on évite, c'est
de le faire sans le savoir.

### La cascade n'est pas symétrique

Masquer entraîne ce qui **dépend** de la fonctionnalité ; ouvrir n'entraîne que ce dont
elle **a besoin**. Rouvrir la bibliothèque ne rouvre donc pas le comptoir d'emprunt : on
peut vouloir rendre le catalogue visible avant de rouvrir le guichet. Défaire une
fermeture en cascade demande autant de bascules qu'elle en avait entraînées — le panneau
affiche à tout moment la liste de ce qui reste masqué.

## Après une bascule

**Le compteur de tentatives** est le seul détecteur de fuite dont on dispose. Un module
masqué qui reçoit du trafic signale un lien resté quelque part. À consulter dans les jours
qui suivent une fermeture.

**Le journal d'audit** garde tout : qui, quand, dans quel sens, avec quelle note et quelle
séquence. Une cascade = une seule entrée.

## Deux délais à connaître

| Surface | Délai |
|---|---|
| Pages, API, navigations | **quelques secondes** (compteur de version partagé) |
| Jetons de carte CJS déjà émis | **jusqu'à 15 min** — un jeune devant le comptoir finit son passage |

## Interrupteur d'urgence

`NOTIFICATIONS_ENABLED=false` coupe **tous les canaux externes** (e-mail, SMS, WhatsApp),
quel que soit l'état du catalogue. L'in-app reste actif : la plateforme ne doit pas devenir
muette sur un statut de candidature.

C'est le seul levier qui répond encore **quand la base et Redis sont tombés** — d'où sa
survie malgré le panneau. Le pilotage courant passe par le catalogue ; celui-ci est le
dernier recours.

## Ce que le dispositif ne couvre pas

- **La prose de Yaye** — l'agent ne peut plus ni servir les données d'un module masqué ni
  le proposer spontanément : l'outil est retiré de son registre et de son prompt, et le
  graphe de connaissances est gardé intention par intention. Mais le prompt décrit aussi le
  produit en français courant, hors des zones filtrées ; interrogé frontalement sur un
  module fermé, Yaye peut encore en parler — sans jamais rien en tirer. Vérifié en réel le
  2026-08-15 : agenda masqué, aucun outil appelé, mais réponse conversationnelle sur le
  sujet nommé.
- **L'accueil public** — décision produit : ses cartes de raccourci ne suivent pas les
  flags.
- **Les liens partenaires** (YEAH, e-learning) — hors périmètre, ce sont d'autres
  plateformes.

## En cas de doute

Ne rien masquer sans avoir lu le décompte d'engagements. Une fermeture se rattrape à la
main ; une donnée fausse partie au Data Hub, non.
