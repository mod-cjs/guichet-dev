/** @jest-environment jsdom */
/** GUIC-687 — ImageUploadField : upload vers /api/upload/image + aperçu + retrait. */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageUploadField } from '@/components/admin/ImageUploadField'

function pngFile() {
  return new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' })
}

const realFetch = global.fetch
afterEach(() => { global.fetch = realFetch })

describe('ImageUploadField', () => {
  it('sans valeur : bouton « Choisir une image »', () => {
    render(<ImageUploadField value="" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Choisir une image/i })).toBeInTheDocument()
  })

  it('avec valeur : aperçu + Changer + Retirer', () => {
    render(<ImageUploadField value="https://cdn/x.png" onChange={() => {}} />)
    expect(screen.getByAltText(/Aperçu de la ressource/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Changer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retirer/i })).toBeInTheDocument()
  })

  it('upload : POST /api/upload/image puis onChange(url)', async () => {
    const onChange = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ data: { url: 'https://cdn/uploaded.png' } }),
    } as Response)
    render(<ImageUploadField value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/Choisir une image/i), { target: { files: [pngFile()] } })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn/uploaded.png'))
    expect(global.fetch).toHaveBeenCalledWith('/api/upload/image', expect.objectContaining({ method: 'POST' }))
  })

  it('refuse un format non image', () => {
    render(<ImageUploadField value="" onChange={() => {}} />)
    const pdf = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText(/Choisir une image/i), { target: { files: [pdf] } })
    expect(screen.getByRole('alert')).toHaveTextContent(/JPEG, PNG ou WebP/i)
  })

  it('erreur serveur affichée', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, json: async () => ({ error: { message: 'Upload impossible' } }),
    } as Response)
    render(<ImageUploadField value="" onChange={() => {}} />)
    fireEvent.change(screen.getByLabelText(/Choisir une image/i), { target: { files: [pngFile()] } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Upload impossible/i))
  })
})
