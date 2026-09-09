import Link from 'next/link'
import { Alert, Breadcrumbs, PageHeader } from '@/components/ui'
import type { BlocLegal, DocumentLegal } from '@/content/legal/types'

/**
 * GUIC-605 — Rendu générique d'un document légal.
 *
 * Une seule mise en page pour les 5 documents `/legal/*` : ils doivent se
 * ressembler, un texte légal qui change d'allure d'une page à l'autre inspire
 * la méfiance. Le contenu vient de `src/content/legal/`, jamais de JSX en dur.
 *
 * Aucun `dangerouslySetInnerHTML` : les blocs sont du texte structuré, donc
 * pas de surface XSS sur des pages pourtant entièrement statiques.
 */

function Bloc({ bloc }: { bloc: BlocLegal }) {
  switch (bloc.type) {
    case 'paragraphe':
      return <p className="text-fs-300 text-color-text-secondary mb-space-3">{bloc.texte}</p>

    case 'liste':
      return (
        <ul className="mb-space-3 flex flex-col gap-space-2 pl-space-4 list-disc marker:text-gj-teal">
          {bloc.items.map((item) => (
            <li key={item} className="text-fs-300 text-color-text-secondary">
              {item}
            </li>
          ))}
        </ul>
      )

    case 'definitions':
      return (
        <dl className="mb-space-3 flex flex-col gap-space-2">
          {bloc.items.map((item) => (
            <div key={item.terme} className="text-fs-300">
              <dt className="inline font-bold text-color-text-primary">{item.terme}</dt>
              <dd className="inline text-color-text-secondary"> — {item.valeur}</dd>
            </div>
          ))}
        </dl>
      )

    case 'encart':
      return (
        <div className="mb-space-3 rounded-gj-lg bg-gj-teal/5 px-space-4 py-space-3">
          {bloc.titre ? (
            <p className="text-fs-300 font-bold text-color-text-primary mb-space-1">{bloc.titre}</p>
          ) : null}
          <p className="text-fs-300 text-color-text-secondary m-0">{bloc.texte}</p>
        </div>
      )
  }
}

export interface LegalDocumentProps {
  document: DocumentLegal
}

export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <div className="container-page py-space-6 max-w-[76ch]">
      <Breadcrumbs
        items={[
          { label: 'Accueil', href: '/' },
          { label: document.titre },
        ]}
        className="mb-space-4"
      />

      <PageHeader
        title={document.titre}
        subtitle={
          <>
            {document.resume}
            <span className="block mt-space-1 text-fs-200 text-color-text-muted">
              Version {document.version} — dernière mise à jour : {document.dateMaj}
            </span>
          </>
        }
      />

      {document.estCoquille ? (
        <div className="mb-space-5">
          <Alert type="warning" title="Document en cours de rédaction">
            Son contenu n’est pas encore complet et ne constitue pas un engagement contractuel. La{' '}
            <Link href="/legal/confidentialite" className="underline">
              politique de confidentialité
            </Link>{' '}
            et la page{' '}
            <Link href="/legal/vos-droits" className="underline">
              Vos droits
            </Link>{' '}
            sont, elles, en vigueur.
          </Alert>
        </div>
      ) : null}

      {document.sections.map((section) => (
        <section key={section.titre} className="mb-space-6">
          <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-3">
            {section.titre}
          </h2>
          {section.blocs.map((bloc, i) => (
            <Bloc key={i} bloc={bloc} />
          ))}
        </section>
      ))}
    </div>
  )
}
