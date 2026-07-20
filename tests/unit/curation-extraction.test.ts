/**
 * GUIC-598 — US-3 : extraction déterministe en cascade (SANS LLM).
 * Fixtures d'octets réels (JSON-LD schema.org, sélecteurs HTML, meta, dates FR).
 */
import { extraireJsonLd } from '@/lib/curation/extraction/jsonld'
import { extraireParSelecteurs } from '@/lib/curation/extraction/selecteurs'
import { extraireMeta } from '@/lib/curation/extraction/meta'
import { parseDateFr } from '@/lib/curation/extraction/dates'
import { extraireOpportunite } from '@/lib/curation/extraction/extract'
import { mapperRegion, mapperDomaine, slugTypeSchemaOrg } from '@/lib/curation/extraction/mapping'
import { nettoyerTexte } from '@/lib/curation/extraction/html-texte'

describe('GUIC-598 — JSON-LD (schema.org JobPosting)', () => {
  const HTML = `<html><head>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": "Développeur backend",
      "description": "<p>Rejoignez notre équipe à Dakar.</p>",
      "validThrough": "2026-09-30",
      "hiringOrganization": { "@type": "Organization", "name": "CJS Tech" },
      "jobLocation": { "address": { "addressRegion": "Dakar" } },
      "industry": "Informatique"
    }
    </script></head><body>...</body></html>`

  it('extrait titre, description, organisation, région, deadline, domaine', () => {
    const c = extraireJsonLd(HTML)
    expect(c.titre).toBe('Développeur backend')
    expect(c.description).toContain('Rejoignez notre équipe')
    expect(c.description).not.toContain('<p>') // HTML nettoyé
    expect(c.organisation).toBe('CJS Tech')
    expect(c.region).toBe('Dakar')
    expect(c.deadline).toBe('2026-09-30')
    expect(c.domaine).toBe('Informatique')
  })

  it('gère un @graph et ignore un JSON-LD invalide sans planter', () => {
    const html = `<script type="application/ld+json">{ CASSÉ }</script>
      <script type="application/ld+json">{"@graph":[{"@type":"Event","name":"Forum emploi","startDate":"2026-08-01"}]}</script>`
    const c = extraireJsonLd(html)
    expect(c.titre).toBe('Forum emploi')
  })

  it('renvoie vide si aucun JSON-LD exploitable', () => {
    expect(extraireJsonLd('<html><body>rien</body></html>')).toEqual({})
  })
})

describe('GUIC-598 — sélecteurs HTML (css-select)', () => {
  const HTML = `<html><body>
    <h1 class="job-title">Stage marketing</h1>
    <div class="org">Agence Baobab</div>
    <span class="deadline" data-date="2026-07-31">31 juillet 2026</span>
    <a class="src" href="https://exemple.sn/postuler">Postuler</a>
  </body></html>`

  it('extrait le texte d’un sélecteur et un attribut via sel@attr', () => {
    const c = extraireParSelecteurs(HTML, {
      titre: '.job-title',
      organisation: '.org',
      deadline: '.deadline@data-date',
    })
    expect(c.titre).toBe('Stage marketing')
    expect(c.organisation).toBe('Agence Baobab')
    expect(c.deadline).toBe('2026-07-31')
  })

  it('ignore un sélecteur sans correspondance', () => {
    expect(extraireParSelecteurs(HTML, { titre: '.introuvable' })).toEqual({})
  })
})

describe('GUIC-598 — meta / og', () => {
  it('extrait og:title et og:description', () => {
    const html = `<head>
      <meta property="og:title" content="Bourse d’excellence">
      <meta name="description" content="Financement master.">
      <title>Page</title></head>`
    const c = extraireMeta(html)
    expect(c.titre).toBe('Bourse d’excellence')
    expect(c.description).toBe('Financement master.')
  })

  it('retombe sur <title> si pas d’og:title', () => {
    expect(extraireMeta('<head><title>Titre page</title></head>').titre).toBe('Titre page')
  })
})

