'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { htmlToPlainText } from '@/lib/rich-html'
import { modifierPartenaire, creerPartenaire } from './actions'

const opt = (...v: string[]) => v.map((x) => ({ value: x, label: x.replace(/_/g, ' ') }))
const DOMAINES = opt('Agriculture', 'Numerique', 'Entrepreneuriat', 'Citoyennete', 'Environnement', 'Sante', 'Education', 'Culture', 'Autre')
const REGIONS = opt('Dakar', 'Thies', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine', 'Louga', 'Saint_Louis', 'Matam', 'Tambacounda', 'Kedougou', 'Kolda', 'Ziguinchor', 'Sedhiou')

export interface PartenaireValues {
  id: string
  nom: string
  description?: string | null
  logoUrl?: string | null
  secteur: string | null
  region: string | null
  adresse?: string | null
  telephone?: string | null
  email: string | null
  siteWeb?: string | null
}

export interface PartenaireFormModalProps {
  isOpen: boolean
  onClose: () => void
  partenaire: PartenaireValues
  onSuccess?: () => void
}

export function PartenaireFormModal({ isOpen, onClose, partenaire, onSuccess }: PartenaireFormModalProps) {
  const [nom, setNom] = useState(partenaire.nom ?? '')
  const [description, setDescription] = useState(partenaire.description ?? '')
  const [logoUrl, setLogoUrl] = useState(partenaire.logoUrl ?? '')
  const [secteur, setSecteur] = useState(partenaire.secteur ?? '')
  const [region, setRegion] = useState(partenaire.region ?? '')
  const [adresse, setAdresse] = useState(partenaire.adresse ?? '')
  const [telephone, setTelephone] = useState(partenaire.telephone ?? '')
  const [email, setEmail] = useState(partenaire.email ?? '')
  const [siteWeb, setSiteWeb] = useState(partenaire.siteWeb ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // GUIC-705 — création (partenaire autonome sans compte) si pas d'id, sinon édition.
  const enCreation = !partenaire.id

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const champs = {
          nom,
          // Éditeur riche : un corps sans texte (ex. "<p></p>") est traité comme vide.
          description: htmlToPlainText(description).trim() ? description : null,
          logoUrl: logoUrl.trim() || null,
          secteur: secteur || null,
          region: region || null,
          adresse: adresse.trim() || null,
          telephone: telephone.trim() || null,
          email: email.trim() || null,
          siteWeb: siteWeb.trim() || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
        if (enCreation) await creerPartenaire(champs)
        else await modifierPartenaire(partenaire.id, champs)
        onSuccess?.()
        onClose()
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'FORBIDDEN') setError('Action réservée aux administrateurs.')
        else setError('Échec — vérifie les champs (nom requis, email valide).')
      }
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={enCreation ? 'Ajouter un partenaire' : 'Modifier le partenaire'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-3">
        <Input id="pa-nom" label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        <Input id="pa-logo" label="Logo (URL)" type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        <RichTextEditor id="pa-description" label="Description" value={description} onChange={setDescription} />
        <Select id="pa-secteur" label="Secteur" options={[{ value: '', label: '—' }, ...DOMAINES]} value={secteur} onChange={(e) => setSecteur(e.target.value)} />
        <Select id="pa-region" label="Région" options={[{ value: '', label: '—' }, ...REGIONS]} value={region} onChange={(e) => setRegion(e.target.value)} />
        <Input id="pa-adresse" label="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        <Input id="pa-tel" label="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <Input id="pa-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input id="pa-site" label="Site web" type="url" value={siteWeb} onChange={(e) => setSiteWeb(e.target.value)} />
        {error && <p role="alert" className="text-fs-200 text-gj-red font-bold">{error}</p>}
        <div className="flex items-center justify-end gap-space-2 mt-space-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button type="submit" variant="primary" disabled={pending}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  )
}
