import Image from 'next/image'

export interface DashboardHeroProps {
  prenom:    string
  nom:       string
  /** Libellé du programme (ex. "Programme YEAH"). Facultatif. */
  programme?: string
  /** URL d'avatar. Si absente, fallback initiales sur disque pastille. */
  photoUrl?:  string | null
  /** Message d'accroche optionnel (sinon "Bonjour"). */
  greeting?:  string
}

/**
 * Hero du tableau de bord bénéficiaire — bandeau dégradé teal/jaune avec
 * salutation, badge programme et avatar à droite.
 *
 * Le score de complétude vit désormais dans `DashboardTracker` (séparation de
 * responsabilités : Hero = identité, Tracker = nudge profil).
 */
export function DashboardHero({
  prenom,
  nom,
  programme,
  photoUrl,
  greeting = 'Bonjour',
}: DashboardHeroProps) {
  const initials =
    (prenom?.[0] ?? '').toUpperCase() + (nom?.[0] ?? '').toUpperCase()

  return (
    <section
      className="relative overflow-hidden rounded-gj-lg p-space-5 md:p-space-6
        bg-gradient-to-br from-gj-teal-deep via-gj-teal to-gj-yellow text-white"
      aria-label="Bienvenue"
    >
      <div
        className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-gj-yellow/30 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-space-4">
        <div className="flex-1 min-w-0">
          <p className="text-fs-200 uppercase tracking-wider opacity-80">{greeting}</p>
          <h1 className="text-fs-600 md:text-fs-700 font-black leading-tight mt-1 truncate">
            {prenom || nom || ''}
          </h1>
          {programme && (
            <span
              className="inline-flex items-center gap-space-1 mt-space-3 px-space-3 py-space-1
                rounded-full bg-white/20 backdrop-blur-sm text-fs-100 font-black uppercase tracking-wider"
            >
              {programme}
            </span>
          )}
        </div>

        <div className="flex-shrink-0">
          {photoUrl ? (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-white/40">
              <Image
                src={photoUrl}
                alt={`Photo de ${prenom}`}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 border-2 border-white/40
                flex items-center justify-center font-black text-fs-500"
              aria-hidden
            >
              {initials || '·'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
