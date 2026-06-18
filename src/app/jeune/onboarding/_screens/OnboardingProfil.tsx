'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Chip } from '@/components/ui/Chip'
import { StepBar } from '@/components/ui/StepBar'
import { FooterCTA } from '@/components/ui/FooterCTA'
import { REGIONS_SENEGAL } from '@/lib/regions'
import { patchDraft, readDraft } from '@/lib/onboarding-draft'
import { stepIdentiteSchema, stepLocalisationSchema } from '@/lib/validations/onboarding'

/**
 * Libellés des mois en français pour les 3 selects de date de naissance.
 * F-01 : remplace l'input[type=date] natif dont le format varie selon la locale
 * navigateur (mm/dd/yyyy en en-US). Assure un format FR garanti.
 */
const MOIS_FR = [
  { value: '01', label: 'janvier' },
  { value: '02', label: 'février' },
  { value: '03', label: 'mars' },
  { value: '04', label: 'avril' },
  { value: '05', label: 'mai' },
  { value: '06', label: 'juin' },
  { value: '07', label: 'juillet' },
  { value: '08', label: 'août' },
  { value: '09', label: 'septembre' },
  { value: '10', label: 'octobre' },
  { value: '11', label: 'novembre' },
  { value: '12', label: 'décembre' },
]

const CURRENT_YEAR = new Date().getFullYear()
/** Années de l'année courante-15 jusqu'à l'année courante-80 */
const ANNEE_OPTIONS = Array.from({ length: 66 }, (_, i) => {
  const y = CURRENT_YEAR - 15 - i
  return { value: String(y), label: String(y) }
})
const JOUR_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const d = i + 1
  return { value: String(d), label: String(d) }
})

/** Parse une date YYYY-MM-DD en { jour, mois, annee } strings (ou vide si invalide) */
function parseDateParts(date: string): { jour: string; mois: string; annee: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return { jour: '', mois: '', annee: '' }
  return { annee: m[1], mois: m[2], jour: String(parseInt(m[3], 10)) }
}

/** Recompose YYYY-MM-DD depuis les 3 parts (retourne '' si incomplet) */
function buildDate(annee: string, mois: string, jour: string): string {
  if (!annee || !mois || !jour) return ''
  return `${annee}-${mois}-${jour.padStart(2, '0')}`
}

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
 *
 * F-01 : date de naissance en 3 selects FR (jour/mois/année) — le state
 * `dateNaissance` reste au format YYYY-MM-DD (contrat zod).
 */
export function OnboardingProfil({ initial }: Props) {
  const router = useRouter()
  const [prenom, setPrenom]               = useState(initial.prenom)
  const [nom, setNom]                     = useState(initial.nom)
  const [dateNaissance, setDateNaissance] = useState(initial.dateNaissance)
  const initParts = parseDateParts(initial.dateNaissance)
  const [jourDN, setJourDN]   = useState(initParts.jour)
  const [moisDN, setMoisDN]   = useState(initParts.mois)
  const [anneeDN, setAnneeDN] = useState(initParts.annee)
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
      if (draft.prenom)        setPrenom(p => p || draft.prenom!)
      if (draft.nom)           setNom(n => n || draft.nom!)
      if (draft.dateNaissance) {
        setDateNaissance(d => {
          const next = d || draft.dateNaissance!
          if (!d) {
            const parts = parseDateParts(next)
            setJourDN(j => j || parts.jour)
            setMoisDN(m => m || parts.mois)
            setAnneeDN(a => a || parts.annee)
          }
          return next
        })
      }
      if (draft.genre)         setGenre(g => g ?? draft.genre!)
      if (draft.region)        setRegion(r => r || draft.region!)
      if (draft.commune)       setCommune(c => c || draft.commune!)
    })
    return () => { alive = false }
  }, [])

  function handleJourChange(v: string) {
    setJourDN(v)
    setDateNaissance(buildDate(anneeDN, moisDN, v))
  }
  function handleMoisChange(v: string) {
    setMoisDN(v)
    setDateNaissance(buildDate(anneeDN, v, jourDN))
  }
  function handleAnneeChange(v: string) {
    setAnneeDN(v)
    setDateNaissance(buildDate(v, moisDN, jourDN))
  }

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
      router.push('/jeune/onboarding/centre-principal')
    } catch {
      setErrors({ _form: 'Erreur réseau. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-surface)' }}>
      <StepBar step={2} total={4} />

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
            {/* F-01 : 3 selects FR au lieu de input[type=date] natif */}
            <FieldLabel htmlFor="dn-jour" required>Date de naissance</FieldLabel>
            <div className="flex gap-1">
              <Select
                id="dn-jour"
                aria-label="Jour"
                value={jourDN}
                onChange={e => handleJourChange(e.target.value)}
                options={JOUR_OPTIONS}
                placeholder="Jour"
                className="flex-1"
              />
              <Select
                id="dn-mois"
                aria-label="Mois"
                value={moisDN}
                onChange={e => handleMoisChange(e.target.value)}
                options={MOIS_FR}
                placeholder="Mois"
                className="flex-1"
              />
              <Select
                id="dn-annee"
                aria-label="Année"
                value={anneeDN}
                onChange={e => handleAnneeChange(e.target.value)}
                options={ANNEE_OPTIONS}
                placeholder="Année"
                className="flex-1"
              />
            </div>
            {errors.dateNaissance ? (
              <p className="text-fs-100 text-gj-red mt-1">{errors.dateNaissance}</p>
            ) : null}
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
