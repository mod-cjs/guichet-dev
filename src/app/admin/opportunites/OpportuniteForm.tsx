'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { ProgrammesField, type ProgrammeOption } from '@/components/admin/ProgrammesField'
import { creerOpportunite, modifierOpportunite } from './actions'
import type { SousTypeSlug } from '@/lib/services/opportunite-service'
import { DOMAINES_VISIBLES, libelleDomaine } from '@/lib/domaines'

// ─── Options d'enum (miroir de prisma/schema.prisma) ───────────────────────────

type Opt = { value: string; label: string }
const opts = (...v: string[]): Opt[] => v.map((x) => ({ value: x, label: x.replace(/_/g, ' ') }))

// GUIC-689 — la liste était recopiée en `string[]` NON typé : après la refonte
// de taxonomie, tsc n'aurait rien signalé et le formulaire aurait proposé des
// valeurs mortes, l'échec n'arrivant qu'à l'enregistrement.
const DOMAINES = DOMAINES_VISIBLES.map((d) => ({ value: d, label: libelleDomaine(d) }))
const REGIONS = opts('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou')
const NIVEAUX = opts('BFEM', 'BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_5', 'DOCTORAT')
const TYPE_CONTRAT = opts('CDI', 'CDD', 'FREELANCE', 'ALTERNANCE', 'STAGE_ALTERNE')
const MODALITE_FORMATION = opts('PRESENTIEL', 'DISTANCE', 'HYBRIDE')
const TYPE_FINANCEMENT = opts('MICROCREDIT', 'SUBVENTION', 'DOTATION', 'PRET_HONNEUR', 'CAPITAL_AMORCAGE')
const MODALITE_MENTORAT = opts('INDIVIDUEL', 'GROUPE', 'COHORTE')
const TYPE_MOBILITE = opts('ETUDE', 'STAGE', 'PROFESSIONNELLE', 'RECHERCHE')
const TYPE_VOLONTARIAT = opts('SERVICE_CIVIQUE', 'ENGAGEMENT', 'INTERNATIONAL', 'HUMANITAIRE')

const STATUTS: Opt[] = [
  { value: 'brouillon', label: 'Brouillon (à modérer)' },
  { value: 'publiee', label: 'Publiée (en ligne)' },
  { value: 'archivee', label: 'Archivée' },
]

// ─── Descripteurs de champs par sous-type ──────────────────────────────────────

type FieldKind = 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date'
interface FieldDef {
  name: string
  label: string
  kind: FieldKind
  required?: boolean
  options?: Opt[]
}

