'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui'
import {
  ProfilHeader,
  SectionIdentite,
  SectionProfil,
  SectionExperiences,
  SectionCertificats,
} from '@/components/profil'
import type { ProfilComplet } from '@/app/api/profil/route'

export default function MonProfilPage() {
  const [profil, setProfil]   = useState<ProfilComplet | null>(null)
  const [score,  setScore]    = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profil')
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error.message)
        setProfil(json.data)
        setScore(json.data.profil?.completionScore ?? 0)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-space-5">
        <Skeleton height="96px" rounded="var(--gj-r-lg)" />
        <Skeleton height="192px" rounded="var(--gj-r-lg)" />
        <Skeleton height="192px" rounded="var(--gj-r-lg)" />
      </div>
    )
  }

  if (error || !profil) {
    return (
      <div className="p-space-4 bg-gj-red/10 rounded-gj-lg text-gj-red text-fs-300">
        {error ?? 'Impossible de charger le profil.'}
      </div>
    )
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
        nom={profil.nom}
        prenom={profil.prenom}
        email={profil.email}
        completionScore={score}
      />

      <SectionIdentite
        data={profil}
        onSaved={setScore}
      />

      <SectionProfil
        data={profil.profil}
        onSaved={setScore}
      />

      <SectionExperiences
        experiences={profil.experiences}
      />

      <SectionCertificats
        certificats={profil.certificats}
      />
    </div>
  )
}
