import { render } from '@testing-library/react'

describe('<PhoneFrame /> (dev only)', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: ORIGINAL_ENV,
      configurable: true,
    })
    jest.resetModules()
  })

  it('rend le contenu en NODE_ENV !== production', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true })
    jest.isolateModules(() => {
      // require après mutation pour que le test soit déterministe
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PhoneFrame } = require('@/components/dev/PhoneFrame') as typeof import('@/components/dev/PhoneFrame')
      const { container } = render(
        <PhoneFrame>
          <span data-testid="inner">child</span>
        </PhoneFrame>,
      )
      expect(container.querySelector('[data-phone-frame]')).toBeTruthy()
      expect(container.querySelector('[data-testid="inner"]')).toBeTruthy()
    })
  })

  it('rend null en NODE_ENV production', () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true })
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PhoneFrame } = require('@/components/dev/PhoneFrame') as typeof import('@/components/dev/PhoneFrame')
      const { container } = render(
        <PhoneFrame>
          <span data-testid="inner">child</span>
        </PhoneFrame>,
      )
      expect(container.firstChild).toBeNull()
    })
  })
})
