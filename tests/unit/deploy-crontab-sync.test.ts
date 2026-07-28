/**
 * @jest-environment node
 *
 * GUIC-683 — Le déploiement synchronise le crontab serveur.
 *
 * Piège B8 (checklist go-live) : sur OVH, Vercel Cron n'existe plus. Les tâches vivent dans
 * `scripts/cron/jobs.json` et le crontab est généré depuis ce fichier — mais il était installé
 * À LA MAIN. Conséquence : ajouter une tâche dans une PR ne la déploie pas, et l'oubli est
 * SILENCIEUX (le site répond, la tâche ne tourne simplement jamais).
 *
 * Le déploiement s'en charge désormais. Sentinelles de contrat sur la source, dans le style
 * de deploy-infra.test.ts.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const R = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('deploy.sh — synchronisation du crontab', () => {
  const deploy = R('scripts/deploy/deploy.sh')

  it('appelle le générateur de crontab', () => {
    expect(deploy).toMatch(/generate-crontab\.sh/)
  })

  it('synchronise APRÈS la bascule d’image et sa vérification', () => {
    const main = deploy.slice(deploy.lastIndexOf('main() {'))
    const posBascule = main.indexOf('switch_and_verify')
    const posCron = main.indexOf('sync_crontab')
    expect(posBascule).toBeGreaterThanOrEqual(0)
    expect(posCron).toBeGreaterThan(posBascule)
  })

  it('ne remplace QUE le bloc du Guichet, sans toucher aux autres lignes du crontab', () => {
    expect(deploy).toMatch(/GUICHET-CRON/)
    expect(deploy).toMatch(/grep\s+-v/)
  })

  it('refuse d’installer un crontab généré vide (jq absent, jobs.json cassé)', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_crontab()'))
    expect(bloc).toMatch(/-s\s|wc -l|vide/i)
  })

  it('un échec de synchronisation est ANNONCÉ, jamais silencieux', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_crontab()'), deploy.indexOf('# ── 0. Preflight'))
    expect(bloc).toMatch(/err\s/)
  })
})

describe('Le cron d’amorçage est bien déclaré des deux côtés', () => {
  it('présent dans l’ordonnanceur OVH', () => {
    const jobs = JSON.parse(R('scripts/cron/jobs.json')) as { jobs: Array<{ path: string; schedule: string }> }
    const warm = jobs.jobs.find(j => j.path === '/api/cron/yaye-warm-search')
    expect(warm).toBeDefined()
    expect(warm!.schedule).toBe('5 * * * *') // à l'heure : amorçage terminé dans la journée
  })

  it('présent dans vercel.json (la sentinelle de parité veille sur les deux)', () => {
    const vercel = JSON.parse(R('vercel.json')) as { crons: Array<{ path: string }> }
    expect(vercel.crons.some(c => c.path === '/api/cron/yaye-warm-search')).toBe(true)
  })
})
