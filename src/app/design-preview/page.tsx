/**
 * Route publique `/design-preview` — GUIC-208 (v2) / GUIC-428 (v3) / GUIC-690 (v5).
 *
 * Liste les maquettes HTML statiques livrées par le PO :
 *  - **v5** (livraison juillet 2026) — réponse aux retours design V3 + audit UX,
 *    source de vérité actuelle (15 lots, palette charte Yaakaar 2030, Lexend)
 *  - **v3** (livraison 2026-06-16) — référence précédente
 *  - **v2** (livraison 2026-06-15) — archive, conservée pour comparaison/rollback
 *
 * Accessible en production sans session. Aucune donnée perso, indexable.
 */
import Link from 'next/link'

export const metadata = {
  title: 'Aperçu design — Guichet Jeunesse',
  description: 'Maquettes HTML livrées par le PO (v5 — juillet 2026).',
}

interface Lot {
  num: number
  label: string
  file: string
  /** Marqueur "nouveau" (lots ajoutés depuis la livraison précédente). */
  isNew?: boolean
}

const LOTS_V5: Lot[] = [
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
  { num: 14, label: 'Bibliothèque Composants', file: 'Lot 14 - Bibliotheque Composants.html' },
  { num: 15, label: 'Yaye · Opportunités · Dépôt', file: 'Lot 15 - Yaye Opportunites Depot.html', isNew: true },
]

const LOTS_V3: Lot[] = [
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
  { num: 14, label: 'Bibliothèque Composants', file: 'Lot 14 - Bibliotheque Composants.html' },
]

const LOTS_V2: Lot[] = [
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

function LotCard({ lot, root, accentClass }: { lot: Lot; root: 'design-v5' | 'design-v3' | 'design-v2'; accentClass: string }) {
  return (
    <li
      key={lot.file}
      className="bg-gj-surface border border-gj-line rounded-gj-md overflow-hidden"
    >
      <div className="p-space-4">
        <div className="flex items-center gap-2">
          <p className={`text-fs-100 font-bold uppercase tracking-wide ${accentClass}`}>
            Lot {lot.num}
          </p>
          {lot.isNew ? (
            <span
              className="inline-block text-fs-100 font-black uppercase tracking-wide px-2 py-0.5 rounded-gj-pill"
              style={{ background: 'var(--gj-yellow)', color: 'var(--gj-ink)' }}
            >
              Nouveau
            </span>
          ) : null}
        </div>
        <p className="text-fs-300 font-bold text-color-text-primary mt-space-1">
          {lot.label}
        </p>
        <Link
          href={`/${root}/${encodeURIComponent(lot.file)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-fs-200 font-black ${accentClass} hover:underline mt-space-3`}
        >
          Ouvrir la maquette ↗
        </Link>
      </div>
    </li>
  )
}

export default function DesignPreviewPage() {
  return (
    <main className="container-page py-space-6">
      <header className="mb-space-6">
        <p className="text-fs-100 uppercase tracking-wide text-color-text-secondary">
          Aperçu PO — livraison juillet 2026 (15 lots · réponse aux retours V3 + audit UX)
        </p>
        <h1 className="text-fs-800 font-black text-color-text-primary mt-space-1">
          Maquettes design v5
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-2 max-w-prose">
          15 lots HTML autonomes — palette charte Yaakaar 2030, police Lexend, couleur
          d&apos;action magenta unique, code couleur par catégorie d&apos;offre. Source de
          vérité pour toute implémentation hors admin (épic GUIC-689). Chaque lien ouvre
          la maquette interactive en plein écran.
        </p>
        <p className="text-fs-200 mt-space-2">
          <Link
            href="/design-v5/Reponse%20au%20retour%20design%20V3.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-gj-teal-deep hover:underline"
          >
            Lire la réponse au retour design V3 ↗
          </Link>
          {' '}·{' '}
          <Link
            href="/design-v5/Audit%20UX%20-%20Guichet%20Jeunesse.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-gj-teal-deep hover:underline"
          >
            Audit UX (P1/P2/P3) ↗
          </Link>
          {' '}— changements point par point, plan d&apos;action priorisé.
        </p>
      </header>

      <section aria-labelledby="v5-heading">
        <h2
          id="v5-heading"
          className="text-fs-500 font-black text-color-text-primary mb-space-3"
        >
          Design v5 — livraison juillet 2026 (actif)
        </h2>
        <ul className="grid gap-space-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
          {LOTS_V5.map((lot) => (
            <LotCard
              key={`v5-${lot.file}`}
              lot={lot}
              root="design-v5"
              accentClass="text-gj-teal-deep"
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="v3-heading" className="mt-space-7 pt-space-6 border-t border-gj-line">
        <h2
          id="v3-heading"
          className="text-fs-400 font-bold text-color-text-secondary mb-space-2"
        >
          Design v3 — référence précédente (livraison 2026-06-16)
        </h2>
        <p className="text-fs-200 text-color-text-secondary mb-space-3 max-w-prose">
          Référence pour les écrans non couverts par la migration v5 en cours (dont
          l&apos;espace admin, migré séparément). La v5 supersede sur son périmètre.
        </p>
        <ul className="grid gap-space-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
          {LOTS_V3.map((lot) => (
            <LotCard
              key={`v3-${lot.file}`}
              lot={lot}
              root="design-v3"
              accentClass="text-color-text-secondary"
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="v2-heading" className="mt-space-7 pt-space-6 border-t border-gj-line">
        <h2
          id="v2-heading"
          className="text-fs-400 font-bold text-color-text-secondary mb-space-2"
        >
          Design v2 — archive (livraison 2026-06-15)
        </h2>
        <p className="text-fs-200 text-color-text-secondary mb-space-3 max-w-prose">
          Conservé pour comparaison et rollback éventuel. Ne pas utiliser comme référence
          d&apos;implémentation.
        </p>
        <ul className="grid gap-space-3 sm:grid-cols-2 lg:grid-cols-3 list-none p-0">
          {LOTS_V2.map((lot) => (
            <LotCard
              key={`v2-${lot.file}`}
              lot={lot}
              root="design-v2"
              accentClass="text-color-text-secondary"
            />
          ))}
        </ul>
      </section>

      <footer className="mt-space-7 pt-space-4 border-t border-gj-line text-fs-100 text-color-text-secondary">
        Sources : <code>design-guichet-v5/</code> + <code>public/design-v5/</code> (actif · GUIC-690)
        · <code>design-guichet-v3/</code> + <code>public/design-v3/</code> (référence précédente · GUIC-428)
        · <code>design-guichet-v2/</code> + <code>public/design-v2/</code> (archive · GUIC-208).
      </footer>
    </main>
  )
}
