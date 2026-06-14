'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

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
  /**
   * Désactive les contrôles UI de Google Maps (zoom, streetView, map type).
   * Utile pour les mini-cartes de localisation centre (cf vue détail).
   */
  disableUI?: boolean
  /**
   * Anime un cercle de pulsation autour du marker `activeId`.
   * Utile pour mettre en évidence le centre courant dans la vue détail.
   */
  pulseActiveMarker?: boolean
}

const DEFAULT_CENTER = { lat: 14.7, lng: -14.5 } // Centre approximatif du Sénégal

// GUIC-391 : Google Maps JS API n'accepte que des hex litéraux (pas de CSS vars).
// Source de vérité = `--gj-red` dans `src/styles/tokens.css`. Synchroniser si le token change.
const GJ_RED_HEX = '#D92A1E'

/**
 * <CentresMapGoogle> — wrapper Google Maps JS API pour les vues `all` et
 * landing mobile. ADR-004.
 *
 * - Import dynamique de `@googlemaps/js-api-loader` (lazy)
 * - Skeleton de chargement avant init
 * - Liste a11y rendue en parallèle (sr-only quand carte chargée, visible
 *   sinon — fournit l'alternative texte obligatoire)
 * - Si `NEXT_PUBLIC_GOOGLE_MAPS_KEY` absente : warn console + fallback liste
 * - Si erreur runtime Google Maps : affiche un placeholder visuel + la liste
 *
 * Diagnostic : logs explicites côté browser pour debug Vercel (origine,
 * présence clé, restrictions HTTP referrers GCP).
 */
export function CentresMapGoogle({
  centres,
  activeId,
  onPinClick,
  height = 460,
  zoom = 6,
  className = '',
  centresForList,
  disableUI = false,
  pulseActiveMarker = false,
}: CentresMapGoogleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // markers conservés pour cleanup (mapInstance pas nécessaire — pas de destroy explicite en GMaps).
    const markers: unknown[] = []

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

    // Diagnostic explicite pour debug Vercel (production)
    if (typeof window !== 'undefined') {
      console.info('[CentresMapGoogle] init', {
        hasKey: !!apiKey,
        keyPrefix: apiKey?.slice(0, 8) ?? null,
        centresCount: centres.length,
        origin: window.location.origin,
      })
    }

    if (!apiKey) {
      console.warn(
        '[CentresMapGoogle] NEXT_PUBLIC_GOOGLE_MAPS_KEY absente — fallback liste a11y',
      )
      setError(
        'Clé Google Maps non configurée. Vérifier NEXT_PUBLIC_GOOGLE_MAPS_KEY sur Vercel.',
      )
      return
    }

    ;(async () => {
      try {
        const mod = await import('@googlemaps/js-api-loader')
        const Loader = mod.Loader
        const loader = new Loader({ apiKey, version: 'weekly' })
        const google = await loader.load()
        if (cancelled || !containerRef.current) return

        // Centre la carte sur le centre actif si fourni, sinon sur DEFAULT_CENTER.
        const activeCentre = activeId
          ? centres.find((c) => c.id === activeId)
          : null
        const initialCenter = activeCentre
          ? { lat: activeCentre.latitude, lng: activeCentre.longitude }
          : DEFAULT_CENTER

        const map = new google.maps.Map(containerRef.current, {
          center: initialCenter,
          zoom,
          disableDefaultUI: disableUI,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: !disableUI,
          fullscreenControl: !disableUI,
        })
        void map

        centres.forEach((c) => {
          const marker = new google.maps.Marker({
            position: { lat: c.latitude, lng: c.longitude },
            map,
            title: c.nom,
            // Google Maps label color = hex litéral (var() non supporté par la lib JS).
            label: activeId === c.id ? { text: '★', color: '#FFFFFF' } : undefined,
          })
          if (onPinClick) {
            marker.addListener('click', () => onPinClick(c.id))
          }
          markers.push(marker)
        })

        // Pulsation autour du marker actif — utile pour mettre en évidence
        // le centre courant (cf vue détail). Cercle animé via setInterval qui
        // modifie radius + fillOpacity (alternative HTML overlay = lourd).
        if (pulseActiveMarker && activeCentre) {
          const pulseCircle = new google.maps.Circle({
            map,
            center: { lat: activeCentre.latitude, lng: activeCentre.longitude },
            radius: 80,
            strokeColor: GJ_RED_HEX,
            strokeOpacity: 0.55,
            strokeWeight: 2,
            fillColor: GJ_RED_HEX,
            fillOpacity: 0.2,
          })
          let scale = 0
          const pulseInterval = setInterval(() => {
            if (cancelled) {
              pulseCircle.setMap(null)
              clearInterval(pulseInterval)
              return
            }
            scale = (scale + 1) % 60
            const t = scale / 60
            pulseCircle.setRadius(80 + t * 240)
            pulseCircle.setOptions({
              fillOpacity: 0.25 * (1 - t),
              strokeOpacity: 0.55 * (1 - t),
            })
          }, 40)
          markers.push(pulseCircle)
        }

        setLoaded(true)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[CentresMapGoogle] Échec chargement Google Maps API', {
          error: msg,
          origin:
            typeof window !== 'undefined' ? window.location.origin : 'ssr',
          hint:
            'Vérifier restrictions HTTP referrers sur GCP Console (Maps JavaScript API enabled).',
        })
        if (!cancelled) {
          setError(`Carte indisponible : ${msg}`)
        }
      }
    })()

    return () => {
      cancelled = true
      // Cleanup markers + map — Google Maps n'a pas de destroy explicite,
      // null la ref suffit pour permettre le GC.
      markers.length = 0
    }
  }, [centres, activeId, onPinClick, zoom, disableUI, pulseActiveMarker])

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
              'linear-gradient(135deg, var(--gj-teal-soft) 0%, var(--gj-bg) 50%, var(--gj-teal-soft) 100%)',
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
          data-testid="centres-map-google-error"
          className="rounded-gj-lg"
          style={{
            height,
            background: 'var(--gj-bg)',
            border: '1px dashed var(--gj-line)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            color: 'var(--gj-grey)',
            textAlign: 'center',
          }}
        >
          <Icon name="pin" size={32} aria-hidden="true" />
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)' }}>
            Carte indisponible
          </div>
          <div style={{ fontSize: 12, maxWidth: 320 }}>{error}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Consultez la liste des centres ci-dessous.
          </div>
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
