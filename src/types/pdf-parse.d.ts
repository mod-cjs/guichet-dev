// Déclaration minimale pour pdf-parse (pas de @types publiés).
declare module 'pdf-parse' {
  interface PdfParseResult {
    text: string
    numpages: number
    info: unknown
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PdfParseResult>
  export default pdfParse
}
