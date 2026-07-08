import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description:
    'Mentions légales du Guichet Jeunesse — éditeur Consortium Jeunesse Sénégal, hébergement Vercel.',
  ...withCanonical('/legal/mentions-legales'),
}

export const dynamic = 'force-static'

const DERNIERE_MAJ = '4 juin 2026'

export default function MentionsLegalesPage() {
  return (
    <div className="container-page py-space-6 max-w-[760px]">
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">
          Mentions légales
        </h1>
        <p className="text-fs-200 text-color-text-secondary mt-space-1">
          Dernière mise à jour : {DERNIERE_MAJ}
        </p>
      </header>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          1. Éditeur
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Le site Guichet Jeunesse est édité par le Consortium Jeunesse Sénégal
          (CJS), association de jeunesse de droit sénégalais, dont le siège est
          à Dakar, Sénégal. Directeur de la publication : le coordinateur
          national du Consortium.
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          2. Hébergement
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut,
          CA 91789, États-Unis. Les bases de données opérationnelles
          (MariaDB, Redis) sont hébergées sur des serveurs choisis par le CJS.
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          3. Propriété intellectuelle
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          L&apos;ensemble des contenus présents sur le Guichet Jeunesse
          (textes, graphismes, logo, code source) est la propriété exclusive
          du CJS ou de ses partenaires, et est protégé par les lois
          sénégalaises et internationales sur la propriété intellectuelle.
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          4. Contact
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Pour toute question relative au site ou pour exercer vos droits sur
          vos données personnelles, contactez le Consortium Jeunesse Sénégal
          à Dakar.
        </p>
        <p className="text-fs-200 text-color-text-muted mt-space-3 italic">
          Coordonnées complètes (adresse postale, téléphone, e-mail) à
          compléter par le service juridique du CJS.
        </p>
      </section>
    </div>
  )
}
