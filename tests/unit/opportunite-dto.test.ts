/**
 * @jest-environment node
 *
 * GUIC-184 (M3 v2 — 178c/4) — Tests unitaires couche DTO opportunités.
 *
 * Couvre les 10 sous-types + cas legacy (row non encore migrée) + champs aplatis
 * Data Hub. Voir `src/lib/opportunites/dto.ts`.
 */

import {
  toOpportuniteListItem,
  toOpportuniteListItemArray,
  toOpportuniteDetailDTO,
  toOpportuniteExportDTO,
  toOpportuniteExportDTOArray,
  pickSousType,
  type OpportuniteRow,
} from '@/lib/opportunites/dto'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-01T10:00:00.000Z')
const DEADLINE = new Date('2026-09-01T00:00:00.000Z')

function baseRow(overrides: Partial<OpportuniteRow> = {}): OpportuniteRow {
  return {
    id: 'opp-1',
    drupalNid: null,
    slug: 'mon-opportunite',
    titre: 'Mon opportunité',
    description: 'Description complète.',
    type: 'Stage',
    organisation: 'CJS legacy',
    typeId: null,
    programmeId: null,
    organisationLibelle: null,
    niveauEtudeMin: null,
    domaine: 'Numerique',
    region: 'Dakar',
    organisationId: null,
    remuneration: '50 000 FCFA',
    deadline: DEADLINE,
    lienExterne: null,
    statut: 'publiee',
    recruteurUid: null,
    vues: 7,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  } as OpportuniteRow
}

