// Legacy (v1) — conservés pour compatibilité ascendante
export { DashboardHero }      from './DashboardHero'
export type { DashboardHeroProps } from './DashboardHero'
export { DashboardCompteurs } from './DashboardCompteurs'
export { ActivityFeed }       from './ActivityFeed'
export { DashboardCTACard }   from './DashboardCTACard'

// v2 — refonte dashboard web bénéficiaire (GUIC-196)
export { WebDashHero }                 from './WebDashHero'
export { WebDashKPIs }                 from './WebDashKPIs'
export type { KPIItem }                from './WebDashKPIs'
export { WebDashTracker }              from './WebDashTracker'
export type { TrackerItem }            from './WebDashTracker'
export { WebDashEvents }               from './WebDashEvents'
export type { DashEventItem }          from './WebDashEvents'
export { WebDashCenters }              from './WebDashCenters'
export type { DashCenterItem }         from './WebDashCenters'
export { WebDashProfileNudge }         from './WebDashProfileNudge'
export { WebDashYayePanel }            from './WebDashYayePanel'
export { OpportunitesRecoCarousel }    from './OpportunitesRecoCarousel'
export type { OppRecoCard, OppTone }   from './OpportunitesRecoCarousel'

// Phase 2B/1 — GUIC-187 (dashboard bénéficiaire mobile)
// NB: KPIItem est exporté par WebDashKPIs (v2) ci-dessus ; DashboardKPIs (v1)
// expose le sien en import direct (`./DashboardKPIs`) pour éviter la collision.
export { DashboardKPIs }     from './DashboardKPIs'
export type { DashboardKPIsProps, KPITone } from './DashboardKPIs'
export { DashboardTracker }  from './DashboardTracker'
export type { DashboardTrackerProps } from './DashboardTracker'
export { MiniOppCard }       from './MiniOppCard'
export type { MiniOppCardProps, MiniOpp, MiniOppTone } from './MiniOppCard'
export { YayeNudgeCard }     from './YayeNudgeCard'
export type { YayeNudgeCardProps } from './YayeNudgeCard'
export {
  MOCK_KPIS, MOCK_RECO_OPPS, MOCK_EVENTS, MOCK_CENTRES,
} from './mock-data'
export type { MockEvent, MockCentre } from './mock-data'
