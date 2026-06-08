import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

function findPageFiles(dir: string): string[] {
  const out: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...findPageFiles(full))
    } else if (name === 'page.tsx') {
      out.push(full)
    }
  }
  return out
}

const ROOT = resolve(__dirname, '..', '..')
const ADMIN_PAGES = findPageFiles(join(ROOT, 'src', 'app', 'admin'))
const RECRUTEUR_PAGES = findPageFiles(join(ROOT, 'src', 'app', 'recruteur'))

// Emoji glyphes interdits comme « icônes décoratives » dans les pages stub.
const EMOJI_RE = /🚧|🎉|📚|🔔|⭐|✨|💼/

describe('GUIC-204 — pages admin/recruteur sans emoji icône', () => {
  it('liste des pages admin non vide', () => {
    expect(ADMIN_PAGES.length).toBeGreaterThan(0)
  })

  it('liste des pages recruteur non vide', () => {
    expect(RECRUTEUR_PAGES.length).toBeGreaterThan(0)
  })

  it.each([...ADMIN_PAGES, ...RECRUTEUR_PAGES])('%s sans emoji icône', (path) => {
    const src = readFileSync(path, 'utf-8')
    expect(src).not.toMatch(EMOJI_RE)
  })
})
