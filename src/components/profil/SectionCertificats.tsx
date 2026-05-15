import { Card } from '@/components/ui'
import type { ProfilComplet } from '@/app/api/profil/route'

interface Props {
  certificats: ProfilComplet['certificats']
}

export function SectionCertificats({ certificats }: Props) {
  if (certificats.length === 0) return null

  return (
    <Card>
      <h2 className="text-fs-400 font-bold text-color-text-primary mb-space-4">Certificats Moodle</h2>
      <div className="flex flex-col divide-y divide-gj-line">
        {certificats.map(c => (
          <div key={c.id} className="py-space-3 first:pt-0 last:pb-0 flex justify-between items-center gap-space-3">
            <div>
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
                className="text-fs-200 text-gj-teal font-bold hover:underline flex-shrink-0"
              >
                Voir
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
