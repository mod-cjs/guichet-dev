'use client'
import { useState } from 'react'
import { Avatar, Icon, Sheet } from '@/components/ui'

/**
 * <MyCardCjs /> — Carte CJS bénéficiaire avec QR de check-in (GUIC-191).
 *
 * Design : `design-guichet-v2/cjs-card.jsx#MyCJSCard`
 * - Card gradient teal-deep → ink-teal (dark)
 * - Avatar 80×80 + nom + identifiant CJS hashé court
 * - QR code décoratif (placeholder — signature HMAC reportée Phase 4)
 * - Bouton "Agrandir" ouvre un Sheet plein écran avec QR x4
 *
 * Sécurité : le QR rendu ici n'est PAS un QR signé. Il sert d'aperçu UI ;
 * la génération réelle d'un QR HMAC court (TTL ~5 min) est tracée dans
 * la backlog Phase 4 (M4 — Centres CJS check-in).
 */

interface MyCardCjsProps {
  cjsUid: string
  nom: string
  prenom: string
  photoUrl?: string | null
  /** Optionnel — label "Membre actif depuis MM/YYYY". */
  actifDepuis?: string | null
}

/** Identifiant court lisible affiché sur la carte (GJS · INITIALES · 5 derniers chars du cjs_uid). */
export function formatCardId(cjsUid: string, prenom: string, nom: string): string {
  const ini = `${prenom?.charAt(0) ?? ''}${nom?.charAt(0) ?? ''}`.toUpperCase() || '··'
  // Hash court : 5 derniers caractères alphanumériques du cjs_uid (uppercase).
  const tail = (cjsUid.replace(/[^a-zA-Z0-9]/g, '').slice(-5) || '00000').toUpperCase()
  return `GJS · ${ini} · ${tail}`
}

/** SVG pseudo-QR décoratif — pattern déterministe seedé sur cjs_uid. */
function QrGlyph({ size = 140, seed }: { size?: number; seed: string }) {
  const cells = 25
  const cell = size / cells
  const filled = new Set<string>()

  // Finder patterns (3 coins).
  const finder = (x: number, y: number) => {
    for (let yy = y; yy < y + 7; yy++) for (let xx = x; xx < x + 7; xx++) filled.add(`${xx},${yy}`)
    for (let yy = y + 1; yy < y + 6; yy++) for (let xx = x + 1; xx < x + 6; xx++) filled.delete(`${xx},${yy}`)
    for (let yy = y + 2; yy < y + 5; yy++) for (let xx = x + 2; xx < x + 5; xx++) filled.add(`${xx},${yy}`)
  }
  finder(0, 0)
  finder(cells - 7, 0)
  finder(0, cells - 7)

  // Timing patterns.
  for (let i = 8; i < cells - 8; i++) {
    if (i % 2 === 0) {
      filled.add(`${i},6`)
      filled.add(`6,${i}`)
    }
  }

  // Données pseudo-aléatoires seedées par cjs_uid.
  const hash = (i: number) => {
    let h = 5381
    for (let k = 0; k < seed.length; k++) h = ((h << 5) + h + seed.charCodeAt(k) + i) | 0
    return Math.abs(h)
  }
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const inTL = x < 8 && y < 8
      const inTR = x > cells - 9 && y < 8
      const inBL = x < 8 && y > cells - 9
      if (inTL || inTR || inBL) continue
      if (hash(y * cells + x) % 100 < 47) filled.add(`${x},${y}`)
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR code Carte CJS (aperçu)"
      data-testid="mycard-qr"
      style={{ display: 'block', background: '#fff', borderRadius: 8 }}
    >
      <rect x={0} y={0} width={size} height={size} fill="#fff" />
      {[...filled].map((k, i) => {
        const [x, y] = k.split(',').map(Number)
        return <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0A2A24" />
      })}
    </svg>
  )
}

