'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  initials: string
  prenom:   string
  nom:      string
}

export function UserMenu({ initials, prenom, nom }: Props) {
  const [open, setOpen]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const router            = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    setBusy(true)
    setOpen(false)
    try {
      await fetch('/api/auth/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      })
    } finally {
      router.push('/auth/deconnexion')
    }
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center bg-gj-teal rounded-full text-white
          text-[11px] font-bold flex-shrink-0 hover:bg-gj-teal-deep transition-colors"
        style={{ width: 'var(--tap-min)', height: 'var(--tap-min)' }}
        aria-label={`Menu utilisateur — ${prenom} ${nom}`}
        aria-expanded={open}
        disabled={busy}
      >
        {initials || '?'}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-xl shadow-lg
            border border-gj-line py-1 z-[var(--gj-z-modal)]"
          role="menu"
        >
          <div className="px-space-3 py-2 border-b border-gj-line">
            <p className="text-fs-200 font-semibold text-color-text-primary truncate">
              {prenom} {nom}
            </p>
          </div>

          <Link
            href="/jeune/mon-profil"
            className="flex items-center gap-space-2 px-space-3 py-[10px] text-fs-200
              text-color-text-primary hover:bg-gj-bg transition-colors no-underline"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            Mon profil
          </Link>

          <button
            onClick={handleLogout}
            disabled={busy}
            className="w-full flex items-center gap-space-2 px-space-3 py-[10px] text-fs-200
              text-gj-red hover:bg-red-50 transition-colors text-left"
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {busy ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      )}
    </div>
  )
}
