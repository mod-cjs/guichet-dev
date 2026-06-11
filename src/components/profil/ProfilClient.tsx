'use client'

import { useState } from 'react'
import { ProfilHeader }       from './ProfilHeader'
import { SectionIdentite }    from './SectionIdentite'
import { SectionProfil }      from './SectionProfil'
import { SectionExperiences } from './SectionExperiences'
import { SectionDiplomes }    from './SectionDiplomes'
import { SectionCertificats } from './SectionCertificats'
import { MyCJSCard }          from '@/components/centres/MyCJSCard'
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
            />
            {/* Carte CJS — version Lot 7 (GUIC-368). QR fallback démo généré
                automatiquement depuis `cjsUid` tant que la Wave 6 (GUIC-357 —
                JWT signé HMAC) n'est pas livrée. Centre de rattachement non
                disponible aujourd'hui dans ProfilComplet (TODO : exposer via
                relation Centre quand M4 sera branché côté profil). */}
            <MyCJSCard
              compact
              cjsUid={initial.cjsUid}
              user={{
                prenom: initial.prenom,
                nom: initial.nom,
                matricule: `GJS · ${(initial.prenom?.[0] ?? '?').toUpperCase()}${(initial.nom?.[0] ?? '?').toUpperCase()} · ${initial.cjsUid.slice(0, 6).toUpperCase()}`,
                membreDepuis: '—',
              }}
            />
          </div>
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
