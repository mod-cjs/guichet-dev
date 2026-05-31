// Programmes CJS — constante typée (décision Q7 REFONTE-V2.md)
// Phase 0 : pas d'entité Prisma dédiée, simple constante.
//
// Note : BRM (Beneficiary Relationship Management) n'est PAS un programme
// sectoriel — c'est un outil interne CJS. Référencé uniquement comme
// plateforme externe via /api/interconnexion/brm.

export type ProgrammeId = 'yaakaar' | 'yeah' | 'yjc' | 'edupop'

export interface Programme {
  id: ProgrammeId
  nom: string
  description: string
  gradientToken: string // var(--prog-*)
}

export const PROGRAMMES: Record<ProgrammeId, Programme> = {
  yaakaar: {
    id: 'yaakaar',
    nom: 'Yaakaar',
    description: 'Programme entrepreneuriat et auto-emploi',
    gradientToken: 'var(--prog-yaakaar)',
  },
  yeah: {
    id: 'yeah',
    nom: 'YEAH',
    description: 'Youth Empowerment for African Health',
    gradientToken: 'var(--prog-yeah)',
  },
  yjc: {
    id: 'yjc',
    nom: 'YJC',
    description: 'Youth Job Connect',
    gradientToken: 'var(--prog-yjc)',
  },
  edupop: {
    id: 'edupop',
    nom: 'EduPop',
    description: 'Éducation populaire',
    gradientToken: 'var(--prog-edupop)',
  },
}

export function getProgramme(id: ProgrammeId | string): Programme | null {
  return id in PROGRAMMES ? PROGRAMMES[id as ProgrammeId] : null
}
