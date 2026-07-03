import sanitizeHtml from 'sanitize-html'
import { RICH_ALLOWED_TAGS, isRichHtml } from '@/lib/rich-html'

/**
 * GUIC-506 — Sanitisation serveur du contenu riche (Tiptap → HTML).
 *
 * Le corps descriptif des contenus (opportunités, événements, ressources, offres
 * recruteur…) est saisi par des tiers. On applique une liste blanche STRICTE avant
 * toute persistance : seule la mise en forme bridée CJS est conservée, tout le reste
 * (scripts, handlers, styles inline, iframes…) est neutralisé.
 *
 * `sanitize-html` (pur JS, sans jsdom) tourne côté serveur — la sanitisation se fait
 * à l'écriture, jamais au rendu. Aligné sur l'éditeur `RichTextEditor` (mêmes nodes/marks).
 * `isRichHtml` est réexporté depuis `rich-html.ts` (pur, client-safe) pour rétro-compat.
 */

export { isRichHtml }

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...RICH_ALLOWED_TAGS],
  // Aucun `style`/`class`/`on*` (pas de police/couleur libre — bridage CJS).
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    // Cases à cocher (task list) : structure Tiptap + case NON interactive à l'affichage.
    ul: ['data-type'],
    li: ['data-type', 'data-checked'],
    input: ['type', 'checked', 'disabled'],
  },
  // Liens : http/https/mailto uniquement — bloque javascript:, etc.
  allowedSchemes: ['http', 'https', 'mailto'],
  // Images : https/http uniquement — bloque data:text/html et data: non contrôlé.
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    // Durcit chaque lien sortant : nouvelle fenêtre + rel sûr.
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
    // Case à cocher : on force type=checkbox + disabled (jamais interactive côté lecteur,
    // jamais de <input type="text"> ou autre injecté). L'état coché est conservé via data-checked.
    input: sanitizeHtml.simpleTransform('input', { type: 'checkbox', disabled: 'disabled' }, true),
  },
}

/**
 * Nettoie un fragment HTML produit par l'éditeur riche.
 * Renvoie une chaîne vide pour toute entrée vide/nulle.
 */
export function sanitizeRichHtml(input: string | null | undefined): string {
  if (!input) return ''
  return sanitizeHtml(input, OPTIONS).trim()
}
