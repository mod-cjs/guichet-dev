/**
 * @jest-environment jsdom
 *
 * GUIC-689 (Lot D — états système, D1 mode hors-ligne) : `useOnlineStatus()`
 * doit refléter `navigator.onLine` + les événements `online`/`offline`,
 * sans jamais lire `navigator`/`window` pendant le rendu (SSR-safe).
 */
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function setOnlineState(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value })
}

describe('useOnlineStatus (GUIC-689 — D1)', () => {
  afterEach(() => {
    setOnlineState(true)
  })

  it('reflète "en ligne" quand navigator.onLine est true', () => {
    setOnlineState(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it("reflète l'état hors-ligne initial de navigator.onLine", () => {
    setOnlineState(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it('passe à false quand l\'événement "offline" est émis', () => {
    setOnlineState(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      setOnlineState(false)
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
  })

  it('repasse à true quand l\'événement "online" est émis', () => {
    setOnlineState(false)
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      setOnlineState(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })

  it('retire ses listeners au démontage (pas de fuite)', () => {
    const addSpy = jest.spyOn(window, 'addEventListener')
    const removeSpy = jest.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useOnlineStatus())
    unmount()

    const added = addSpy.mock.calls.filter(([e]) => e === 'online' || e === 'offline').map(([e]) => e).sort()
    const removed = removeSpy.mock.calls.filter(([e]) => e === 'online' || e === 'offline').map(([e]) => e).sort()
    expect(removed).toEqual(added)
    expect(added.length).toBeGreaterThan(0)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
