import '@testing-library/jest-dom'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Les suites « DB réelle » lisent DATABASE_URL dans process.env. En CI la variable est
// injectée par l'environnement ; en local elle ne vit que dans .env.local, que Jest ne
// charge pas — d'où 40 échecs « DATABASE_URL manquante » et un hook pre-push bloqué.
//
// On ne charge QUE cette variable, et seulement si elle est absente : sourcer tout le
// .env.local écraserait NEXT_PUBLIC_APP_URL avec l'URL locale, ce qui fait échouer les
// tests SEO (json-ld) qui attendent l'URL de production.
if (!process.env.DATABASE_URL) {
  const envFile = resolve(__dirname, '..', '.env.local')
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('DATABASE_URL='))
    if (line) {
      process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
    }
  }
}

// GUIC-706 — Les fonctionnalités sont TOUTES ouvertes par défaut dans les tests.
//
// À partir du lot 3, les loaders, les navigations et les gardes appelleront `getFlags()`,
// qui touche Redis et la base. Sans ce mock, les 648 suites existantes se mettraient à
// dépendre d'une infrastructure qu'elles n'utilisent pas, pour un comportement qu'elles
// ne testent pas. Le mock ne travestit rien : « tout ouvert » est exactement l'état de la
// production avant le lancement séquentiel.
//
// Les suites qui éprouvent un module MASQUÉ (lots 5 et 6) lèvent ce mock explicitement
// via `jest.unmock('@/lib/flags')`, ce qui rend leur intention lisible d'un coup d'œil.
jest.mock('@/lib/flags', () => {
  const reel = jest.requireActual('@/lib/flags')
  const { catalogDefaults } = jest.requireActual('@/lib/flags/catalog')
  return {
    ...reel,
    getFlags: async () => catalogDefaults(),
    isEnabled: async (key: string) => catalogDefaults()[key] === true,
  }
})

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
