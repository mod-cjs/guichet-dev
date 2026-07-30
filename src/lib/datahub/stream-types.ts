/**
 * M13 / Data Hub — socle typé du contrat d'export (lot 3, spec §7.1).
 *
 * CE QUE CE FICHIER GARANTIT
 * Le contrat d'export est déclaré en TypeScript et vérifié par `tsc`, pas par revue de
 * code. Trois erreurs deviennent impossibles à committer :
 *   - déclarer une colonne qui n'existe pas sur le modèle ;
 *   - poser une transformation dont la signature ne correspond pas au type de la colonne ;
 *   - désigner comme clé de réplication une colonne qui n'est pas une date.
 *
 * FAIL-CLOSED — le principe qui rend l'ensemble défendable devant la CDP : seules les
 * colonnes explicitement listées sortent. Une colonne ajoutée demain au schéma n'atterrit
 * pas dans l'entrepôt par inadvertance ; il faut un acte délibéré, relu, pour l'exporter.
 *
 * Les types viennent de `Prisma.TypeMap`, qui expose les champs scalaires de chaque modèle
 * AVEC leur type TypeScript — d'où la vérification des transformations.
 */
import type { Prisma } from '@prisma/client'

export type ModelName = Prisma.ModelName

/** Champs scalaires d'un modèle et leurs types — les relations en sont absentes. */
type Scalars<M extends ModelName> = Prisma.TypeMap['model'][M]['payload']['scalars']

/** Noms des colonnes réelles d'un modèle. */
export type ScalarField<M extends ModelName> = keyof Scalars<M> & string

/** Colonnes de type date — seules candidates valides comme watermark ou soft-delete. */
export type DateField<M extends ModelName> = {
  [K in ScalarField<M>]: Scalars<M>[K] extends Date | null ? K : never
}[ScalarField<M>]

/**
 * Niveau de confidentialité, qui pilote le périmètre d'une clé API.
 *
 * `public`     — aucune ré-identification possible, même par croisement.
 * `pseudonyme` — porte une clé de jointure (cjs_uid et identifiants liés). Permet de
 *                relier les flux entre eux dans l'entrepôt, ce qui fait entrer celui-ci
 *                dans le périmètre CDP (spec §6.1).
 *
 * Il n'existe volontairement pas de niveau « données personnelles » : aucune clé, quelles
 * que soient ses permissions, ne peut obtenir un nom, un téléphone, un e-mail, une date de
 * naissance brute, une IP ou un texte libre saisi par un jeune.
 */
export type Tier = 'public' | 'pseudonyme'

export interface FieldSpec<M extends ModelName, K extends ScalarField<M>> {
  /** Nom de la colonne dans l'entrepôt — snake_case, stable, indépendant du nom Prisma. */
  as: string
  tier: Tier
  /**
   * Dérivation appliquée avant export. Sa signature est contrainte par le type réel de la
   * colonne : brancher une transformation de date sur une colonne texte ne compile pas.
   * Sert notamment à ne jamais exporter une donnée brute quand sa forme dérivée suffit
   * (`dateNaissance` → `tranche_age`).
   */
  transform?: (value: Scalars<M>[K]) => unknown
}

export interface StreamSpec<M extends ModelName> {
  /** Clé primaire — départage les ex æquo du watermark dans le curseur d'extraction. */
  primaryKey: ScalarField<M>
  /** Colonne portant la date de dernière modification, base de l'extraction incrémentale. */
  replicationKey: DateField<M>
  /** Colonne de suppression logique, si le modèle en a une (spec §3, DA-5). */
  softDelete?: DateField<M>
  fields: { [K in ScalarField<M>]?: FieldSpec<M, K> }
}

export interface StreamDefinition<M extends ModelName = ModelName> extends StreamSpec<M> {
  model: M
}

/**
 * Un flux, quel que soit son modèle — UNION sur les modèles, jamais `StreamDefinition<ModelName>`.
 * Ce dernier intersecterait les champs de tous les modèles et donnerait `never` : aucun flux
 * ne pourrait plus être déclaré. C'est le type à utiliser partout où l'on manipule des flux
 * hétérogènes (registre, générateur, tests).
 */
export type AnyStreamDefinition = { [M in ModelName]: StreamDefinition<M> }[ModelName]

/** Déclare un flux. Le paramètre `model` fixe le modèle sur lequel tout le reste est vérifié. */
export function defineStream<M extends ModelName>(
  model: M,
  spec: StreamSpec<M>
): StreamDefinition<M> {
  return { model, ...spec }
}

/**
 * Colonnes qui ne doivent JAMAIS sortir, quel que soit le flux ou la clé appelante.
 *
 * Doublon volontaire de la sélection : l'allowlist protège déjà, mais une liste
 * d'interdiction explicite et testée survit à une erreur d'inattention dans le contrat.
 *
 * Deux formes d'entrée. Un nom nu (`telephone`) interdit ce champ sur TOUS les modèles —
 * réservé à ce qui est une donnée personnelle quel que soit son porteur, de sorte qu'un
 * modèle ajouté demain soit couvert d'office. Un nom qualifié (`Utilisateur.nom`) ne vise
 * qu'un modèle : `nom` désigne une personne sur `Utilisateur` mais une organisation sur
 * `Centre` ou `Programme`, et interdire les trois bloquerait des données parfaitement
 * publiques.
 */
export const CHAMPS_INTERDITS: readonly string[] = [
  'Utilisateur.nom',
  'Utilisateur.prenom',
  'Centre.responsable',
  'telephone',
  'email',
  'conseillerEmail',
  'consentIp',
  'cvUrl',
  'lettreMotivation',
  'formulaireData',
  'biographie',
  'photoUrl',
  'scoreRaison',
  'motif',
  'raisonRefusOuAnnul',
  'motifRejet',
  'justifFileUrl',
  'jwtNonce',
  'prefsAccessibilite',
]

/**
 * Colonnes exportables UNIQUEMENT sous forme dérivée, jamais brutes.
 *
 * Distinctes des interdites : leur valeur analytique est réelle — l'âge structure tout le
 * pilotage d'un programme jeunesse — mais la donnée source est identifiante. Le contrat
 * doit donc porter une transformation, et le test le vérifie. Une exception étroite et
 * nommée vaut mieux qu'un assouplissement général de la liste d'interdiction.
 */
export const CHAMPS_DERIVABLES: readonly string[] = ['dateNaissance']

/** Une entrée de liste vise-t-elle ce champ ? Accepte la forme nue et la forme qualifiée. */
export function estListe(
  liste: readonly string[],
  model: string,
  field: string
): boolean {
  return liste.includes(field) || liste.includes(`${model}.${field}`)
}
