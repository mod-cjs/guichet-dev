/**
 * GUIC-597 — US-2 : respect de robots.txt (autorisation + Crawl-delay).
 */
import { analyserRobots } from '@/lib/curation/robot/robots'

const UA = 'CJSGuichetBot'

describe('GUIC-597 — robots.txt', () => {
  it('autorise par défaut quand aucune règle ne matche', () => {
    const r = analyserRobots('User-agent: *\nDisallow: /admin\n', UA)
    expect(r.estAutorise('/offres')).toBe(true)
    expect(r.estAutorise('/admin/x')).toBe(false)
  })

  it('applique une section ciblant notre user-agent', () => {
    const txt = `User-agent: *\nDisallow: /\n\nUser-agent: CJSGuichetBot\nDisallow: /prive\n`
    const r = analyserRobots(txt, UA)
    // Notre section est plus spécifique : seul /prive est interdit.
    expect(r.estAutorise('/offres')).toBe(true)
    expect(r.estAutorise('/prive/x')).toBe(false)
  })

  it('lit le Crawl-delay (secondes → ms)', () => {
    const r = analyserRobots('User-agent: *\nCrawl-delay: 5\n', UA)
    expect(r.crawlDelayMs).toBe(5000)
  })

  it('crawlDelayMs = null si absent', () => {
    expect(analyserRobots('User-agent: *\nDisallow:\n', UA).crawlDelayMs).toBeNull()
  })

  it('robots.txt vide ou illisible → tout autorisé, pas de delay', () => {
    const r = analyserRobots('', UA)
    expect(r.estAutorise('/quoi')).toBe(true)
    expect(r.crawlDelayMs).toBeNull()
  })

  it('plafonne un Crawl-delay abusif (une source ne doit pas geler la file)', () => {
    const r = analyserRobots('User-agent: *\nCrawl-delay: 250\n', UA)
    expect(r.crawlDelayMs).toBe(30_000) // plafond, pas 250 000
  })
})
