import type { JsonLdObject } from '@/lib/seo/json-ld'

/**
 * Rend un bloc de données structurées Schema.org (JSON-LD) — GUIC-25 (M7 SEO).
 *
 * Le payload provient exclusivement des helpers de `src/lib/seo/json-ld.ts`
 * (déjà `prune()`é et déterministe). On sérialise avec un échappement de `<`
 * pour empêcher toute fermeture prématurée de la balise `<script>`.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      // Contenu contrôlé (nos helpers), `<` échappé ci-dessus.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
