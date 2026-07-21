/**
 * @jest-environment node
 *
 * GUIC-625 — Aucun secret en clair dans les scripts suivis par git.
 *
 * INCIDENT À L'ORIGINE : scripts/vercel-env-setup.sh a porté SESSION_SECRET, SSO_CLIENT_SECRET
 * et les mots de passe Redis/MariaDB EN CLAIR, suivis par git du 2026-05-07 au 2026-07-20. Le
 * SESSION_SECRET permet de forger n'importe quelle session, admin comprise.
 *
 * Retirer les valeurs une fois ne suffit pas : quelqu'un en remettra « juste pour tester ». Ce
 * test fait de l'absence de secret un INVARIANT — un `add SESSION_SECRET "..."` réintroduit fait
 * échouer la CI, avant le commit, pas deux mois après.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const RACINE = process.cwd()

/** Fichiers réellement suivis par git — on n'audite pas ce qui n'est pas versionné. */
function fichiersSuivis(): string[] {
  return execFileSync('git', ['ls-files', 'scripts/', '*.sh', '*.env.example'], {
    cwd: RACINE,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
}

/**
 * Motifs de VRAIS secrets — valeur littérale, pas un nom de variable ni une référence env.
 * On cible les affectations de type `X="valeur"` où la valeur ressemble à un secret.
 */
const MOTIFS: { nom: string; re: RegExp }[] = [
  // URL avec identifiants : mysql://user:MOTDEPASSE@host, redis://:MOTDEPASSE@host
  { nom: 'URL avec mot de passe', re: /(mysql|redis|postgres|mongodb):\/\/[^\s"']*:[^\s"'@]{6,}@/ },
  // Clé/secret affecté à une valeur littérale d'apparence aléatoire (≥ 20 car. base64-ish).
  // Le séparateur peut être `=`, `:` OU une ESPACE — c'est le cas de `add SESSION_SECRET "..."`,
  // la forme exacte de l'incident GUIC-625, que la version `[:=]` ratait.
  { nom: 'secret affecté en dur', re: /(SECRET|_KEY|PASSWORD|TOKEN)[A-Z_]*\s*[:=]?\s*["'][A-Za-z0-9+/=_-]{20,}["']/i },
]

/**
 * Une valeur est TOLÉRÉE si elle référence l'environnement ou est manifestement un exemple.
 * Sans ça, `MYSQL_PWD="$DB_PASS"` ou `SECRET="<votre-secret>"` seraient de faux positifs.
 */
function estTolere(ligne: string, fichier: string): boolean {
  // Les fichiers d'EXEMPLE contiennent par nature des valeurs de démonstration.
  if (/\.example$/.test(fichier)) return true
  // Références d'environnement, placeholders, et mots de passe de DÉVELOPPEMENT LOCAL connus
  // (jamais des secrets de production — ceux-là sont dans le fichier hors dépôt).
  return /\$\{?[A-Z_]|process\.env|<[^>]+>|example|CHANGE|xxx+|your[-_]|placeholder|:-root\}|:-guichet|guichet_dev_password|drupal_user:password|localhost|127\.0\.0\.1/i.test(ligne)
}

describe('GUIC-625 — pas de secret en clair dans les fichiers suivis', () => {
  const suivis = fichiersSuivis()

  it('inspecte réellement des fichiers (garde-fou anti-faux-vert)', () => {
    expect(suivis.length).toBeGreaterThan(5)
    expect(suivis).toContain('scripts/vercel-env-setup.sh')
  })

  it('aucun secret en clair dans les scripts et templates', () => {
    const trouvailles: string[] = []

    for (const fichier of suivis) {
      const contenu = readFileSync(join(RACINE, fichier), 'utf8').split('\n')
      contenu.forEach((ligne, i) => {
        if (estTolere(ligne, fichier)) return
        for (const { nom, re } of MOTIFS) {
          if (re.test(ligne)) {
            trouvailles.push(`${fichier}:${i + 1} — ${nom} : ${ligne.trim().slice(0, 70)}`)
          }
        }
      })
    }

    // Message actionnable : la liste exacte, fichier:ligne.
    expect(trouvailles).toEqual([])
  })
})
