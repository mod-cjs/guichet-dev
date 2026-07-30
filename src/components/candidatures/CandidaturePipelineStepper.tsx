import { PIPELINE_STEPS, STEP_LABELS, type CandidatureDecision, type PipelineStep } from './types'

export interface CandidaturePipelineStepperProps {
  /** Étape actuelle dans le pipeline. */
  currentStep: PipelineStep
  /** Décision finale (seulement si `currentStep === 'Decision'`). */
  decision?: CandidatureDecision
  /** Masque la rangée de labels (variante très compacte). */
  hideLabels?: boolean
  /** Label aria pour la progressbar. */
  ariaLabel?: string
}

type StepState = 'done' | 'current' | 'todo'

/**
 * GUIC-689 (finding E) — réf design v5 `candidatures-web.jsx` (`CandStepper`) :
 * teal pour tout ce qui est atteint (étape courante incluse, jamais de jaune
 * « en cours »), `--gj-line` pour le reste, rouge UNIQUEMENT sur l'étape
 * finale en cas de refus (jamais de vert pour une acceptation — le dot reste
 * teal, la décision est déjà portée par la pill de statut).
 */
function stateClasses(state: StepState, isFinal: boolean, decision: CandidatureDecision): string {
  if (state === 'todo') return 'bg-gj-line'
  if (isFinal && decision === 'Refusee') return 'bg-gj-red'
  return 'bg-gj-teal'
}

function labelClasses(state: StepState): string {
  if (state === 'current') return 'text-color-text-primary font-bold'
  if (state === 'done') return 'text-gj-teal-deep font-semibold'
  return 'text-color-text-muted font-medium'
}

/**
 * Stepper 5 étapes du pipeline candidature (GUIC-190).
 *
 * Mobile-first : segments colorés sur une ligne + labels en dessous.
 * - Étapes passées : teal
 * - Étape courante : yellow (ou green/red si étape "Décision" finalisée)
 * - Étapes futures : line/grisé
 *
 * Réutilisable côté carte de liste et future page détail candidature.
 */
export function CandidaturePipelineStepper({
  currentStep,
  decision = null,
  hideLabels = false,
  ariaLabel,
}: CandidaturePipelineStepperProps) {
  const currentIndex = PIPELINE_STEPS.indexOf(currentStep)
  const total = PIPELINE_STEPS.length
  const finalStepReached = currentStep === 'Decision'
  // Si décision finale rendue (acceptée/refusée), considérer toutes les étapes faites.
  const allDone = finalStepReached && decision !== null

  const states: StepState[] = PIPELINE_STEPS.map((_, i) => {
    if (allDone) return 'done'
    if (i < currentIndex) return 'done'
    if (i === currentIndex) return 'current'
    return 'todo'
  })

  const ariaValue = allDone ? total : currentIndex + 1
  const label =
    ariaLabel ??
    (allDone
      ? `Pipeline terminé · ${decision === 'Acceptee' ? 'acceptée' : 'refusée'}`
      : `Étape ${currentIndex + 1} sur ${total} : ${STEP_LABELS[currentStep]}`)

  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ariaValue}
        aria-label={label}
        className="flex gap-1"
      >
        {states.map((state, i) => (
          <div
            key={PIPELINE_STEPS[i]}
            className={[
              'flex-1 h-[5px] rounded-[3px] transition-colors',
              stateClasses(state, i === total - 1, decision),
            ].join(' ')}
            data-testid={`stepper-segment-${PIPELINE_STEPS[i]}`}
            data-state={state}
          />
        ))}
      </div>
      {hideLabels ? null : (
        <div className="mt-space-1 flex justify-between text-[9.5px] uppercase tracking-[0.04em] leading-tight">
          {PIPELINE_STEPS.map((step, i) => (
            <span key={step} className={labelClasses(states[i])}>
              {STEP_LABELS[step]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
