/**
 * M13 / Data Hub — suffisance du sql_mode serveur (GUIC-696, lot 4, R4).
 *
 * `docker-compose.yml` pose `NO_ZERO_DATE,NO_ZERO_IN_DATE` sur la MariaDB de développement
 * — mais ce fichier ne pilote pas la MariaDB Plesk de préprod/prod. Constat du rapport
 * GUIC-693 : le conteneur `guichet_mariadb` en cours d'exécution avait un sql_mode SANS
 * `NO_ZERO_DATE`. La prévention annoncée n'existait donc pas là où elle compte.
 *
 * `sqlModeSuffisant` est la fonction pure que le pré-vol utilise pour vérifier
 * `SELECT @@sql_mode` — sans elle, un opérateur ne découvre le trou qu'en production,
 * au moment précis où une date corrompue traverse.
 */
import { sqlModeSuffisant } from '@/lib/datahub/sql-mode'

describe('sqlModeSuffisant', () => {
  it('rend true quand les deux garde-fous sont présents', () => {
    expect(
      sqlModeSuffisant('STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ZERO_DATE,NO_ZERO_IN_DATE')
    ).toBe(true)
  })

  it('rend false quand NO_ZERO_DATE manque — le cas réellement rencontré en préprod', () => {
    expect(
      sqlModeSuffisant('STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION')
    ).toBe(false)
  })

  it('rend false quand seul NO_ZERO_IN_DATE est présent — les deux sont requis', () => {
    expect(sqlModeSuffisant('STRICT_TRANS_TABLES,NO_ZERO_IN_DATE')).toBe(false)
  })

  it('rend false quand seul NO_ZERO_DATE est présent', () => {
    expect(sqlModeSuffisant('STRICT_TRANS_TABLES,NO_ZERO_DATE')).toBe(false)
  })

  it('rend false pour une chaîne vide', () => {
    expect(sqlModeSuffisant('')).toBe(false)
  })

  it('est insensible à l\'ordre des modes', () => {
    expect(sqlModeSuffisant('NO_ZERO_IN_DATE,NO_ZERO_DATE,STRICT_TRANS_TABLES')).toBe(true)
  })
})
