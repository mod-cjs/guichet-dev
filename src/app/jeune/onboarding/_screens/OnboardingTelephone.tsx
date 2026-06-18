'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { FieldLabel } from '@/components/ui/FieldLabel'
import { Input } from '@/components/ui/Input'
import { FooterCTA } from '@/components/ui/FooterCTA'
import { StepBar } from '@/components/ui/StepBar'
import { SnFlag } from '@/components/ui/SnFlag'

interface Props {
  telephone?: string
}

const OPERATEURS = [
  { id: 'orange',   label: 'orange',   prefixes: '77 · 78', color: 'var(--gj-yellow-deep)' },
  { id: 'free',     label: 'free',     prefixes: '76',      color: '#CE0F69' },
  { id: 'expresso', label: 'expresso', prefixes: '70',      color: '#E60000' },
] as const

/**
 * Onboarding écran 2/5 — Téléphone (redirect SSO).
 *
 * Le SSO porte le contrat OTP (SMS / WhatsApp fallback). Cet écran est
 * purement informatif : il affiche un sélecteur d'opérateur (purement
 * cosmétique) + un input téléphone E.164. Au submit, on redirige vers
 * `/api/auth/login?return_to=/jeune/onboarding/objectifs` — le SSO
 * réclame le téléphone et le code SMS, puis rapatrie l'utilisateur.
 *
 * StepBar : 1/5.
 */
export function OnboardingTelephone({ telephone }: Props) {
  // Détection auto opérateur sur les 2 chiffres après +221
  const detected = telephone?.replace(/\D/g, '').slice(-9, -7)
  const initialOp =
    detected === '77' || detected === '78' ? 'orange' :
    detected === '76' ? 'free' :
    detected === '70' ? 'expresso' :
    'orange'
  const [op, setOp] = useState<string>(initialOp)
  const [num, setNum] = useState<string>(telephone?.replace(/^\+221/, '').trim() ?? '')

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3rem)', background: 'var(--gj-surface)' }}>
      <StepBar step={1} total={5} />

      <div className="flex-1 flex flex-col gap-space-3 px-space-4 py-space-5">
        <div>
          <h1 className="font-black text-color-text-primary text-fs-500" style={{ lineHeight: 1.2 }}>
            Ton numéro de téléphone
          </h1>
          <p className="text-fs-200 text-gj-grey mt-1" style={{ lineHeight: 1.5 }}>
            On envoie un code à 6 chiffres par SMS. Gratuit, valable 10 min.
          </p>
        </div>

        {/* Opérateurs (info — non sélectable) */}
        <div className="flex gap-space-1" role="group" aria-label="Opérateurs sénégalais">
          {OPERATEURS.map(o => {
            const selected = op === o.id
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setOp(o.id)}
                aria-pressed={selected}
                className="flex-1 flex flex-col items-center gap-[2px] font-black"
                style={{
                  padding: '10px 8px',
                  border: `1.5px solid ${selected ? o.color : 'var(--gj-line)'}`,
                  background: selected ? 'rgba(0,159,118,.06)' : 'var(--gj-surface)',
                  borderRadius: 10,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: o.color }}>{o.label}</span>
                <span style={{ fontSize: 9, color: 'var(--gj-grey)', fontWeight: 600 }}>{o.prefixes}</span>
              </button>
            )
          })}
        </div>

        {/* Input téléphone */}
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="phone" required>Ton numéro de téléphone</FieldLabel>
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
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="77 654 32 10"
                value={num}
                onChange={e => setNum(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* WhatsApp fallback note */}
        <div
          className="flex items-center gap-2 text-white"
          style={{
            background: 'var(--gj-whatsapp)',
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <Icon name="whatsapp" size={20} aria-hidden />
          <div className="flex-1">
            <div className="text-fs-100 font-black">Pas de SMS ?</div>
            <div className="text-fs-100" style={{ opacity: 0.9 }}>
              Le SSO te proposera WhatsApp comme alternative
            </div>
          </div>
        </div>
      </div>

      <FooterCTA
        primary={{
          label: 'Vérifier',
          // SSO porte l'OTP — on redirige vers le flow login.
          // L'utilisateur est déjà authentifié (sinon middleware aurait redirigé),
          // donc on saute directement à l'écran objectifs.
          // En production réelle, on passerait par /api/auth/login avec
          // `force_phone_verify` si le téléphone est manquant côté SSO.
          onClick: () => { window.location.href = '/jeune/onboarding/objectifs' },
        }}
        secondary={{
          label: '← Retour',
          onClick: () => { window.history.back() },
        }}
      />

      <div className="text-center pb-space-3 text-fs-100 text-gj-grey px-space-4">
        Vérification gérée par le <Link href="/api/auth/login" prefetch={false} className="font-bold text-gj-teal-deep no-underline">SSO CJS</Link>.
      </div>
    </div>
  )
}
