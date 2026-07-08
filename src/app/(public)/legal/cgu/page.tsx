import type { Metadata } from 'next'
import { withCanonical } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description:
    "Conditions Générales d'Utilisation du Guichet Jeunesse du Consortium Jeunesse Sénégal.",
  ...withCanonical('/legal/cgu'),
}

export const dynamic = 'force-static'

const DERNIERE_MAJ = '4 juin 2026'

export default function CguPage() {
  return (
    <div className="container-page py-space-6 max-w-[760px]">
      <header className="mb-space-5">
        <h1 className="text-fs-800 font-black text-color-text-primary">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-fs-200 text-color-text-secondary mt-space-1">
          Dernière mise à jour : {DERNIERE_MAJ}
        </p>
      </header>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          1. Objet
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent
          l&apos;accès et l&apos;usage du Guichet Jeunesse, plateforme numérique
          opérée par le Consortium Jeunesse Sénégal (CJS) à destination des
          jeunes du Sénégal, des organisations partenaires et des recruteurs.
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          2. Accès au service
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          L&apos;accès au Guichet Jeunesse nécessite la création d&apos;un
          compte unique CJS via le Single Sign-On (SSO) du Consortium. Aucun
          mot de passe local n&apos;est stocké par la plateforme. Le compte
          est strictement personnel.
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          3. Engagements de l&apos;utilisateur
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          L&apos;utilisateur s&apos;engage à fournir des informations exactes,
          à ne pas usurper d&apos;identité, à respecter les autres usagers et
          à ne pas détourner la plateforme de son objet (orientation, formation,
          insertion socio-économique des jeunes).
        </p>
      </section>

      <section className="mb-space-5">
        <h2 className="text-fs-500 font-bold text-color-text-primary mb-space-2">
          4. Modification & résiliation
        </h2>
        <p className="text-fs-300 text-color-text-primary leading-relaxed">
          Le CJS se réserve le droit de modifier les présentes CGU à tout
          moment. Tout manquement grave aux engagements ci-dessus pourra
          entraîner la suspension du compte. L&apos;utilisateur peut demander
          la clôture de son compte à tout moment depuis son profil.
        </p>
        <p className="text-fs-200 text-color-text-muted mt-space-3 italic">
          Document à compléter par le service juridique du Consortium Jeunesse
          Sénégal — version provisoire.
        </p>
      </section>
    </div>
  )
}
