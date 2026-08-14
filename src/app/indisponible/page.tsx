import type { Metadata } from 'next'

/**
 * GUIC-706 — Cible de réécriture en fermeture explicite (`silentClose: false`).
 *
 * Réservée aux publics identifiés — recruteurs et conseillers. Ce sont des personnes
 * rattachées, sous contrat : leur opposer un 404 muet ne protège rien et leur fait perdre
 * leur travail en cours, puis appeler un support qui n'aura rien à leur répondre.
 *
 * Le message ne nomme JAMAIS la fonctionnalité concernée ni le motif : la page est atteinte
 * par réécriture depuis n'importe quelle route fermée, et une navigation directe ne doit
 * rien apprendre. Il dit seulement qu'il n'y a rien à réparer de leur côté et vers qui se
 * tourner.
 */
export const metadata: Metadata = { title: 'Momentanément indisponible — Guichet Jeunesse' }

export default function Page() {
  return (
    <main
      id="main"
      className="min-h-[60svh] flex items-center justify-center px-space-4 py-space-6"
    >
      <div className="max-w-[520px] text-center flex flex-col gap-space-3">
        <h1 className="text-fs-500 font-bold text-color-text-primary m-0">
          Momentanément indisponible
        </h1>
        <p className="text-fs-300 text-color-text-secondary m-0">
          Cette partie de votre espace est temporairement fermée par l’équipe du Guichet.
          Rien n’est perdu et il n’y a rien à faire de votre côté : elle réapparaîtra sans
          action de votre part.
        </p>
        <p className="text-fs-200 text-color-text-secondary m-0">
          Si vous en avez besoin dès maintenant, contactez votre référent CJS.
        </p>
      </div>
    </main>
  )
}