export function MyCardCjs({ cjsUid, nom, prenom, photoUrl, actifDepuis }: MyCardCjsProps) {
  const [open, setOpen] = useState(false)
  const cardId = formatCardId(cjsUid, prenom, nom)

  return (
    <>
      <article
        data-testid="mycard"
        className="relative overflow-hidden rounded-gj-xl p-space-4 text-white flex flex-col gap-space-3"
        style={{
          background: 'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
          aspectRatio: '16 / 10',
        }}
      >
        {/* Glow décoratif */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            right: -50,
            top: -60,
            width: 220,
            height: 220,
            background: 'radial-gradient(circle, rgba(249,196,0,.18), transparent 60%)',
          }}
        />

        <header className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-fs-100 font-black uppercase tracking-[0.5px] text-gj-yellow">
            <Icon name="pin" size={14} />
            Carte CJS
          </span>
          <span className="bg-black/25 text-gj-yellow text-fs-100 font-black uppercase tracking-[0.4px] px-space-2 py-[3px] rounded-gj-pill">
            Membre actif
          </span>
        </header>

        <div className="flex items-center gap-space-3 relative">
          {photoUrl ? (
            // Photo locale uploadée — <img> brut (URL blob volatile, pas d'optimisation Next.Image).
            <img
              src={photoUrl}
              alt=""
              className="w-[80px] h-[80px] rounded-gj-md object-cover border-[1.5px] border-white/30"
            />
          ) : (
            <Avatar nom={nom} prenom={prenom} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-fs-400 font-black leading-tight truncate">
              {prenom} {nom}
            </div>
            <div
              className="text-fs-200 font-bold tracking-[0.5px] text-gj-yellow"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              data-testid="mycard-id"
            >
              {cardId}
            </div>
            {actifDepuis && (
              <div className="mt-[2px] inline-flex items-center gap-1 text-fs-100 text-white/75">
                <Icon name="calendar" size={12} />
                Actif depuis {actifDepuis}
              </div>
            )}
          </div>
        </div>

        <footer className="mt-auto flex items-center justify-between gap-space-2">
          <span className="text-fs-100 text-white/65 max-w-[60%] leading-snug">
            Présentez cette carte à l&apos;accueil d&apos;un centre CJS.
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Agrandir la carte CJS"
            data-testid="mycard-expand"
            className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/20
              rounded-gj-pill px-space-3 py-[7px] text-fs-200 font-bold transition-colors
              focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]"
          >
            <Icon name="search" size={14} />
            Agrandir
          </button>
        </footer>
      </article>

      <Sheet isOpen={open} onClose={() => setOpen(false)} title="Carte CJS" variant="bottom">
        <div className="flex flex-col items-center gap-space-4 py-space-3">
          <div
            className="rounded-gj-lg p-space-4 text-white w-full max-w-[420px] flex flex-col gap-space-3"
            style={{
              background: 'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
            }}
          >
            <div className="text-center">
              <div className="text-fs-500 font-black">{prenom} {nom}</div>
              <div
                className="text-fs-300 font-bold text-gj-yellow tracking-[0.5px]"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              >
                {cardId}
              </div>
            </div>
            <div className="bg-white rounded-gj-md p-space-3 mx-auto" data-testid="mycard-qr-large-wrap">
              <QrGlyph size={280} seed={cjsUid} />
            </div>
            <p className="text-fs-200 text-white/75 text-center leading-snug">
              Présentez ce QR à l&apos;accueil d&apos;un centre CJS pour valider votre présence.
              <br />
              <span className="text-fs-100 text-white/60">
                Aperçu — signature à durée limitée à venir (Phase 4).
              </span>
            </p>
          </div>
        </div>
      </Sheet>
    </>
  )
}

// Petit QR aussi visible sur la carte compacte (intégré dans la card principale).
// Note : volontairement non rendu sur le format 16:10 pour laisser respirer l'identité —
// l'utilisateur ouvre "Agrandir" pour scanner. C'est conforme au design v2 (l'écran
// d'accueil mobile affiche le QR en grand via Sheet, pas la carte récap).
