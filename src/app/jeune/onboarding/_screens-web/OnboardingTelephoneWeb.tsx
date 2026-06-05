'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { Input } from '@/components/ui/Input'
import { SnFlag } from '@/components/ui/SnFlag'
import { OnboardingNavWeb } from './OnboardingNavWeb'

interface Props {
  telephone?: string
}

const OPERATEURS = [
  { id: 'orange',   label: 'orange',   prefixes: '77 · 78', color: 'var(--gj-yellow-deep)' },
  { id: 'free',     label: 'free',     prefixes: '76',      color: '#CE0F69' },
  { id: 'expresso', label: 'expresso', prefixes: '70',      color: '#E60000' },
] as const

const STEPS = [
  { n: 1, t: 'Vérifie ton numéro',          s: 'Code par SMS ou WhatsApp · gratuit' },
  { n: 2, t: 'Dis-nous ce que tu cherches', s: 'Emploi, projet, formation, agri…'    },
  { n: 3, t: 'Complète ton profil',         s: 'Nom, âge, région. 3 questions, pas plus.' },
  { n: 4, t: 'Découvre tes opps',           s: 'Yaye te montre les 3 meilleures pour toi.' },
] as const

/**
 * Onboarding écran 2/5 — version WEB (≥1024px).
 *
 * Split : gauche hero teal-deep + liste 4 étapes, droite formulaire
 * téléphone + opérateurs + CTA WhatsApp. Conforme
 * `design-guichet-v2/web-onboarding.jsx#WebOnboard2Phone`.
 *
 * Comme pour le mobile, le SSO porte l'OTP — pas d'OTP rendu en réel
 * (le composant `otpRow` du mock n'est pas répliqué côté prod).
 */
export function OnboardingTelephoneWeb({ telephone }: Props) {
  const detected = telephone?.replace(/\D/g, '').slice(-9, -7)
  const initialOp =
    detected === '77' || detected === '78' ? 'orange' :
    detected === '76' ? 'free' :
    detected === '70' ? 'expresso' :
    'orange'
  const [op, setOp] = useState<string>(initialOp)
  const [num, setNum] = useState<string>(telephone?.replace(/^\+221/, '').trim() ?? '')

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-bg)' }}
    >
      <OnboardingNavWeb step={1} total={4} />
      <div
        className="grid flex-1 overflow-hidden"
        style={{ gridTemplateColumns: '1fr 1fr' }}
      >
        {/* Pane gauche — hero teal */}
        <section
          className="relative overflow-hidden flex flex-col justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
            padding: 60,
          }}
        >
          <span
            aria-hidden
            className="absolute"
            style={{
              left: -80, top: -100, width: 380, height: 380,
              background: 'radial-gradient(circle, rgba(249,196,0,.18) 0%, transparent 60%)',
            }}
          />
          <div className="relative">
            <span
              className="inline-flex items-center gap-2 font-black uppercase"
              style={{
                fontSize: 11,
                background: 'rgba(249,196,0,.22)',
                color: 'var(--gj-yellow)',
                padding: '5px 10px',
                borderRadius: 999,
                letterSpacing: '.5px',
                marginBottom: 18,
              }}
            >
              Inscription · 90 secondes
            </span>
            <h2
              className="font-black"
              style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-.5px', marginBottom: 16 }}
            >
              Crée ton compte en 4 étapes simples.
            </h2>
            <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.55, marginBottom: 36 }}>
              Pas de paperasse, pas de carte de crédit. Juste ton numéro sénégalais.
            </p>

            <ol className="flex flex-col" style={{ gap: 18, listStyle: 'none', padding: 0, margin: 0 }}>
              {STEPS.map(st => (
                <li key={st.n} className="flex gap-3 items-start">
                  <div
                    aria-hidden
                    className="inline-flex items-center justify-center font-black flex-shrink-0"
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--gj-yellow)',
                      color: 'var(--gj-ink)',
                      fontSize: 14,
                    }}
                  >
                    {st.n}
                  </div>
                  <div>
                    <div className="font-black" style={{ fontSize: 14, color: '#fff' }}>{st.t}</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)', marginTop: 2, lineHeight: 1.5 }}>
                      {st.s}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pane droite — formulaire */}
        <section
          className="flex flex-col justify-center w-full mx-auto"
          style={{
            background: 'var(--gj-surface)',
            padding: '48px 80px',
            gap: 18,
            maxWidth: 640,
          }}
        >
          <h2 className="font-black text-color-text-primary text-fs-700" style={{ lineHeight: 1.15 }}>
            Ton numéro sénégalais
          </h2>
          <p className="text-gj-grey" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
            Un seul compte pour tout le Guichet. Code SMS gratuit, valable 10 min.
          </p>

          <div>
            <FieldLabel htmlFor="phone-web" required>Numéro de téléphone</FieldLabel>
            <div className="flex gap-2 items-stretch">
              <div
                className="inline-flex items-center gap-1 font-bold"
                style={{
                  background: 'var(--gj-surface)',
                  border: '1.5px solid var(--gj-line)',
                  borderRadius: 10,
                  padding: '0 12px',
                  minHeight: 50,
                  fontSize: 15,
                }}
              >
                <SnFlag size={16} />
                <span>+221</span>
              </div>
              <div className="flex-1">
                <Input
                  id="phone-web"
                  type="tel"
                  inputMode="numeric"
                  placeholder="77 654 32 10"
                  value={num}
                  onChange={e => setNum(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2" style={{ marginTop: 8 }} role="group" aria-label="Opérateurs sénégalais">
              {OPERATEURS.map(o => {
                const selected = op === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOp(o.id)}
                    aria-pressed={selected}
                    className="flex-1 flex flex-col items-center font-black"
                    style={{
                      padding: '10px 8px',
                      border: `1.5px solid ${selected ? o.color : 'var(--gj-line)'}`,
                      background: selected ? 'rgba(0,159,118,.04)' : 'var(--gj-surface)',
                      borderRadius: 10,
                      fontSize: 11,
                      gap: 2,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: o.color }}>{o.label}</span>
                    <span style={{ fontSize: 9, color: 'var(--gj-grey)', fontWeight: 600 }}>{o.prefixes}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { window.location.href = '/jeune/onboarding/objectifs' }}
              className="flex-1 inline-flex items-center justify-center gap-2 font-black"
              style={{
                background: 'var(--gj-teal-deep)',
                color: 'var(--gj-surface)',
                border: 0,
                padding: '0 24px',
                minHeight: 54,
                borderRadius: 10,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Vérifier le code
              <Icon name="arrow-right" size={16} aria-hidden />
            </button>
            <Link
              href="/api/auth/login"
              className="inline-flex items-center gap-2 font-black no-underline"
              style={{
                background: 'var(--gj-whatsapp)',
                color: 'var(--gj-surface)',
                border: 0,
                padding: '0 18px',
                minHeight: 54,
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              <Icon name="whatsapp" size={16} aria-hidden />
              Via WhatsApp
            </Link>
          </div>

          <div className="text-gj-grey" style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 6 }}>
            En continuant, tu acceptes les{' '}
            <Link href="/legal/cgu" className="font-bold text-gj-teal-deep no-underline">CGU</Link>
            {' '}et la{' '}
            <Link href="/legal/confidentialite" className="font-bold text-gj-teal-deep no-underline">
              charte de confidentialité
            </Link>
            . Tes données restent au Sénégal.
          </div>
        </section>
      </div>
    </div>
  )
}
