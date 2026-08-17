'use client'

/**
 * GUIC-490 (US-8) — Formulaire recruteur de création d'offre (Emploi / Stage).
 * Organisation verrouillée (affichée en lecture seule). Soumission → `brouillon`
 * (validation CJS). Couleurs recruteur (bleu).
 */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { creerOffreRecruteur, type CreerOffreRecruteurInput } from './actions'
import { MESSAGE_ECHEC_OFFRE } from './echec-messages'

type Opt = { value: string; label: string }
const opt = (...v: string[]): Opt[] => v.map((x) => ({ value: x, label: x.replace(/_/g, ' ') }))

const DOMAINES = opt('Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete', 'Environnement', 'Sante', 'Education', 'Culture', 'Autre')
const REGIONS = opt('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou')
const NIVEAUX = opt('BFEM', 'BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_5', 'DOCTORAT')
const TYPE_CONTRAT = opt('CDI', 'CDD', 'FREELANCE', 'ALTERNANCE', 'STAGE_ALTERNE')

const TYPES: { value: 'emploi' | 'stage'; label: string; icon: 'employment' | 'document' }[] = [
  { value: 'emploi', label: 'Emploi', icon: 'employment' },
  { value: 'stage', label: 'Stage', icon: 'document' },
]

function Check({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-[8px] text-[13.5px] font-bold cursor-pointer" style={{ color: 'var(--gj-ink)' }}>
      <input type="checkbox" name={name} className="w-[18px] h-[18px] accent-[var(--gj-blue,#1A4ED8)]" />
      {label}
    </label>
  )
}

