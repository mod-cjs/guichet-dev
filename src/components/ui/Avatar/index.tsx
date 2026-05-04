interface AvatarProps {
  nom?: string
  prenom?: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'w-8 h-8 text-fs-200',
  md: 'w-10 h-10 text-fs-300',
  lg: 'w-16 h-16 text-fs-500',
}

export function Avatar({ nom, prenom, src, size = 'md' }: AvatarProps) {
  const initiales = `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`
  return (
    <div className={`${SIZES[size]} rounded-full bg-gj-teal flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {src
        ? <img src={src} alt={`${prenom} ${nom}`} className="w-full h-full object-cover" />
        : <span className="font-bold text-white">{initiales || '?'}</span>
      }
    </div>
  )
}