/** Champs spécifiques par sous-type — les `required` reflètent les inputs du service. */
const SUBTYPE_FIELDS: Record<SousTypeSlug, FieldDef[]> = {
  emploi: [
    { name: 'typeContrat', label: 'Type de contrat', kind: 'select', required: true, options: TYPE_CONTRAT },
    { name: 'dureeContratMois', label: 'Durée du contrat (mois)', kind: 'number' },
    { name: 'experienceRequise', label: 'Expérience requise', kind: 'text' },
    { name: 'teletravail', label: 'Télétravail possible', kind: 'checkbox' },
    { name: 'niveauEtudeMin', label: 'Niveau d’étude minimum', kind: 'select', options: NIVEAUX },
  ],
  stage: [
    { name: 'dureeMois', label: 'Durée (mois)', kind: 'number', required: true },
    { name: 'conventionneEcole', label: 'Conventionné avec une école', kind: 'checkbox' },
    { name: 'indemnise', label: 'Indemnisé', kind: 'checkbox' },
    { name: 'indemniteMensuelleFcfa', label: 'Indemnité mensuelle (FCFA)', kind: 'number' },
    { name: 'niveauEtudeMin', label: 'Niveau d’étude minimum', kind: 'select', options: NIVEAUX },
    { name: 'dateDebutPrevue', label: 'Date de début prévue', kind: 'date' },
  ],
  formation: [
    { name: 'dureeHeures', label: 'Durée (heures)', kind: 'number', required: true },
    { name: 'modalite', label: 'Modalité', kind: 'select', required: true, options: MODALITE_FORMATION },
    { name: 'certifiante', label: 'Certifiante', kind: 'checkbox' },
    { name: 'organismeCertificateur', label: 'Organisme certificateur', kind: 'text' },
    { name: 'prerequis', label: 'Prérequis', kind: 'text' },
    { name: 'gratuite', label: 'Gratuite', kind: 'checkbox' },
    { name: 'fraisInscriptionFcfa', label: 'Frais d’inscription (FCFA)', kind: 'number' },
  ],
  bourse: [
    { name: 'montantTotalFcfa', label: 'Montant total (FCFA)', kind: 'number', required: true },
    { name: 'dureeMois', label: 'Durée (mois)', kind: 'number' },
    { name: 'niveauEtudeRequis', label: 'Niveau d’étude requis', kind: 'select', options: NIVEAUX },
    { name: 'paysDestination', label: 'Pays de destination', kind: 'text' },
    { name: 'organismeFinanceur', label: 'Organisme financeur', kind: 'text', required: true },
    { name: 'coupleObligatoire', label: 'Couple obligatoire', kind: 'checkbox' },
  ],
  concours: [
    { name: 'organismeOrganisateur', label: 'Organisme organisateur', kind: 'text', required: true },
    { name: 'dateEpreuves', label: 'Date des épreuves', kind: 'date' },
    { name: 'lieuEpreuves', label: 'Lieu des épreuves', kind: 'text' },
    { name: 'preuvesDemandees', label: 'Pièces demandées', kind: 'text' },
    { name: 'placesDisponibles', label: 'Places disponibles', kind: 'number' },
  ],
  appel_a_projets: [
    { name: 'budgetMaxFcfa', label: 'Budget maximum (FCFA)', kind: 'number' },
    { name: 'dureeProjetMois', label: 'Durée du projet (mois)', kind: 'number' },
    { name: 'thematique', label: 'Thématique', kind: 'text' },
    { name: 'dossierRequis', label: 'Dossier requis', kind: 'textarea', required: true },
    { name: 'criteresEligibilite', label: 'Critères d’éligibilité', kind: 'textarea', required: true },
  ],
  financement: [
    { name: 'montantFcfa', label: 'Montant (FCFA)', kind: 'number', required: true },
    { name: 'typeFinancement', label: 'Type de financement', kind: 'select', required: true, options: TYPE_FINANCEMENT },
    { name: 'tauxAnnuel', label: 'Taux annuel (%)', kind: 'number' },
    { name: 'garanties', label: 'Garanties', kind: 'text' },
    { name: 'dureeRemboursementMois', label: 'Durée de remboursement (mois)', kind: 'number' },
    { name: 'organismeFinanceur', label: 'Organisme financeur', kind: 'text', required: true },
    { name: 'isContinuous', label: 'Dépôt en continu', kind: 'checkbox' },
    { name: 'dateLimiteDepot', label: 'Date limite de dépôt', kind: 'date' },
  ],
  mentorat: [
    { name: 'dureeMois', label: 'Durée (mois)', kind: 'number', required: true },
    { name: 'modalite', label: 'Modalité', kind: 'select', required: true, options: MODALITE_MENTORAT },
    { name: 'thematique', label: 'Thématique', kind: 'text' },
    { name: 'placesDisponibles', label: 'Places disponibles', kind: 'number' },
    { name: 'organisateurLibelle', label: 'Organisateur', kind: 'text', required: true },
  ],
  mobilite: [
    { name: 'destination', label: 'Destination', kind: 'text', required: true },
    { name: 'typeMobilite', label: 'Type de mobilité', kind: 'select', required: true, options: TYPE_MOBILITE },
    { name: 'dureeMois', label: 'Durée (mois)', kind: 'number', required: true },
    { name: 'prisEnCharge', label: 'Prise en charge', kind: 'text' },
    { name: 'niveauLangueRequis', label: 'Niveau de langue requis', kind: 'text' },
    { name: 'dateDepartPrevue', label: 'Date de départ prévue', kind: 'date' },
  ],
  volontariat: [
    { name: 'dureeMois', label: 'Durée (mois)', kind: 'number', required: true },
    { name: 'typeVolontariat', label: 'Type de volontariat', kind: 'select', required: true, options: TYPE_VOLONTARIAT },
    { name: 'indemniteMensuelleFcfa', label: 'Indemnité mensuelle (FCFA)', kind: 'number' },
    { name: 'domaineMission', label: 'Domaine de la mission', kind: 'text', required: true },
    { name: 'placesDisponibles', label: 'Places disponibles', kind: 'number' },
  ],
}

