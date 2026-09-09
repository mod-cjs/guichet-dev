import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import { appUrl } from '@/lib/app-url'
import { QRBadge } from '../QRBadge'
import { MyCJSCardBack } from './MyCJSCardBack'

export { MyCJSCardBack }
export type { MyCJSCardBackProps } from './MyCJSCardBack'

export interface MyCJSCardUser {
  prenom: string
  nom: string
  /**
   * Matricule de membre persisté (ex. « GJ-2026-77294A »). `null` pour un
   * compte qui n'en a pas encore : le backfill peut ne pas être passé, et la
   * carte doit rester utilisable — le QR porte l'identification.
   */
  matricule: string | null
  /** URL photo (null → fallback initiales). */
  photoUrl?: string
  centrePrincipal?: { nom: string; region: string }
  /** Date d'adhésion lisible (ex. « 03/2025 »), `null` si inconnue. */
  membreDepuis: string | null
}

export interface MyCJSCardProps {
  user: MyCJSCardUser
  /** URL à encoder dans le QR. Si absent : fallback démo basé sur `cjsUid`. */
  qrUrl?: string
  /**
   * Identifiant SSO (claim `sub`). Sert à construire un QR fallback démo si
   * `qrUrl` n'est pas fourni — `https://guichetjeunesse.sn/cjs-card/<cjsUid>`.
   * GUIC-368 : fix immédiat avant Wave 6 (GUIC-357 — JWT signé HMAC).
   */
  cjsUid?: string
  /** Recto (par défaut) ou verso (délégué à `<MyCJSCardBack>`). */
  variant?: 'recto' | 'verso'
  /** Largeur max en px. Défaut : 480. */
  maxWidth?: number
  /** Mode compact : QR plus petit, pas de footer. */
  compact?: boolean
  /** Recto sombre (gradient teal-deep → ink-teal) par défaut, ou clair sur fond surface. */
  dark?: boolean
  className?: string
  /** GUIC-386 (Wave 6.1) — JWT rotatif transmis au verso. */
  qrToken?: string | null
  qrExpiresAt?: Date | null
}

