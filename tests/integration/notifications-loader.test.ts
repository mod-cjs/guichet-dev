/**
 * @jest-environment node
 *
 * GUIC-247 — Tests du loader loadNotifications.
 */

const mockFindMany = jest.fn()
const mockCount = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  loadNotifications,
  ageRelatifLabel,
  groupeJourLabel,
} = require('@/lib/loaders/notifications')

const NOW = new Date('2026-06-05T12:00:00Z')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('loadNotifications', () => {
  it('retourne unreadCount = 0 et groupes vide si aucune notif', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    const r = await loadNotifications('uid-1', NOW)
    expect(r.unreadCount).toBe(0)
    expect(r.groupes).toEqual([])
  })

  it('groupe les notifications par jour dans l’ordre attendu', async () => {
    mockCount.mockResolvedValue(2)
    mockFindMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'Deadline',
        titre: 'A',
        contenu: 'c',
        iconName: null,
        lien: null,
        metaPill: null,
        luA: null,
        createdAt: new Date('2026-06-05T11:30:00Z'), // aujourd'hui
      },
      {
        id: 'n2',
        type: 'Message',
        titre: 'B',
        contenu: 'c',
        iconName: null,
        lien: null,
        metaPill: null,
        luA: new Date('2026-06-04T20:00:00Z'),
        createdAt: new Date('2026-06-04T18:00:00Z'), // hier
      },
      {
        id: 'n3',
        type: 'System',
        titre: 'C',
        contenu: 'c',
        iconName: null,
        lien: null,
        metaPill: null,
        luA: null,
        createdAt: new Date('2026-05-20T10:00:00Z'), // plus ancien
      },
    ])
    const r = await loadNotifications('uid-1', NOW)
    expect(r.groupes.map((g: { jour: string }) => g.jour)).toEqual([
      "Aujourd'hui",
      'Hier',
      'Plus ancien',
    ])
    expect(r.groupes[0].items[0].lu).toBe(false)
    expect(r.groupes[1].items[0].lu).toBe(true)
  })

  it('passe cjsUid en filtre, trie par createdAt desc et limite à 200', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await loadNotifications('uid-42', NOW)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cjsUid: 'uid-42' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    )
    expect(mockCount).toHaveBeenCalledWith({
      where: { cjsUid: 'uid-42', luA: null },
    })
  })

  it('expose ageRelatif via ageRelatifLabel', () => {
    const today = new Date('2026-06-05T11:50:00Z')
    expect(ageRelatifLabel(today, NOW)).toMatch(/instant|min/)

    const yesterday = new Date('2026-06-04T18:24:00Z')
    expect(ageRelatifLabel(yesterday, NOW)).toMatch(/^hier · \d{2}:\d{2}$/)
  })

  it('classe correctement les jours via groupeJourLabel', () => {
    expect(groupeJourLabel(new Date('2026-06-05T01:00:00Z'), NOW)).toBe("Aujourd'hui")
    expect(groupeJourLabel(new Date('2026-06-04T23:00:00Z'), NOW)).toBe('Hier')
    expect(groupeJourLabel(new Date('2026-06-01T08:00:00Z'), NOW)).toBe('Cette semaine')
    expect(groupeJourLabel(new Date('2026-05-01T08:00:00Z'), NOW)).toBe('Plus ancien')
  })
})
