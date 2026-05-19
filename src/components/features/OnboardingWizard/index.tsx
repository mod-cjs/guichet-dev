'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { Button }              from '@/components/ui/Button'
import { StepIdentite }        from './StepIdentite'
import { StepLocalisation }    from './StepLocalisation'
import { StepProfil }          from './StepProfil'
import {
  stepIdentiteSchema,
  stepLocalisationSchema,
  stepProfilSchema,
  type StepIdentiteData,
  type StepLocalisationData,
  type StepProfilData,
} from '@/lib/validations/onboarding'

type Draft = {
  identite:     Partial<StepIdentiteData>
  localisation: Partial<StepLocalisationData>
  profil:       Partial<StepProfilData>
}

const DRAFT_KEY = 'onboarding_draft'
const STEPS = ['Identité', 'Localisation', 'Profil'] as const

// Garde uniquement les champs avec une valeur explicite (pas null ni undefined)
function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<T>
}

function useDraft(initialData?: Partial<Draft>) {
  const [draft, setDraft] = useState<Draft>({ identite: {}, localisation: {}, profil: {} })

  useEffect(() => {
    // Lire localStorage
    let local: Partial<Draft> = {}
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) local = JSON.parse(raw)
    } catch {}

    // Fusion : localStorage de base, initialData (DB) a priorité sur ses champs définis.
    // Raison : les données DB sont la source de vérité ; localStorage comble les champs
    // non encore sauvegardés (session interrompue mid-step).
    const merged: Draft = {
      identite:     { ...(local.identite     ?? {}), ...(definedOnly(initialData?.identite     ?? {})) },
      localisation: { ...(local.localisation ?? {}), ...(definedOnly(initialData?.localisation ?? {})) },
      profil:       { ...(local.profil       ?? {}), ...(definedOnly(initialData?.profil       ?? {})) },
    }

    setDraft(merged)
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(merged)) } catch {}
  }, []) // effet d'initialisation — doit tourner une seule fois au montage

  function updateDraft(next: Draft) {
    setDraft(next)
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)) } catch {}
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  return { draft, updateDraft, clearDraft }
}

interface Props {
  initialData?: Partial<Draft>
}

export function OnboardingWizard({ initialData }: Props) {
  const router                             = useRouter()
  const { draft, updateDraft, clearDraft } = useDraft(initialData)
  const [step, setStep]                    = useState(1)
  const [loading, setLoading]              = useState(false)
  const [errors, setErrors]                = useState<Record<string, string>>({})

  async function handleNext() {
    setErrors({})

    let parseResult
    if (step === 1) {
      parseResult = stepIdentiteSchema.safeParse(draft.identite)
    } else if (step === 2) {
      parseResult = stepLocalisationSchema.safeParse(draft.localisation)
    } else {
      parseResult = stepProfilSchema.safeParse(draft.profil)
    }

    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parseResult.error.issues) {
        const key = issue.path[0] as string
        if (key) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const stepData =
        step === 1 ? draft.identite :
        step === 2 ? draft.localisation :
        draft.profil

      const res = await fetch('/api/v1/onboarding', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ step, data: stepData }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrors({ _form: body?.error?.message ?? 'Une erreur est survenue.' })
        return
      }

      const body = await res.json()
      if (body.data?.onboardingComplete) {
        clearDraft()
        router.push('/jeune/tableau-de-bord')
        return
      }

      setStep(s => s + 1)
    } catch {
      setErrors({ _form: 'Erreur réseau. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }

  const progressPct = Math.round(((step - 1) / STEPS.length) * 100)

  return (
    <div className="min-h-screen bg-gj-bg flex flex-col items-center justify-start px-space-4 py-space-8">
      <div className="w-full max-w-lg">

        {/* En-tête */}
        <div className="mb-space-6 text-center">
          <h1 className="text-fs-600 font-bold text-color-text-primary mb-space-1">
            Bienvenue sur Guichet Jeunesse
          </h1>
          <p className="text-fs-300 text-color-text-secondary">
            Complétez votre profil pour accéder à toutes les opportunités.
          </p>
        </div>

        {/* Barre de progression */}
        <div className="mb-space-6">
          <div className="flex justify-between mb-space-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-space-1 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-fs-200 font-bold border-2
                    ${i + 1 < step  ? 'bg-gj-teal border-gj-teal text-white' : ''}
                    ${i + 1 === step ? 'bg-white border-gj-teal text-gj-teal-deep' : ''}
                    ${i + 1 > step  ? 'bg-white border-gj-line text-gj-grey' : ''}`}
                >
                  {i + 1 < step ? (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-fs-100 font-bold ${i + 1 === step ? 'text-gj-teal-deep' : 'text-gj-grey'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-gj-line rounded-full overflow-hidden">
            <div
              className="h-full bg-gj-teal transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Carte du step */}
        <div className="bg-white rounded-gj-lg shadow-gj-sm p-space-5 mb-space-5">
          <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-4">
            Étape {step} — {STEPS[step - 1]}
          </h2>

          {step === 1 && (
            <StepIdentite
              data={draft.identite}
              errors={errors as Partial<Record<keyof StepIdentiteData, string>>}
              onChange={d => updateDraft({ ...draft, identite: d })}
            />
          )}
          {step === 2 && (
            <StepLocalisation
              data={draft.localisation}
              errors={errors as Partial<Record<keyof StepLocalisationData, string>>}
              onChange={d => updateDraft({ ...draft, localisation: d })}
            />
          )}
          {step === 3 && (
            <StepProfil
              data={draft.profil}
              errors={errors as Partial<Record<keyof StepProfilData, string>>}
              onChange={d => updateDraft({ ...draft, profil: d })}
            />
          )}

          {errors._form && (
            <p className="mt-space-3 text-fs-200 text-gj-red">{errors._form}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-space-3">
          {step > 1 && (
            <Button
              variant="ghost"
              className="flex-1"
              disabled={loading}
              onClick={() => { setErrors({}); setStep(s => s - 1) }}
            >
              Précédent
            </Button>
          )}
          <Button
            variant={step === 3 ? 'secondary' : 'primary'}
            className="flex-1"
            loading={loading}
            onClick={handleNext}
          >
            {step === 3 ? 'Terminer' : 'Suivant'}
          </Button>
        </div>

      </div>
    </div>
  )
}
