import { readFile, stat } from 'node:fs/promises'
import { join, normalize, resolve } from 'node:path'
import { NextResponse } from 'next/server'

const DESIGN_ROOT = resolve(process.cwd(), 'design-guichet-v2')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jsx': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 })
  }
  const { path } = await ctx.params
  const rel = normalize(path.join('/'))
  if (rel.startsWith('..') || rel.includes('\0')) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  const full = join(DESIGN_ROOT, rel)
  if (!full.startsWith(DESIGN_ROOT)) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  try {
    const s = await stat(full)
    if (!s.isFile()) return new NextResponse('Not Found', { status: 404 })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
  const ext = full.slice(full.lastIndexOf('.')).toLowerCase()
  const data = await readFile(full)
  // CSP et X-Frame-Options permissifs gérés dans next.config.ts (matcher dev).
  return new NextResponse(data as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    },
  })
}
