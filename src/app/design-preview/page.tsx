/**
 * Route publique `/design-preview` — GUIC-208.
 *
 * Accessible en production (déployé sur Vercel) — page ultra-légère
 * qui liste les maquettes HTML statiques servies depuis `public/design-v2/`.
 * Permet à la PO et aux reviewers de visualiser les écrans livrés sans
 * avoir à cloner le repo.
 *
 * Aucune donnée personnelle, aucune dépendance à la session — peut être
 * indexée par les crawlers, on laisse robots.txt décider (cf. SEO module).
 */
import Link from 'next/link'

export const metadata = {
  title: 'Aperçu design — Guichet Jeunesse',
  description: 'Maquettes HTML livrées par le PO (lot 2026-06-15).',
}

const LOTS = [
  { num: 1, label: 'Onboarding mobile + écrans clés', file: 'Lot 1 - Onboarding + Ecrans cles.html' },
  { num: 2, label: 'Onboarding web + Dashboard bénéficiaire', file: 'Lot 2 - Onboarding Web + Dashboard Beneficiaire.html' },
  { num: 3, label: 'Opportunités', file: 'Lot 3 - Opportunites.html' },
  { num: 4, label: 'Profil bénéficiaire', file: 'Lot 4 - Profil Beneficiaire.html' },
  { num: 5, label: 'Événements', file: 'Lot 5 - Evenements.html' },
  { num: 6, label: 'Ressources', file: 'Lot 6 - Ressources.html' },
  { num: 7, label: 'Centres CJS', file: 'Lot 7 - Centres CJS.html' },
  { num: 8, label: 'Espace Conseiller', file: 'Lot 8 - Espace Conseiller.html' },
  { num: 9, label: 'Mes candidatures', file: 'Lot 9 - Mes Candidatures.html' },
  { num: 10, label: 'Espace Recruteur', file: 'Lot 10 - Espace Recruteur.html' },
  { num: 11, label: 'Administration', file: 'Lot 11 - Administration.html' },
  { num: 12, label: 'Compléments bénéficiaire', file: 'Lot 12 - Complements Beneficiaire.html' },
  { num: 13, label: 'États système', file: 'Lot 13 - Etats Systeme.html' },
]

export default function DesignPreviewPage() {
  return (
    <main className="container-page py-space-6">
      <header className="mb-space-6">
        <p className="text-fs-100 uppercase tracking-wide text-color-text-secondary">
          Aperçu PO — livraison 2026-06-15 (13 lots)
        </p>
        <h1 className="text-fs-800 font-black text-color-text-primary mt-space-1">
          Maquettes design v2
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-2 max-w-prose">
          13 lots HTML autonomes livrés par le Product Owner. Chaque lien ouvre la maquette interactive
          en plein écran. Les sources JSX sont disponibles uniquement en dev sur <code>/preview-v2</code>.
        </p>
      </header>

      <ul className="grid gap-space-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
        {LOTS.map((lot) => (
          <li
            key={lot.file}
            className="bg-gj-surface border border-gj-line rounded-gj-md overflow-hidden"
          >
            <div className="p-space-4">
              <p className="text-fs-100 font-bold uppercase tracking-wide text-gj-teal-deep">
                Lot {lot.num}
              </p>
              <p className="text-fs-300 font-bold text-color-text-primary mt-space-1">
                {lot.label}
              </p>
              <Link
                href={`/design-v2/${encodeURIComponent(lot.file)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-fs-200 font-black text-gj-teal-deep hover:underline mt-space-3"
              >
                Ouvrir la maquette ↗
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <footer className="mt-space-7 pt-space-4 border-t border-gj-line text-fs-100 text-color-text-secondary">
        Source : <code>design-guichet-v2/</code> + <code>public/design-v2/</code> · GUIC-208
      </footer>
    </main>
  )
}
