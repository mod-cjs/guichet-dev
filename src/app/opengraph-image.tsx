import {
  renderOgImage,
  OG_IMAGE_SIZE,
  OG_IMAGE_ALT,
  OG_IMAGE_CONTENT_TYPE,
} from '@/lib/seo/og-image'

// GUIC-25 (M7 SEO) — image OpenGraph par défaut de tout le site (1200×630).
export const alt = OG_IMAGE_ALT
export const size = OG_IMAGE_SIZE
export const contentType = OG_IMAGE_CONTENT_TYPE

export default function OpengraphImage() {
  return renderOgImage()
}
