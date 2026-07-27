/**
 * @jest-environment node
 *
 * GUIC-674 — Sentinelle anti-régression PII : garantit que le SQL d'anonymisation
 * (scripts/sql/anonymize-preprod.sql) supprime bien la PII ET préserve les signaux de matching.
 * Une modif qui casserait l'un ou l'autre est un incident CDP / une perte de valeur Yaye.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const sql = readFileSync(join(process.cwd(), 'scripts/sql/anonymize-preprod.sql'), 'utf8')

describe('anonymize-preprod.sql', () => {
  it('anonymise nom / prénom / e-mail (@example.test) / téléphone des utilisateurs', () => {
    expect(sql).toMatch(/UPDATE utilisateurs[\s\S]*prenom\s*=/)
    expect(sql).toMatch(/@example\.test/)
    expect(sql).toMatch(/telephone\s*=/)
  })

  it('nullifie les texte-libre / fichiers / IP à risque', () => {
    expect(sql).toMatch(/lettre_motivation\s*=\s*NULL/)
    expect(sql).toMatch(/consent_ip\s*=\s*NULL/)
    expect(sql).toMatch(/biographie\s*=\s*NULL/)
  })

  it('PRÉSERVE les signaux de matching Yaye (ne les nullifie jamais)', () => {
    expect(sql).not.toMatch(/competences\s*=\s*NULL/)
    expect(sql).not.toMatch(/domaines_interet\s*=\s*NULL/)
  })
})
