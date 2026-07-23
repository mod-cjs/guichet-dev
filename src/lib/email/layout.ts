// Habillage HTML des emails Guichet Jeunesse — GUIC-553 évolution.
// ⚠️ Email-safe : tables + styles inline UNIQUEMENT, et couleurs en HEX (les clients
// mail ne supportent pas var(--gj-*) — c'est l'exception documentée à la règle tokens).
// Valeurs alignées sur src/styles/tokens.css : teal #0FA88F · teal-deep #0B7285 ·
// ink #101828 · grey #667085 · bg #F4F7F6 · line #DDE5E1.

/** Enveloppe un corps HTML dans la mise en page CJS (bandeau, carte, pied). */
export function emailLayout(titre: string, corpsHtml: string): string {
  return [
    '<div style="margin:0;padding:24px 12px;background:#F4F7F6;font-family:\'Segoe UI\',system-ui,-apple-system,\'Helvetica Neue\',Arial,sans-serif">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">',
    // Bandeau
    '<tr><td style="background:#0B7285;background:linear-gradient(135deg,#0FA88F,#0B7285);border-radius:14px 14px 0 0;padding:18px 24px">',
    '<span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.2px">Guichet Jeunesse</span>',
    '<span style="color:#CFF2EA;font-size:11px;font-weight:700;display:block;margin-top:2px">Consortium Jeunesse Sénégal</span>',
    '</td></tr>',
    // Carte
    '<tr><td style="background:#ffffff;border:1.5px solid #DDE5E1;border-top:0;padding:26px 24px">',
    `<h1 style="margin:0 0 14px;font-size:19px;line-height:1.3;color:#0B7285;font-weight:800">${titre}</h1>`,
    `<div style="font-size:14px;line-height:1.65;color:#101828">${corpsHtml}</div>`,
    '</td></tr>',
    // Pied
    '<tr><td style="background:#ffffff;border:1.5px solid #DDE5E1;border-top:1px solid #EDF2F0;border-radius:0 0 14px 14px;padding:14px 24px">',
    '<p style="margin:0;font-size:11px;line-height:1.5;color:#667085">',
    'Message envoyé via le Guichet Jeunesse — la plateforme d’opportunités du Consortium Jeunesse Sénégal.',
    '</p>',
    '</td></tr>',
    '</table>',
    '</div>',
  ].join('')
}

/** Le corps d'un template contient-il du HTML (éditeur riche) ? */
export function estHtml(corps: string): boolean {
  return /<[a-z][\s\S]*>/i.test(corps)
}

/** Corps texte simple → paragraphes HTML (compat templates non riches). */
export function texteVersHtml(texte: string): string {
  return texte
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}
