'use client'

import {
  useA11y,
  A11Y_DEFAULTS,
  type A11yPrefs,
  type A11yTextSize,
} from '@/components/a11y/A11yProvider'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Switch } from '@/components/ui/Switch'
import { modifierPrefsAccessibilite } from './actions'

/** Tailles de texte — libellés + taille d'aperçu « Aa » (design v4 Lot 4). */
const SIZES: Array<{ key: A11yTextSize; label: string; preview: string }> = [
  { key: 's', label: 'Petit', preview: 'text-[13px]' },
  { key: 'm', label: 'Normal', preview: 'text-[15px]' },
  { key: 'l', label: 'Grand', preview: 'text-[18px]' },
  { key: 'xl', label: 'Très grand', preview: 'text-[22px]' },
]

type BoolKey = Exclude<keyof A11yPrefs, 'text'>

interface Row {
  key: BoolKey
  icon: IconName
  label: string
  sub: string
}

/** Groupes de réglages — reprise 1:1 du découpage v4 (Vision / Lecture / Navigation). */
const GROUPS: Array<{ title: string; rows: Row[] }> = [
  {
    title: 'Vision',
    rows: [
      {
        key: 'contrast',
        icon: 'eye',
        label: 'Contraste élevé',
        sub: 'Renforce le contraste des textes et bordures',
      },
      {
        key: 'gray',
        icon: 'eye-off',
        label: 'Niveaux de gris',
        sub: 'Réduit les couleurs à l’essentiel',
      },
      {
        key: 'motion',
        icon: 'clock',
        label: 'Réduire les animations',
        sub: 'Limite les mouvements à l’écran',
      },
      {
        key: 'spacing',
        icon: 'resources',
        label: 'Espacement du texte',
        sub: 'Interlignes et lettres plus aérés',
      },
    ],
  },
  {
    title: 'Lecture & compréhension',
    rows: [
      {
        key: 'falc',
        icon: 'sparkle',
        label: 'Mode FALC',
        sub: 'Facile à lire et à comprendre — mise en page simplifiée',
      },
    ],
  },
  {
    title: 'Navigation',
    rows: [
      {
        key: 'kbd',
        icon: 'target',
        label: 'Navigation clavier renforcée',
        sub: 'Met en évidence l’élément sélectionné',
      },
    ],
  },
]

const cardClass = 'bg-white border-[1.5px] border-gj-line rounded-gj-lg p-5 flex flex-col gap-4'

const cardHeading = 'text-fs-400 font-extrabold text-gj-ink'

/**
 * GUIC-581 — Page Inclusion & accessibilité (design v4 Lot 4, InclusionPage).
 *
 * Chaque changement : application immédiate via A11yProvider (data-attributes
 * + localStorage) puis persistance par profil best-effort (action serveur —
 * l'échec réseau ne casse pas l'expérience, le cache local fait foi en attendant).
 */
export function AccessibiliteClient() {
  const { prefs, setPref, reset } = useA11y()

  const persist = (next: A11yPrefs) => {
    void modifierPrefsAccessibilite(next).catch(() => {})
  }

  const change = <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => {
    setPref(key, value)
    persist({ ...prefs, [key]: value })
  }

  const resetAll = () => {
    reset()
    persist({ ...A11Y_DEFAULTS })
  }

  return (
    <div className="max-w-[760px] mx-auto w-full flex flex-col gap-5">
      {/* Hero — gradient teal, icône œil jaune (v4) */}
      <section className="relative overflow-hidden rounded-gj-2xl px-6 py-6 text-white bg-[linear-gradient(135deg,var(--gj-teal-deep),var(--gj-ink-teal,var(--gj-ink)))]">
        <span
          aria-hidden
          className="absolute -right-12 -top-16 w-[220px] h-[220px] pointer-events-none bg-[radial-gradient(circle,rgba(249,196,0,.18),transparent_60%)]"
        />
        <div className="relative flex items-center gap-4">
          <span className="w-[50px] h-[50px] rounded-gj-lg shrink-0 bg-white/15 inline-flex items-center justify-center text-gj-yellow">
            <Icon name="eye" size={26} />
          </span>
          <div>
            <h1 className="text-fs-700 font-black leading-tight">
              Inclusion & accessibilité
            </h1>
            <p className="text-fs-300 opacity-90 mt-1 leading-normal max-w-[480px]">
              Adapte l’application à tes besoins. Tes préférences sont
              enregistrées sur ton profil et appliquées sur tout ton espace.
            </p>
          </div>
        </div>
      </section>

      {/* Taille du texte */}
      <section className={cardClass} aria-labelledby="a11y-taille">
        <h2 id="a11y-taille" className={cardHeading}>
          Taille du texte
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SIZES.map(({ key, label, preview }) => {
            const active = prefs.text === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => change('text', key)}
                className={[
                  'min-h-[72px] rounded-gj-lg cursor-pointer flex flex-col items-center justify-center gap-1',
                  'border-[1.5px] transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
                  active
                    ? 'bg-gj-teal-soft border-gj-teal-deep text-gj-teal-deep'
                    : 'bg-white border-gj-line text-gj-grey hover:border-gj-line-strong',
                ].join(' ')}
              >
                <span aria-hidden className={`font-black ${preview}`}>
                  Aa
                </span>
                <span className="text-fs-100 font-bold">{label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Groupes de réglages */}
      {GROUPS.map(({ title, rows }) => (
        <section key={title} className={cardClass} aria-labelledby={`a11y-${title}`}>
          <h2 id={`a11y-${title}`} className={cardHeading}>
            {title}
          </h2>
          <div className="flex flex-col">
            {rows.map((row, i) => (
              <div
                key={row.key}
                className={[
                  'flex items-center gap-3.5 py-3',
                  i === 0 ? '' : 'border-t border-gj-line',
                ].join(' ')}
              >
                <span className="w-[38px] h-[38px] rounded-gj-md shrink-0 bg-gj-teal-soft text-gj-teal-deep inline-flex items-center justify-center">
                  <Icon name={row.icon} size={19} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-fs-300 font-extrabold text-gj-ink">
                    {row.label}
                  </div>
                  <div className="text-fs-200 text-gj-grey mt-0.5">{row.sub}</div>
                </div>
                <Switch
                  checked={prefs[row.key]}
                  onChange={(next) => change(row.key, next)}
                  aria-label={row.label}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Réinitialisation */}
      <button
        type="button"
        onClick={resetAll}
        className={[
          'w-full py-3 rounded-gj-md border-[1.5px] border-gj-line bg-white',
          'text-fs-300 font-extrabold text-gj-teal-deep cursor-pointer',
          'transition-colors duration-150 hover:border-gj-teal-deep',
          'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
        ].join(' ')}
      >
        Tout réinitialiser
      </button>

      {/* Note — persistance par profil */}
      <div className="flex items-center gap-3 bg-gj-teal-soft rounded-gj-md px-4 py-3.5">
        <span className="shrink-0 text-gj-teal-deep">
          <Icon name="info" size={20} />
        </span>
        <p className="text-fs-200 text-gj-teal-deep font-semibold leading-normal">
          Ces réglages sont liés à ton profil : tu les retrouves sur tous tes
          appareils, uniquement dans ton espace jeune.
        </p>
      </div>
    </div>
  )
}
