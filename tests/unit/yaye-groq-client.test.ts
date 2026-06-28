/**
 * @jest-environment node
 *
 * Client Groq partagé et résilient (GUIC-259) : singleton + timeout/retry passés
 * au SDK (robustesse prod E2/E3).
 */

const ctorCalls: Array<Record<string, unknown>> = []
jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: class {
    constructor(opts: Record<string, unknown>) {
      ctorCalls.push(opts)
    }
  },
}))

beforeEach(() => {
  ctorCalls.length = 0
  jest.resetModules()
})

it('construit le client avec timeout + maxRetries et le mémoïse (singleton)', () => {
  process.env.GROQ_API_KEY = 'k-test'
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getGroq } = require('@/lib/ia/groq-client')

  const a = getGroq()
  const b = getGroq()

  expect(a).toBe(b) // singleton → une seule instanciation
  expect(ctorCalls).toHaveLength(1)
  expect(ctorCalls[0]).toMatchObject({ apiKey: 'k-test' })
  expect(typeof ctorCalls[0].timeout).toBe('number')
  expect(typeof ctorCalls[0].maxRetries).toBe('number')
})

it('respecte les surcharges d\'environnement (YAYE_GROQ_*)', () => {
  process.env.YAYE_GROQ_TIMEOUT_MS = '5000'
  process.env.YAYE_GROQ_MAX_RETRIES = '4'
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getGroq } = require('@/lib/ia/groq-client')

  getGroq()
  expect(ctorCalls[0].timeout).toBe(5000)
  expect(ctorCalls[0].maxRetries).toBe(4)

  delete process.env.YAYE_GROQ_TIMEOUT_MS
  delete process.env.YAYE_GROQ_MAX_RETRIES
})