// ─── Valeurs ───────────────────────────────────────────────────────────────────

export interface OpportuniteFormBase {
  titre?: string
  slug?: string
  description?: string
  mission?: string | null
  profilRecherche?: string | null
  conditions?: string | null
  organisationLibelle?: string
  domaine?: string
  region?: string | null
  remuneration?: string | null
  deadline?: string | null // yyyy-mm-dd
  lienExterne?: string | null
  niveauEtudeMin?: string | null
  statut?: string
}

export interface OpportuniteFormInitial {
  /** Présent = édition ; absent = création. */
  id?: string
  type?: SousTypeSlug
  base?: OpportuniteFormBase
  /** Valeurs de sous-type aplaties (clés = champs du sous-type). */
  details?: Record<string, string | number | boolean | null>
  /** Programmes déjà rattachés (GUIC-684). */
  programmeSlugs?: string[]
  /** Programme principal parmi ceux rattachés. */
  programmePrincipalSlug?: string | null
}

export interface OpportuniteFormProps {
  /** Sous-types proposés (slug technique + libellé lisible). */
  types: { slug: SousTypeSlug; libelle: string }[]
  /** Programmes actifs proposés au rattachement (GUIC-684). */
  programmes?: ProgrammeOption[]
  initial?: OpportuniteFormInitial
}

const SUBTYPE_SLUGS = Object.keys(SUBTYPE_FIELDS) as SousTypeSlug[]

function slugify(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 280)
}

/** Coerce une valeur de formulaire vers le type attendu par le sous-type. */
function coerce(kind: FieldKind, raw: string | boolean): string | number | boolean | Date | null {
  if (kind === 'checkbox') return Boolean(raw)
  const s = String(raw).trim()
  if (s === '') return null
  if (kind === 'number') return Number(s)
  if (kind === 'date') return new Date(s)
  return s
}

/**
 * Formulaire partagé création/édition d'une opportunité (GUIC-28).
 * Piloté par un descripteur de champs par sous-type → couvre les 10 sous-types.
 * En édition, le sous-type n'est pas modifiable (protège l'historique candidatures).
 */
