/**
 * GUIC-684 — Filtre du bruit MariaDB dans les migrations générées.
 *
 * POURQUOI CE FILTRE EXISTE : MariaDB n'a pas de type JSON natif — `JSON` y est un
 * alias de `longtext … CHECK (json_valid(col))`. `prisma migrate diff` compare donc
 * un `longtext` (ce que la base contient) à un `Json` (ce que le schéma déclare) et
 * émet un `MODIFY … JSON` pour CHAQUE colonne JSON, à chaque génération, sans fin.
 *
 * Vérifié le 2026-07-28 sur MariaDB 10.11 : appliquer le `MODIFY` ne change
 * strictement rien à la table. Ce n'est donc pas une dérive à réconcilier, c'est un
 * bruit structurel — dont un `DEFAULT []` invalide en MariaDB, qui ferait ÉCHOUER la
 * migration si on la livrait telle quelle.
 *
 * Ces 45 lignes de bruit se sont retrouvées deux fois dans des migrations de ce
 * ticket et ont dû être retirées à la main. D'où ce filtre, et ce test.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const SCRIPT = join(process.cwd(), 'scripts/prisma-filtrer-bruit-mariadb.sh')

/** Passe un SQL dans le filtre et récupère le résultat. */
function filtrer(sql: string): string {
  return execFileSync('bash', [SCRIPT], { input: sql, encoding: 'utf8' })
}

describe('GUIC-684 — filtre du bruit MariaDB', () => {
  it('retire les MODIFY … JSON, qui ne changent rien à la table', () => {
    const out = filtrer(`-- AlterTable
ALTER TABLE \`audit_logs\` MODIFY \`meta\` JSON NULL;

-- CreateTable
CREATE TABLE \`ma_table\` (
    \`id\` VARCHAR(36) NOT NULL
);
`)
    expect(out).not.toMatch(/audit_logs/)
    expect(out).toContain('CREATE TABLE `ma_table`')
  })

  it('retire le MODIFY multi-colonnes (deux colonnes JSON sur la même table)', () => {
    const out = filtrer(`-- AlterTable
ALTER TABLE \`agent_logs\` MODIFY \`payload\` JSON NULL,
    MODIFY \`nodes_returned\` JSON NULL;

-- CreateTable
CREATE TABLE \`x\` (\`id\` VARCHAR(36) NOT NULL);
`)
    expect(out).not.toMatch(/agent_logs/)
    expect(out).toContain('CREATE TABLE `x`')
  })

  it('retire le `DEFAULT []`, qui ferait échouer la migration en MariaDB', () => {
    const out = filtrer(`-- AlterTable
ALTER TABLE \`centres\` MODIFY \`services\` JSON NOT NULL DEFAULT [];

-- CreateTable
CREATE TABLE \`y\` (\`id\` VARCHAR(36) NOT NULL);
`)
    expect(out).not.toMatch(/DEFAULT \[\]/)
    expect(out).toContain('CREATE TABLE `y`')
  })

  it('PRÉSERVE un vrai changement de colonne — le filtre ne doit pas manger le signal', () => {
    const sql = `-- AlterTable
ALTER TABLE \`opportunites\` MODIFY \`titre\` VARCHAR(300) NOT NULL;
`
    expect(filtrer(sql)).toContain('MODIFY `titre` VARCHAR(300)')
  })

  it('PRÉSERVE un DROP COLUMN sur une colonne JSON — ce n’est pas du bruit', () => {
    const sql = `-- AlterTable
ALTER TABLE \`centres\` DROP COLUMN \`services\`;
`
    expect(filtrer(sql)).toContain('DROP COLUMN `services`')
  })
})

describe('GUIC-684 — le piège est documenté', () => {
  it('docs/conventions.md explique pourquoi ce bruit apparaît', () => {
    const doc = readFileSync(join(process.cwd(), 'docs/conventions.md'), 'utf8')
    expect(doc).toMatch(/MariaDB n['’]a pas de type JSON natif/i)
  })
})
