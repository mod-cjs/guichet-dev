import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

/**
 * Layout dédié `/jeune/onboarding/*` — funnel obligatoire (5 écrans).
 *
 * Pas de BottomNav (cf MobileShellGate, exclusion), pas de Header marketing
 * (le user n'a pas finalisé son onboarding, il ne doit pas pouvoir naviguer
 * ailleurs). Mini-topbar avec logo + lien "Se déconnecter".
 *
 * Le StepBar n'est PAS rendu ici : il dépend de l'étape courante et est
 * placé par chaque page (l'écran 1 "Welcome" n'en a pas, et le total varie
 * selon l'écran). Cf `design-guichet-v2/onboarding.jsx` — chaque PhoneFrame
 * possède son propre `<StepBar step total />`.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="sticky top-0 bg-gj-surface border-b border-gj-line"
        style={{ zIndex: 'var(--gj-z-nav)', paddingTop: 'var(--safe-top)' }}
      >
        <div className="flex items-center justify-between gap-space-3 px-space-3 h-12">
          <div className="flex items-center gap-[6px] flex-shrink-0">
            <div className="w-8 h-8 bg-gj-teal rounded-[7px] flex items-center justify-center flex-shrink-0">
              <Icon name="profile" size={16} aria-hidden style={{ color: 'var(--gj-yellow)' }} />
            </div>
            <span className="text-fs-300 font-black text-gj-teal-deep leading-none">
              Guichet<b className="text-gj-yellow-ink">Jeunesse</b>
            </span>
          </div>
          <Link
            href="/api/auth/logout"
            className="text-fs-200 text-gj-grey hover:text-gj-red no-underline whitespace-nowrap"
          >
            Se déconnecter
          </Link>
        </div>
      </header>
      <main id="main" className="bg-gj-surface min-h-[calc(100dvh-3rem)]">
        {children}
      </main>
    </>
  )
}
