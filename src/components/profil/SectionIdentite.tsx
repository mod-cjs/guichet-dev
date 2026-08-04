'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Card, Button, Icon, Input, Select } from '@/components/ui'
import type { IconName } from '@/components/ui'
import { communesForRegion } from '@/lib/communes'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

/** Sentinelle « Autre (préciser) » — commune libre / genre non précisé (GUIC-445). */
const AUTRE = '__autre__'

const ALLOWED_PHOTO_MIME_CLIENT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES_CLIENT    = 5 * 1024 * 1024

/** Magic-bytes côté client (défense en profondeur, le serveur revalide). */
function clientHasValidMagic(mime: string, head: Uint8Array): boolean {
  if (mime === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  if (mime === 'image/png')  return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
  if (mime === 'image/webp') {
    return head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
      && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  }
  return false
}

const REGIONS = [
  'Dakar','Thies','Diourbel','Fatick','Kaolack','Kaffrine',
  'Louga','Saint_Louis','Matam','Tambacounda','Kedougou','Kolda','Ziguinchor','Sedhiou',
].map(r => ({ value: r, label: r.replace('_', '-') }))

interface Props {
  data:         Pick<ProfilComplet, 'nom' | 'prenom' | 'email' | 'telephone' | 'region' | 'commune' | 'genre' | 'dateNaissance'>
  photoUrl?:    string | null
  ssoProfilUrl: string | null
  onSaved:      (data: PutProfilResponse) => void
  onPhotoSaved?: (photoUrl: string) => void
}

/**
 * Groupe de champs d'identité — intitulé de section (11px/800/uppercase sur
 * `--gj-grey`, conforme `sectH` de la maquette) précédé de son icône.
 */
function GroupeIdentite({
  icon,
  titre,
  children,
}: {
  icon: IconName
  titre: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-fs-100 font-extrabold uppercase tracking-[0.4px] text-color-text-secondary mb-space-2">
        <Icon name={icon} size={13} aria-hidden />
        {titre}
      </h3>
      <dl className="grid grid-cols-2 gap-x-space-4 gap-y-space-2 text-fs-300">{children}</dl>
    </section>
  )
}

/** Couple libellé/valeur ; le tiret signale un champ à compléter. */
function Champ({ label, valeur }: { label: string; valeur?: string | null }) {
  return (
    <>
      <dt className="text-color-text-secondary">{label}</dt>
      <dd className="font-medium text-color-text-primary">{valeur?.trim() ? valeur : '—'}</dd>
    </>
  )
}

export function SectionIdentite({ data, photoUrl, ssoProfilUrl, onSaved, onPhotoSaved }: Props) {
  const [editing, setEditing] = useState(false)
  // GUIC-689 (P1 audit UX) — champs secondaires repliés par défaut.
  const [voirPlus, setVoirPlus] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [photo,        setPhoto]        = useState<string | null>(photoUrl ?? null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError,   setPhotoError]   = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const initiales = `${(data.prenom?.[0] ?? '').toUpperCase()}${(data.nom?.[0] ?? '').toUpperCase()}`

  async function uploadPhoto(file: File) {
    setPhotoError(null)

    if (!ALLOWED_PHOTO_MIME_CLIENT.includes(file.type)) {
      setPhotoError('Format invalide (JPEG, PNG ou WebP requis).')
      return
    }
    if (file.size > MAX_PHOTO_BYTES_CLIENT) {
      setPhotoError('Image trop volumineuse (5 MB max).')
      return
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    if (!clientHasValidMagic(file.type, head)) {
      setPhotoError("Le contenu du fichier ne correspond pas au format déclaré.")
      return
    }

    setPhotoLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/profil/photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Upload impossible')
      // Cache-bust : on suffixe l'URL d'un `?ts=` pour forcer le navigateur (et
      // next/image) à recharger l'image immédiatement après upload (GUIC-365).
      const url    = json.data.photoUrl as string
      const busted = `${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`
      setPhoto(busted)
      onPhotoSaved?.(busted)
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setPhotoLoading(false)
    }
  }

  const [displayed, setDisplayed] = useState({
    region:        data.region,
    commune:       data.commune,
    genre:         data.genre,
    dateNaissance: data.dateNaissance,
  })

  const [form, setForm] = useState({
    region:        data.region        ?? '',
    commune:       data.commune       ?? '',
    genre:         data.genre         ?? '',
    dateNaissance: data.dateNaissance ?? '',
  })

  // GUIC-445 — commune en mode saisie libre (« Autre ») si la valeur existante
  // n'appartient pas à la liste officielle de la région.
  const [communeAutre, setCommuneAutre] = useState(
    () => Boolean(data.commune) && !communesForRegion(data.region).includes(data.commune ?? ''),
  )

  const communeOptions = communesForRegion(form.region)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleRegionChange(r: string) {
    setForm(f => {
      // Réinitialiser la commune si elle n'est plus valide dans la nouvelle région.
      const stillValid = communeAutre || communesForRegion(r).includes(f.commune)
      return { ...f, region: r, commune: stillValid ? f.commune : '' }
    })
  }

  function handleCommuneSelect(val: string) {
    if (val === AUTRE) {
      setCommuneAutre(true)
      set('commune', '')
    } else {
      setCommuneAutre(false)
      set('commune', val)
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region:        form.region        || null,
          commune:       form.commune       || null,
          // L'enum Prisma n'accepte que M|F : « Non précisé » (AUTRE) → null.
          genre:         form.genre === 'M' || form.genre === 'F' ? form.genre : null,
          dateNaissance: form.dateNaissance || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Erreur')
      const saved = json.data as PutProfilResponse
      setDisplayed({
        region:        saved.region,
        commune:       saved.commune,
        genre:         saved.genre,
        dateNaissance: saved.dateNaissance,
      })
      onSaved(saved)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-space-4">
        <h2 className="text-fs-400 font-bold text-color-text-primary">Identité</h2>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Modifier</Button>
        )}
      </div>

      {/* Photo de profil — GUIC-360 */}
      <div className="flex items-center gap-space-4 mb-space-4">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={photoLoading}
          className="relative w-[96px] h-[96px] rounded-full bg-gj-teal overflow-hidden flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gj-teal-deep disabled:opacity-60"
          aria-label="Modifier la photo de profil"
        >
          {photo ? (
            <Image src={photo} alt="" width={96} height={96} className="w-full h-full object-cover" />
          ) : (
            <span className="text-fs-500 font-bold text-white">{initiales || '?'}</span>
          )}
        </button>
        <div className="flex flex-col gap-space-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => photoInputRef.current?.click()}
            loading={photoLoading}
            className="min-h-[44px]"
          >
            {photo ? 'Changer la photo' : 'Ajouter une photo'}
          </Button>
          <p className="text-fs-200 text-color-text-secondary">JPEG, PNG ou WebP · 5 MB max</p>
          {photoError && <p className="text-fs-200 text-gj-red">{photoError}</p>}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) void uploadPhoto(f)
            e.target.value = ''
          }}
        />
      </div>

      {!editing ? (
        /* GUIC-689 (P1 audit UX Lot 4) — les 7 champs ne sont plus à plat :
           regroupement par section avec icône, et champs secondaires (état
           civil) repliés derrière « Voir plus ». Le tiret est conservé pour un
           champ vide : sur SON PROPRE profil, savoir qu'un champ manque est une
           information utile qui invite à le compléter (contrairement à une
           fiche publique, où un vide n'apprend rien). */
        <div className="flex flex-col gap-space-4">
          <GroupeIdentite icon="users" titre="Contact">
            <Champ label="Nom complet" valeur={`${data.prenom} ${data.nom}`} />
            <Champ label="Email" valeur={data.email} />
            <Champ label="Téléphone" valeur={data.telephone} />
          </GroupeIdentite>

          <GroupeIdentite icon="pin" titre="Localisation">
            <Champ label="Région" valeur={displayed.region?.replace('_', '-')} />
            <Champ label="Commune" valeur={displayed.commune} />
          </GroupeIdentite>

          <div>
            <Button
              type="button"
              variant="text"
              onClick={() => setVoirPlus(v => !v)}
              aria-expanded={voirPlus}
              aria-controls="profil-identite-secondaire"
              className="min-h-[var(--tap-min)]"
            >
              {voirPlus ? 'Voir moins' : 'Voir plus'}
              {/* Le sprite n'a pas de `chevron-up` : on pivote celui du bas. */}
              <Icon
                name="chevron-down"
                size={14}
                aria-hidden
                className={voirPlus ? 'rotate-180 transition-transform' : 'transition-transform'}
              />
            </Button>

            {voirPlus && (
              <div id="profil-identite-secondaire" className="mt-space-3">
                <GroupeIdentite icon="user" titre="État civil">
                  <Champ
                    label="Genre"
                    valeur={displayed.genre === 'M' ? 'Homme' : displayed.genre === 'F' ? 'Femme' : null}
                  />
                  <Champ label="Date de naissance" valeur={displayed.dateNaissance} />
                </GroupeIdentite>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-space-4">

          {/* Bloc coordonnées SSO — lecture seule */}
          <div className="rounded-gj-md bg-gj-bg border border-gj-line p-space-3 flex flex-col gap-space-2">
            <p className="text-fs-200 font-bold text-color-text-primary">
              Nom, email et téléphone
            </p>
            <p className="text-fs-200 text-color-text-secondary">
              Ces informations sont gérées sur votre compte CJS et synchronisées
              automatiquement à chaque connexion.
            </p>
            {ssoProfilUrl ? (
              <a
                href={ssoProfilUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fs-200 font-bold text-gj-teal-deep underline underline-offset-2 self-start"
              >
                Modifier sur mon compte CJS →
              </a>
            ) : (
              <p className="text-fs-200 text-color-text-secondary italic">
                Contactez le support CJS pour modifier ces informations.
              </p>
            )}
          </div>

          <Select
            id="region" label="Région" value={form.region}
            options={REGIONS} placeholder="Sélectionner une région"
            onChange={e => handleRegionChange(e.target.value)}
          />
          {/* GUIC-445 — commune : select filtré par région + « Autre » (saisie libre). */}
          <Select
            id="commune" label="Commune"
            value={communeAutre ? AUTRE : form.commune}
            disabled={!form.region}
            options={[
              ...communeOptions.map(c => ({ value: c, label: c })),
              { value: AUTRE, label: 'Autre (préciser)' },
            ]}
            placeholder={form.region ? 'Choisir une commune…' : 'Choisis d’abord ta région'}
            onChange={e => handleCommuneSelect(e.target.value)}
          />
          {communeAutre && (
            <Input
              id="commune-libre" label="Préciser la commune" value={form.commune}
              placeholder="Saisir votre commune…"
              onChange={e => set('commune', e.target.value)}
            />
          )}
          {/* GUIC-445 — genre 3 options alignées sur l'onboarding (+ Non précisé). */}
          <Select
            id="genre" label="Genre" value={form.genre || ''}
            options={[
              { value: 'F', label: 'Femme' },
              { value: 'M', label: 'Homme' },
              { value: AUTRE, label: 'Non précisé' },
            ]}
            placeholder="Sélectionner"
            onChange={e => set('genre', e.target.value)}
          />
          <Input
            id="dateNaissance" label="Date de naissance" type="date"
            value={form.dateNaissance}
            onChange={e => set('dateNaissance', e.target.value)}
          />
          {error && <p className="text-fs-200 text-gj-red">{error}</p>}
          <div className="flex gap-space-3">
            <Button onClick={save} loading={saving}>Enregistrer</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setError(null) }}>Annuler</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
