/**
 * M13 / Data Hub — suffisance du sql_mode serveur (lot 4, rapport GUIC-693 R4).
 *
 * `docker-compose.yml` pose `NO_ZERO_DATE,NO_ZERO_IN_DATE` sur la MariaDB de
 * développement, mais ce fichier ne pilote pas la MariaDB Plesk de préprod/prod. Constat
 * du rapport : le conteneur `guichet_mariadb` en cours d'exécution avait un `sql_mode`
 * SANS `NO_ZERO_DATE`. Sans ces deux modes au niveau du SERVEUR, rien n'empêche une
 * insertion de date zéro d'atteindre la base — le pré-vol (§R1) la détecterait après coup,
 * mais la prévention à la source resterait absente.
 *
 * Les deux modes sont requis : `NO_ZERO_DATE` refuse `0000-00-00`, `NO_ZERO_IN_DATE`
 * refuse une seule partie à zéro (`2026-00-15`). L'un sans l'autre laisse un trou.
 */
export function sqlModeSuffisant(mode: string): boolean {
  const modes = new Set(mode.split(',').map((m) => m.trim()))
  return modes.has('NO_ZERO_DATE') && modes.has('NO_ZERO_IN_DATE')
}
