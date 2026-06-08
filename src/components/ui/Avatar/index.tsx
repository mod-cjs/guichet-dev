import Image from 'next/image'

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

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 32,
  md: 40,
  lg: 64,
}

export function Avatar({ nom, prenom, src, size = 'md' }: AvatarProps) {
  const initiales = `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`
  const alt = [prenom, nom].filter(Boolean).join(' ') || 'Avatar'
  const px = SIZE_PX[size]
  return (
    <div className={`${SIZES[size]} rounded-full bg-gj-teal flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {src
        ? <Image src={src} alt={alt} width={px} height={px} className="w-full h-full object-cover" />
        : <span className="font-bold text-white">{initiales || '?'}</span>
      }
    </div>
  )
}
