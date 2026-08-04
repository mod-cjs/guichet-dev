import { Icon, type IconName } from '@/components/ui'

export interface DocumentsCardProps {
  cvUrl: string | null
  cvUploadedAt: string | null
  diplomes: { id: string; intitule: string; fichierUrl: string | null }[]
  certificats: { id: string; formation: string; fichierUrl: string | null; urlCertificat: string | null }[]
}

/**
 * <DocumentsCard /> — carte d'aside « CV & documents ».
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`DocumentsCard` L.250-282), avec un
 * ÉCART ASSUMÉ : la maquette liste une pièce d'identité, une attestation de
 * scolarité et une lettre de motivation, et leur attribue un statut
 * « Vérifié ». Aucun de ces quatre éléments n'existe dans le modèle. Les
 * afficher promettrait des fonctionnalités qui n'existent pas.
 *
 * On rend donc ce que le contrat porte : le CV, et les diplômes/certificats
 * dont un fichier a réellement été joint. Une pièce sans fichier n'est pas un
 * document — elle est déjà listée dans sa propre section.
 */

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

function dateLisible(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : DATE_FMT.format(d)
}

function LigneDocument({
  icon,
  nom,
  meta,
  href,
  testId,
}: {
  icon: IconName
  nom: string
  meta: string | null
  href: string
  testId?: string
}) {
  return (
    <li
      data-testid={testId}
      className="flex items-center gap-space-3 py-space-2 border-b border-gj-line last:border-b-0"
    >
      <span
        aria-hidden
        className="w-9 h-9 rounded-gj-md shrink-0 bg-gj-bg text-gj-grey inline-flex items-center justify-center"
      >
        <Icon name={icon} size={18} />
      </span>
      <span className="flex-1 min-w-0">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-fs-200 font-extrabold text-gj-ink no-underline hover:underline truncate"
        >
          {nom}
        </a>
        {meta && <span className="block text-fs-100 text-gj-grey mt-[1px]">{meta}</span>}
      </span>
      <span
        className="inline-flex items-center gap-1 text-fs-100 font-extrabold shrink-0
          text-gj-blue-ink bg-gj-blue-soft px-space-2 py-[3px] rounded-gj-pill"
      >
        <Icon name="check" size={11} aria-hidden />
        Ajouté
      </span>
    </li>
  )
}

export function DocumentsCard({ cvUrl, cvUploadedAt, diplomes, certificats }: DocumentsCardProps) {
  const dateCv = dateLisible(cvUploadedAt)
  const diplomesJoints = diplomes.filter((d) => d.fichierUrl)
  const certificatsJoints = certificats.filter((c) => c.fichierUrl ?? c.urlCertificat)
  const aDesDocuments = Boolean(cvUrl) || diplomesJoints.length > 0 || certificatsJoints.length > 0

  return (
    <section
      aria-label="CV & documents"
      className="bg-gj-surface border border-gj-line rounded-gj-lg p-space-4
        flex flex-col gap-space-3"
    >
      <h2 className="text-fs-300 font-extrabold text-gj-ink m-0">CV &amp; documents</h2>

      {!cvUrl && (
        /* Aucun pourcentage : le CV ne pèse pas dans le barème de complétion,
           contrairement à ce qu'annonce la maquette (« débloque +18 % »). */
        <div
          data-testid="documents-cv-manquant"
          className="flex items-center gap-space-3 rounded-gj-md p-space-3
            border-2 border-dashed border-gj-yellow bg-gj-yellow-soft"
        >
          <span
            aria-hidden
            className="w-10 h-10 rounded-gj-md shrink-0 bg-gj-surface text-gj-yellow-ink
              inline-flex items-center justify-center"
          >
            <Icon name="upload" size={20} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-fs-200 font-black text-gj-ink">Ajoute ton CV</span>
            <span className="block text-fs-100 text-gj-yellow-ink mt-[1px]">
              Réutilisé automatiquement dans tes candidatures.
            </span>
          </span>
        </div>
      )}

      {aDesDocuments && (
        <ul data-testid="documents-liste" className="list-none p-0 m-0">
          {cvUrl && (
            <LigneDocument
              testId="document-cv"
              icon="document"
              nom="Mon CV"
              meta={dateCv ? `Ajouté le ${dateCv}` : null}
              href={cvUrl}
            />
          )}
          {diplomesJoints.map((d) => (
            <LigneDocument key={d.id} icon="learning" nom={d.intitule} meta="Diplôme" href={d.fichierUrl!} />
          ))}
          {certificatsJoints.map((c) => (
            <LigneDocument
              key={c.id}
              icon="check-circle"
              nom={c.formation}
              meta="Certification"
              href={(c.fichierUrl ?? c.urlCertificat)!}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
