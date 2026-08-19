/**
 * @jest-environment node
 *
 * GUIC-625 — Le déploiement peut synchroniser les secrets depuis Doppler avant de démarrer,
 * au lieu de dépendre d'un fichier `.env` plat maintenu à la main sur le serveur (source
 * historique de la fuite GUIC-625 : un script qui committait des secrets en clair — le pattern
 * sous-jacent, des fichiers plats jamais remis en question, n'avait jamais changé).
 *
 * Même style de sentinelles que deploy-crontab-sync.test.ts (GUIC-683) : opt-in explicite,
 * jamais d'effet de bord sur un poste de dev, échec annoncé jamais silencieux, refuse un
 * résultat vide plutôt que d'écraser un fichier de secrets valide par du rien.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const R = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('deploy.sh — synchronisation des secrets depuis Doppler', () => {
  const deploy = R('scripts/deploy/deploy.sh')

  it('appelle le CLI Doppler pour télécharger les secrets au format env', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_secrets_from_doppler()'))
    expect(bloc).toMatch(/doppler secrets download/)
    expect(bloc).toMatch(/--format env/)
  })

  it('écrit exactement dans GUICHET_ENV_FILE — aucun changement de compose nécessaire', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_secrets_from_doppler()'))
    expect(bloc).toMatch(/\$GUICHET_ENV_FILE/)
  })

  it('N’AGIT QUE sur opt-in explicite — un poste de dev ne doit jamais tenter Doppler', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_secrets_from_doppler()'), deploy.indexOf('main() {'))
    expect(bloc).toMatch(/DOPPLER_SYNC/)
    expect(bloc).toMatch(/\$\{DOPPLER_SYNC:-0\}/) // défaut : inactif
  })

  it('exige DOPPLER_CONFIG explicite si DOPPLER_SYNC=1 — jamais un environnement par défaut deviné', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_secrets_from_doppler()'), deploy.indexOf('main() {'))
    expect(bloc).toMatch(/DOPPLER_CONFIG/)
  })

  it('refuse d’écraser GUICHET_ENV_FILE avec un résultat vide (Doppler injoignable, config vidée)', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_secrets_from_doppler()'), deploy.indexOf('main() {'))
    expect(bloc).toMatch(/-s\s/) // test [ -s fichier ] : non vide
  })

  it('un échec de téléchargement Doppler est ANNONCÉ et arrête le déploiement, jamais silencieux', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_secrets_from_doppler()'), deploy.indexOf('main() {'))
    expect(bloc).toMatch(/err\s/)
    expect(bloc).toMatch(/exit\s+2/)
  })

  it('se synchronise AVANT require() — le fichier doit exister avant que require() ne le vérifie', () => {
    const main = deploy.slice(deploy.lastIndexOf('main() {'))
    const posDoppler = main.indexOf('sync_secrets_from_doppler')
    const posRequire = main.indexOf('require')
    expect(posDoppler).toBeGreaterThanOrEqual(0)
    expect(posRequire).toBeGreaterThan(posDoppler)
  })

  it('le fichier régénéré n’est lisible que par son propriétaire (secrets)', () => {
    const bloc = deploy.slice(deploy.indexOf('sync_secrets_from_doppler()'), deploy.indexOf('main() {'))
    expect(bloc).toMatch(/install -m 600|chmod 600/)
  })
})
