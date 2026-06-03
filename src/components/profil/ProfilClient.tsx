'use client'

import { useState } from 'react'
import { ProfilHeader }       from './ProfilHeader'
import { SectionIdentite }    from './SectionIdentite'
import { SectionProfil }      from './SectionProfil'
import { SectionExperiences } from './SectionExperiences'
import { SectionDiplomes }    from './SectionDiplomes'
import { SectionCertificats } from './SectionCertificats'
import { MyCardCjs }          from './MyCardCjs'
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
  const [score, setScore] = useState(initial.profil?.completionScore ?? 0)

  function handleSaved(data: PutProfilResponse) {
    setScore(data.completionScore)
  }

  return (
    <div className="flex flex-col gap-space-5">
      <div>
        <h1 className="text-fs-600 font-black text-color-text-primary">Mon profil</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Complétez votre profil pour accéder à plus d&apos;opportunités
        </p>
      </div>

      <div className="grid gap-space-5 lg:grid-cols-[320px_1fr] lg:items-start">
        {/* Aside : MyCard + header — sticky desktop */}
        <aside className="flex flex-col gap-space-4 lg:sticky lg:top-space-4">
          <MyCardCjs
            cjsUid={initial.cjsUid}
            nom={initial.nom}
            prenom={initial.prenom}
          />
          <ProfilHeader
            nom={initial.nom}
            prenom={initial.prenom}
            email={initial.email}
            completionScore={score}
          />
        </aside>

        {/* Sections éditables */}
        <div className="flex flex-col gap-space-4 min-w-0">
          <SectionIdentite
            data={initial}
            ssoProfilUrl={ssoProfilUrl}
            onSaved={handleSaved}
          />

          <SectionProfil
            data={initial.profil}
            onSaved={handleSaved}
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
