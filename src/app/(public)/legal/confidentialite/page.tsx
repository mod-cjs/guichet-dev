import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de protection des données personnelles du Guichet Jeunesse, conforme à la loi sénégalaise n° 2008-12 sur la protection des données personnelles.',
  ...withCanonical('/legal/confidentialite'),
}

export const dynamic = 'force-static'

const DERNIERE_MAJ = '4 juin 2026'

export default function ConfidentialitePage() {
  return (
    <div className="container-page py-space-6 max-w-[760px]">
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">
          Politique de confidentialité
        </h1>
        <p className="text-fs-200 text-color-text-secondary mt-space-1">
          Dernière mise à jour : {DERNIERE_MAJ}
        </p>
      </header>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          1. Responsable de traitement
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Le responsable de traitement des données personnelles collectées par
          le Guichet Jeunesse est le Consortium Jeunesse Sénégal (CJS), Dakar,
          Sénégal. Le traitement est déclaré auprès de la Commission de
          Protection des Données Personnelles (CDP) du Sénégal conformément à
          la loi n° 2008-12 du 25 janvier 2008.
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          2. Données collectées
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Le Guichet Jeunesse collecte l&apos;identifiant unique CJS
          (<code className="text-fs-200 font-mono">cjs_uid</code>), le nom,
          le prénom, l&apos;adresse e-mail, le numéro de téléphone au format
          E.164, ainsi que les données déclaratives renseignées par
          l&apos;utilisateur (formation, expériences, candidatures).
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          3. Finalités
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Les données sont traitées aux fins suivantes : authentification,
          mise en relation avec les opportunités (bourses, stages, formations),
          envoi de notifications via WhatsApp ou e-mail, statistiques anonymes
          de pilotage du programme YEAH.
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          4. Droits de l&apos;utilisateur
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Conformément à la loi sénégalaise, l&apos;utilisateur dispose
          d&apos;un droit d&apos;accès, de rectification, d&apos;opposition,
          de portabilité et d&apos;effacement de ses données. Toute demande
          peut être adressée au délégué à la protection des données du CJS.
        </p>
        <p className="text-fs-200 text-color-text-muted mt-space-3 italic">
          Document à compléter par le DPO du Consortium Jeunesse Sénégal —
          version provisoire en cours de validation CDP.
        </p>
      </section>
    </div>
  )
}
