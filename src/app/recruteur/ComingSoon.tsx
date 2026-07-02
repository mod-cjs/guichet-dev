import { Icon, type IconName } from '@/components/ui/Icon'

/** État honnête « bientôt disponible » — aucune donnée fabriquée. */
export function ComingSoon({ icon, titre, message }: { icon: IconName; titre: string; message: string }) {
  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <h1 className="text-[24px] font-black mb-6" style={{ color: 'var(--gj-ink)' }}>{titre}</h1>
      <div className="rounded-[14px] p-[40px] text-center" style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}>
        <span className="inline-flex items-center justify-center rounded-[14px] mb-[12px]" style={{ width: 56, height: 56, background: 'var(--gj-blue-soft, #E8EFFF)', color: 'var(--gj-blue-ink, #1A3FA8)' }}>
          <Icon name={icon} size={26} />
        </span>
        <p className="text-[15px] font-black" style={{ color: 'var(--gj-ink)' }}>Bientôt disponible</p>
        <p className="text-[13px] mt-[6px]" style={{ color: 'var(--gj-grey)', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{message}</p>
      </div>
    </div>
  )
}
