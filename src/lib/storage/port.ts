// GUIC-565 — Contrat de stockage objet, indépendant du fournisseur.
//
// Deux implémentations :
//   - `s3-adapter`     → MinIO (production OVH) et tout S3 compatible ;
//   - `vercel-adapter` → Vercel Blob (miroir de dev déployé sur Vercel, qui ne peut pas
//                        joindre le MinIO du serveur : il écoute sur la boucle locale).
//
// Les fichiers manipulés ici — CV, photos, diplômes, justificatifs — sont des DONNÉES
// PERSONNELLES. La référence renvoyée par `televerser` n'est donc jamais une URL publique :
// elle est stockée en base, et l'application sert le contenu elle-même après avoir vérifié
// l'autorisation (c'était déjà le cas avec Vercel Blob, via `proxyPrivateBlob`).

/** Un objet déposé, tel que renvoyé par `televerser`. */
export interface ObjetDepose {
  /** Référence à persister en base (`s3://bucket/clé` ou URL Vercel héritée). */
  reference: string
  /** Chemin logique dans le bucket (`profil-cv/<uid>/cv-a1b2.pdf`). */
  chemin: string
}

/** Un objet listé (nettoyage des orphelins). */
export interface ObjetListe {
  reference: string
  chemin: string
  taille: number
  deposeLe: Date
}

export interface PageObjets {
  objets: ObjetListe[]
  /** Absent quand la dernière page est atteinte. */
  curseur?: string
}

/** Contenu d'un objet, prêt à être streamé au client. */
export interface ContenuObjet {
  corps: ReadableStream<Uint8Array>
  contentType: string
  taille?: number
}

export interface OptionsTeleversement {
  /** Chemin logique souhaité. Un suffixe aléatoire est ajouté pour éviter tout écrasement. */
  chemin: string
  fichier: File
  /** Durée de cache côté client, en secondes. */
  cacheMaxAgeSec?: number
  /**
   * Visibilité chez le fournisseur. Défaut : `prive`.
   *
   * N'a d'effet que sur Vercel Blob. Sur MinIO le bucket est privé de bout en bout : c'est
   * TOUJOURS l'application qui sert le contenu, après vérification de l'autorisation.
   *
   * ⚠️ Certains appels historiques déposent en `public` (photos de profil, CV du profil).
   * On préserve ce comportement à l'identique pour ne rien casser — mais c'est un sujet CDP
   * à trancher : un CV déposé en `public` est accessible à qui connaît son URL.
   */
  acces?: 'public' | 'prive'
}

export interface OptionsListage {
  prefixe: string
  curseur?: string
}

/** Ce que doit savoir faire un fournisseur de stockage. */
export interface StockagePort {
  televerser(opts: OptionsTeleversement): Promise<ObjetDepose>
  lire(reference: string): Promise<ContenuObjet>
  lister(opts: OptionsListage): Promise<PageObjets>
  supprimer(reference: string): Promise<void>
}
