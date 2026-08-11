/**
 * GUIC-689 (É-13) — Aside du détail de candidature.
 *
 * La v5 (`candidatures-web.jsx:134-206`) en fait le cœur de l'écran : ce qui va
 * se passer, ce qu'il faut savoir de l'offre, ce que contient le dossier.
 *
 * Principe qui gouverne tout ce fichier : **rien d'inventé**. Un champ absent
 * ne devient ni un tiret ni « non précisé » — la ligne disparaît, et un bloc
 * entièrement vide ne s'affiche pas. Une valeur de remplissage se lit comme une
 * donnée réelle : c'est le défaut qu'on a corrigé trois fois sur cet écran.
 */
import { Card, Icon } from '@/components/ui'
import type { CandidatureDetailDTO } from '@/lib/candidature-detail-loader'

export interface CandidatureAsideProps {
  candidature: CandidatureDetailDTO
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateHeureFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

const MODE_LABEL: Record<string, string> = {
  Presentiel: 'en présentiel',
  Visio: 'en visio',
  Telephone: 'par téléphone',
}

const STATUT_ETAPE: Record<string, string> = {
  En_attente: 'En attente de lecture par le recruteur.',
  Vue: 'Le recruteur étudie ton dossier.',
  Retenue: 'Ta candidature a été retenue.',
  Refusee: 'Ta candidature n’a pas été retenue cette fois.',
  Retiree: 'Tu as retiré cette candidature.',
}

/**
 * Ce qui va se passer ensuite.
 *
 * Un entretien PLANIFIÉ l'emporte sur le statut : il porte une date, donc une
 * information plus précise que « le recruteur étudie ton dossier ». Un
 * entretien annulé ou terminé n'est pas une prochaine étape.
 */
function prochaineEtape(c: CandidatureDetailDTO): string {
  const e = c.entretien
  if (e && e.statut === 'Planifie') {
    const mode = MODE_LABEL[e.mode] ?? ''
    return `Entretien le ${dateHeureFmt.format(new Date(e.dateHeure))} ${mode}.`.replace(/\s+\./, '.')
  }
  return STATUT_ETAPE[c.statut] ?? 'Candidature en cours de traitement.'
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-space-2">
      <span className="text-fs-100 text-color-text-muted">{label}</span>
      <span className="text-fs-200 font-bold text-color-text-primary text-right">{valeur}</span>
    </div>
  )
}

export function CandidatureAside({ candidature: c }: CandidatureAsideProps) {
  const { region, remuneration, deadline } = c.opportunite
  // Le bloc « offre » n'existe que s'il a quelque chose à dire.
  const aOffre = Boolean(region || remuneration || deadline)

  return (
    <div className="flex flex-col gap-space-3">
      <Card>
        <h2 className="text-fs-300 font-black text-color-text-primary">Prochaine étape</h2>
        <p
          className="mt-space-2 text-fs-200 text-color-text-secondary"
          data-testid="aside-prochaine-etape"
        >
          {prochaineEtape(c)}
        </p>
      </Card>

      {aOffre && (
        <Card>
          <h2 className="text-fs-300 font-black text-color-text-primary">L’offre</h2>
          <div className="mt-space-2 flex flex-col gap-space-2" data-testid="aside-offre">
            {region && <Ligne label="Région" valeur={region} />}
            {remuneration && <Ligne label="Rémunération" valeur={remuneration} />}
            {deadline && (
              <Ligne label="Date limite" valeur={dateFmt.format(new Date(deadline))} />
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-fs-300 font-black text-color-text-primary">Mon dossier</h2>
        <ul className="mt-space-2 flex flex-col gap-space-1 list-none p-0 m-0" data-testid="aside-dossier">
          <li className="flex items-center gap-space-2 text-fs-200 text-color-text-secondary">
            <Icon name={c.cvUrl ? 'check-circle' : 'info'} size={16} />
            {/* Dire ce qui MANQUE autant que ce qui est joint : un dossier
                incomplet doit se voir, c'est actionnable. */}
            <span>{c.cvUrl ? 'CV joint' : 'Aucun CV joint'}</span>
          </li>
          <li className="flex items-center gap-space-2 text-fs-200 text-color-text-secondary">
            <Icon name={c.lettreMotivation ? 'check-circle' : 'info'} size={16} />
            <span>{c.lettreMotivation ? 'Lettre de motivation jointe' : 'Aucune lettre de motivation'}</span>
          </li>
          <li className="text-fs-100 text-color-text-muted mt-space-1">
            {/* `updatedAt`, jamais `soumiseA` : les confondre ferait croire que
                rien n'a bougé depuis l'envoi. */}
            Dernière mise à jour le {dateFmt.format(new Date(c.updatedAt))}
          </li>
        </ul>
      </Card>
    </div>
  )
}
