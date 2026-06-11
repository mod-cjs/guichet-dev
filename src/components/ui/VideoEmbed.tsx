/**
 * GUIC-366 — VideoEmbed : iframe responsive 16:9 pour YouTube / Vimeo.
 *
 * À utiliser conjointement avec `parseVideoEmbedUrl` :
 *   const embed = parseVideoEmbedUrl(url)
 *   embed ? <VideoEmbed embedUrl={embed.embedUrl} title={titre} /> : <a …>
 */

export interface VideoEmbedProps {
  embedUrl: string
  title: string
  className?: string
}

export function VideoEmbed({ embedUrl, title, className = '' }: VideoEmbedProps) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ aspectRatio: '16/9' }}
    >
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full rounded-gj-md border-0"
      />
    </div>
  )
}