export function NouvelleOffreForm({ companyName, skills = [] }: { companyName: string; skills?: { id: string; libelle: string }[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<'emploi' | 'stage'>('emploi')
  const [desc, setDesc] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)
  const toggleSkill = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    const g = (k: string) => {
      const v = fd.get(k)
      return typeof v === 'string' && v.trim() ? v.trim() : undefined
    }
    const common = {
      titre: g('titre') ?? '',
      description: g('description') ?? '',
      domaine: g('domaine') ?? 'Numerique',
      region: g('region') ?? null,
      remuneration: g('remuneration') ?? null,
      deadline: g('deadline') ?? null,
      niveauEtudeMin: g('niveauEtudeMin') ?? null,
      skills: sel,
    }
    const payload = (
      type === 'emploi'
        ? {
            ...common, type: 'emploi',
            typeContrat: g('typeContrat') ?? 'CDD',
            dureeContratMois: g('dureeContratMois') ?? null,
            experienceRequise: g('experienceRequise') ?? null,
            teletravail: fd.get('teletravail') === 'on',
          }
        : {
            ...common, type: 'stage',
            dureeMois: g('dureeMois') ?? '',
            indemnise: fd.get('indemnise') === 'on',
            indemniteMensuelleFcfa: g('indemniteMensuelleFcfa') ?? null,
            conventionneEcole: fd.get('conventionneEcole') === 'on',
            dateDebutPrevue: g('dateDebutPrevue') ?? null,
          }
    ) as CreerOffreRecruteurInput

    start(async () => {
      try {
        const res = await creerOffreRecruteur(payload)
        if (res.ok) router.push('/recruteur/mes-offres?creee=1')
        else setToast({ msg: MESSAGE_ECHEC_OFFRE[res.code], variant: 'error' })
      } catch {
        setToast({ msg: 'Une erreur est survenue. Réessayez.', variant: 'error' })
      }
    })
  }

  const card: React.CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, padding: 18 }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-[16px]">
      {/* Type d'offre */}
      <div style={card}>
        <h2 className="text-[14px] font-black mb-[10px]" style={{ color: 'var(--gj-ink)' }}>Type d&apos;offre</h2>
        <div className="flex gap-[10px] flex-wrap">
          {TYPES.map((t) => {
            const on = type === t.value
            return (
              <button
                key={t.value} type="button" onClick={() => setType(t.value)} aria-pressed={on}
                className="inline-flex items-center gap-[8px] font-bold text-[13.5px] rounded-[10px] px-[16px] min-h-[44px]"
                style={{
                  border: `1.5px solid ${on ? 'var(--gj-blue, #1A4ED8)' : 'var(--gj-line)'}`,
                  background: on ? 'var(--gj-blue-soft, #E8EFFF)' : '#fff',
                  color: on ? 'var(--gj-blue-ink, #1A3FA8)' : 'var(--gj-grey)',
                }}
              >
                <Icon name={t.icon} size={16} /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Organisation verrouillée */}
      <div style={card}>
        <h2 className="text-[14px] font-black mb-[10px]" style={{ color: 'var(--gj-ink)' }}>Organisation</h2>
        <div className="flex items-center gap-[8px] rounded-[10px] px-[14px] py-[11px]" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
          <Icon name="shield" size={15} />
          <span className="text-[13.5px] font-black">{companyName}</span>
          <span className="text-[11.5px] font-bold ml-auto">Verrouillée</span>
        </div>
      </div>

      {/* Informations principales */}
      <div style={card}>
        <h2 className="text-[14px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>Informations</h2>
        <div className="flex flex-col gap-[12px]">
          <Input name="titre" label="Titre de l'offre" required maxLength={255} placeholder="Ex. Développeur web junior" />
          <RichTextEditor
            name="description"
            label="Description"
            placeholder="Missions, profil recherché, conditions…"
            value={desc}
            onChange={setDesc}
          />
          <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Select name="domaine" label="Domaine" required options={DOMAINES} defaultValue="Numerique" />
            <Select name="region" label="Région" options={REGIONS} placeholder="—" />
            <Input name="deadline" label="Date limite" type="date" />
            <Input name="remuneration" label="Rémunération" maxLength={100} placeholder="Ex. 250 000 FCFA / mois" />
            <Select name="niveauEtudeMin" label="Niveau d'étude min." options={NIVEAUX} placeholder="—" />
          </div>
        </div>
      </div>

      {/* Champs spécifiques */}
      <div style={card}>
        <h2 className="text-[14px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>
          Détails {type === 'emploi' ? 'de l’emploi' : 'du stage'}
        </h2>
        {type === 'emploi' ? (
          <div className="flex flex-col gap-[12px]">
            <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <Select name="typeContrat" label="Type de contrat" required options={TYPE_CONTRAT} defaultValue="CDD" />
              <Input name="dureeContratMois" label="Durée (mois)" type="number" min={1} />
              <Input name="experienceRequise" label="Expérience requise" maxLength={255} placeholder="Ex. 2 ans" />
            </div>
            <Check name="teletravail" label="Télétravail possible" />
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <Input name="dureeMois" label="Durée (mois)" type="number" min={1} required />
              <Input name="indemniteMensuelleFcfa" label="Indemnité mensuelle (FCFA)" type="number" min={0} />
              <Input name="dateDebutPrevue" label="Date de début prévue" type="date" />
            </div>
            <div className="flex gap-[20px] flex-wrap">
              <Check name="indemnise" label="Indemnisé" />
              <Check name="conventionneEcole" label="Conventionné avec une école" />
            </div>
          </div>
        )}
      </div>

      {/* Compétences requises (alimentent le score d'adéquation IA) */}
      {skills.length > 0 && (
        <div style={card}>
          <h2 className="text-[14px] font-black mb-[4px]" style={{ color: 'var(--gj-ink)' }}>Compétences requises</h2>
          <p className="text-[12px] mb-[10px]" style={{ color: 'var(--gj-grey)' }}>Sélectionnez les compétences attendues — elles servent au score d&apos;adéquation des candidats.</p>
          <div className="flex flex-wrap gap-[8px]">
            {skills.map((s) => {
              const on = sel.includes(s.id)
              return (
                <button key={s.id} type="button" onClick={() => toggleSkill(s.id)} aria-pressed={on} className="inline-flex items-center gap-[5px] text-[12.5px] font-bold rounded-full px-[12px] min-h-[36px]" style={{ border: `1.5px solid ${on ? 'var(--gj-blue, #1A4ED8)' : 'var(--gj-line)'}`, background: on ? 'var(--gj-blue-soft, #E8EFFF)' : '#fff', color: on ? 'var(--gj-blue-ink, #1A3FA8)' : 'var(--gj-grey)' }}>
                  {on && <Icon name="check" size={12} />}{s.libelle}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bandeau validation + actions */}
      <div className="flex items-center gap-[10px] rounded-[12px] px-[14px] py-[11px]" style={{ background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
        <Icon name="info" size={16} />
        <span className="text-[12.5px] font-bold">Votre offre sera soumise à la validation de l&apos;équipe CJS avant publication.</span>
      </div>

      <div className="flex items-center gap-[10px] justify-end flex-wrap">
        <a href="/recruteur/mes-offres" className="inline-flex items-center font-bold text-[13px] rounded-[10px] px-[18px] min-h-[44px] no-underline" style={{ color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)' }}>Annuler</a>
        <button type="submit" disabled={pending} className="inline-flex items-center gap-[8px] font-black text-[13.5px] rounded-[10px] px-[22px] min-h-[44px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Envoi…' : <><Icon name="check-circle" size={16} /> Soumettre à validation</>}
        </button>
      </div>

      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </form>
  )
}
