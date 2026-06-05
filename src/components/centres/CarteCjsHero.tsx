import { MyCJSCard } from '@/components/ui/MyCJSCard'

export interface CarteCjsHeroProps {
  /** Nom complet du membre (ex : "Awa Diop"). Affiche "Invité·e" si absent. */
  userName?: string | null
  /** Identifiant lisible (ex : "GJS · AD · 23045"). Conservé pour compat — non utilisé : `MyCJSCard` régénère le matricule depuis `cjsUid` / `prenom` / `nom`. */
  memberId?: string
  /** Identifiant SSO du membre — seed du QR + matricule. */
  cjsUid?: string
  /** Centre de rattachement (ex : "CJS Tambacounda"). */
  centre?: string
  /** Date d'activation lisible (ex : "03/2025"). */
  activeSince?: string
}

/**
 * @deprecated — wrapper de compatibilité. Utiliser `<MyCJSCard>` directement
 * (cf. GUIC-248). Cette signature historique (`userName` string) est conservée
 * pour ne pas casser la page `/centres` tant que la migration n'est pas faite.
 */
export function CarteCjsHero({
  userName,
  memberId,
  cjsUid,
  centre,
  activeSince,
}: CarteCjsHeroProps) {
  // Reconstitue prenom/nom depuis le `userName` historique (1ʳᵉ token = prenom).
  const tokens = (userName ?? '').trim().split(/\s+/).filter(Boolean)
  const prenom = tokens[0] ?? ''
  const nom    = tokens.slice(1).join(' ')

  // Seed du QR : priorité au `cjsUid` réel, sinon le `memberId` lisible
  // (ex : "GJS · AD · 23045"), sinon le nom complet, sinon une constante.
  const seed = cjsUid || memberId || userName || 'gjs-anon'

  return (
    <MyCJSCard
      cjsUid={seed}
      prenom={prenom || 'Invité·e'}
      nom={prenom ? nom : ''}
      centre={centre}
      activeSince={activeSince}
    />
  )
}
