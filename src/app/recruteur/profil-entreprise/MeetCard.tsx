'use client'

// Carte « Visioconférence — Google Meet » du profil entreprise : état de la
// connexion + connexion/déconnexion. Le lien Meet est généré automatiquement
// à la planification d'un entretien Visio quand le compte est connecté.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { deconnecterGoogleMeet } from './actions'
import type { MeetEtat } from '@/lib/google-meet'

const STATUT_META: Record<MeetEtat['statut'], { label: string; bg: string; fg: string }> = {
  connecte: { label: 'Connecté', bg: 'var(--gj-green-soft, #E7F6EC)', fg: 'var(--gj-green-ink, #14532D)' },
  expire: { label: 'Expiré — reconnectez-vous', bg: 'var(--gj-yellow-soft, #FEF6E7)', fg: 'var(--gj-yellow-ink, #92400E)' },
  non_connecte: { label: 'Non connecté', bg: 'var(--gj-bg)', fg: 'var(--gj-grey)' },
  non_configure: { label: 'Non configuré', bg: 'var(--gj-bg)', fg: 'var(--gj-grey)' },
}

export function MeetCard({ etat }: { etat: MeetEtat }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const meta = STATUT_META[etat.statut]
  const connecte = etat.statut === 'connecte'

  function deconnecter() {
    if (!window.confirm('Déconnecter Google Meet ? Les liens ne seront plus générés automatiquement.')) return
    start(async () => {
      try {
        await deconnecterGoogleMeet()
        router.refresh()
      } catch { /* noop */ }
    })
  }

  return (
    <section aria-label="Visioconférence Google Meet" className="rounded-[14px] p-[16px] mt-4" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span aria-hidden className="inline-flex items-center justify-center rounded-[12px]" style={{ width: 44, height: 44, background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)' }}>
          <Icon name="desktop" size={20} />
        </span>
        <div className="flex-1 min-w-[220px]">
          <div className="text-[13.5px] font-black" style={{ color: 'var(--gj-ink)' }}>Visioconférence — Google Meet</div>
          <div className="flex items-center gap-2 mt-[3px] flex-wrap">
            <span className="rounded-full text-[10px] font-black px-[8px] py-[2px] uppercase tracking-wide" style={{ background: meta.bg, color: meta.fg }}>{meta.label}</span>
            {etat.email && <span className="text-[12px]" style={{ color: 'var(--gj-grey)' }}>{etat.email}</span>}
          </div>
        </div>
        {etat.statut === 'non_configure' ? (
          <span className="text-[11.5px]" style={{ color: 'var(--gj-grey)', maxWidth: 220 }}>
            Intégration en attente d’activation par l’administration CJS.
          </span>
        ) : connecte ? (
          <button type="button" disabled={pending} onClick={deconnecter} className="rounded-[10px] border-[1.5px] px-4 min-h-[40px] text-[13px] font-extrabold bg-white" style={{ borderColor: 'var(--gj-line)', color: 'var(--gj-red)', cursor: 'pointer' }}>
            Déconnecter
          </button>
        ) : (
          <a href="/api/recruteur/google-meet/connect" className="no-underline rounded-[10px] border-0 px-4 inline-flex items-center min-h-[40px] text-[13px] font-extrabold" style={{ background: 'var(--gj-teal-deep, #0B7285)', color: '#fff' }}>
            {etat.statut === 'expire' ? 'Reconnecter' : 'Connecter Google Meet'}
          </a>
        )}
      </div>
      <p className="text-[11px] mt-[10px]" style={{ color: 'var(--gj-grey)' }}>
        Une fois connecté, un lien Meet est créé automatiquement quand vous planifiez un entretien en visio.
      </p>
    </section>
  )
}
