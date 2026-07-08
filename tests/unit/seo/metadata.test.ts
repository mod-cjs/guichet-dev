import { withCanonical } from '@/lib/seo/metadata'

describe('withCanonical', () => {
  it('produit un fragment alternates.canonical avec le chemin relatif', () => {
    expect(withCanonical('/legal/cgu')).toEqual({ alternates: { canonical: '/legal/cgu' } })
  })

  it('préserve les chemins dynamiques tels quels (résolus par metadataBase)', () => {
    expect(withCanonical('/centres/dakar/ressources')).toEqual({
      alternates: { canonical: '/centres/dakar/ressources' },
    })
  })

  it('est étalable dans un objet Metadata sans écraser les autres clés', () => {
    const meta = { title: 'X', ...withCanonical('/x') }
    expect(meta.title).toBe('X')
    expect(meta.alternates).toEqual({ canonical: '/x' })
  })
})
