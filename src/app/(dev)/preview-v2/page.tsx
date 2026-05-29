import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PhoneFrame } from '@/components/dev/PhoneFrame'
import { StepBar } from '@/components/ui/StepBar'
import { FooterCTA } from '@/components/ui/FooterCTA'

export const dynamic = 'force-dynamic'

const LOTS = [
  { file: 'Lot 1 - Onboarding + Ecrans cles (1).html', label: 'Lot 1 — Onboarding mobile + écrans clés' },
  { file: 'Lot 2 - Onboarding Web + Dashboard Beneficiaire.html', label: 'Lot 2 — Onboarding web + Dashboard bénéficiaire' },
  { file: 'Lot 3 - Opportunites.html', label: 'Lot 3 — Opportunités' },
]

const JSX_FILES = [
  { file: 'design-canvas.jsx', label: 'design-canvas — Canvas pan/zoom de tous les écrans' },
  { file: 'onboarding.jsx', label: 'onboarding — 5 écrans mobile' },
  { file: 'web-onboarding.jsx', label: 'web-onboarding — 5 écrans web' },
  { file: 'web-dashboard.jsx', label: 'web-dashboard — Sidebar + topbar + hero + KPIs + tracker' },
  { file: 'mobile-flows.jsx', label: 'mobile-flows — Dashboard mobile, recherche, détail, candidature' },
  { file: 'lot3-opps-mobile.jsx', label: 'lot3-opps-mobile — Liste + filtres + détail + candidature' },
  { file: 'lot3-opps-web.jsx', label: 'lot3-opps-web — Liste + slide-over + modal apply' },
  { file: 'mobile-centres.jsx', label: 'mobile-centres — Carte + liste + ateliers' },
  { file: 'screens.jsx', label: 'screens — Pipeline candidatures + Yaye + notifications' },
  { file: 'cjs-card.jsx', label: 'cjs-card — Carte membre QR' },
  { file: 'phone.jsx', label: 'phone — PhoneFrame + StatusBar + TopBar + BottomNav + Yaye FAB' },
]

const COLOR_GROUPS = [
  {
    title: 'Brand',
    swatches: [
      { name: '--gj-teal', hex: '#009F76' },
      { name: '--gj-teal-deep', hex: '#007A5C' },
      { name: '--gj-teal-soft', hex: '#E1F5EE' },
      { name: '--gj-yellow', hex: '#F9C400' },
      { name: '--gj-yellow-soft', hex: '#FFF8E0' },
    ],
  },
  {
    title: 'Statuts',
    swatches: [
      { name: '--gj-red', hex: '#D92A1E' },
      { name: '--gj-blue', hex: '#1A4ED8' },
      { name: '--gj-green', hex: '#15803D' },
    ],
  },
  {
    title: 'Neutres',
    swatches: [
      { name: '--gj-ink', hex: '#111111' },
      { name: '--gj-grey', hex: '#4A4A4A' },
      { name: '--gj-grey-2', hex: '#767676' },
      { name: '--gj-bg', hex: '#F5F7F6' },
      { name: '--gj-line', hex: '#DDE5E1' },
    ],
  },
  {
    title: 'Spéciaux',
    swatches: [
      { name: '--gj-whatsapp', hex: '#25D366' },
    ],
  },
]

const PROGRAMMES = [
  { name: '--prog-yaakaar', stops: ['#A3742A', '#5C4118'] },
  { name: '--prog-yeah', stops: ['#0A807F', '#0D4D3A'] },
  { name: '--prog-yjc', stops: ['#15803D', '#082F19'] },
  { name: '--prog-edupop', stops: ['#007A5C', '#0A2820'] },
]

