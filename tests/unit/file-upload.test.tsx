import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FileUpload, sanitizeFilename } from '@/components/ui/FileUpload'

function makePdf(name: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'application/pdf' })
}

function pickFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  })
  fireEvent.change(input)
}

describe('sanitizeFilename', () => {
  it('remplace les caractères dangereux par _', () => {
    expect(sanitizeFilename('../bad name.pdf')).toBe('.._bad_name.pdf')
    expect(sanitizeFilename('cv (1) éà.pdf')).toBe('cv__1____.pdf')
    expect(sanitizeFilename('clean-file_2.pdf')).toBe('clean-file_2.pdf')
  })
})

describe('<FileUpload />', () => {
  it('passe un nom de fichier sanitizé à upload()', async () => {
    const upload = jest.fn(async (safeName: string) => ({
      url: 'https://blob/foo',
      name: safeName,
      sizeKb: 1,
    }))
    const { container } = render(<FileUpload upload={upload} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('../bad name.pdf'))
    })
    await waitFor(() => expect(upload).toHaveBeenCalled())
    const safeName = upload.mock.calls[0][0]
    expect(safeName).toBe('.._bad_name.pdf')
    expect(safeName).not.toMatch(/\s|\//)
  })

  it('annonce le fichier chargé via aria-live="polite"', async () => {
    const upload = jest.fn(async (safeName: string) => ({
      url: 'https://blob/foo',
      name: safeName,
      sizeKb: 12,
    }))
    const { container } = render(<FileUpload upload={upload} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('mon-cv.pdf'))
    })
    await waitFor(() =>
      expect(screen.getByText(/CV chargé : mon-cv\.pdf/i)).toBeInTheDocument(),
    )
    const region = container.querySelector('[aria-live="polite"]')
    expect(region).not.toBeNull()
    expect(region?.textContent).toMatch(/CV chargé : mon-cv\.pdf/)
  })

  it('rejette les formats non supportés via role="alert"', async () => {
    const upload = jest.fn()
    const { container } = render(<FileUpload upload={upload} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const bad = new File(['x'], 'pic.png', { type: 'image/png' })
    await act(async () => {
      pickFile(input, bad)
    })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/format non support/i)
    expect(upload).not.toHaveBeenCalled()
  })

  it('rejette les fichiers trop volumineux', async () => {
    const upload = jest.fn()
    const { container } = render(<FileUpload upload={upload} maxBytes={100} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('big.pdf', 500))
    })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/volumineux/i)
    expect(upload).not.toHaveBeenCalled()
  })

  it('expose role="progressbar" pendant l\'upload', async () => {
    let resolveUpload: (v: { url: string; name: string; sizeKb: number }) => void = () => {}
    const upload = jest.fn(
      () =>
        new Promise<{ url: string; name: string; sizeKb: number }>((res) => {
          resolveUpload = res
        }),
    )
    const { container } = render(<FileUpload upload={upload} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      pickFile(input, makePdf('cv.pdf'))
    })
    const bar = await screen.findByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar.getAttribute('aria-valuenow')).not.toBeNull()
    await act(async () => {
      resolveUpload({ url: 'u', name: 'cv.pdf', sizeKb: 1 })
    })
    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
    )
  })
})
