import Image from 'next/image'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { regionLabel } from '@/lib/regions'
import { getProfilePhotoUrl } from '@/lib/avatar/profile-photo'

/**
 * <ProfileHeroBand /> — bandeau d'identité pleine largeur du profil jeune.
 *
 * Réf `design-guichet-v5/profil-web.jsx` (`ProfileHeader` L.116-173) : avatar,
 * badge « Membre CJS », pastilles meta (localisation · âge · niveau d'étude ·
 * ancienneté) et une action unique. Le dégradé est l'exception hero autorisée
 * (cf. `.agent_context/specs/design-v5-standard-qualite.md`).
 *
 * Règle R3 du standard : une pastille n'apparaît que si sa donnée existe —
 * jamais de « null », jamais de tiret de remplissage.
 */
export interface ProfileHeroBandProps {
  prenom: string | null
  nom: string | null
  cjsUid: string
  photoUrl: string | null
  completionScore: number
  region: string | null
  dateNaissance: string | null
  genre: string | null
  niveauEtude: string | null
  membreDepuis: string | null
}

const GENRES: Record<string, string> = { F: 'Femme', M: 'Homme' }

const NIVEAUX: Record<string, string> = {
  BFEM: 'BFEM',
  BAC: 'Bac',
  BAC_PLUS_2: 'Bac +2',
  BAC_PLUS_3: 'Bac +3',
  BAC_PLUS_5: 'Bac +5',
  DOCTORAT: 'Doctorat',
}

const MOIS_ANNEE = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** Âge révolu à partir d'une date ISO ; `null` si absente ou incohérente. */
function ageDepuis(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age > 0 && age < 120 ? age : null
}

export function ProfileHeroBand({
  prenom,
  nom,
  cjsUid,
  photoUrl,
  completionScore,
  region,
  dateNaissance,
  genre,
  niveauEtude,
  membreDepuis,
}: ProfileHeroBandProps) {
  const nomComplet = [prenom, nom].filter(Boolean).join(' ') || 'Mon profil'
  const initiales =
    `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}` || '?'

  // Chaque pastille n'est construite QUE si sa donnée existe (règle R3).
  const metas: { icon: IconName; label: string }[] = []
  const regionLisible = region ? regionLabel(region) ?? region : null
  if (regionLisible) metas.push({ icon: 'pin', label: regionLisible })

  const age = ageDepuis(dateNaissance)
  const genreLisible = genre ? GENRES[genre] ?? null : null
  const identite = [age ? `${age} ans` : null, genreLisible].filter(Boolean).join(' · ')
  if (identite) metas.push({ icon: 'user', label: identite })

  const niveauLisible = niveauEtude ? NIVEAUX[niveauEtude] ?? null : null
  if (niveauLisible) metas.push({ icon: 'learning', label: niveauLisible })

  if (membreDepuis) {
    const d = new Date(membreDepuis)
    if (!Number.isNaN(d.getTime())) {
      metas.push({ icon: 'calendar', label: `Membre depuis ${MOIS_ANNEE.format(d)}` })
    }
  }

  const photo = getProfilePhotoUrl(cjsUid, Boolean(photoUrl))

  return (
    <section
      data-testid="profil-hero-band"
      aria-label="Mon identité"
      className="relative overflow-hidden rounded-gj-lg px-space-4 py-space-4
        sm:px-space-5 sm:py-space-5 text-white
        bg-gradient-to-br from-gj-teal-deep to-gj-ink-teal"
    >
      <div className="flex flex-wrap items-center gap-space-4">
        {/* Avatar — photo réelle si présente, initiales sinon (jamais de vide). */}
        <span
          className="relative shrink-0 inline-flex items-center justify-center
            w-[76px] h-[76px] sm:w-[92px] sm:h-[92px] rounded-full
            bg-white/15 text-fs-700 font-black"
        >
          {photoUrl && photo ? (
            <Image
              src={photo}
              alt=""
              width={92}
              height={92}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span aria-hidden>{initiales}</span>
          )}
        </span>

        <div className="flex-1 min-w-0">
          <span
            className="inline-flex items-center gap-1 text-fs-100 font-extrabold
              uppercase tracking-[0.5px] bg-gj-yellow text-gj-ink
              px-space-2 py-[3px] rounded-gj-pill"
          >
            Membre CJS
          </span>

          <h1 className="text-fs-600 sm:text-fs-700 font-black leading-tight mt-space-2">
            {nomComplet}
          </h1>

          {metas.length > 0 && (
            <ul
              data-testid="profil-hero-metas"
              className="flex flex-wrap gap-2 list-none p-0 m-0 mt-space-2"
            >
              {metas.map((m) => (
                <li
                  key={m.label}
                  className="inline-flex items-center gap-1 text-fs-100 font-semibold
                    bg-white/15 px-space-2 py-1 rounded-gj-pill"
                >
                  <Icon name={m.icon} size={12} aria-hidden />
                  {m.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href="#profil-identite"
          className="shrink-0 inline-flex items-center justify-center gap-2 no-underline
            min-h-[var(--tap-min)] px-space-4 rounded-gj-md
            bg-gj-yellow text-gj-ink text-fs-300 font-extrabold"
        >
          Modifier mon profil
          <Icon name="arrow-right" size={16} aria-hidden />
        </Link>
      </div>

      {/* Complétion — barre lisible sur fond sombre, valeur réelle. */}
      <div className="mt-space-4">
        <div className="flex items-center justify-between text-fs-100 font-bold">
          <span>Profil complété</span>
          <span>{completionScore} %</span>
        </div>
        <div
          className="mt-1 h-[6px] rounded-gj-pill bg-white/20 overflow-hidden"
          role="progressbar"
          aria-valuenow={completionScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression du profil"
        >
          <span
            className="block h-full bg-gj-yellow rounded-gj-pill"
            style={{ width: `${Math.max(0, Math.min(100, completionScore))}%` }}
          />
        </div>
      </div>
    </section>
  )
}