export default function PreviewV2Page() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--gj-font-sans)' }}>
      <header style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--gj-grey-2)' }}>Outil dev</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 8px' }}>Preview design v2</h1>
        <p style={{ color: 'var(--gj-grey)', maxWidth: 720 }}>
          Visualisation des maquettes livrées par le PO le 2026-05-26. 3 HTML autonomes, 11 fichiers JSX de référence, tokens visuels.
          Route accessible uniquement en dev. Voir <code style={{ background: 'var(--gj-teal-soft)', padding: '1px 6px', borderRadius: 4 }}>.agent_context/specs/REFONTE-V2.md</code>.
        </p>
      </header>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Lots HTML (interactifs)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {LOTS.map((lot) => (
            <article key={lot.file} style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gj-line)' }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{lot.label}</p>
                <Link
                  href={`/api/dev/design-v2/${encodeURIComponent(lot.file)}`}
                  target="_blank"
                  rel="noopener"
                  style={{ fontSize: 12, color: 'var(--gj-teal-deep)', textDecoration: 'underline' }}
                >
                  Ouvrir plein écran ↗
                </Link>
              </div>
              <iframe
                src={`/api/dev/design-v2/${encodeURIComponent(lot.file)}`}
                title={lot.label}
                style={{ width: '100%', height: 520, border: 'none', display: 'block', background: 'var(--gj-surface)' }}
                loading="lazy"
              />
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Fichiers JSX (sources de référence)</h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {JSX_FILES.map((f) => (
            <li key={f.file} style={{ background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 8, padding: '10px 12px' }}>
              <Link
                href={`/api/dev/design-v2/${encodeURIComponent(f.file)}`}
                target="_blank"
                rel="noopener"
                style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--gj-teal-deep)' }}
              >
                {f.file}
              </Link>
              <p style={{ fontSize: 12, color: 'var(--gj-grey)', marginTop: 4 }}>{f.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Palette tokens</h2>
        {COLOR_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--gj-grey-2)', marginBottom: 8 }}>
              {group.title}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {group.swatches.map((s) => (
                <div key={s.name} style={{ width: 140, border: '1px solid var(--gj-line)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: s.hex, height: 64 }} />
                  <div style={{ padding: 8, background: 'var(--gj-surface)' }}>
                    <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 600 }}>{s.name}</p>
                    <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--gj-grey)' }}>{s.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--gj-grey-2)', marginBottom: 8 }}>
            Programmes CJS (gradients)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {PROGRAMMES.map((p) => (
              <div key={p.name} style={{ width: 180, border: '1px solid var(--gj-line)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: `linear-gradient(135deg, ${p.stops[0]}, ${p.stops[1]})`, height: 80 }} />
                <div style={{ padding: 8, background: 'var(--gj-surface)' }}>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 600 }}>{p.name}</p>
                  <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--gj-grey)' }}>
                    {p.stops.join(' → ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Typographie</h2>
        <div style={{ background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 10, padding: 24 }}>
          <p style={{ fontSize: 36, fontWeight: 800, margin: '0 0 4px' }}>--fs-900 · 36px / hero</p>
          <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>--fs-800 · 28px / page</p>
          <p style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 4px' }}>--fs-700 · 24px / section</p>
          <p style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 4px' }}>--fs-600 · 20px / card title</p>
          <p style={{ fontSize: 18, fontWeight: 600, margin: '8px 0 4px' }}>--fs-500 · 18px / subtitle</p>
          <p style={{ fontSize: 16, margin: '8px 0 4px' }}>--fs-400 · 16px / body (default)</p>
          <p style={{ fontSize: 14, color: 'var(--gj-grey)', margin: '8px 0 4px' }}>--fs-300 · 14px / support</p>
          <p style={{ fontSize: 13, color: 'var(--gj-grey-2)', margin: '8px 0 4px' }}>--fs-200 · 13px / caption</p>
          <p style={{ fontSize: 11, color: 'var(--gj-grey-2)', margin: '8px 0 0' }}>--fs-100 · 11px / micro</p>
          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--gj-line)' }} />
          <p style={{ fontSize: 12, color: 'var(--gj-grey)' }}>
            Police stack système : <code style={{ fontFamily: 'ui-monospace, monospace' }}>{'"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, "Noto Sans", sans-serif'}</code>
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>PhoneFrame demo (dev only)</h2>
        <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginBottom: 16 }}>
          Simulateur iPhone 14 (390×844) embarquant <code>StepBar</code> + <code>FooterCTA</code>.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PhoneFrame>
            <StepBar step={2} total={5} />
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Démo onboarding</h3>
              <p style={{ fontSize: 14, color: 'var(--gj-grey)' }}>
                Contenu placeholder pour valider visuellement le cadre, la status bar et la footer
                CTA dans un viewport mobile.
              </p>
            </div>
            <FooterCTA
              primary={{ label: 'Continuer' }}
              secondary={{ label: 'Retour' }}
            />
          </PhoneFrame>
        </div>
      </section>

      <footer style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid var(--gj-line)', color: 'var(--gj-grey-2)', fontSize: 12 }}>
        Route dev — GUIC-171 · disponible uniquement quand <code>NODE_ENV !== "production"</code>
      </footer>
    </main>
  )
}
