/**
 * GUIC-259 — libellés lisibles des codes d'escalade (raison / signal de danger). Le back
 * stocke des codes machine (`sujet_sensible`, `automutilation_suicide`…) ; l'admin ne doit
 * JAMAIS voir le code brut. Module PUR. Un code inconnu retombe proprement (jamais vide).
 */
import { raisonLabel, dangerLabel, RAISON_LABELS, DANGER_LABELS } from '@/lib/ia/admin/escalade-labels'

describe('GUIC-259 — raisonLabel', () => {
  it('mappe chaque motif connu vers un libellé lisible', () => {
    expect(raisonLabel('sujet_sensible')).toBe('Sujet sensible')
    expect(raisonLabel('demande_complexe')).toBe('Demande complexe')
    expect(raisonLabel('echec_repete')).toBe('Échec répété')
  })
  it('code inconnu → humanisé par défaut (jamais le code brut à underscores)', () => {
    expect(raisonLabel('un_nouveau_motif')).toBe('Un nouveau motif')
  })
  it('null/vide → « — »', () => {
    expect(raisonLabel(null)).toBe('—')
    expect(raisonLabel('')).toBe('—')
  })
})

describe('GUIC-259 — dangerLabel', () => {
  it('mappe les signaux de danger sensibles vers un libellé humain', () => {
    expect(dangerLabel('automutilation_suicide')).toBe('Automutilation / suicide')
    expect(dangerLabel('abus_sexuel')).toBe('Abus sexuel')
    expect(dangerLabel('violence')).toBe('Violence')
  })
  it('code inconnu → humanisé par défaut', () => {
    expect(dangerLabel('autre_chose')).toBe('Autre chose')
  })
  it('tous les codes source ont un libellé explicite (pas de fallback)', () => {
    for (const code of ['violence', 'harcelement', 'abus_sexuel', 'exploitation', 'automutilation_suicide', 'discrimination', 'autre_danger']) {
      expect(DANGER_LABELS[code]).toBeDefined()
    }
    for (const code of ['demande_complexe', 'sujet_sensible', 'demande_explicite', 'echec_repete', 'autre']) {
      expect(RAISON_LABELS[code]).toBeDefined()
    }
  })
})
