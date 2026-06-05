'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { Chip } from '@/components/ui/Chip'
import { REGIONS_SENEGAL } from '@/lib/regions'
import { useProfilStep, type ProfilInitial } from '../_logic/use-onboarding-step'
import { OnboardingNavWeb } from './OnboardingNavWeb'

interface Props {
  initial: ProfilInitial
}

/**
 * Onboarding écran 4/5 — version WEB.
 *
 * Carte centrée 820px, grille 2 colonnes pour prénom/nom et année/genre.
 * Région en chips wrap, commune + niveau études optionnels en 2-col.
 * Footer avec retour + Continuer.
 *
 * Réutilise la logique `useProfilStep` (validation Zod + submit step 1+2).
 */
export function OnboardingProfilWeb({ initial }: Props) {
  const f = useProfilStep(initial)
  // Niveau d'études — state local seulement : le draft API (GUIC-181) ne
  // porte pas encore ce champ, mais l'input n'est plus orphelin. Le champ
  // sera persisté côté backend dans une future itération (step 3 du schéma
  // `stepProfilSchema` l'accepte déjà via `niveauEtude`).
  const [niveauEtudes, setNiveauEtudes] = useState('')

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-bg)' }}>
      <OnboardingNavWeb step={3} total={4} />
      <div
        className="flex-1 flex flex-col items-center"
        style={{ padding: '48px 24px 40px', overflowY: 'auto' }}
      >
        <div
          className="flex flex-col"
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 18,
            padding: '40px 56px',
            width: 'min(820px, 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,.04)',
            gap: 22,
          }}
        >
          <div>
            <h2 className="font-black text-color-text-primary text-fs-700" style={{ lineHeight: 1.15, letterSpacing: '-.4px' }}>
              Qui es-tu&nbsp;?
            </h2>
            <p className="text-gj-grey" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
              Tes infos restent privées. Tu choisis ce que les recruteurs voient.
            </p>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="web-prenom" required>Prénom</FieldLabel>
              <Input
                id="web-prenom"
                value={f.prenom}
                onChange={e => f.setPrenom(e.target.value)}
                error={f.errors.prenom}
                autoComplete="given-name"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="web-nom" required>Nom</FieldLabel>
              <Input
                id="web-nom"
                value={f.nom}
                onChange={e => f.setNom(e.target.value)}
                error={f.errors.nom}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="web-dn" required>Date de naissance</FieldLabel>
              <Input
                id="web-dn"
                type="date"
                value={f.dateNaissance}
                onChange={e => f.setDateNaissance(e.target.value)}
                error={f.errors.dateNaissance}
                autoComplete="bday"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="web-genre-group" required>Je suis</FieldLabel>
              <div id="web-genre-group" className="flex gap-2" role="group" aria-label="Genre">
                {(['F', 'M', 'Autre'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => f.setGenre(g)}
                    aria-pressed={f.genre === g}
                    className="flex-1 font-bold"
                    style={{
                      background: f.genre === g ? 'var(--gj-teal-soft)' : 'var(--gj-surface)',
                      border: `1.5px solid ${f.genre === g ? 'var(--gj-teal)' : 'var(--gj-line)'}`,
                      color: f.genre === g ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
                      borderRadius: 10,
                      fontSize: 14,
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

          <div style={{ height: 1, background: 'var(--gj-line)' }} />

          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="web-region-group" required>Région de résidence</FieldLabel>
            <div
              id="web-region-group"
              className="flex flex-wrap gap-1"
              role="group"
              aria-label="Région"
            >
              {REGIONS_SENEGAL.map(r => (
                <Chip
                  key={r.value}
                  selected={f.region === r.value}
                  onClick={() => f.setRegion(r.value)}
                >
                  {r.label}
                </Chip>
              ))}
            </div>
            {f.errors.region ? (
              <p className="text-gj-red" style={{ fontSize: 12, marginTop: 4 }}>{f.errors.region}</p>
            ) : null}
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="web-commune">
                Commune
                <span className="text-gj-grey-2" style={{ fontSize: 10, marginLeft: 4 }}>FACULTATIF</span>
              </FieldLabel>
              <Input
                id="web-commune"
                placeholder="ex. Bakel, Kidira, Goudiry…"
                value={f.commune}
                onChange={e => f.setCommune(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="web-niveau">
                Niveau d&apos;études
                <span className="text-gj-grey-2" style={{ fontSize: 10, marginLeft: 4 }}>FACULTATIF</span>
              </FieldLabel>
              <Input
                id="web-niveau"
                placeholder="ex. Bac +2, Licence, Master…"
                value={niveauEtudes}
                onChange={e => setNiveauEtudes(e.target.value)}
              />
            </div>
          </div>

          {f.errors._form ? (
            <p className="text-gj-red" role="alert" style={{ fontSize: 13 }}>{f.errors._form}</p>
          ) : null}

          <div
            className="flex justify-between items-center"
            style={{ paddingTop: 12, borderTop: '1px solid var(--gj-line)' }}
          >
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1 font-bold"
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--gj-grey)',
                cursor: 'pointer',
                fontSize: 13.5,
              }}
            >
              <Icon name="chevron-left" size={14} aria-hidden /> Retour
            </button>
            <button
              type="button"
              onClick={() => { void f.submit() }}
              disabled={f.loading}
              className="inline-flex items-center gap-2 font-black"
              style={{
                background: 'var(--gj-teal-deep)',
                color: 'var(--gj-surface)',
                border: 0,
                padding: '0 28px',
                minHeight: 52,
                borderRadius: 10,
                fontSize: 15,
                cursor: f.loading ? 'not-allowed' : 'pointer',
                opacity: f.loading ? 0.7 : 1,
              }}
            >
              {f.loading ? 'Envoi…' : 'Continuer'}
              <Icon name="arrow-right" size={14} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
