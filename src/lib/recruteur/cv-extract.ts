// Extraction du texte d'un CV PDF soumis avec une candidature — ATS (GUIC-487 évolution).
// Le score d'adéquation n'analyse plus seulement le profil déclaré : le contenu réel
// du CV (expériences, formations, compétences non déclarées) entre dans le prompt.
// Fail-soft : tout échec (stockage, PDF illisible, non-PDF) → null, scoring profil seul.

import { stockagePour } from '@/lib/storage'
import { logger } from '@/lib/logger'

/** Borne le texte injecté dans le prompt (≈ 1 500 tokens). */
const MAX_CHARS = 6000

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

/**
 * Télécharge le CV depuis le stockage objet et en extrait le texte brut.
 * @returns texte nettoyé et tronqué, ou `null` si absent/illisible.
 */
export async function extraireTexteCv(cvUrl: string | null): Promise<string | null> {
  if (!cvUrl) return null
  try {
    const contenu = await stockagePour(cvUrl).lire(cvUrl)
    if (!contenu.contentType.toLowerCase().includes('pdf')) {
      logger.info('[cv-extract] contenu non PDF ignoré', { contentType: contenu.contentType })
      return null
    }
    const buffer = await streamToBuffer(contenu.corps)
    const pdfParse = (await import('pdf-parse')).default
    const { text } = await pdfParse(buffer)
    const propre = text.replace(/\s+/g, ' ').trim()
    return propre ? propre.slice(0, MAX_CHARS) : null
  } catch (err) {
    logger.warn('[cv-extract] extraction échouée (fail-soft)', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