function typeRef(slug: string, actionLabel = 'Postuler'): OpportuniteRow['typeRef'] {
  return {
    id: `type-${slug}`,
    slug,
    libelle: slug,
    actionLabel,
    requiresFileUpload: slug === 'emploi' || slug === 'stage',
    fileLabel: slug === 'emploi' ? 'CV' : null,
    decisionAuthority: null,
    actif: true,
    ordre: 0,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function progRef(slug: string): NonNullable<OpportuniteRow['programme']> {
  return {
    id: `prog-${slug}`,
    slug,
    nom: `Programme ${slug}`,
    description: 'desc',
    gradientToken: 'from-teal to-yellow',
    actif: true,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

// ─── toOpportuniteListItem ─────────────────────────────────────────────────

describe('toOpportuniteListItem', () => {
  it('préserve la forme du contrat actuel (row legacy)', () => {
    const out = toOpportuniteListItem(baseRow())
    expect(out).toEqual({
      id: 'opp-1',
      slug: 'mon-opportunite',
      titre: 'Mon opportunité',
      type: 'Stage',
      domaine: 'Numerique',
      region: 'Dakar',
      organisation: 'CJS legacy',
      remuneration: '50 000 FCFA',
      deadline: '2026-09-01T00:00:00.000Z',
    })
  })

  it("préfère `organisationLibelle` quand présent (row migrée)", () => {
    const out = toOpportuniteListItem(baseRow({ organisationLibelle: 'CJS officiel' }))
    expect(out.organisation).toBe('CJS officiel')
  })

  it('normalise `deadline` null en null', () => {
    expect(toOpportuniteListItem(baseRow({ deadline: null })).deadline).toBeNull()
  })

  it('mappe un tableau', () => {
    const arr = toOpportuniteListItemArray([baseRow(), baseRow({ id: 'opp-2' })])
    expect(arr).toHaveLength(2)
    expect(arr[1].id).toBe('opp-2')
  })
})

// ─── pickSousType ──────────────────────────────────────────────────────────

describe('pickSousType', () => {
  it('renvoie null pour une row legacy sans sous-type', () => {
    expect(pickSousType(baseRow())).toBeNull()
  })

  it.each([
    ['emploi',          { typeContrat: 'CDI', dureeContratMois: 12, experienceRequise: null, teletravail: true, niveauEtudeMin: 'BAC_PLUS_3' }],
    ['stage',           { dureeMois: 6, conventionneEcole: true, indemnise: true, indemniteMensuelleFcfa: 75000, niveauEtudeMin: 'BAC_PLUS_3', dateDebutPrevue: NOW }],
    ['formation',       { dureeHeures: 80, modalite: 'PRESENTIEL', certifiante: true, organismeCertificateur: 'ISM', prerequis: null, gratuite: false, fraisInscriptionFcfa: 50000 }],
    ['bourse',          { montantTotalFcfa: 1_000_000, dureeMois: 12, niveauEtudeRequis: 'BAC_PLUS_3', paysDestination: 'France', organismeFinanceur: 'AUF', coupleObligatoire: false }],
    ['concours',        { organismeOrganisateur: 'Présidence', dateEpreuves: NOW, lieuEpreuves: 'Dakar', preuvesDemandees: 'CNI', placesDisponibles: 100 }],
    ['appelAProjets',   { budgetMaxFcfa: 5_000_000, dureeProjetMois: 12, thematique: 'Numérique', dossierRequis: 'Pitch', criteresEligibilite: 'Jeunes' }],
    ['financement',     { montantFcfa: 500_000, typeFinancement: 'MICROCREDIT', tauxAnnuel: null, garanties: null, dureeRemboursementMois: 24, organismeFinanceur: 'DER', isContinuous: true, dateLimiteDepot: null }],
    ['mentorat',        { dureeMois: 6, modalite: 'INDIVIDUEL', thematique: 'Entrepreneuriat', placesDisponibles: 10, organisateurLibelle: 'CJS' }],
    ['mobilite',        { destination: 'Maroc', typeMobilite: 'ETUDE', dureeMois: 12, prisEnCharge: 'Hébergement', niveauLangueRequis: 'B2', dateDepartPrevue: NOW }],
    ['volontariat',     { dureeMois: 12, typeVolontariat: 'SERVICE_CIVIQUE', indemniteMensuelleFcfa: 50000, domaineMission: 'Éducation', placesDisponibles: 20 }],
  ])("isole le sous-type %s", (key, payload) => {
    const subKey = key as keyof OpportuniteRow
    const row = baseRow({ [subKey]: { opportuniteId: 'opp-1', ...payload } } as Partial<OpportuniteRow>)
    const sub = pickSousType(row)
    expect(sub).not.toBeNull()
    // Slug discriminant — `appelAProjets` (camelCase relation) → 'appel_a_projets' (slug DTO)
    const expectedSlug = key === 'appelAProjets' ? 'appel_a_projets' : key
    expect(sub!.type).toBe(expectedSlug)
    // `opportuniteId` retiré du payload exposé
    expect((sub!.payload as Record<string, unknown>).opportuniteId).toBeUndefined()
  })
})

// ─── toOpportuniteDetailDTO ────────────────────────────────────────────────

describe('toOpportuniteDetailDTO', () => {
  it('retombe sur les colonnes legacy quand `typeRef` absent', () => {
    const out = toOpportuniteDetailDTO(baseRow())
    expect(out.type).toBe('Stage')
    expect(out.organisation).toBe('CJS legacy')
    expect(out.typeSlug).toBeNull()
    expect(out.actionLabel).toBeNull()
    expect(out.details).toBeNull()
    expect(out.programme).toBeNull()
    expect(out.requiresFileUpload).toBe(false)
    expect(out.skills).toEqual([])
    expect(out.tags).toEqual([])
  })

  it('expose le sous-type + actionLabel + programme + skills/tags quand migrée', () => {
    const row = baseRow({
      organisationLibelle: 'CJS officiel',
      typeRef: typeRef('stage'),
      programme: progRef('yjc'),
      stage: {
        opportuniteId: 'opp-1',
        dureeMois: 6,
        conventionneEcole: true,
        indemnise: true,
        indemniteMensuelleFcfa: 75000,
        niveauEtudeMin: 'BAC_PLUS_3',
        dateDebutPrevue: null,
      },
      skills: [{ opportuniteId: 'opp-1', skillId: 'sk1', requise: true, skill: { id: 'sk1', slug: 'react', libelle: 'React', categorie: null, createdAt: NOW } }],
      tags: [{ opportuniteId: 'opp-1', tagId: 't1', tag: { id: 't1', slug: 'urgent', libelle: 'Urgent', createdAt: NOW } }],
    })
    const out = toOpportuniteDetailDTO(row)
    expect(out.typeSlug).toBe('stage')
    expect(out.actionLabel).toBe('Postuler')
    expect(out.requiresFileUpload).toBe(true)
    expect(out.organisation).toBe('CJS officiel')
    expect(out.programme).toEqual({ slug: 'yjc', nom: 'Programme yjc' })
    expect(out.details).toEqual({
      type: 'stage',
      payload: expect.objectContaining({ dureeMois: 6, conventionneEcole: true }),
    })
    expect(out.skills).toEqual([{ slug: 'react', libelle: 'React', requise: true }])
    expect(out.tags).toEqual([{ slug: 'urgent', libelle: 'Urgent' }])
  })

  // GUIC-684 — rattachement M:N : `programmes` est la nouvelle source, `programme`
  // (singulier) reste servi depuis le PRINCIPAL pour préserver le contrat existant.
  it('expose tous les programmes rattachés et dérive `programme` du principal', () => {
    const row = baseRow({
      typeRef: typeRef('formation'),
      programmes: [
        { principal: false, programme: progRef('edupop') },
        { principal: true, programme: progRef('yeah') },
      ],
    })
    const out = toOpportuniteDetailDTO(row)
    expect(out.programmes).toEqual([
      { slug: 'edupop', nom: 'Programme edupop' },
      { slug: 'yeah', nom: 'Programme yeah' },
    ])
    expect(out.programme).toEqual({ slug: 'yeah', nom: 'Programme yeah' })
  })

  it('retombe sur la colonne dépréciée tant qu’une row n’est pas backfillée', () => {
    const row = baseRow({ typeRef: typeRef('stage'), programme: progRef('yjc') })
    const out = toOpportuniteDetailDTO(row)
    expect(out.programme).toEqual({ slug: 'yjc', nom: 'Programme yjc' })
    expect(out.programmes).toEqual([{ slug: 'yjc', nom: 'Programme yjc' }])
  })
})

// ─── toOpportuniteExportDTO (Data Hub aplati) ──────────────────────────────

describe('toOpportuniteExportDTO', () => {
  it('aplati une row legacy : `type` dérivé en lowercase, toutes les colonnes sous-type à null', () => {
    const out = toOpportuniteExportDTO(baseRow())
    expect(out.type).toBe('stage') // 'Stage' enum → 'stage' slug
    expect(out.programme_slug).toBeNull()
    expect(out.emploi_type_contrat).toBeNull()
    expect(out.stage_duree_mois).toBeNull()
    expect(out.bourse_montant_total_fcfa).toBeNull()
    expect(out.skills).toEqual([])
    expect(out.tags).toEqual([])
  })

  it('aplati un EMPLOI complet avec type slug et préfixes', () => {
    const row = baseRow({
      typeRef: typeRef('emploi'),
      programme: progRef('yaakaar'),
      emploi: {
        opportuniteId: 'opp-1',
        typeContrat: 'CDI',
        dureeContratMois: 24,
        experienceRequise: '2 ans',
        teletravail: true,
        niveauEtudeMin: 'BAC_PLUS_3',
      },
    })
    const out = toOpportuniteExportDTO(row)
    expect(out.type).toBe('emploi')
    expect(out.programme_slug).toBe('yaakaar')
    expect(out.programmes_slugs).toEqual(['yaakaar'])
    expect(out.emploi_type_contrat).toBe('CDI')
    expect(out.emploi_duree_contrat_mois).toBe(24)
    expect(out.emploi_teletravail).toBe(true)
    // Autres sous-types : null
    expect(out.stage_duree_mois).toBeNull()
    expect(out.bourse_montant_total_fcfa).toBeNull()
  })

  it('convertit Decimal `tauxAnnuel` (financement) en number', () => {
    const fakeDecimal = { toNumber: () => 5.5, toString: () => '5.5' }
    const row = baseRow({
      typeRef: typeRef('financement', 'Faire une demande'),
      financement: {
        opportuniteId: 'opp-1',
        montantFcfa: 500_000,
        typeFinancement: 'MICROCREDIT',
        // @ts-expect-error — on simule un Prisma Decimal sans dépendre de la lib.
        tauxAnnuel: fakeDecimal,
        garanties: null,
        dureeRemboursementMois: 24,
        organismeFinanceur: 'DER',
        isContinuous: true,
        dateLimiteDepot: null,
      },
    })
    const out = toOpportuniteExportDTO(row)
    expect(out.financement_taux_annuel).toBe(5.5)
    expect(out.financement_is_continuous).toBe(true)
  })

  it('expose skills/tags en tableaux de slugs', () => {
    const row = baseRow({
      skills: [
        { opportuniteId: 'opp-1', skillId: 'sk1', requise: true, skill: { id: 'sk1', slug: 'react', libelle: 'React', categorie: null, createdAt: NOW } },
        { opportuniteId: 'opp-1', skillId: 'sk2', requise: false, skill: { id: 'sk2', slug: 'python', libelle: 'Python', categorie: null, createdAt: NOW } },
      ],
      tags: [{ opportuniteId: 'opp-1', tagId: 't1', tag: { id: 't1', slug: 'remote', libelle: 'Remote', createdAt: NOW } }],
    })
    const out = toOpportuniteExportDTO(row)
    expect(out.skills).toEqual(['react', 'python'])
    expect(out.tags).toEqual(['remote'])
  })

  it('mappe un tableau', () => {
    const arr = toOpportuniteExportDTOArray([baseRow(), baseRow({ id: 'opp-2' })])
    expect(arr).toHaveLength(2)
    expect(arr[0].id).toBe('opp-1')
  })
})
