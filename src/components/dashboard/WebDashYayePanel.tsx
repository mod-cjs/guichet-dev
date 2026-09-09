'use client'

import { Icon } from '@/components/ui/Icon'
import { YayeAvatar } from '@/components/ui/Yaye/YayeAvatar'
import { useYayePanel } from '@/components/yaye/YayeProvider'

interface Props {
  preview?: string
  onOpen?:  () => void
}

/**
 * WebDashYayePanel — preview de l'agent Yaye dans l'aside du dashboard
 * avec CTA pour ouvrir le side panel complet.
 *
 * Référence : design-guichet-v2/web-dashboard.jsx#WebDashYayePanel (L.695-781)
 *
 * GUIC-689 (finding A1) — `page.tsx` (Server Component) monte ce panel sans
 * `onOpen` : le CTA se cable donc lui-même sur `useYayePanel` (même drawer
 * partagé que `WebDashHero`), `onOpen` restant un override possible.
 */
export function WebDashYayePanel({
  preview = 'Salama. J\'ai 3 opportunités à 90%+ match pour toi cette semaine. On y va ?',
  onOpen,
}: Props) {
  const yaye = useYayePanel()
  const handleOpen = onOpen ?? yaye.open

  return (
    <aside
      className="rounded-gj-md p-space-4 bg-gj-teal-deep text-white
        flex flex-col gap-space-3"
      aria-label="Yaye, ton agent IA"
    >
      <div className="flex items-center gap-space-3">
        <YayeAvatar size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-space-2">
            <span className="font-black text-fs-400">Yaye</span>
            <span className="bg-gj-yellow text-gj-teal-deep text-fs-100 font-black
              px-space-2 py-space-1 rounded-full uppercase tracking-wider">
              IA
            </span>
          </div>
          <div className="text-fs-100 opacity-90 mt-space-1">
            Conseillère IA · agit sur ton compte
          </div>
        </div>
      </div>
      <p className="text-fs-200 leading-relaxed bg-white/10 rounded-gj-sm p-space-3">
        « {preview} »
      </p>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={onOpen ? undefined : yaye.isOpen}
        className="inline-flex items-center justify-center gap-space-2
          bg-gj-yellow text-gj-teal-deep px-space-3 py-space-3 rounded-gj-md
          font-black text-fs-200 hover:bg-gj-yellow-deep transition-colors"
      >
        <Icon name="chat" size={14} /> Ouvrir le chat Yaye
      </button>
    </aside>
  )
}
