'use client'

import { useEffect, useRef, useState } from 'react'

export interface CentresMapGoogleCentre {
  id: string
  nom: string
  latitude: number
  longitude: number
}

export interface CentresMapGoogleListItem {
  id: string
  nom: string
  region: string
  slug: string
}

export interface CentresMapGoogleProps {
  centres: CentresMapGoogleCentre[]
  activeId?: string
  onPinClick?: (id: string) => void
  /** Hauteur de la carte en px. Défaut : 460. */
  height?: number
  /** Zoom initial. Défaut : 6 (Sénégal entier). */
  zoom?: number
  className?: string
  /** Liste a11y alternative à la carte — toujours rendue dans le DOM. */
  centresForList: CentresMapGoogleListItem[]
}

const DEFAULT_CENTER = { lat: 14.7, lng: -14.5 } // Centre approximatif du Sénégal

/**
 * <CentresMapGoogle> — wrapper Google Maps JS API pour les vues `all` et
 * landing mobile. ADR-004.
 *
 * - Import dynamique de `@googlemaps/js-api-loader` (lazy)
 * - Skeleton de chargement avant init
 * - Liste a11y rendue en parallèle (sr-only quand carte chargée, visible
 *   sinon — fournit l'alternative texte obligatoire)
 * - Si `NEXT_PUBLIC_GOOGLE_MAPS_KEY` absente : warn console + fallback liste
 * - Si erreur runtime Google Maps : affiche un message + la liste
 */
export function CentresMapGoogle({
  centres,
  activeId,
  onPinClick,
  height = 460,
  zoom = 6,
  className = '',
  centresForList,
}: CentresMapGoogleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // markers conservés pour cleanup (mapInstance pas nécessaire — pas de destroy explicite en GMaps).
    const markers: unknown[] = []

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) {
      console.warn(
        '[CentresMapGoogle] NEXT_PUBLIC_GOOGLE_MAPS_KEY manquante — fallback liste a11y',
      )
      setError('Carte indisponible, voir la liste ci-dessous')
      return
    }

    ;(async () => {
      try {
        const mod = await import('@googlemaps/js-api-loader')
        const Loader = mod.Loader
        const loader = new Loader({ apiKey, version: 'weekly' })
        const google = await loader.load()
        if (cancelled || !containerRef.current) return

        const map = new google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
        })
        void map

        centres.forEach((c) => {
          const marker = new google.maps.Marker({
            position: { lat: c.latitude, lng: c.longitude },
            map,
            title: c.nom,
            label: activeId === c.id ? { text: '★', color: '#fff' } : undefined,
          })
          if (onPinClick) {
            marker.addListener('click', () => onPinClick(c.id))
          }
          markers.push(marker)
        })

        setLoaded(true)
      } catch (e) {
        console.error('[CentresMapGoogle] échec chargement Google Maps', e)
        if (!cancelled) {
          setError('Carte indisponible, voir la liste ci-dessous')
        }
      }
    })()

    return () => {
      cancelled = true
      // Cleanup markers + map — Google Maps n'a pas de destroy explicite,
      // null la ref suffit pour permettre le GC.
      markers.length = 0
    }
  }, [centres, activeId, onPinClick, zoom])

  const showSkeleton = !loaded && !error

  return (
    <div className={`relative ${className}`.trim()}>
      {showSkeleton && (
        <div
          aria-hidden="true"
          className="animate-pulse rounded-gj-lg"
          style={{
            height,
            background:
              'linear-gradient(135deg, #E5F0EC 0%, #D6E5E0 50%, #C5DDD8 100%)',
          }}
          data-testid="centres-map-google-skeleton"
        />
      )}

      {!error && (
        <div
          ref={containerRef}
          role="application"
          aria-label="Carte des centres CJS"
          className="rounded-gj-lg overflow-hidden"
          style={{ height, display: showSkeleton ? 'none' : 'block' }}
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-gj-lg p-space-3 text-fs-200"
          style={{
            background: 'var(--gj-bg)',
            border: '1px solid var(--gj-line)',
            color: 'var(--gj-ink)',
          }}
        >
          {error}
        </div>
      )}

      <ul
        aria-label="Liste des centres CJS — alternative à la carte"
        className={loaded && !error ? 'sr-only' : 'mt-space-3 flex flex-col gap-1 text-fs-200'}
      >
        {centresForList.map((c) => (
          <li key={c.id}>
            <a href={`/centres/${c.slug}`} className="underline">
              {c.nom} — {c.region}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
