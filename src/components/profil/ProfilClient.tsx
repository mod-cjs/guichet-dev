'use client'

import { useState } from 'react'
import { ProfilHeader }       from './ProfilHeader'
import { SectionIdentite }    from './SectionIdentite'
import { SectionProfil }      from './SectionProfil'
import { SectionExperiences } from './SectionExperiences'
import { SectionDiplomes }    from './SectionDiplomes'
import { SectionCertificats } from './SectionCertificats'
import type { ProfilComplet, PutProfilResponse } from '@/types/profil'

interface Props {
  initial:      ProfilComplet
  ssoProfilUrl: string | null
}

export function ProfilClient({ initial, ssoProfilUrl }: Props) {
  const [score, setScore] = useState(initial.profil?.completionScore ?? 0)

  function handleSaved(data: PutProfilResponse) {
    setScore(data.completionScore)
  }

  return (
    <div className="flex flex-col gap-space-5 pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
      <div>
        <h1 className="text-fs-600 font-black text-color-text-primary">Mon profil</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Complétez votre profil pour accéder à plus d&apos;opportunités
        </p>
      </div>

      <ProfilHeader
        nom={initial.nom}
        prenom={initial.prenom}
        email={initial.email}
        completionScore={score}
      />

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
  )
}
