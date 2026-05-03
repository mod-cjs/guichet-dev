import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accueil',
}

export default function Accueil() {
  return (
    <div className="container-page py-16">
      <h1 className="text-4xl font-bold text-cjs-vert mb-4">
        Bienvenue sur le Guichet Jeunesse
      </h1>
      <p className="text-cjs-gris text-lg">
        Portail numérique du Consortium Jeunesse Sénégal.
      </p>
    </div>
  )
}
