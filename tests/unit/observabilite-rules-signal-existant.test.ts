/**
 * @jest-environment node
 *
 * GUIC-576 — Le fichier `rules.yml` porte lui-même la règle : « ne sont écrites ici que les
 * règles dont le signal existe ». Trouvé en configurant réellement les alertes : la règle
 * `guichet-cron-echecs-repetes` filtre le contenu des logs sur
 * `(?i)(erreur|error|failed|échec)`, mais les scripts ETL (`run-nightly.sh`,
 * `purge-absents-weekly.sh`, via `lib-log.sh`) écrivent « ÉCHOUÉE », « ÉCHOUÉ » et « ÉCART »
 * — trois mots qu'aucun de ces motifs ne matche. Le pipeline ETL durci pendant cette session
 * pouvait donc échouer en silence, sans jamais déclencher d'alerte, malgré Promtail qui
 * étiquette déjà CHAQUE ligne d'échec avec `marqueur="✗"` (le label conçu précisément pour
 * ça, documenté dans promtail.yml : « pour que les règles d'alerte s'y accrochent sans
 * scanner tout le contenu »).
 *
 * Ces tests vérifient que les règles s'appuient sur le label `marqueur`, pas sur une
 * re-détection de contenu qui peut dériver du vocabulaire réel des scripts.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CHEMIN = join(process.cwd(), 'infra/observabilite/grafana/provisioning/alerting/rules.yml')
const contenu = readFileSync(CHEMIN, 'utf8')

describe('GUIC-576 — rules.yml : alertes appuyées sur le label marqueur, pas un motif de contenu fragile', () => {
  it('la règle des échecs de tâches planifiées interroge le label marqueur="✗", pas une regex de mots', () => {
    const bloc = contenu.split('guichet-cron-echecs-repetes')[1]?.split(/- uid:|groups:/)[0] ?? ''
    expect(bloc).toMatch(/marqueur\s*=\s*"✗"/)
  })

  it('une règle dédiée existe pour un échec ETL (nightly/purge), au niveau alerte', () => {
    expect(contenu).toMatch(/uid:\s*guichet-etl-echec/)
    const bloc = contenu.split('guichet-etl-echec')[1]?.split(/- uid:/)[0] ?? ''
    expect(bloc).toMatch(/severite:\s*alerte/)
    // Filtre sur "[datahub]", le marqueur littéral écrit par scripts/etl/lib-log.sh — pas un
    // mot générique, pour ne pas se déclencher sur un échec de cron applicatif sans rapport.
    expect(bloc).toMatch(/\[datahub\]/)
    expect(bloc).toMatch(/marqueur\s*=\s*"✗"/)
  })
})

describe('GUIC-545 — rules.yml : alertes disque/mémoire contre les vrais noms de métriques Netdata', () => {
  function bloc(uid: string): string {
    return contenu.split(`uid: ${uid}`)[1]?.split(/- uid:/)[0] ?? ''
  }

  it('les règles disque interrogent Prometheus, filtrées sur le vrai point de montage racine', () => {
    for (const uid of ['guichet-disque-alerte', 'guichet-disque-avertissement']) {
      const b = bloc(uid)
      expect(b).toMatch(/datasourceUid:\s*prometheus/)
      // mount_point="/" précisément : Netdata expose aussi des pseudo-systèmes de fichiers
      // noyau (efivarfs, bpf, tracefs...) à 0 GiB — les inclure fausserait le taux réel.
      expect(b).toMatch(/mount_point="\/"/)
      expect(b).toMatch(/netdata_disk_space_GiB_average/)
    }
  })

  it('les règles mémoire utilisent la métrique "available", pas used/free bruts (cache récupérable)', () => {
    for (const uid of ['guichet-memoire-alerte', 'guichet-memoire-avertissement']) {
      const b = bloc(uid)
      expect(b).toMatch(/datasourceUid:\s*prometheus/)
      expect(b).toMatch(/netdata_mem_available_MiB_average/)
      // Pas de dimension "used"/"free" ici : piège vécu en réel avec le swap Netdata (99,9 %
      // plein mais 15 Gio disponibles, aucun incident) — available reflète ce que le noyau
      // donnerait réellement à une nouvelle application.
      expect(b).not.toMatch(/dimension="used"/)
      expect(b).not.toMatch(/dimension="free"/)
    }
  })

  it('les règles disque apparient used/avail avec ignoring(dimension) — sinon Prometheus renvoie un vecteur vide', () => {
    // GUIC-712 — vécu en réel (20/08) : une alerte "disque presque plein" arrivait alors que
    // df -h montrait 5% d'usage. Root cause : par défaut Prometheus exige des labels
    // IDENTIQUES des deux côtés d'une opération binaire (sauf __name__) ; dimension="used" et
    // dimension="avail" diffèrent, donc used/(used+avail) ne trouve AUCUNE paire à apparier et
    // renvoie systématiquement un vecteur vide — jamais "parfois", à CHAQUE évaluation.
    // Avec noDataState: Alerting (assertion précédente), une absence de données perpétuelle
    // déclenche l'alerte en continu, sans lien avec le vrai taux de disque. Confirmé sur le
    // serveur : la requête telle qu'écrite renvoie result: [], la même requête avec
    // ignoring(dimension) renvoie la vraie valeur (4.43).
    for (const uid of ['guichet-disque-alerte', 'guichet-disque-avertissement']) {
      const b = bloc(uid)
      expect(b).toMatch(/\/\s*ignoring\(dimension\)/)
      expect(b).toMatch(/\+\s*ignoring\(dimension\)/)
    }
  })

  it('les 4 règles machine sont sévérité alerte/avertissement et alertent en l’absence de données', () => {
    expect(bloc('guichet-disque-alerte')).toMatch(/severite:\s*alerte/)
    expect(bloc('guichet-memoire-alerte')).toMatch(/severite:\s*alerte/)
    expect(bloc('guichet-disque-avertissement')).toMatch(/severite:\s*avertissement/)
    expect(bloc('guichet-memoire-avertissement')).toMatch(/severite:\s*avertissement/)
    // noDataState: Alerting — l'absence de données est en soi un incident de supervision
    // (Prometheus/Netdata injoignables), pas une absence de problème.
    for (const uid of [
      'guichet-disque-alerte',
      'guichet-disque-avertissement',
      'guichet-memoire-alerte',
      'guichet-memoire-avertissement',
    ]) {
      expect(bloc(uid)).toMatch(/noDataState:\s*Alerting/)
    }
  })
})
