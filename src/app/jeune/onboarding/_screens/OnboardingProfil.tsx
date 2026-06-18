'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { Input } from '@/components/ui/Input'
import { Chip } from '@/components/ui/Chip'
import { StepBar } from '@/components/ui/StepBar'
import { FooterCTA } from '@/components/ui/FooterCTA'
import { REGIONS_SENEGAL } from '@/lib/regions'
import { patchDraft, readDraft } from '@/lib/onboarding-draft'
import { stepIdentiteSchema, stepLocalisationSchema } from '@/lib/validations/onboarding'

interface InitialData {
  prenom:        string
  nom:           string
  dateNaissance: string
  genre:         'M' | 'F' | null
  region:        string
  commune:       string
}

interface Props {
  initial: InitialData
}

/**
 * Onboarding écran 4/5 — Profil minimal.
 *
 * Soumet les 2 premières étapes du contrat `/api/v1/onboarding` :
 * 1. Identité (prénom, nom, dateNaissance, genre)
 * 2. Localisation (region, commune)
 *
 * Le step 3 (profil — niveau études, situation, domaines) est appelé sur
 * l'écran 5 "Recommendations" pour finaliser et marquer
 * `onboardingComplete=true`.
 */
export function OnboardingProfil({ initial }: Props) {
  const router = useRouter()
  const [prenom, setPrenom]               = useState(initial.prenom)
  const [nom, setNom]                     = useState(initial.nom)
  const [dateNaissance, setDateNaissance] = useState(initial.dateNaissance)
  const [genre, setGenre]                 = useState<'M' | 'F' | 'Autre' | null>(initial.genre)
  const [region, setRegion]               = useState(initial.region)
  const [commune, setCommune]             = useState(initial.commune)
  const [loading, setLoading]             = useState(false)
  const [errors, setErrors]               = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    // On ne surcharge que les champs vides actuellement (cas reprise) pour
    // éviter d'écraser une saisie en cours si le fetch tarde.
    readDraft().then(draft => {
      if (!alive) return
      if (draft.prenom)        setPrenom(p        => p        || draft.prenom!)
      if (draft.nom)           setNom(n           => n           || draft.nom!)
      if (draft.dateNaissance) setDateNaissance(d => d || draft.dateNaissance!)
      if (draft.genre)         setGenre(g         => g         ?? draft.genre!)
      if (draft.region)        setRegion(r        => r        || draft.region!)
      if (draft.commune)       setCommune(c       => c       || draft.commune!)
    })
    return () => { alive = false }
  }, [])

  function setGenreAndPersist(g: 'M' | 'F' | 'Autre') {
    setGenre(g)
    // 'Autre' n'est pas envoyé à l'API (enum Prisma = M|F seulement).
    // On garde l'info en local pour l'UX mais on n'altère pas le draft persisté.
    if (g === 'M' || g === 'F') void patchDraft({ genre: g })
  }

  async function handleSubmit() {
    setErrors({})
    setLoading(true)

    // Validation client
    const id = stepIdentiteSchema.safeParse({
      prenom: prenom.trim(),
      nom: nom.trim(),
      dateNaissance: dateNaissance || null,
      // L'enum Prisma n'accepte que M ou F : 'Autre' est ignoré côté API.
      genre: genre === 'M' || genre === 'F' ? genre : null,
    })
    const loc = stepLocalisationSchema.safeParse({
      region: region,
      commune: commune || null,
    })

    if (!id.success || !loc.success) {
      const errs: Record<string, string> = {}
      for (const i of id.success ? [] : id.error.issues) errs[i.path[0] as string] = i.message
      for (const i of loc.success ? [] : loc.error.issues) errs[i.path[0] as string] = i.message
      setErrors(errs)
      setLoading(false)
      return
    }

    try {
      // Step 1 — identité
      const r1 = await fetch('/api/v1/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, data: id.data }),
      })
      if (!r1.ok) {
        const body = await r1.json().catch(() => ({}))
        setErrors({ _form: body?.error?.message ?? 'Erreur — étape identité.' })
        return
      }
      // Step 2 — localisation
      const r2 = await fetch('/api/v1/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, data: loc.data }),
      })
      if (!r2.ok) {
        const body = await r2.json().catch(() => ({}))
        setErrors({ _form: body?.error?.message ?? 'Erreur — étape localisation.' })
        return
      }

      await patchDraft({
        prenom: prenom.trim(),
        nom: nom.trim(),
        dateNaissance: dateNaissance || undefined,
        region,
        commune: commune || undefined,
      })
      router.push('/jeune/onboarding/recommandations')
    } catch {
      setErrors({ _form: 'Erreur réseau. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-surface)' }}>
      <StepBar step={3} total={5} />

      <div className="flex-1 flex flex-col gap-space-3 px-space-4 py-space-5 overflow-y-auto">
        <div>
          <h1 className="font-black text-color-text-primary text-fs-500" style={{ lineHeight: 1.2 }}>
            Qui es-tu&nbsp;?
          </h1>
          <p className="text-fs-100 text-gj-grey mt-1" style={{ lineHeight: 1.5 }}>
            On garde tes infos privées. Tu choisis ce que les recruteurs voient.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="prenom" required>Prénom</FieldLabel>
          <Input
            id="prenom"
            value={prenom}
            onChange={e => setPrenom(e.target.value)}
            error={errors.prenom}
            autoComplete="given-name"
          />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="nom" required>Nom</FieldLabel>
          <Input
            id="nom"
            value={nom}
            onChange={e => setNom(e.target.value)}
            error={errors.nom}
            autoComplete="family-name"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="date-naissance" required>Date de naissance</FieldLabel>
            <Input
              id="date-naissance"
              type="date"
              value={dateNaissance}
              onChange={e => setDateNaissance(e.target.value)}
              error={errors.dateNaissance}
              autoComplete="bday"
            />
          </div>
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="genre-group" required>Genre</FieldLabel>
            <div id="genre-group" className="flex gap-1" role="group" aria-label="Genre">
              {(['F', 'M', 'Autre'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenreAndPersist(g)}
                  aria-pressed={genre === g}
                  className="flex-1 font-bold"
                  style={{
                    padding: '12px 4px',
                    border: `1.5px solid ${genre === g ? 'var(--gj-teal)' : 'var(--gj-line)'}`,
                    background: genre === g ? 'var(--gj-teal-soft)' : 'var(--gj-surface)',
                    color: genre === g ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
                    borderRadius: 10,
                    fontSize: 13,
                    minHeight: 50,
                    cursor: 'pointer',
                  }}
                >
                  {g === 'F' ? 'Femme' : g === 'M' ? 'Homme' : 'Non précisé'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-gj-line my-1" />

        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="region-group" required>Région</FieldLabel>
          <div id="region-group" className="flex flex-wrap gap-1" role="group" aria-label="Région">
            {REGIONS_SENEGAL.map(r => (
              <Chip
                key={r.value}
                selected={region === r.value}
                onClick={() => {
                  setRegion(r.value)
                  void patchDraft({ region: r.value })
                }}
              >
                {r.label}
              </Chip>
            ))}
          </div>
          {errors.region ? (
            <p className="text-fs-100 text-gj-red mt-1">{errors.region}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="commune">
            Commune <span className="text-fs-100 text-gj-grey-2 font-semibold ml-1">FACULTATIF</span>
          </FieldLabel>
          <Input
            id="commune"
            placeholder="ex. Bakel, Kidira…"
            value={commune}
            onChange={e => {
              setCommune(e.target.value)
              void patchDraft({ commune: e.target.value || undefined })
            }}
          />
        </div>

        {errors._form ? (
          <p className="text-fs-200 text-gj-red mt-2" role="alert">{errors._form}</p>
        ) : null}
      </div>

      <FooterCTA
        primary={{ label: 'Continuer', onClick: handleSubmit }}
        secondary={{ label: '← Retour', onClick: () => window.history.back() }}
        loading={loading}
      />
    </div>
  )
}
