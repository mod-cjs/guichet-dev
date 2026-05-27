/**
 * Exports centralisés des composants layout (refonte v2).
 *
 * Note : seuls les composants stabilisés post-refonte v2 sont ré-exportés
 * ici pour favoriser les imports cohérents. Les autres composants
 * (Header, Footer, AdminSidebar, RecruteurSidebar, UserMenu, MobileAppShell)
 * restent disponibles via leurs chemins directs.
 */
export { AppTopbar } from './AppTopbar'
export type { AppTopbarProps } from './AppTopbar'
export { BottomNav } from './BottomNav'
export { BenefSidebar } from './BenefSidebar'
export type {
  BenefSidebarProps,
  BenefSidebarItem,
  BenefSidebarSection,
} from './BenefSidebar'
export { BenefTopBar } from './BenefTopBar'
export type { BenefTopBarProps } from './BenefTopBar'
