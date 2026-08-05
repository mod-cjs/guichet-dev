import type { ExperienceItem, DiplomeItem, EngagementItem } from '@/types/profil'

/**
 * GUIC-689 — Parcours unifié : formations, expériences et engagements en un
 * seul flux chronologique (réf `profil-web.jsx` `TimelineCard` L.567-616).
 *
 * Un parcours se lit dans le temps, pas par catégorie administrative. La
 * difficulté est que les trois sources n'ont pas la même forme :
 *
 *   - `Experience`  : `dateDebut` / `dateFin` — un « en cours » est possible
 *   - `Diplome`     : `anneeObtention` seule — ni début, ni « en cours »
 *   - `Engagement`  : `dateDebut` / `dateFin`
 *
 * On les normalise sur une clé de tri commune (`debut`, ISO) et une période
 * lisible. Un diplôme n'ayant qu'une année, sa clé de tri est le 31 décembre de
 * cette année-là : à défaut, il passerait avant tout ce qui a commencé la même
 * année, alors que l'obtention la clôt.
 */
export interface ElementParcours {
  id: string
  type: 'formation' | 'experience' | 'engagement'
  titre: string
  organisation: string
  /** Clé de tri, date ISO `YYYY-MM-DD`. */
  debut: string
  /** Période affichée (« 2023 — en cours », « 2022 »). */
  periode: string
  enCours: boolean
}

const LIBELLE_TYPE: Record<ElementParcours['type'], string> = {
  formation: 'Formation',
  experience: 'Expérience',
  engagement: 'Engagement',
}

export function libelleType(t: ElementParcours['type']): string {
  return LIBELLE_TYPE[t]
}

const annee = (iso: string) => iso.slice(0, 4)

/** « 2023 — en cours », « 2023 — 2024 », ou « 2023 » si tout tient dans l'année. */
function periodeDe(debut: string, fin: string | null): string {
  if (!fin) return `${annee(debut)} — en cours`
  return annee(debut) === annee(fin) ? annee(debut) : `${annee(debut)} — ${annee(fin)}`
}

export function construireParcours(
  experiences: ExperienceItem[],
  diplomes: DiplomeItem[],
  engagements: EngagementItem[],
): ElementParcours[] {
  const elements: ElementParcours[] = [
    ...experiences.map((e) => ({
      id: e.id,
      type: 'experience' as const,
      titre: e.poste,
      organisation: e.organisation,
      debut: e.dateDebut,
      periode: periodeDe(e.dateDebut, e.dateFin),
      enCours: e.dateFin === null,
    })),
    ...diplomes.map((d) => ({
      id: d.id,
      type: 'formation' as const,
      titre: d.intitule,
      organisation: d.etablissement,
      // Le diplôme n'a qu'une année : on l'ancre à sa fin, l'obtention clôt
      // l'année plutôt qu'elle ne l'ouvre.
      debut: `${d.anneeObtention}-12-31`,
      periode: String(d.anneeObtention),
      enCours: false,
    })),
    ...engagements.map((g) => ({
      id: g.id,
      type: 'engagement' as const,
      titre: g.role,
      organisation: g.organisation,
      debut: g.dateDebut,
      periode: periodeDe(g.dateDebut, g.dateFin),
      enCours: g.dateFin === null,
    })),
  ]

  // Du plus récent au plus ancien ; à date égale, ce qui est en cours d'abord —
  // sinon un stage terminé passerait devant l'emploi actuel commencé le même jour.
  return elements.sort((a, b) => {
    if (a.debut !== b.debut) return a.debut < b.debut ? 1 : -1
    if (a.enCours !== b.enCours) return a.enCours ? -1 : 1
    return 0
  })
}
