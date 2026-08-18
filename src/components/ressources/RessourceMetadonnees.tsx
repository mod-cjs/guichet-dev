/**
 * GUIC-689 — Métadonnées d'une ressource, sur sa fiche.
 *
 * La maquette v5 en attend cinq : Format, Taille, Langue, Contenu, Mis à jour.
 *
 * `Format` n'y figure PAS : le hero porte déjà le badge de type juste au-dessus.
 * Répéter la même valeur à deux endroits d'un même écran est du bruit, pas de
 * l'information.
 * Trois existent réellement en base ; **taille et pagination n'existent pas du
 * tout** dans le modèle `Ressource`.
 *
 * On affiche donc ce qu'on a et on TAIT le reste : ni tiret, ni « non précisé ».
 * Une ligne vide se lit comme une donnée manquante — alors qu'ici elle n'a
 * jamais existé. Les ajouter au modèle sans que personne ne les renseigne
 * produirait exactement le défaut qu'on évite.
 */
import type { LangueRessourceValue, NiveauRessourceValue, TypeRessourceValue } from '@/lib/loaders/ressources'

export interface RessourceMetadonneesProps {
  /** Conservé au contrat : le hero l'affiche, ce bloc ne le répète pas. */
  type: TypeRessourceValue
  langue: LangueRessourceValue | null
  niveau: NiveauRessourceValue | null
  theme: string
  /** ISO 8601. */
  updatedAt: string
}

const NIVEAU_LABEL: Record<NiveauRessourceValue, string> = {
  Debutant: 'Débutant',
  Intermediaire: 'Intermédiaire',
  Avance: 'Avancé',
}

const LANGUE_LABEL: Record<LangueRessourceValue, string> = {
  FR: 'Français',
  Wolof: 'Wolof',
}

const moisFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <dt className="text-fs-100 text-color-text-muted uppercase tracking-[0.04em]">{label}</dt>
      <dd className="text-fs-200 font-bold text-color-text-primary m-0">{valeur}</dd>
    </div>
  )
}

export function RessourceMetadonnees({
  // Conservé au contrat pour que l'appelant n'ait pas à savoir ce qu'on affiche,
  // mais volontairement NON rendu : le hero porte déjà le badge de type.
  type: _type,
  langue,
  niveau,
  theme,
  updatedAt,
}: RessourceMetadonneesProps) {
  return (
    <dl
      className="flex flex-wrap gap-x-space-5 gap-y-space-3 m-0"
      data-testid="ressource-metadonnees"
    >
      <Ligne label="Thème" valeur={theme} />
      {langue && <Ligne label="Langue" valeur={LANGUE_LABEL[langue]} />}
      {niveau && <Ligne label="Niveau" valeur={NIVEAU_LABEL[niveau]} />}
      <Ligne label="Mis à jour" valeur={moisFmt.format(new Date(updatedAt))} />
    </dl>
  )
}
