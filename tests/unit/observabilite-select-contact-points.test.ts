/**
 * @jest-environment node
 *
 * GUIC-576 — Grafana valide TOUS les points de contact déclarés au démarrage, même ceux
 * qu'aucune politique n'utilise. Trouvé au premier déploiement réel : `ALERTE_WEBHOOK_URL`
 * vide (relais WhatsApp pas encore créé, GUIC-575) faisait planter Grafana à l'amorçage
 * entier — pas juste désactiver le canal WhatsApp — avec
 * `required field 'url' is not specified`. Le commentaire du compose promettait
 * "dégradé, pas silencieux" ; en réalité c'était "mort, pas silencieux".
 *
 * `select-contact-points.sh` retire le récepteur webhook du fichier de provisioning AVANT
 * que Grafana ne le lise, si `ALERTE_WEBHOOK_URL` est absente — plutôt que de le déclarer
 * avec une URL vide.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, readFileSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'infra/observabilite/grafana/select-contact-points.sh')

function run(env: Record<string, string> = {}): { dst: string; contactPoints: string; calls: string } {
  const sandbox = mkdtempSync(join(tmpdir(), 'guic-grafana-contact-'))
  const src = join(sandbox, 'src')
  mkdirSync(join(src, 'alerting'), { recursive: true })
  cpSync(
    join(ROOT, 'infra/observabilite/grafana/provisioning/alerting/contact-points.yml'),
    join(src, 'alerting/contact-points.yml')
  )

  // GUIC-576 — $DST est en réalité le POINT DE MONTAGE d'un volume Docker nommé, jamais un
  // chemin que le script crée ou détruit lui-même : sur un vrai conteneur, `rm -rf "$DST"`
  // échoue avec « Permission denied » (on ne peut retirer l'entrée du point de montage de
  // SON PARENT, seulement écrire dans son contenu). Simulé ici en rendant le PARENT de
  // $DST en lecture seule (0555) après avoir pré-rempli $DST avec du contenu d'un run
  // précédent : impossible de re-créer/supprimer le dossier "provisioning" lui-même,
  // mais toujours possible d'écrire les fichiers qu'il contient. `chmodSync` seul (sans
  // vrai point de montage) ne suffisait pas à reproduire l'échec constaté en réel — un
  // dossier qu'on possède reste supprimable même vide.
  const dstParent = join(sandbox, 'dst-parent')
  const dst = join(dstParent, 'provisioning')
  mkdirSync(join(dst, 'alerting'), { recursive: true })
  writeFileSync(join(dst, 'alerting/contact-points.yml'), '# contenu d\'un run précédent, à remplacer\n')
  chmodSync(dstParent, 0o555)

  const bin = join(sandbox, 'bin')
  mkdirSync(bin)
  const runSh = join(bin, 'run.sh')
  const callLog = join(sandbox, 'calls.log')
  writeFileSync(callLog, '')
  writeFileSync(runSh, `#!/bin/sh\necho "run.sh appelé avec: $*" >> "$CALL_LOG"\n`)
  chmodSync(runSh, 0o755)

  try {
    execFileSync('sh', [SCRIPT], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        PROVISIONING_SRC: src,
        PROVISIONING_DST: dst,
        RUN_SH: runSh,
        ...env,
      },
    })
  } finally {
    chmodSync(dstParent, 0o755)
  }

  return {
    dst,
    contactPoints: readFileSync(join(dst, 'alerting/contact-points.yml'), 'utf8'),
    calls: readFileSync(callLog, 'utf8'),
  }
}

describe('GUIC-576 — select-contact-points.sh : webhook retiré si ALERTE_WEBHOOK_URL absente', () => {
  it('retire le récepteur webhook quand ALERTE_WEBHOOK_URL est vide', () => {
    const r = run({ ALERTE_WEBHOOK_URL: '' })
    expect(r.contactPoints).not.toMatch(/astreinte-whatsapp/)
    expect(r.contactPoints).not.toMatch(/type: webhook/)
    // Le canal e-mail, lui, reste présent — on ne dégrade qu'un canal, pas les deux.
    expect(r.contactPoints).toMatch(/astreinte-email/)
  })

  it('retire le récepteur webhook quand ALERTE_WEBHOOK_URL est absente de l\'environnement', () => {
    const r = run({})
    expect(r.contactPoints).not.toMatch(/astreinte-whatsapp/)
  })

  it('conserve le récepteur webhook quand ALERTE_WEBHOOK_URL est renseignée', () => {
    const r = run({ ALERTE_WEBHOOK_URL: 'https://relais.example.org/whatsapp' })
    expect(r.contactPoints).toMatch(/astreinte-whatsapp/)
    expect(r.contactPoints).toMatch(/type: webhook/)
    expect(r.contactPoints).toMatch(/astreinte-email/)
  })

  it('exécute bien /run.sh à la fin (jamais avaler le vrai entrypoint Grafana)', () => {
    const r = run({ ALERTE_WEBHOOK_URL: '' })
    expect(r.calls).toMatch(/run\.sh appelé/)
  })
})
