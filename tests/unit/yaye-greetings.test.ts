import { pickGreeting, pickSuggestions } from '@/lib/ia/greetings'

describe('Yaye — variété conversationnelle (greetings.ts)', () => {
  it('rng=()=>0 → variante canonique déterministe (« Salama … » + « Une offre pour moi »)', () => {
    expect(pickGreeting('Awa', () => 0)).toMatch(/^Salama Awa\./)
    expect(pickSuggestions(() => 0)[0]).toEqual({
      label: 'Une offre pour moi',
      value: 'Trouve-moi une opportunité adaptée à mon profil',
    })
  })

  it('insère le prénom quand il est fourni, et reste correct sans prénom', () => {
    expect(pickGreeting('Fatou', () => 0)).toContain('Fatou')
    expect(pickGreeting(undefined, () => 0)).not.toContain('undefined')
    expect(pickGreeting('   ', () => 0)).not.toContain('  ')
  })

  it('varie réellement les salutations selon rng (≥3 formulations distinctes)', () => {
    const variants = new Set(
      [0, 0.2, 0.4, 0.6, 0.8, 0.99].map(r => pickGreeting('Awa', () => r)),
    )
    expect(variants.size).toBeGreaterThanOrEqual(3)
  })

  it('varie les amorces de conversation selon rng', () => {
    const a = pickSuggestions(() => 0)
    const b = pickSuggestions(() => 0.99)
    expect(a).not.toEqual(b)
  })

  it('aucun emoji ni pourcentage dans les greetings (toutes variantes)', () => {
    const emojiOrPct = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|%/u
    for (const r of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      expect(pickGreeting('Awa', () => r)).not.toMatch(emojiOrPct)
    }
  })
})
