/**
 * @jest-environment node
 *
 * GUIC-574 — Upload d'une pièce justificative de réservation.
 *
 * POURQUOI CE TEST EXISTE : cette route n'avait **aucun test**, et j'y ai modifié le chemin
 * d'erreur (`catch {}` → `erreurServeur`) sans filet. Une route qui manipule des pièces
 * justificatives — donc des données personnelles — méritait mieux qu'une vérification de types.
 *
 * Le cœur du test est le CHEMIN D'ÉCHEC : quand le stockage tombe, le client doit recevoir un 502
 * générique pendant que la cause part dans les logs. Avant, le `catch {}` jetait la cause : un
 * MinIO injoignable, un bucket absent et une clé invalide donnaient le même 502 indiscernable.
 */

const mockLoggerError = jest.fn()
jest.mock('@/lib/logger', () => ({
  logger: { error: (...a: unknown[]) => mockLoggerError(...a), info: jest.fn(), warn: jest.fn() },
  hashId: (s: string) => `sha256:${s.length}`,
}))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

const mockRateLimit = jest.fn()
jest.mock('@/lib/rate-limit', () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }))

const mockTeleverser = jest.fn()
jest.mock('@/lib/storage', () => ({ stockage: () => ({ televerser: mockTeleverser }) }))

import { POST } from '@/app/api/reservations/justif/upload/route'
import type { NextRequest } from 'next/server'

/** PDF minimal valide : les 4 magic bytes `%PDF` que la route vérifie. */
function pdf(nom = 'justif.pdf'): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])], nom, {
    type: 'application/pdf',
  })
}

function requete(fichier?: File): NextRequest {
  const form = new FormData()
  if (fichier) form.set('file', fichier)
  form.set('ressourceId', 'res-1')
  return new Request('http://localhost/api/reservations/justif/upload', {
    method: 'POST',
    body:   form,
  }) as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ cjsUid: '000016dd-3ec7-4d17-aa8c-7dcc58cd0835' })
  mockRateLimit.mockResolvedValue(null)
  mockTeleverser.mockResolvedValue({ reference: 's3://guichet/justif/x.pdf' })
})

describe('POST /api/reservations/justif/upload', () => {
  it('téléverse un PDF valide et renvoie sa référence', async () => {
    const res = await POST(requete(pdf()))
    expect(res.status).toBe(200)
    expect((await res.json()).data.url).toBe('s3://guichet/justif/x.pdf')
  })

  // ── Le chemin que GUIC-574 a modifié ────────────────────────────────────────
  describe('quand le stockage tombe (GUIC-574)', () => {
    const panne = new Error('connect ECONNREFUSED 10.0.0.5:9000 — bucket guichet absent')

    it('renvoie 502 UPLOAD_FAILED sans divulguer la cause au client', async () => {
      mockTeleverser.mockRejectedValue(panne)
      const res = await POST(requete(pdf()))
      expect(res.status).toBe(502)

      const corps = await res.json()
      expect(corps.error.code).toBe('UPLOAD_FAILED')
      // La topologie interne ne doit JAMAIS sortir : IP, port, nom de bucket.
      expect(JSON.stringify(corps)).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|9000|bucket/)
    })

    it('journalise la cause — c’est tout l’objet du ticket', async () => {
      mockTeleverser.mockRejectedValue(panne)
      await POST(requete(pdf()))

      expect(mockLoggerError).toHaveBeenCalledTimes(1)
      const [evenement, ctx] = mockLoggerError.mock.calls[0]
      expect(evenement).toBe('api_5xx')
      expect(ctx).toMatchObject({ code: 'UPLOAD_FAILED', status: 502 })
      // Sans cette assertion, le `catch {}` d'origine passerait encore le test.
      expect(JSON.stringify(ctx)).toMatch(/ECONNREFUSED/)
    })
  })

  // ── Chemins de refus (charte qualité : tester le refus, pas que le chemin heureux) ──
  it('401 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST(requete(pdf()))
    expect(res.status).toBe(401)
    expect(mockTeleverser).not.toHaveBeenCalled()
  })

  it('400 sans fichier', async () => {
    const res = await POST(requete())
    expect(res.status).toBe(400)
    expect(mockTeleverser).not.toHaveBeenCalled()
  })

  it('400 sur un type MIME non autorisé', async () => {
    const exe = new File([new Uint8Array([0x4d, 0x5a])], 'v.exe', { type: 'application/x-msdownload' })
    const res = await POST(requete(exe))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_MIME')
  })

  it('400 quand le contenu dément le type déclaré (magic bytes)', async () => {
    // Un exécutable renommé en .pdf : le type déclaré est autorisé, le contenu non.
    const faux = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], 'piege.pdf', {
      type: 'application/pdf',
    })
    const res = await POST(requete(faux))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('INVALID_CONTENT')
    expect(mockTeleverser).not.toHaveBeenCalled()
  })

  it('respecte le rate-limit et n’appelle pas le stockage', async () => {
    mockRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'RATE_LIMITED' } }), { status: 429 }),
    )
    const res = await POST(requete(pdf()))
    expect(res.status).toBe(429)
    expect(mockTeleverser).not.toHaveBeenCalled()
  })
})
