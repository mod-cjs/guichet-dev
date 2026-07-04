import manifest from '@/app/manifest'

// GUIC-25 (M7 SEO / PWA) — le manifest doit exposer les icônes réelles du site
// (favicon CJS) et rester conforme aux tokens de marque.
describe('manifest web (PWA)', () => {
  const m = manifest()

  it('déclare le nom et le thème de marque gj-teal', () => {
    expect(m.name).toMatch(/Guichet Jeunesse/i)
    expect(m.short_name).toBe('Guichet Jeunesse')
    expect(m.theme_color).toBe('#009F76')
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
  })

  it('référence les favicons CJS servis publiquement', () => {
    const srcs = (m.icons ?? []).map((i) => i.src)
    expect(srcs).toContain('/images/favicon/cropped-Favicon-CJS-150x150.png')
    expect(srcs).toContain('/images/favicon/cropped-Favicon-CJS-300x300.png')
  })

  it('fournit chaque icône en image/png avec une taille déclarée', () => {
    expect(m.icons?.length).toBeGreaterThan(0)
    for (const icon of m.icons ?? []) {
      expect(icon.type).toBe('image/png')
      expect(icon.sizes).toBeTruthy()
      expect(icon.src.startsWith('/')).toBe(true)
    }
  })
})
