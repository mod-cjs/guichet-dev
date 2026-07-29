/* eslint-disable */
// Dashboard Bénéficiaire — version TABLETTE (834×1112, iPad portrait).
// Démontre le breakpoint intermédiaire : rail d'icônes 76px + contenu 2 colonnes.
// Réutilise WebOppCard (web-dashboard.jsx) — charger APRÈS web-dashboard.jsx.

const tabletRailItems = [
  ["i-home", "Accueil", true],
  ["i-target", "Opportunités", false],
  ["i-calendar", "Événements", false],
  ["i-resources", "Ressources", false],
  ["i-employment", "Candidatures", false],
  ["i-profile", "Profil", false],
];

const TabletRail = () => (
  <aside style={{ width: 76, flexShrink: 0, background: "linear-gradient(180deg, var(--gj-teal-deep), var(--gj-ink-teal))", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 6 }}>
    <span style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,.14)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
      <img src="assets/logo-symbole-blanc.png" alt="Guichet Jeunesse" style={{ width: 30, height: 30, objectFit: "contain" }} />
    </span>
    {tabletRailItems.map(([ic, label, act]) => (
      <button key={label} aria-label={label} style={{ width: 52, height: 52, borderRadius: 13, border: 0, cursor: "pointer", background: act ? "rgba(255,255,255,.18)" : "transparent", color: act ? "#fff" : "rgba(255,255,255,.62)", display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {act && <span style={{ position: "absolute", left: -12, top: 13, bottom: 13, width: 4, borderRadius: 999, background: "var(--gj-yellow)" }} />}
        <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + ic} /></svg>
      </button>
    ))}
    <span style={{ flex: 1 }} />
    <button aria-label="Réglages d'accessibilité" onClick={() => window.gjOpenA11y && window.gjOpenA11y()} style={{ width: 52, height: 52, borderRadius: 15, border: "2px solid var(--gj-yellow)", cursor: "pointer", background: "var(--gj-ink-teal)", color: "var(--gj-yellow)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg className="gj-icon" style={{ width: 24, height: 24 }}><use href="#i-inclusion" /></svg>
    </button>
  </aside>
);

const TabletTopBar = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", background: "#fff", borderBottom: "1.5px solid var(--gj-line)", flexShrink: 0 }}>
    <div>
      <div style={{ fontSize: 19, fontWeight: 900, color: "var(--gj-ink)" }}>Salut Awa 👋🏾</div>
      <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>Tambacounda · profil 72 %</div>
    </div>
    <span style={{ flex: 1 }} />
    <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", minHeight: 44, width: 240, color: "var(--gj-grey-2)", fontSize: 13 }}>
      <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-search" /></svg>Rechercher…
    </div>
    <button aria-label="Notifications" style={{ width: 44, height: 44, borderRadius: 12, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-ink)", cursor: "pointer", position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-bell" /></svg>
      <span style={{ position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: "50%", background: "var(--gj-red)", border: "2px solid #fff" }} />
    </button>
    <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15 }}>AD</span>
  </div>
);

const TabletDashboard = () => (
  <div style={{ width: 834, height: 1112, display: "flex", background: "var(--gj-bg)", overflow: "hidden", fontFamily: "var(--gj-font-sans)" }}>
    <TabletRail />
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      <TabletTopBar />
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>

        {/* bandeau progression + prochain rdv : 2 colonnes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))", color: "#fff", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", right: -34, top: -40, width: 130, height: 130, background: "radial-gradient(circle, rgba(248,163,9,.22), transparent 60%)", pointerEvents: "none" }} />
            <div style={{ fontSize: 13.5, fontWeight: 900 }}>Complète ton profil</div>
            <div style={{ fontSize: 11.5, opacity: .88, marginTop: 3, lineHeight: 1.45 }}>Ajoute ton CV pour débloquer les recommandations.</div>
            <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.22)", marginTop: 12 }}>
              <span style={{ display: "block", width: "72%", height: "100%", borderRadius: 999, background: "var(--gj-yellow)" }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 6 }}>72 %</div>
          </div>
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 13, alignItems: "center" }}>
            <span style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "var(--gj-yellow-soft)", color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-calendar" /></svg></span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: "var(--gj-ink)" }}>Atelier CV — jeudi 10h</div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>Centre CJS Tambacounda · place confirmée</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-teal-deep)", marginTop: 5 }}>Voir ma carte CJS →</div>
            </div>
          </div>
        </div>

        {/* recommandations : grille 2 colonnes (vs 3 sur desktop, 1 sur mobile) */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 900, color: "var(--gj-ink)" }}>Recommandé pour toi</h2>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-teal-deep)", marginLeft: "auto", cursor: "pointer" }}>Tout voir →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <WebOppCard tag="Formation" tagTone="success" title="Bootcamp Data Analyst — Force-N" org="Force-N · Dakar (hybride)" meta={[{ icon: "i-calendar", label: "6 mois" }, { icon: "i-target", label: "Gratuit" }]} match="92 % de match" cta="Voir l'offre" />
            <WebOppCard tag="Emploi" tagTone="info" title="Assistante logistique — PME agroalimentaire" org="Sodefitex · Tambacounda" meta={[{ icon: "i-calendar", label: "CDD 12 mois" }]} match="87 % de match" cta="Voir l'offre" />
            <WebOppCard tag="Bourse" tagTone="partner" title="Bourse d'excellence — Master agro-économie" org="UGB · Saint-Louis" meta={[{ icon: "i-calendar", label: "Clôture 28 juil." }]} match="81 % de match" cta="Voir l'offre" />
            <WebOppCard tag="Atelier CJS" tagTone="cjs" title="Atelier pitch & entretien d'embauche" org="Centre CJS Tambacounda" meta={[{ icon: "i-calendar", label: "Mar. 22 juil. · 15h" }]} cta="Réserver ma place" />
          </div>
        </div>

        {/* suivi candidatures compact */}
        <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 12 }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 900, color: "var(--gj-ink)" }}>Mes candidatures</h2>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-teal-deep)", marginLeft: "auto", cursor: "pointer" }}>Tout voir →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            {[
              ["Stage assistante data — Sonatel", "Entretien mar. 15 juil.", "var(--gj-yellow-soft)", "var(--gj-yellow-ink)", "Entretien"],
              ["Volontariat croix-rouge — Tamba", "Dossier en présélection", "var(--gj-teal-soft)", "var(--gj-teal-deep)", "En cours"],
            ].map(([titre, sub, bg, ink, st], i) => (
              <div key={titre} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: i > 1 ? "1px solid var(--gj-line)" : 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{sub}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: bg, color: ink, flexShrink: 0 }}>{st}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  </div>
);

Object.assign(window, { TabletDashboard });