describe('GUIC-598 — dates FR', () => {
  it.each([
    ['31/07/2026', '2026-07-31'],
    ['2026-07-31', '2026-07-31'],
    ['31 juillet 2026', '2026-07-31'],
    ['1er septembre 2026', '2026-09-01'],
  ])('%s → %s', (input, iso) => expect(parseDateFr(input)).toBe(iso))

  it('renvoie null sur texte non daté', () => {
    expect(parseDateFr('bientôt')).toBeNull()
  })

  it('rejette une date calendaire impossible (31/02, 31/04)', () => {
    expect(parseDateFr('31/02/2026')).toBeNull()
    expect(parseDateFr('31/04/2026')).toBeNull()
    expect(parseDateFr('29/02/2024')).toBe('2024-02-29') // bissextile OK
    expect(parseDateFr('29/02/2026')).toBeNull() // non bissextile
  })
})

// ─── Durcissement post-challenge (2026-07-20) ────────────────────────────────

describe('GUIC-598 — mapping texte → enums Guichet (M-2/M-3)', () => {
  it('mappe les régions (insensible aux accents)', () => {
    expect(mapperRegion('Thiès')).toBe('Thies')
    expect(mapperRegion('Saint-Louis')).toBe('Saint_Louis')
    expect(mapperRegion('Dakar, Sénégal')).toBe('Dakar') // match partiel
    expect(mapperRegion('Paris')).toBeUndefined()
  })

  it('mappe les domaines par mots-clés', () => {
    expect(mapperDomaine('Informatique')).toBe('Numerique')
    expect(mapperDomaine('Développeur web full-stack')).toBe('Numerique')
    expect(mapperDomaine('Agroalimentaire')).toBe('Agriculture')
    expect(mapperDomaine('xyz inconnu')).toBeUndefined()
  })

  it('mappe le @type schema.org vers un slug de type', () => {
    expect(slugTypeSchemaOrg('JobPosting')).toBe('emploi')
    expect(slugTypeSchemaOrg('Event')).toBe('evenement')
    expect(slugTypeSchemaOrg('AutreChose')).toBeUndefined()
  })

  it('extraireOpportunite mappe region/domaine et garde le texte brut', () => {
    const html = `<script type="application/ld+json">
      {"@type":"JobPosting","title":"Dev","jobLocation":{"address":{"addressRegion":"Ziguinchor"}},"industry":"Informatique"}</script>`
    const r = extraireOpportunite(html, { url: 'https://x.sn/1' })
    expect(r.champs.region).toBe('Ziguinchor')
    expect(r.champs.domaine).toBe('Numerique')
    expect(r.champs.domaineTexte).toBe('Informatique')
    expect(r.champs.typeSlugSchemaOrg).toBe('emploi') // pas de typeDefautId → déduit du @type
  })
})

describe('GUIC-598 — nettoyerTexte n’est pas contournable (fragment de balise)', () => {
  it('retire un fragment de balise non fermé en fin de champ', () => {
    const out = nettoyerTexte('Offre <img src=x onerror=alert(1)')
    expect(out).not.toContain('<')
    expect(out).not.toContain('onerror=alert') // le fragment dangereux est retiré
  })

  it('neutralise les chevrons résiduels', () => {
    expect(nettoyerTexte('a > b < c')).not.toMatch(/[<>]/)
  })
})

describe('GUIC-598 — cascade + score de complétude', () => {
  it('JSON-LD prioritaire, complété par sélecteurs, lienSource = url', () => {
    const html = `<script type="application/ld+json">
      {"@type":"JobPosting","title":"Data analyst","hiringOrganization":{"name":"CJS"}}</script>
      <div class="secteur">Statistiques</div>`
    const r = extraireOpportunite(html, {
      url: 'https://exemple.sn/offres/1',
      typeDefautId: 'type-emploi',
      champs: { domaine: '.secteur' },
    })
    expect(r.champs.titre).toBe('Data analyst') // JSON-LD gagne
    expect(r.champs.organisation).toBe('CJS')
    expect(r.champs.domaine).toBe('Statistiques') // via sélecteur (absent du JSON-LD)
    expect(r.champs.typeId).toBe('type-emploi')
    expect(r.champs.lienSource).toBe('https://exemple.sn/offres/1')
    expect(r.scoreCompletude).toBeGreaterThan(0)
  })

  it('score reflète le nombre de champs trouvés (0 si page vide)', () => {
    const r = extraireOpportunite('<html><body></body></html>', { url: 'https://x.sn/a' })
    expect(r.scoreCompletude).toBe(0)
    expect(r.champs.lienSource).toBe('https://x.sn/a')
  })
})
