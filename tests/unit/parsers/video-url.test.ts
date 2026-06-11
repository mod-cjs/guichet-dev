import { parseVideoEmbedUrl } from '@/lib/parsers/video-url'

describe('parseVideoEmbedUrl — GUIC-366', () => {
  it('détecte YouTube /watch?v=ID', () => {
    const r = parseVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(r).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    })
  })

  it('détecte youtu.be/ID', () => {
    const r = parseVideoEmbedUrl('https://youtu.be/abc123XYZ')
    expect(r).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/abc123XYZ',
    })
  })

  it('détecte youtube.com/embed/ID', () => {
    const r = parseVideoEmbedUrl('https://www.youtube.com/embed/foo_bar-42')
    expect(r?.provider).toBe('youtube')
    expect(r?.embedUrl).toBe('https://www.youtube.com/embed/foo_bar-42')
  })

  it('détecte Vimeo numérique', () => {
    const r = parseVideoEmbedUrl('https://vimeo.com/76979871')
    expect(r).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    })
  })

  it('renvoie null pour un lien externe non-vidéo', () => {
    expect(parseVideoEmbedUrl('https://example.com/article')).toBeNull()
    expect(parseVideoEmbedUrl('not-a-url')).toBeNull()
    expect(parseVideoEmbedUrl('')).toBeNull()
  })

  it('détecte YouTube Shorts', () => {
    const r = parseVideoEmbedUrl('https://www.youtube.com/shorts/short42ID')
    expect(r?.provider).toBe('youtube')
    expect(r?.embedUrl).toBe('https://www.youtube.com/embed/short42ID')
  })
})
