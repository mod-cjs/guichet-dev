import { QRBadge } from '../QRBadge'
import { MyCJSCardBack } from './MyCJSCardBack'

export { MyCJSCardBack }
export type { MyCJSCardBackProps } from './MyCJSCardBack'

export interface MyCJSCardUser {
  prenom: string
  nom: string
  /** Matricule formaté (ex: "GJS · AD · 23045"). */
  matricule: string
  /** URL photo (null → fallback initiales). */
  photoUrl?: string
  centrePrincipal?: { nom: string; region: string }
  /** Date d'adhésion lisible (ex: "03/2025"). */
  membreDepuis: string
}

export interface MyCJSCardProps {
  user: MyCJSCardUser
  /** URL à encoder dans le QR. Si absent : skeleton placeholder. */
  qrUrl?: string
  /** Recto (par défaut) ou verso (délégué à `<MyCJSCardBack>`). */
  variant?: 'recto' | 'verso'
  /** Largeur max en px. Défaut : 480. */
  maxWidth?: number
  /** Mode compact : pas de QR, identité seulement. */
  compact?: boolean
  className?: string
}

function Initials({ prenom, nom, size = 64 }: { prenom: string; nom: string; size?: number }) {
  const initials = `${prenom?.[0] ?? '?'}${nom?.[0] ?? '?'}`.toUpperCase()
  return (
    <div
      aria-hidden="true"
      data-testid="my-cjs-card-initials"
      className="flex items-center justify-center font-black"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--gj-yellow, #F9C400)',
        color: 'var(--gj-ink, #0E1A1F)',
        fontSize: Math.round(size * 0.4),
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

function QrSkeleton({ size = 120 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      data-testid="my-cjs-card-qr-skeleton"
      className="animate-pulse rounded-gj-sm"
      style={{ width: size, height: size, background: 'rgba(255,255,255,.85)' }}
    />
  )
}

/**
 * <MyCJSCard> — carte CJS du jeune (Lot 7 Wave 1).
 *
 * Recto par défaut (gradient teal-deep → teal). Verso délégué à
 * `<MyCJSCardBack>`. Le QR est généré par `<QRBadge>` (lib `qrcode`).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 1.
 * Distinct de `src/components/ui/MyCJSCard` (placeholder visuel Phase 2B —
 * pas de QR signé). Ici on intègre le QR signé HMAC + photo OIDC.
 */
export function MyCJSCard({
  user,
  qrUrl,
  variant = 'recto',
  maxWidth = 480,
  compact = false,
  className = '',
}: MyCJSCardProps) {
  if (variant === 'verso') {
    return (
      <MyCJSCardBack
        matricule={user.matricule}
        emiseLe={user.membreDepuis}
        maxWidth={maxWidth}
        className={className}
      />
    )
  }

  const photoSize = compact ? 48 : 64
  const qrSize = 120

  return (
    <article
      aria-label="Carte CJS"
      data-variant="recto"
      className={`relative overflow-hidden text-white flex flex-col gap-3 ${className}`.trim()}
      style={{
        maxWidth,
        padding: 22,
        borderRadius: 18,
        background:
          'linear-gradient(180deg, var(--gj-teal-deep, #0A2A24) 0%, var(--gj-teal, #007A5C) 100%)',
      }}
    >
      <div className="flex items-start gap-3">
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={`Photo de ${user.prenom} ${user.nom}`}
            width={photoSize}
            height={photoSize}
            style={{
              width: photoSize,
              height: photoSize,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,.4)',
            }}
          />
        ) : (
          <Initials prenom={user.prenom} nom={user.nom} size={photoSize} />
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className="text-fs-400 font-black leading-tight m-0">
            {user.prenom} {user.nom}
          </h2>
          <div
            className="text-fs-200 font-bold"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: 'var(--gj-yellow, #F9C400)',
              letterSpacing: '0.05em',
            }}
          >
            {user.matricule}
          </div>
        </div>

        {!compact && (
          <div
            className="flex-shrink-0 p-2 rounded-gj-sm"
            style={{ background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}
          >
            {qrUrl ? <QRBadge url={qrUrl} size={qrSize} /> : <QrSkeleton size={qrSize} />}
          </div>
        )}
      </div>

      {!compact && (
        <footer
          className="flex items-center justify-between text-fs-100"
          style={{
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,.18)',
            color: 'rgba(255,255,255,.78)',
          }}
        >
          <span>
            {user.centrePrincipal
              ? `${user.centrePrincipal.nom} — ${user.centrePrincipal.region}`
              : 'Aucun centre principal'}
          </span>
          <span>Membre depuis {user.membreDepuis}</span>
        </footer>
      )}
    </article>
  )
}
