/**
 * @jest-environment node
 *
 * GUIC-218 — Validations Zod renforcées (CandidatureBodySchema).
 * Cf src/lib/validations/candidature.ts
 */
import { CandidatureBodySchema } from '@/lib/validations/candidature'
import { LETTRE_MIN_CHARS, LETTRE_MAX_CHARS, CV_URL_MAX_LEN } from '@/lib/constants/candidature'

const VALID_UUID = '11111111-1111-4111-8111-111111111111'
const VALID_BLOB_URL = 'https://store-abc123.public.blob.vercel-storage.com/cv/uid/cv-rand.pdf'

function lettre(len: number): string {
  return 'a'.repeat(len)
}

describe('CandidatureBodySchema', () => {
  it('accepte une candidature minimale valide (sans CV)', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(LETTRE_MIN_CHARS),
    })
    expect(res.success).toBe(true)
  })

  it('accepte une URL Vercel Blob valide en cvUrl', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(LETTRE_MIN_CHARS),
      cvUrl: VALID_BLOB_URL,
    })
    expect(res.success).toBe(true)
  })

  it('refuse un hostname externe pour cvUrl', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(LETTRE_MIN_CHARS),
      cvUrl: 'https://attacker.example.com/evil.pdf',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.message.includes('Vercel Blob'))).toBe(true)
    }
  })

  it('refuse une lettre trop courte (< LETTRE_MIN_CHARS)', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(LETTRE_MIN_CHARS - 1),
    })
    expect(res.success).toBe(false)
  })

  it('refuse une lettre trop longue (> LETTRE_MAX_CHARS)', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(LETTRE_MAX_CHARS + 1),
    })
    expect(res.success).toBe(false)
  })

  it('refuse une lettre contenant un <script> (XSS)', () => {
    const payload = lettre(LETTRE_MIN_CHARS) + '<script>alert(1)</script>'
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: payload,
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues.some((i) => i.message === 'Contenu non autorisé')).toBe(true)
    }
  })

  it('refuse une lettre contenant une URL javascript: (XSS)', () => {
    const payload = lettre(LETTRE_MIN_CHARS) + ' cliquez javascript:alert(1)'
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: payload,
    })
    expect(res.success).toBe(false)
  })

  it('refuse une lettre contenant un attribut onerror= (XSS)', () => {
    const payload = lettre(LETTRE_MIN_CHARS) + ' <img onerror=alert(1)>'
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: payload,
    })
    expect(res.success).toBe(false)
  })

  it('refuse une cvUrl > CV_URL_MAX_LEN caractères', () => {
    // Construit une URL Blob valide mais trop longue
    const longSegment = 'a'.repeat(CV_URL_MAX_LEN)
    const url = `https://s.public.blob.vercel-storage.com/${longSegment}.pdf`
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(LETTRE_MIN_CHARS),
      cvUrl: url,
    })
    expect(res.success).toBe(false)
  })

  it('GUIC-232 — LETTRE_MAX_CHARS est désormais à 4000', () => {
    expect(LETTRE_MAX_CHARS).toBe(4000)
  })

  it('GUIC-232 — accepte une lettre de pile 4000 caractères', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(4000),
    })
    expect(res.success).toBe(true)
  })

  it('GUIC-232 — refuse une lettre de 4001 caractères', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: VALID_UUID,
      lettreMotivation: lettre(4001),
    })
    expect(res.success).toBe(false)
  })

  it('refuse un opportuniteId non-UUID', () => {
    const res = CandidatureBodySchema.safeParse({
      opportuniteId: 'pas-un-uuid',
      lettreMotivation: lettre(LETTRE_MIN_CHARS),
    })
    expect(res.success).toBe(false)
  })
})
