'use client'

import { useState } from 'react'
import { ProfilHeader }       from './ProfilHeader'
import { SectionIdentite }    from './SectionIdentite'
import { SectionProfil }      from './SectionProfil'
import { SectionExperiences } from './SectionExperiences'
import { SectionDiplomes }    from './SectionDiplomes'
import { SectionCertificats } from './SectionCertificats'
import { SectionCv }          from './SectionCv'
import { MyCJSCard }          from '@/components/centres/MyCJSCard'
import { PageHeader }         from '@/components/ui'
import { getProfilePhotoUrl } from '@/lib/avatar/profile-photo'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

interface Props {
  initial:      ProfilComplet
  ssoProfilUrl: string | null
}

/**
 * <ProfilClient /> — page profil jeune (GUIC-20 / GUIC-191).
 *
 * Layout v2 :
 * - mobile : empilement vertical, MyCard en haut + sections en dessous
 * - desktop : grid `lg:grid-cols-[320px_1fr]` — aside MyCard + header sticky, sections à droite
 */
export function ProfilClient({ initial, ssoProfilUrl }: Props) {
  const [score, setScore]       = useState(initial.profil?.completionScore ?? 0)
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.profil?.photoUrl ?? null)

  function handleSaved(data: PutProfilResponse) {
    setScore(data.completionScore)
  }

  return (
    <div className="flex flex-col gap-space-5">
      <PageHeader
        title="Mon profil"
        subtitle="Complétez votre profil pour accéder à plus d&apos;opportunités"
        className="mb-0"
      />

      {/* Layout desktop conforme design v2 : aside gauche 300px sticky (identité +
          complétude) + colonne droite (sections éditables). Mobile : empilement. */}
      <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-space-5 flex flex-col gap-space-5">
        <aside>
          <div className="lg:sticky lg:top-[80px] flex flex-col gap-space-4">
            <ProfilHeader
              nom={initial.nom}
              prenom={initial.prenom}
              email={initial.email}
              completionScore={score}
              photoUrl={photoUrl}
              cjsUid={initial.cjsUid}
            />
            {/* Carte CJS — GUIC-369 : on bascule sur la version "centres"
                (gradient teal-deep + QR + matricule monospace) — identique à
                celle affichée dans `/centres`. La précédente version
                `@/components/ui/MyCJSCard` (placeholder Phase 2B) divergeait
                visuellement. */}
            <MyCJSCard
              cjsUid={initial.cjsUid}
              compact
              user={{
                prenom: initial.prenom,
                nom: initial.nom,
                matricule: `GJS · ${(initial.prenom?.[0] ?? '?').toUpperCase()}${(initial.nom?.[0] ?? '?').toUpperCase()} · ${initial.cjsUid.slice(0, 6).toUpperCase()}`,
                membreDepuis: '—',
                photoUrl: getProfilePhotoUrl(initial.cjsUid),
              }}
            />
          </div>
        </aside>

        {/* Sections éditables */}
        <div className="flex flex-col gap-space-4 min-w-0">
          <SectionIdentite
            data={initial}
            photoUrl={photoUrl}
            ssoProfilUrl={ssoProfilUrl}
            onSaved={handleSaved}
            onPhotoSaved={setPhotoUrl}
          />

          <SectionProfil
            data={initial.profil}
            onSaved={handleSaved}
          />

          <SectionCv
            initialCvUrl={initial.profil?.cvUrl ?? null}
          />

          <SectionExperiences
            experiences={initial.experiences}
            onScoreChange={setScore}
          />

          <SectionDiplomes
            diplomes={initial.diplomes}
            onScoreChange={setScore}
          />

          <SectionCertificats
            certificats={initial.certificats}
          />
        </div>
      </div>
    </div>
  )
}
