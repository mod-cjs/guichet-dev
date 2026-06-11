/**
 * GUIC-366 — détection d'URLs vidéo embeddables (YouTube / Vimeo).
 *
 * Renvoie `null` si l'URL est invalide ou ne correspond à aucun fournisseur
 * supporté → le caller affiche alors un lien externe classique.
 */

export type VideoProvider = 'youtube' | 'vimeo'

export interface VideoEmbed {
  provider: VideoProvider
  embedUrl: string
}

/**
 * Détecte si une URL est une vidéo YouTube ou Vimeo et renvoie l'URL d'embed.
 *
 * YouTube — formats supportés :
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/embed/ID
 *   - https://www.youtube.com/shorts/ID
 *
 * Vimeo :
 *   - https://vimeo.com/123456
 */
export function parseVideoEmbedUrl(url: string): VideoEmbed | null {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()

    // ---- YouTube ----
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      if (id) {
        return {
          provider: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
        }
      }
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      let id: string | null = null
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] ?? null
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] ?? null
      else if (u.pathname.startsWith('/v/')) id = u.pathname.split('/')[2] ?? null
      if (id) {
        return {
          provider: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
        }
      }
    }

    // ---- Vimeo ----
    if (host.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) {
        return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` }
      }
    }
  } catch {
    // URL invalide → fallback null
  }
  return null
}
