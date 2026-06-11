'use client'

import { useState } from 'react'
import { Card } from '@/components/ui'
import { ProfilFileUploadButton } from './ProfilFileUploadButton'
import type { CertificatItem } from '@/types/profil'

interface Props {
  certificats: CertificatItem[]
}

export function SectionCertificats({ certificats }: Props) {
  const [items, setItems] = useState<CertificatItem[]>(certificats)

  if (items.length === 0) return null

  return (
    <Card>
      <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-4">Certificats Moodle</h2>
      <div className="flex flex-col divide-y divide-gj-line">
        {items.map(c => (
          <div key={c.id} className="py-space-3 first:pt-0 last:pb-0 flex flex-col gap-space-2">
            <div className="flex justify-between items-start gap-space-3">
              <div className="min-w-0">
                <p className="font-medium text-fs-300 text-color-text-primary">{c.formation}</p>
                <p className="text-fs-200 text-color-text-secondary">
                  Obtenu le {new Date(c.obtenuLe).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {c.urlCertificat && (
                <a
                  href={c.urlCertificat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fs-200 text-gj-teal-deep font-bold hover:underline flex-shrink-0"
                >
                  Voir Moodle
                </a>
              )}
            </div>
            <ProfilFileUploadButton
              url={`/api/profil/certificats/${c.id}/upload`}
              currentUrl={c.fichierUrl}
              emptyLabel="Joindre le certificat"
              replaceLabel="Remplacer le certificat"
              onUploaded={fichierUrl =>
                setItems(prev => prev.map(x => x.id === c.id ? { ...x, fichierUrl } : x))
              }
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