function Initials({
  prenom,
  nom,
  size = 48,
  dark = true,
}: {
  prenom: string
  nom: string
  size?: number
  dark?: boolean
}) {
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
        background: dark ? 'rgba(0,0,0,.25)' : 'var(--gj-yellow)',
        color: dark ? 'var(--gj-yellow)' : 'var(--gj-ink)',
        fontSize: Math.round(size * 0.4),
        flexShrink: 0,
        border: dark ? '1.5px solid rgba(255,255,255,.18)' : 'none',
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
 * <MyCJSCard> — carte CJS du jeune (Lot 7 Wave 1, refonte fidèle au design source).
 *
 * Recto sombre par défaut : gradient diagonal `var(--gj-teal-deep) → var(--gj-ink-teal)`,
 * glow radial jaune en haut-droite, brand label "GUICHET JEUNESSE CJS" en jaune,
 * matricule monospace en jaune, layout inline (avatar + identité + QR).
 *
 * Source design : `public/design-v2/cjs-card.jsx` lignes 79-175 (MyCJSCard recto).
 *
 * Verso délégué à `<MyCJSCardBack>`. Le QR est généré par `<QRBadge>` (lib `qrcode`).
 * Distinct de `src/components/ui/MyCJSCard` (placeholder visuel Phase 2B —
 * pas de QR signé). Ici on intègre le QR signé HMAC + photo OIDC.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 1.
 */
export function MyCJSCard({
  user,
  qrUrl,
  cjsUid,
  variant = 'recto',
  maxWidth = 480,
  compact = false,
  dark = true,
  className = '',
  qrToken = null,
  qrExpiresAt = null,
}: MyCJSCardProps) {
  if (variant === 'verso') {
    return (
      <MyCJSCardBack
        matricule={user.matricule}
        emiseLe={user.membreDepuis}
        maxWidth={maxWidth}
        className={className}
        qrToken={qrToken ?? null}
        qrExpiresAt={qrExpiresAt ?? null}
      />
    )
  }

  const avatarSize = compact ? 40 : 48
  const qrSize = compact ? 110 : 140

  // GUIC-397 — footer "QR valide · expire le …". Format design source :
  // « 31 décembre 2026 ». Si `qrExpiresAt` (Wave 6.1) fourni, on l'affiche ;
  // sinon placeholder design « 31/12/2026 ».
  const expiresLabel = qrExpiresAt
    ? qrExpiresAt.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '31/12/2026'

  // GUIC-368 — fallback démo : si pas de `qrUrl` signé (Wave 6 / GUIC-357),
  // on génère un QR visuel pointant vers `/cjs-card/<cjsUid>` (ou un slug
  // dérivé du matricule). Pas de JWT, juste un payload stable pour la démo.
  const fallbackSeed =
    cjsUid ||
    (user.matricule
      ? user.matricule.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
      : '')
  const effectiveQrUrl =
    qrUrl || (fallbackSeed ? `${appUrl()}/cjs-card/${fallbackSeed}` : undefined)

  return (
    <article
      aria-label="Carte CJS"
      data-variant="recto"
      className={`relative overflow-hidden flex flex-col gap-3 ${className}`.trim()}
      style={{
        maxWidth,
        width: '100%',
        padding: compact ? 14 : 18,
        borderRadius: 14,
        background: dark
          ? 'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)'
          : 'var(--gj-surface)',
        color: dark ? 'var(--gj-surface)' : 'var(--gj-ink)',
        border: dark ? '0' : '1.5px solid var(--gj-line)',
      }}
    >
      {/* Glow radial jaune décoratif (haut-droite) */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -50,
          top: -60,
          width: 220,
          height: 220,
          background:
            'radial-gradient(circle, rgba(249,196,0,.18), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header : brand label + badge "Membre actif" */}
      <div
        className="relative flex items-center justify-between"
        style={{ zIndex: 1 }}
      >
        <div
          className="inline-flex items-center gap-2"
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: dark ? 'var(--gj-yellow)' : 'var(--gj-teal-deep)',
            letterSpacing: '.5px',
            textTransform: 'uppercase',
          }}
        >
          <Icon name="pin" size={12} aria-hidden="true" />
          Carte CJS
        </div>
        <span
          style={{
            background: dark ? 'rgba(0,0,0,.25)' : 'var(--gj-bg)',
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '.4px',
            color: dark ? 'var(--gj-yellow)' : 'var(--gj-grey)',
            textTransform: 'uppercase',
          }}
        >
          Membre actif
        </span>
      </div>

      {/* Body : avatar + identité + QR (layout inline horizontal) */}
      <div
        className="relative flex items-center gap-3"
        style={{ zIndex: 1 }}
      >
        {user.photoUrl ? (
          <Image
            src={user.photoUrl}
            alt={`Photo de ${user.prenom} ${user.nom}`}
            width={avatarSize}
            height={avatarSize}
            unoptimized
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              border: dark
                ? '1.5px solid rgba(255,255,255,.25)'
                : '1.5px solid var(--gj-line)',
            }}
          />
        ) : (
          <Initials
            prenom={user.prenom}
            nom={user.nom}
            size={avatarSize}
            dark={dark}
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2
            className="m-0"
            style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}
          >
            {user.prenom} {user.nom}
          </h2>
          {user.matricule && (
            <div
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '.5px',
                color: dark ? 'var(--gj-yellow)' : 'var(--gj-teal-deep)',
              }}
            >
              {user.matricule}
            </div>
          )}
          {!compact && (user.centrePrincipal || user.membreDepuis) && (
            <div
              className="flex flex-wrap gap-2"
              style={{
                fontSize: 11,
                color: dark ? 'rgba(255,255,255,.78)' : 'var(--gj-grey)',
              }}
            >
              {user.centrePrincipal && (
                <span className="inline-flex items-center gap-1">
                  <Icon
                    name="pin"
                    size={12}
                    style={{
                      color: dark ? 'var(--gj-yellow)' : 'var(--gj-teal-deep)',
                    }}
                    aria-hidden="true"
                  />
                  {user.centrePrincipal.nom}
                </span>
              )}
              {user.membreDepuis && (
                <span className="inline-flex items-center gap-1">
                  <Icon
                    name="calendar"
                    size={12}
                    style={{
                      color: dark ? 'var(--gj-yellow)' : 'var(--gj-teal-deep)',
                    }}
                    aria-hidden="true"
                  />
                  Membre depuis {user.membreDepuis}
                </span>
              )}
            </div>
          )}
        </div>

        {!compact && (
          <div
            className="flex-shrink-0"
            style={{
              background: 'var(--gj-surface)',
              padding: 8,
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,.18)',
            }}
          >
            {effectiveQrUrl ? (
              <QRBadge url={effectiveQrUrl} size={qrSize} />
            ) : (
              <QrSkeleton size={qrSize} />
            )}
          </div>
        )}
      </div>

      {!compact && (
        <footer
          className="relative flex items-center gap-2"
          style={{
            zIndex: 1,
            paddingTop: 10,
            borderTop: `1px solid ${
              dark ? 'rgba(255,255,255,.14)' : 'var(--gj-line)'
            }`,
            fontSize: 11,
            color: dark ? 'rgba(255,255,255,.7)' : 'var(--gj-grey)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--gj-green)',
            }}
          />
          <span>QR valide · expire le {expiresLabel}</span>
        </footer>
      )}
    </article>
  )
}