export function OpportuniteForm({ types, programmes = [], initial }: OpportuniteFormProps) {
  const router = useRouter()
  const editing = Boolean(initial?.id)
  const availableTypes = types.length ? types : SUBTYPE_SLUGS.map((s) => ({ slug: s, libelle: s }))
  // GUIC-684 — rattachement obligatoire. En édition d'un contenu antérieur au
  // ticket, la liste est vide : l'admin doit choisir avant de pouvoir enregistrer.
  const [programmeSlugs, setProgrammeSlugs] = useState<string[]>(initial?.programmeSlugs ?? [])
  const [programmePrincipal, setProgrammePrincipal] = useState<string | null>(
    initial?.programmePrincipalSlug ?? null,
  )

  const [type, setType] = useState<SousTypeSlug>(initial?.type ?? availableTypes[0].slug)
  const [base, setBase] = useState<OpportuniteFormBase>({
    statut: 'brouillon',
    ...initial?.base,
  })
  const [details, setDetails] = useState<Record<string, string | boolean>>(() => {
    const seed: Record<string, string | boolean> = {}
    for (const [k, v] of Object.entries(initial?.details ?? {})) {
      seed[k] = typeof v === 'boolean' ? v : v == null ? '' : String(v)
    }
    return seed
  })
  // Sections détaillées optionnelles : montées à la demande (évite 4 éditeurs riches
  // d'emblée). Auto-ouvertes en édition si au moins une section est déjà remplie.
  const [showSections, setShowSections] = useState(
    Boolean(initial?.base?.mission || initial?.base?.profilRecherche || initial?.base?.conditions),
  )
  const [slugTouched, setSlugTouched] = useState(editing)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [pending, startTransition] = useTransition()

  const fields = useMemo(() => SUBTYPE_FIELDS[type], [type])

  function setBaseField<K extends keyof OpportuniteFormBase>(k: K, v: OpportuniteFormBase[K]) {
    setBase((b) => ({ ...b, [k]: v }))
  }
  function onTitreChange(v: string) {
    setBaseField('titre', v)
    if (!editing && !slugTouched) setBaseField('slug', slugify(v))
  }

  function buildBaseInput() {
    return {
      titre: base.titre ?? '',
      slug: base.slug ?? '',
      description: base.description ?? '',
      mission: base.mission?.trim() || null,
      profilRecherche: base.profilRecherche?.trim() || null,
      conditions: base.conditions?.trim() || null,
      organisationLibelle: base.organisationLibelle ?? '',
      domaine: base.domaine ?? 'Autre',
      region: base.region || null,
      remuneration: base.remuneration?.trim() || null,
      deadline: base.deadline ? new Date(base.deadline) : null,
      lienExterne: base.lienExterne?.trim() || null,
      niveauEtudeMin: base.niveauEtudeMin || null,
      statut: base.statut ?? 'brouillon',
      programmeSlugs,
      programmePrincipalSlug: programmePrincipal,
    }
  }

  function buildDetails() {
    const out: Record<string, string | number | boolean | Date | null> = {}
    for (const f of fields) {
      out[f.name] = coerce(f.kind, details[f.name] ?? (f.kind === 'checkbox' ? false : ''))
    }
    return out
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // Garde côté client — le serveur refuse de toute façon (PROGRAMME_REQUIS),
    // mais autant ne pas faire faire l'aller-retour à l'admin.
    if (programmeSlugs.length === 0) {
      setError('Sélectionne au moins un programme de rattachement.')
      return
    }
    startTransition(async () => {
      try {
        if (editing && initial?.id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await modifierOpportunite(initial.id, { base: buildBaseInput() as any, details: buildDetails() as any })
          setFeedback({ message: 'Opportunité enregistrée.', variant: 'success' })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await creerOpportunite({ type, base: buildBaseInput(), details: buildDetails() } as any)
          setFeedback({ message: 'Opportunité créée.', variant: 'success' })
        }
        router.push('/admin/opportunites/gestion')
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'SLUG_EXISTANT') setError('Ce slug existe déjà — choisis-en un autre.')
        else if (msg === 'FORBIDDEN') setError('Action réservée aux administrateurs.')
        else if (msg === 'PROGRAMME_REQUIS') setError('Sélectionne au moins un programme de rattachement.')
        else setError('Échec de l’enregistrement — vérifie les champs obligatoires (*).')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-space-4" aria-label="Formulaire opportunité">
      <fieldset className="flex flex-col gap-space-3 border-0 p-0 m-0">
        <legend className="text-fs-400 font-black text-color-text-primary mb-space-2">Informations générales</legend>
        <Select
          id="opp-type"
          label="Type d’opportunité"
          options={availableTypes.map((t) => ({ value: t.slug, label: t.libelle }))}
          value={type}
          disabled={editing}
          onChange={(e) => setType(e.target.value as SousTypeSlug)}
        />
        <ProgrammesField
          options={programmes}
          value={programmeSlugs}
          onChange={setProgrammeSlugs}
          principal={programmePrincipal}
          onPrincipalChange={setProgrammePrincipal}
        />
        <Input id="opp-titre" label="Titre" required value={base.titre ?? ''} onChange={(e) => onTitreChange(e.target.value)} />
        <Input
          id="opp-slug"
          label="Slug (URL — non modifiable après création)"
          required
          value={base.slug ?? ''}
          disabled={editing}
          onChange={(e) => { setSlugTouched(true); setBaseField('slug', e.target.value) }}
        />
        <RichTextEditor
          id="opp-description"
          label="Description"
          hint="Corps principal — titres, gras, italique, listes, liens, images. Style CJS bridé."
          value={base.description ?? ''}
          onChange={(html) => setBaseField('description', html)}
        />
        <Input id="opp-org" label="Organisation" required value={base.organisationLibelle ?? ''} onChange={(e) => setBaseField('organisationLibelle', e.target.value)} />
        <Select id="opp-domaine" label="Domaine" required options={DOMAINES} value={base.domaine ?? ''} onChange={(e) => setBaseField('domaine', e.target.value)} />
        <Select id="opp-region" label="Région (optionnel)" options={[{ value: '', label: '—' }, ...REGIONS]} value={base.region ?? ''} onChange={(e) => setBaseField('region', e.target.value || null)} />
        <Input id="opp-remuneration" label="Rémunération (optionnel)" value={base.remuneration ?? ''} onChange={(e) => setBaseField('remuneration', e.target.value)} />
        <Input id="opp-deadline" label="Date limite (optionnel)" type="date" value={base.deadline ?? ''} onChange={(e) => setBaseField('deadline', e.target.value || null)} />
        <Input id="opp-lien" label="Lien externe (optionnel)" type="url" value={base.lienExterne ?? ''} onChange={(e) => setBaseField('lienExterne', e.target.value)} />
        <Select id="opp-niveau" label="Niveau d’étude minimum (optionnel)" options={[{ value: '', label: '—' }, ...NIVEAUX]} value={base.niveauEtudeMin ?? ''} onChange={(e) => setBaseField('niveauEtudeMin', e.target.value || null)} />
        <Select id="opp-statut" label="Statut" options={STATUTS} value={base.statut ?? 'brouillon'} onChange={(e) => setBaseField('statut', e.target.value)} />
      </fieldset>

      <fieldset className="flex flex-col gap-space-3 border-0 p-0 m-0">
        <legend className="text-fs-400 font-black text-color-text-primary mb-space-2">Sections détaillées (optionnel)</legend>
        {showSections ? (
          <>
            <RichTextEditor
              id="opp-mission"
              label="Mission"
              value={base.mission ?? ''}
              onChange={(html) => setBaseField('mission', html)}
            />
            <RichTextEditor
              id="opp-profil"
              label="Profil recherché"
              value={base.profilRecherche ?? ''}
              onChange={(html) => setBaseField('profilRecherche', html)}
            />
            <RichTextEditor
              id="opp-conditions"
              label="Conditions"
              value={base.conditions ?? ''}
              onChange={(html) => setBaseField('conditions', html)}
            />
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setShowSections(true)}>
            Ajouter des sections détaillées (mission, profil, conditions)
          </Button>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-space-3 border-0 p-0 m-0">
        <legend className="text-fs-400 font-black text-color-text-primary mb-space-2">Détails spécifiques</legend>
        {fields.map((f) => {
          const id = `opp-detail-${f.name}`
          const val = details[f.name]
          if (f.kind === 'checkbox') {
            return (
              <label key={f.name} htmlFor={id} className="flex items-center gap-space-2 text-fs-300 font-bold text-color-text-primary">
                <input id={id} type="checkbox" checked={Boolean(val)} onChange={(e) => setDetails((d) => ({ ...d, [f.name]: e.target.checked }))} className="w-[18px] h-[18px] accent-gj-teal-deep" />
                {f.label}
              </label>
            )
          }
          if (f.kind === 'select') {
            return (
              <Select key={f.name} id={id} label={f.label} required={f.required} options={f.required ? f.options! : [{ value: '', label: '—' }, ...(f.options ?? [])]} value={typeof val === 'string' ? val : ''} onChange={(e) => setDetails((d) => ({ ...d, [f.name]: e.target.value }))} />
            )
          }
          if (f.kind === 'textarea') {
            return <Textarea key={f.name} id={id} label={f.label} required={f.required} value={typeof val === 'string' ? val : ''} onChange={(e) => setDetails((d) => ({ ...d, [f.name]: e.target.value }))} />
          }
          return (
            <Input key={f.name} id={id} label={f.label} required={f.required} type={f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'} value={typeof val === 'string' ? val : ''} onChange={(e) => setDetails((d) => ({ ...d, [f.name]: e.target.value }))} />
          )
        })}
      </fieldset>

      {error && <p role="alert" className="text-fs-300 text-gj-red font-bold">{error}</p>}

      <div className="flex items-center justify-end gap-space-2">
        <Button type="button" variant="secondary" onClick={() => router.push('/admin/opportunites/gestion')} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {editing ? 'Enregistrer' : 'Créer l’opportunité'}
        </Button>
      </div>

      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </form>
  )
}
