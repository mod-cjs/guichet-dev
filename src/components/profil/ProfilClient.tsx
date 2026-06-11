'use client'

import { useState } from 'react'
import { ProfilHeader }       from './ProfilHeader'
import { SectionIdentite }    from './SectionIdentite'
import { SectionProfil }      from './SectionProfil'
import { SectionExperiences } from './SectionExperiences'
import { SectionDiplomes }    from './SectionDiplomes'
import { SectionCertificats } from './SectionCertificats'
import { MyCJSCard }          from '@/components/ui/MyCJSCard'
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
      <div>
        <h1 className="text-fs-600 font-black text-color-text-primary">Mon profil</h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Complétez votre profil pour accéder à plus d&apos;opportunités
        </p>
      </div>

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
            />
            {/* Carte CJS — branchement GUIC-248. Centre rattachement non disponible
                aujourd'hui dans ProfilComplet (TODO : exposer via relation Centre
                quand le module M4 sera branché). */}
            <MyCJSCard
              cjsUid={initial.cjsUid}
              prenom={initial.prenom}
              nom={initial.nom}
              variant="compact"
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
