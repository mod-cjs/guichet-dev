import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder pour jsdom sous Node récent (≥ 20/24).
// Certains modules (undici via @vercel/blob, génération QR, etc.) les importent au
// chargement, or jsdom ne les expose pas globalement → "ReferenceError: TextEncoder
// is not defined" qui fait échouer la suite à l'import (avant toute logique de test).
import { TextEncoder, TextDecoder } from 'node:util'
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web'
import { MessagePort, MessageChannel } from 'node:worker_threads'

/* eslint-disable @typescript-eslint/no-explicit-any */
const g = globalThis as any
const polyfills: Record<string, unknown> = {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  MessagePort,
  MessageChannel,
}
for (const [name, impl] of Object.entries(polyfills)) {
  if (typeof g[name] === 'undefined') g[name] = impl
}
/* eslint-enable @typescript-eslint/no-explicit-any */
