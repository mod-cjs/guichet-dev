import '@testing-library/jest-dom'

// jsdom n'expose pas TextEncoder/TextDecoder en globals ; certains modules
// (undici via @vercel/blob, importé par src/lib/upload/profil-uploads.ts)
// les requièrent au chargement. On les polyfille depuis Node `util`.
import { TextEncoder, TextDecoder } from 'util'

const g = globalThis as unknown as {
  TextEncoder?: typeof TextEncoder
  TextDecoder?: typeof TextDecoder
}
if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder
