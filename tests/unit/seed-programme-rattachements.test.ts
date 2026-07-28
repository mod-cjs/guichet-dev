/**
 * GUIC-684 — Règles de rattachement appliquées au seed.
 *
 * Sans elles, `prisma db seed` produit une base entièrement orpheline : le
 * rattachement étant obligatoire à la création, l'admin d'un environnement neuf
 * (CI, préprod, poste d'un nouveau dev) est bloqué dès la première fiche ouverte.
 *
 * Les règles doivent rester alignées sur `scripts/sql/attach-programmes-enriched.sql`
 * pour que le seed et le dataset enrichi racontent la même histoire.
 */
import {
  programmePourOpportunite,
  programmePourRessource,
} from '../../prisma/seed/programme-rattachements'

describe('programmePourOpportunite', () => {
  it('classe par type quand le domaine n’est pas discriminant', () => {
    expect(programmePourOpportunite('Emploi', 'Numerique')).toBe('yjc')
    expect(programmePourOpportunite('Stage', 'Sante')).toBe('yjc')
    expect(programmePourOpportunite('Formation', 'Numerique')).toBe('edupop')
    expect(programmePourOpportunite('Bourse', 'Sante')).toBe('edupop')
  })

  it('le domaine prime sur le type — une offre agricole relève de YEAH', () => {
    expect(programmePourOpportunite('Emploi', 'Agriculture')).toBe('yeah')
    expect(programmePourOpportunite('Formation', 'Environnement')).toBe('yeah')
    expect(programmePourOpportunite('Emploi', 'Entrepreneuriat')).toBe('yaakaar')
  })

  it('retombe sur Yaakaar plutôt que de laisser un contenu sans programme', () => {
    expect(programmePourOpportunite('Volontariat', 'Autre')).toBe('yaakaar')
  })
})

describe('programmePourRessource', () => {
  it('classe par thème éditorial, insensible à la casse', () => {
    expect(programmePourRessource('Emploi')).toBe('yjc')
    expect(programmePourRessource('ENTREPRENEURIAT')).toBe('yaakaar')
    expect(programmePourRessource('Agriculture durable')).toBe('yeah')
    expect(programmePourRessource('Soft skills')).toBe('edupop')
  })
})
