'use client'

/**
 * <ProfilIncompletClient /> — checklist + CTAs édition profil.
 *
 * GUIC-380. Affiche en clair quels champs manquent au jeune avant qu'il
 * puisse candidater. Chaque ligne pointe vers la section profil concernée.
 */

import Link from 'next/link'
import { Card, Button } from '@/components/ui'
import { Icon } from '@/components/ui/Icon'
import type { ProfilComplet } from '@/types/profil'

interface Field {
  /** Identifiant côté API (missing[]). */
  key: string
  /** Label affiché. */
  label: string
  /** Lien d'édition (anchor profil). */
  href: string
  /** True si le champ est rempli sur le profil. */
  ok: boolean
}

interface Props {
  profil: ProfilComplet
  /** Champs explicitement marqués manquants par l'API. */
  missing: string[]
  /** Opportunité concernée (pour bouton retour). */
  opportuniteId: string | null
}

export function ProfilIncompletClient({ profil, missing, opportuniteId }: Props) {
  const hasCv = Boolean(profil.profil?.cvUrl)
  const fields: Field[] = [
    {
      key: 'email',
      label: 'Adresse email',
      href: '/jeune/mon-profil#identite',
      ok: Boolean(profil.email) && !missing.includes('email'),
    },
    {
      key: 'telephone',
      label: 'Numéro de téléphone',
      href: '/jeune/mon-profil#identite',
      ok: Boolean(profil.telephone) && !missing.includes('telephone'),
    },
    {
      key: 'niveauEtude',
      label: 'Niveau d’études',
      href: '/jeune/mon-profil#parcours',
      ok: Boolean(profil.profil?.niveauEtude) && !missing.includes('niveauEtude'),
    },
    {
      key: 'situationEmploi',
      label: 'Situation actuelle',
      href: '/jeune/mon-profil#parcours',
      ok: Boolean(profil.profil?.situationEmploi) && !missing.includes('situationEmploi'),
    },
    {
      key: 'cv',
      label: 'CV en PDF',
      href: '/jeune/mon-profil#cv',
      ok: hasCv && !missing.includes('cv'),
    },
  ]

  const remainingCount = fields.filter((f) => !f.ok).length

  return (
    <div className="container-page py-space-6 max-w-3xl">
      <Card className="p-space-6">
        <div className="flex flex-col gap-space-4">
          <div className="flex items-start gap-space-3">
            <span
              aria-hidden
              className="w-12 h-12 rounded-full bg-gj-yellow-soft flex items-center justify-center flex-shrink-0"
            >
              <Icon name="profile" size={24} style={{ color: 'var(--gj-teal-deep)' }} />
            </span>
            <div>
              <h1 className="text-fs-600 font-black text-color-text-primary">
                Complète ton profil pour candidater
              </h1>
              <p className="text-fs-300 text-color-text-secondary mt-space-1">
                Tes informations seront utilisées pour toutes tes futures candidatures.
                Tu ne les ressaisiras pas à chaque fois.
              </p>
            </div>
          </div>

          <div
            className="rounded-gj-md border border-gj-line bg-color-surface px-space-3 py-space-2 text-fs-200 text-color-text-secondary"
            role="status"
          >
            {remainingCount === 0
              ? 'Ton profil est complet. Retourne à l’opportunité pour candidater.'
              : `Il reste ${remainingCount} champ${remainingCount > 1 ? 's' : ''} à compléter.`}
          </div>

          <ul className="flex flex-col divide-y divide-gj-line">
            {fields.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between gap-space-3 py-space-3"
              >
                <div className="flex items-center gap-space-3 min-w-0">
                  <span
                    aria-hidden
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      f.ok ? 'bg-gj-green-soft' : 'bg-gj-bg border border-gj-line'
                    }`}
                  >
                    {f.ok && (
                      <Icon
                        name="check"
                        size={14}
                        style={{ color: 'var(--gj-green)' }}
                      />
                    )}
                  </span>
                  <span
                    className={`text-fs-300 ${
                      f.ok
                        ? 'text-color-text-secondary line-through'
                        : 'text-color-text-primary font-bold'
                    }`}
                  >
                    {f.label}
                  </span>
                </div>
                {!f.ok && (
                  <Link
                    href={f.href}
                    className="text-fs-200 font-bold text-gj-teal-deep underline underline-offset-2 min-h-[44px] inline-flex items-center"
                  >
                    Compléter →
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-col-reverse sm:flex-row gap-space-2 sm:justify-end mt-space-3">
            <Link
              href={opportuniteId ? `/opportunites/${opportuniteId}` : '/opportunites'}
              className="inline-flex"
            >
              <Button variant="ghost">Retour aux opportunités</Button>
            </Link>
            <Link href="/jeune/mon-profil" className="inline-flex">
              <Button>Aller sur mon profil</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
