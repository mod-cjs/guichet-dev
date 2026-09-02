/**
 * Data Hub — volume de chaque flux, côté Guichet.
 *
 * « Le pipeline n'a pas planté » ne dit pas « le flux contient quelque chose ». Un flux
 * vide se propage silencieusement jusqu'aux tableaux de bord — c'est exactement ce qui a
 * produit `v_programs_summary` en mode dégradé. Le comptage est donc affiché à côté de
 * chaque flux du dictionnaire.
 */
import { compterVolumes, nomDelegue } from '@/lib/datahub/volumes'
import { allDescriptors } from '@/lib/datahub/descriptor'
import { allFullTableDescriptors } from '@/lib/datahub/full-table-descriptor'

describe('Data Hub — nomDelegue', () => {
  it('dérive le délégué Prisma du nom de modèle', () => {
    expect(nomDelegue('Utilisateur')).toBe('utilisateur')
    expect(nomDelegue('AgentCentre')).toBe('agentCentre')
  })
})

describe('Data Hub — compterVolumes', () => {
  /** Client factice : chaque délégué rend un comptage stable, dérivé de son nom. */
  function clientFactice(): Record<string, { count: () => Promise<number> }> {
    const client: Record<string, { count: () => Promise<number> }> = {}
    for (const d of [...allDescriptors(), ...allFullTableDescriptors()]) {
      client[nomDelegue(d.model)] = { count: async () => d.name.length }
    }
    return client
  }

  it('compte TOUS les flux du contrat, incrémentaux et FULL_TABLE', async () => {
    const volumes = await compterVolumes(clientFactice())
    const attendus = [...allDescriptors(), ...allFullTableDescriptors()].map((d) => d.name)

    expect(Object.keys(volumes).sort()).toEqual(attendus.sort())
    expect(volumes.utilisateurs).toBe('utilisateurs'.length)
  })

  it('rend `null` pour un flux dont le comptage échoue plutôt que de tout faire échouer', async () => {
    const client = clientFactice()
    client[nomDelegue(allDescriptors()[0].model)] = {
      count: async () => {
        throw new Error('table verrouillée')
      },
    }

    const volumes = await compterVolumes(client)

    expect(volumes[allDescriptors()[0].name]).toBeNull()
    // Les autres flux restent comptés : une table en erreur n'aveugle pas la page entière.
    expect(volumes[allFullTableDescriptors()[0].name]).toBeGreaterThan(0)
  })
})
