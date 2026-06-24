/**
 * @jest-environment node
 */
import { getProfilePhotoUrl } from './profile-photo'

describe('getProfilePhotoUrl — gate hasPhoto (GUIC-447)', () => {
  it('retourne l\'URL proxy seulement si une photo existe', () => {
    expect(getProfilePhotoUrl('uid-123', true)).toBe('/api/profil/photo/file?cb=uid-123')
  })

  it('retourne undefined si pas de photo (évite le 404 console)', () => {
    expect(getProfilePhotoUrl('uid-123', false)).toBeUndefined()
  })

  it('retourne undefined par défaut (hasPhoto omis)', () => {
    expect(getProfilePhotoUrl('uid-123')).toBeUndefined()
  })

  it('retourne undefined sans cjsUid', () => {
    expect(getProfilePhotoUrl(null, true)).toBeUndefined()
    expect(getProfilePhotoUrl(undefined, true)).toBeUndefined()
  })
})
