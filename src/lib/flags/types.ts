// GUIC-706 — Types du lancement séquentiel.
//
// Module pur, sans I/O : importable depuis un composant client comme depuis le
// middleware. Spec : `.agent_context/specs/GUIC-706-feature-flags.md`.

/**
 * Publics d'une fonctionnalité. `anonyme` = visiteur sans session : les pages publiques
 * et la bulle Yaye s'adressent aussi à lui (GUIC-373), l'oublier laisserait un module
 * « masqué » entièrement visible aux non-connectés.
 */
export const AUDIENCES = ['anonyme', 'beneficiaire', 'recruteur', 'conseiller'] as const
export type Audience = (typeof AUDIENCES)[number]

/**
 * Face effective d'un visiteur. `admin` n'est pas une audience au sens du catalogue :
 * c'est l'exemption. Un flag ne peut jamais la fermer.
 */
export type Face = Audience | 'admin'

/**
 * Comment un flag se ferme.
 *
 * - `sec` — tout disparaît immédiatement. Modules sans engagement : IA, WhatsApp, canaux
 *   de notification, Data Hub, interop. C'est un coût ou un risque qu'on coupe, personne
 *   n'attend rien.
 * - `drain` — on ferme l'entrée, on garde la sortie jusqu'à extinction. Un jeune qui a un
 *   livre physique chez lui doit continuer de voir sa date de retour, sinon il passe en
 *   retard sans le savoir.
 */
export type CloseMode = 'sec' | 'drain'

/** Où lire les engagements encore actifs, pour le décompte montré à l'admin avant bascule. */
export interface EngagementSource {
  /** Nom du modèle Prisma (clé de `prisma`), ex. `emprunt`. */
  model: string
  /** Valeurs de `statut` considérées comme actives. */
  activeStates: string[]
  /** Libellé au pluriel pour le décompte, ex. « emprunts en cours ». */
  label: string
}

export interface FeatureFlagDef {
  /** Clé stable `module.fonction`. Jamais renommée : elle est persistée en base. */
  key: string
  /** Module métier d'origine (m1…m14, `x` pour le transverse) — groupement dans l'admin. */
  module: string
  /** Libellé court affiché dans le panneau d'administration. */
  label: string
  /** Ce que l'utilisateur perd concrètement quand le flag est masqué. */
  description: string
  /**
   * Préfixes de routes UTILISATEUR fermées quand le flag est masqué. Ne contient jamais
   * `/admin` : la console d'administration est hors périmètre des flags.
   */
  userRoutes: string[]
  /**
   * Routes d'administration du même périmètre. **Jamais fermées.** Listées pour documenter
   * ce que l'admin continue de gérer et pour y afficher le bandeau d'état.
   */
  adminRoutes: string[]
  /** Préfixes d'API utilisateur couverts. Jamais `/api/admin`. */
  apiPrefixes: string[]
  /**
   * Identifiants de TOUTE affordance d'interface nommant la fonctionnalité — pas seulement
   * les barres de navigation :
   *   - items de nav (sidebars, bottom-navs, header) ;
   *   - **onglets à l'intérieur d'une page** (11 `role="tablist"` hors admin) ;
   *   - sections titrées (`CentreEvenementsSection`…) ;
   *   - puces de filtre et chips de type.
   *
   * Le champ s'appelait `navIds`, un nom qui invitait à ne traiter que les barres de
   * navigation — et donc à laisser un onglet nommer une fonctionnalité masquée. Or un
   * onglet « Ressources » sur la page des favoris est une trace au même titre qu'un lien.
   *
   * Deux règles de filtrage, appliquées au lot 5 :
   *   1. Le filtrage croise l'identifiant AVEC l'audience courante : un même `agenda`
   *      existe chez le bénéficiaire et chez le conseiller, et ne disparaît que pour les
   *      publics listés dans `closes`.
   *   2. **Un conteneur vidé disparaît avec son étiquette.** Une section sans contenu, un
   *      tablist réduit à un seul choix, un groupe de nav sans item : le contenant est
   *      lui-même une trace. Un onglet unique n'est plus un choix, c'est un titre — et il
   *      signale qu'on a retiré quelque chose.
   */
  uiIds: string[]
  /** Chemins de tâches planifiées à court-circuiter (tels qu'écrits dans `vercel.json`). */
  crons: string[]
  /**
   * Publics qui perdent la fonctionnalité. Les faces absentes restent ouvertes : c'est ce
   * qui permet au recruteur de continuer à publier et au conseiller à préparer pendant
   * que le module est masqué aux bénéficiaires. Vide = flag interne, sans face utilisateur.
   */
  closes: Audience[]
  /** Clés qui doivent être ouvertes pour que ce flag puisse l'être. */
  dependsOn: string[]
  /**
   * Clés que ce flag exige ouvertes (dépendance inverse). Un flag verrouillé peut exiger
   * qu'un flag masquable reste ouvert — l'onboarding exige les centres pour son étape
   * « centre principal ».
   */
  requires: string[]
  /** Comportement à la fermeture. */
  closeMode: CloseMode
  /** Requis si `closeMode === 'drain'`. */
  engagements?: EngagementSource
  /**
   * Fermeture muette (défaut) ou explicite.
   *
   * `true` — 404 indiscernable d'une route inexistante : l'utilisateur ignore que la
   * fonctionnalité existe. C'est la règle générale.
   *
   * `false` — un message dit que la fonctionnalité est temporairement indisponible.
   * Réservé aux publics **identifiés** (recruteur, conseiller) : ce sont des personnes
   * rattachées, sous contrat, dont on connaît le nom. Leur opposer un 404 muet dégrade
   * leur travail sans rien protéger — l'invisibilité vise un public inconnu, pas un
   * collègue qui perd son formulaire en cours. Jamais applicable aux visiteurs ni aux
   * bénéficiaires.
   */
  silentClose: boolean
  /** Valeur en l'absence de surcharge en base. */
  defaultEnabled: boolean
  /** Socle non masquable : toggle grisé côté UI et refus côté serveur. */
  locked?: boolean
}
