/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JustificatifUpload } from '@/components/centres/JustificatifUpload'

// jsdom n'implémente pas Blob.prototype.arrayBuffer — polyfill minimal pour
// la validation magic-bytes côté JustificatifUpload (lit les 4 premiers octets).
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}

function makeFile(
  bytes: number[],
  name: string,
  type: string,
  sizeBoost = 0,
): File {
  const padded = new Uint8Array(bytes.length + sizeBoost)
  padded.set(bytes, 0)
  return new File([padded], name, { type })
}

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46] // %PDF
const JPEG_HEADER = [0xff, 0xd8, 0xff]
const FAKE_HEADER = [0x00, 0x00, 0x00, 0x00]

describe('<JustificatifUpload />', () => {
  it('rend la dropzone avec label par défaut', () => {
    render(<JustificatifUpload onChange={() => {}} />)
    expect(screen.getByText('Ajouter un document')).toBeInTheDocument()
    expect(screen.getByText(/Facultatif/)).toBeInTheDocument()
  })

  it('label "requise" si required=true', () => {
    render(<JustificatifUpload required onChange={() => {}} />)
    expect(screen.getByText(/requise/i)).toBeInTheDocument()
  })

  it('accepte un PDF valide (magic-bytes OK)', async () => {
    const fn = jest.fn()
    render(<JustificatifUpload onChange={fn} />)
    const input = screen
      .getByLabelText('Parcourir les fichiers')
      .closest('div')!
      .querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile(PDF_HEADER, 'test.pdf', 'application/pdf')
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)
    await waitFor(() => expect(fn).toHaveBeenCalledWith(file))
  })

  it('rejette un fichier au type MIME invalide', async () => {
    const fn = jest.fn()
    render(<JustificatifUpload onChange={fn} />)
    const input = screen
      .getByLabelText('Parcourir les fichiers')
      .closest('div')!
      .querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile(FAKE_HEADER, 'test.txt', 'text/plain')
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/non supporté/i)
    })
    expect(fn).not.toHaveBeenCalled()
  })

  it('rejette un fichier mal renommé (MIME pdf, contenu non PDF)', async () => {
    const fn = jest.fn()
    render(<JustificatifUpload onChange={fn} />)
    const input = screen
      .getByLabelText('Parcourir les fichiers')
      .closest('div')!
      .querySelector('input[type="file"]') as HTMLInputElement
    const file = makeFile(FAKE_HEADER, 'fake.pdf', 'application/pdf')
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/signature/i)
    })
    expect(fn).not.toHaveBeenCalled()
  })

  it('affiche le bouton Retirer quand un fichier est présent', () => {
    const file = makeFile(JPEG_HEADER, 'photo.jpg', 'image/jpeg')
    render(<JustificatifUpload file={file} onChange={() => {}} />)
    expect(screen.getByLabelText('Retirer le fichier')).toBeInTheDocument()
    expect(screen.getByText('photo.jpg')).toBeInTheDocument()
  })
})
