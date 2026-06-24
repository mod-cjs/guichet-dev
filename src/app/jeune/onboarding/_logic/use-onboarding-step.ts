'use client'

/**
 * Hooks partagés entre l'onboarding mobile (`_screens/*`) et web
 * (`_screens-web/*`).
 *
 * Le design web (split hero desktop) diffère radicalement du mobile (PhoneFrame),
 * mais la logique métier est identique : mêmes objectifs, mêmes validations,
 * même API `/api/v1/onboarding`, même draft Prisma (GUIC-181).
 *
 * On extrait donc ici :
 *   - `useObjectifsStep`  → toggle + persistance sessionStorage (écran 3)
 *   - `useProfilStep`     → state form + validation Zod + submit (écran 4)
 *   - `useRecommandationsStep` → finalisation step 3 + clearDraft (écran 5)
 *
 * Les écrans Welcome (1) et Telephone (2) n'ont pas de logique métier
 * (CTA pures redirections SSO), donc pas de hook dédié.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  patchDraft, readDraft, clearDraft,
  type ObjectifId, type OnboardingDraft,
} from '@/lib/onboarding-draft'
import {
  stepLocalisationSchema, validateIdentiteProfil,
} from '@/lib/validations/onboarding'

// ─── Écran 3 — Objectifs ────────────────────────────────────────────────────

export interface UseObjectifsResult {
  selected: ObjectifId[]
  count:    number
  toggle:   (id: ObjectifId) => void
  next:     () => Promise<void>
  skip:     () => Promise<void>
}

export function useObjectifsStep(nextRoute = '/jeune/onboarding/profil'): UseObjectifsResult {
  const router = useRouter()
  const [selected, setSelected] = useState<ObjectifId[]>([])

  useEffect(() => {
    let alive = true
    readDraft().then(d => {
      if (alive && d.objectifs.length > 0) setSelected(d.objectifs)
    })
    return () => { alive = false }
  }, [])

  function toggle(id: ObjectifId) {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      void patchDraft({ objectifs: next })
      return next
    })
  }

  async function next() {
    await patchDraft({ objectifs: selected })
    router.push(nextRoute)
  }

  async function skip() {
    await patchDraft({ objectifs: [] })
    router.push(nextRoute)
  }

  return { selected, count: selected.length, toggle, next, skip }
}

// ─── Écran 4 — Profil ───────────────────────────────────────────────────────

export interface ProfilInitial {
  prenom:        string
  nom:           string
  dateNaissance: string
  genre:         'M' | 'F' | null
  region:        string
  commune:       string
}

export interface UseProfilResult {
  prenom:        string;   setPrenom:        (v: string) => void
  nom:           string;   setNom:           (v: string) => void
  dateNaissance: string;   setDateNaissance: (v: string) => void
  genre:         'M' | 'F' | 'Autre' | null
  setGenre:      (g: 'M' | 'F' | 'Autre') => void
  region:        string;   setRegion:        (v: string) => void
  commune:       string;   setCommune:       (v: string) => void
  loading:       boolean
  errors:        Record<string, string>
  submit:        () => Promise<void>
}

export function useProfilStep(
  initial: ProfilInitial,
  nextRoute = '/jeune/onboarding/centre-principal',
): UseProfilResult {
  const router = useRouter()
  const [prenom, setPrenom]               = useState(initial.prenom)
  const [nom, setNom]                     = useState(initial.nom)
  const [dateNaissance, setDateNaissance] = useState(initial.dateNaissance)
  const [genre, setGenreInner]            = useState<'M' | 'F' | 'Autre' | null>(initial.genre)
  const [region, setRegionInner]          = useState(initial.region)
  const [commune, setCommuneInner]        = useState(initial.commune)
  const [loading, setLoading]             = useState(false)
  const [errors, setErrors]               = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    readDraft().then(draft => {
      if (!alive) return
      if (draft.prenom)        setPrenom(p => p || draft.prenom!)
      if (draft.nom)           setNom(n => n || draft.nom!)
      if (draft.dateNaissance) setDateNaissance(d => d || draft.dateNaissance!)
      if (draft.genre)         setGenreInner(g => g ?? draft.genre!)
      if (draft.region)        setRegionInner(r => r || draft.region!)
      if (draft.commune)       setCommuneInner(c => c || draft.commune!)
    })
    return () => { alive = false }
  }, [])

  function setGenre(g: 'M' | 'F' | 'Autre') {
    setGenreInner(g)
    if (g === 'M' || g === 'F') void patchDraft({ genre: g })
  }

  function setRegion(v: string) {
    setRegionInner(v)
    void patchDraft({ region: v })
  }

  function setCommune(v: string) {
    setCommuneInner(v)
    void patchDraft({ commune: v || undefined })
  }

  async function submit() {
    setErrors({})
    setLoading(true)

    const errs = validateIdentiteProfil({ nom, prenom, dateNaissance, genre })
    const loc = stepLocalisationSchema.safeParse({
      region,
      commune: commune || null,
    })
    if (!loc.success) {
      for (const i of loc.error.issues) {
        const key = i.path[0]
        if (typeof key === 'string' && !errs[key]) errs[key] = i.message
      }
    }

    if (Object.keys(errs).length > 0 || !loc.success) {
      setErrors(errs)
      setLoading(false)
      return
    }

    const identiteData = {
      prenom: prenom.trim(),
      nom: nom.trim(),
      dateNaissance: dateNaissance || null,
      genre: genre === 'M' || genre === 'F' ? genre : null,
    }

    try {
      const r1 = await fetch('/api/v1/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, data: identiteData }),
      })
      if (!r1.ok) {
        const body = await r1.json().catch(() => ({}))
        setErrors({ _form: body?.error?.message ?? 'Erreur — étape identité.' })
        return
      }
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
      router.push(nextRoute)
    } catch {
      setErrors({ _form: 'Erreur réseau. Veuillez réessayer.' })
    } finally {
      setLoading(false)
    }
  }

  return {
    prenom,        setPrenom,
    nom,           setNom,
    dateNaissance, setDateNaissance,
    genre,         setGenre,
    region,        setRegion,
    commune,       setCommune,
    loading,       errors,
    submit,
  }
}

// ─── Écran 5 — Recommandations ──────────────────────────────────────────────

/** Mapping objectif → domaine (`Domaine` enum Prisma). Cf GUIC-181. */
export function mapObjectifToDomaine(o: string): string | null {
  switch (o) {
    case 'agriculture': return 'Agriculture'
    case 'formation':   return 'Education'
    case 'engagement':  return 'Citoyennete'
    case 'projet':      return 'Entrepreneuriat'
    case 'emploi':      return null
    default:            return null
  }
}

export interface UseRecommandationsResult {
  draft:    OnboardingDraft
  loading:  boolean
  finalise: (redirectTo: string) => Promise<void>
}

export function useRecommandationsStep(): UseRecommandationsResult {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<OnboardingDraft>({ objectifs: [] })

  useEffect(() => {
    let alive = true
    readDraft().then(d => { if (alive) setDraft(d) })
    return () => { alive = false }
  }, [])

  async function finalise(redirectTo: string) {
    setLoading(true)
    try {
      const domainesInteret = draft.objectifs
        .map(mapObjectifToDomaine)
        .filter((v): v is string => v !== null)

      const r = await fetch('/api/v1/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 3, data: { domainesInteret } }),
      })
      if (!r.ok) {
        setLoading(false)
        return
      }
      await clearDraft()
      router.push(redirectTo)
    } catch {
      setLoading(false)
    }
  }

  return { draft, loading, finalise }
}
