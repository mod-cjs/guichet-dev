'use client'

/**
 * GUIC-513 — Formulaire d'édition du profil entreprise par le recruteur.
 * Nom + vérification restent gérés par l'admin (non éditables ici).
 */
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { modifierProfilEntreprise, type ProfilEntrepriseInput } from './actions'

type Opt = { value: string; label: string }
const opt = (...v: string[]): Opt[] => v.map((x) => ({ value: x, label: x.replace(/_/g, ' ') }))
const DOMAINES = opt('Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete', 'Environnement', 'Sante', 'Education', 'Culture', 'Autre')
const REGIONS = opt('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou')

export interface ProfilInitial {
  description: string | null
  secteur: string | null
  region: string | null
  adresse: string | null
  telephone: string | null
  email: string | null
  siteWeb: string | null
  logoUrl: string | null
}

export function ProfilEntrepriseForm({ initial }: { initial: ProfilInitial }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, start] = useTransition()
  const [toast, setToast] = useState<{ msg: string; variant: ToastVariant } | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData(formRef.current!)
    const s = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v.trim() : '' }
    const enumVal = (k: string) => { const v = s(k); return v ? v : undefined } // vide = non modifié
    const payload = {
      description: s('description'),
      secteur: enumVal('secteur'),
      region: enumVal('region'),
      adresse: s('adresse'),
      telephone: s('telephone'),
      email: s('email'),
      siteWeb: s('siteWeb'),
      logoUrl: s('logoUrl'),
    } as ProfilEntrepriseInput

    start(async () => {
      try {
        await modifierProfilEntreprise(payload)
        setToast({ msg: 'Profil enregistré.', variant: 'success' })
        router.refresh()
      } catch {
        setToast({ msg: 'Vérifiez les champs (email / URLs).', variant: 'error' })
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-[16px]">
      <div className="rounded-[14px] p-[18px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <h2 className="text-[14px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>Présentation</h2>
        <Textarea name="description" label="Description de l'entreprise" rows={5} defaultValue={initial.description ?? ''} placeholder="Qui êtes-vous, votre mission, vos métiers…" />
      </div>

      <div className="rounded-[14px] p-[18px]" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <h2 className="text-[14px] font-black mb-[12px]" style={{ color: 'var(--gj-ink)' }}>Coordonnées</h2>
        <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Select name="secteur" label="Secteur" options={DOMAINES} placeholder="—" defaultValue={initial.secteur ?? ''} />
          <Select name="region" label="Région" options={REGIONS} placeholder="—" defaultValue={initial.region ?? ''} />
          <Input name="adresse" label="Adresse" maxLength={300} defaultValue={initial.adresse ?? ''} />
          <Input name="telephone" label="Téléphone" maxLength={20} defaultValue={initial.telephone ?? ''} placeholder="+221…" />
          <Input name="email" label="Email" type="email" maxLength={255} defaultValue={initial.email ?? ''} />
          <Input name="siteWeb" label="Site web" type="url" maxLength={500} defaultValue={initial.siteWeb ?? ''} placeholder="https://…" />
          <Input name="logoUrl" label="Logo (URL)" type="url" maxLength={500} defaultValue={initial.logoUrl ?? ''} placeholder="https://…" />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="inline-flex items-center font-black text-[13px] rounded-[10px] px-[22px] min-h-[44px]" style={{ background: 'var(--gj-blue, #1A4ED8)', color: '#fff', opacity: pending ? 0.6 : 1 }}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
      {toast && <Toast message={toast.msg} variant={toast.variant} onClose={() => setToast(null)} />}
    </form>
  )
}
