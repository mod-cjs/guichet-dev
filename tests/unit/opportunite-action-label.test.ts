/**
 * @jest-environment node
 *
 * CTA propre à chaque type d'opportunité — « carte fortement typée » (design v4).
 * Chaque type porte SON action, jamais un « Candidater » générique.
 */
import type { TypeOpportunite } from '@prisma/client'
import { TYPE_ACTION_LABEL, actionLabelForType } from '@/components/opportunites/opportunite-type-meta'

const ALL_TYPES: TypeOpportunite[] = ['Emploi', 'Stage', 'Formation', 'Bourse', 'Volontariat', 'Appel_a_projets']

describe('actionLabelForType — CTA par type (design v4)', () => {
  it('couvre les 6 types de l’enum, sans trou', () => {
    for (const t of ALL_TYPES) {
      expect(TYPE_ACTION_LABEL[t]).toBeTruthy()
      expect(actionLabelForType(t)).toBe(TYPE_ACTION_LABEL[t])
    }
  })

  it('l’action est spécifique au type (on ne « candidate » pas à une formation)', () => {
    expect(actionLabelForType('Formation')).toBe("S'inscrire")
    expect(actionLabelForType('Emploi')).toBe('Postuler')
    expect(actionLabelForType('Stage')).toBe('Postuler')
    expect(actionLabelForType('Bourse')).toBe('Soumettre un dossier')
    expect(actionLabelForType('Volontariat')).toBe('Rejoindre')
    expect(actionLabelForType('Appel_a_projets')).toBe('Déposer un projet')
  })

  it('type inconnu → repli « Candidater »', () => {
    expect(actionLabelForType('Truc' as TypeOpportunite)).toBe('Candidater')
  })
})
