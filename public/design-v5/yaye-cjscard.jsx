/* eslint-disable */
// Lot 15 — Carte CJS affichée à la demande (web : modale ; mobile : bottom-sheet).
// Réutilise MyCJSCard / MyCJSCardBack (cjs-card.jsx) + PhoneFrame.

// ===== WEB : page avec déclencheur + modale carte =====
const CjsOnDemandWeb = () => (
  <div style={{ display: "flex", height: "100%", background: "var(--gj-bg)", overflow: "hidden", fontFamily: "var(--gj-font-sans)", position: "relative" }}>
    <aside style={{ width: 230, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--gj-line)", padding: 14, display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 6px 13px", borderBottom: "1px solid var(--gj-line)", marginBottom: 8 }}><img src="assets/logo-guichet.png" alt="Guichet Jeunesse" style={{ height: 26 }} /></div>
      {[["i-home", "Accueil", false], ["i-pin", "Centres CJS", true], ["i-profile", "Profil", false]].map(([ic, l, on]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: on ? 800 : 600, color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)", background: on ? "var(--gj-teal-soft)" : "transparent" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + ic} /></svg>{l}</div>
      ))}
    </aside>
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", minHeight: 62, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: "var(--gj-ink)" }}>Centres CJS</h1>
        {/* déclencheur — afficher la carte à la demande */}
        <button style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "0 16px", minHeight: 42, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-resources" /></svg>Afficher ma carte CJS</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16, opacity: .55 }}><div style={{ height: 13, width: "70%", background: "var(--gj-bg)", borderRadius: 5, marginBottom: 8 }} /><div style={{ height: 11, width: "45%", background: "var(--gj-bg)", borderRadius: 5 }} /></div>)}
        </div>
      </div>
    </div>
    {/* modale carte */}
    <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, padding: 28 }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "min(460px, 100%)", padding: 22, boxShadow: "0 30px 80px rgba(0,0,0,.4)", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-resources" /></svg></span>
          <div style={{ flex: 1 }}><h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-ink)" }}>Ma carte CJS</h2><div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>Présente le QR à l'accueil d'un centre.</div></div>
          <button style={{ width: 34, height: 34, border: 0, background: "transparent", cursor: "pointer", color: "var(--gj-grey)" }} aria-label="Fermer"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-close" /></svg></button>
        </div>
        <MyCJSCard maxWidth={420} />
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 46, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-arrow-right" /></svg>Voir le verso</button>
          <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 46, padding: "0 16px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-download" /></svg>Ajouter au portefeuille</button>
        </div>
      </div>
    </div>
  </div>
);

// ===== MOBILE : déclencheur + bottom-sheet carte =====
const CjsOnDemandMob = () => (
  <PhoneFrame>
    <AppHeader title="Centres CJS" onBack={() => {}} />
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)", height: "100%" }}>
        {/* bouton déclencheur en avant */}
        <button style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))", color: "#fff", border: 0, borderRadius: 14, padding: "15px 16px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
          <span style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(255,255,255,.14)", color: "var(--gj-yellow)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href="#i-resources" /></svg></span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 900 }}>Afficher ma carte CJS</span><span style={{ display: "block", fontSize: 11.5, color: "rgba(255,255,255,.75)", marginTop: 2 }}>QR de check-in · accès aux centres</span></span>
          <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-yellow)" }}><use href="#i-arrow-right" /></svg>
        </button>
        {[1, 2].map(i => <div key={i} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, opacity: .5 }}><div style={{ height: 12, width: "60%", background: "var(--gj-bg)", borderRadius: 5 }} /></div>)}
      </div>
      {/* overlay + bottom-sheet */}
      <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderRadius: "20px 20px 0 0", padding: "10px 16px 20px", boxShadow: "0 -8px 30px rgba(0,0,0,.22)" }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--gj-line-strong)", margin: "0 auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-resources" /></svg></span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 900, color: "var(--gj-ink)" }}>Ma carte CJS</div><div style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>Présente le QR à l'accueil.</div></div>
          <button style={{ width: 32, height: 32, border: 0, background: "var(--gj-bg)", borderRadius: 8, cursor: "pointer", color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Fermer"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-close" /></svg></button>
        </div>
        <MyCJSCard />
        <button style={{ width: "100%", marginTop: 14, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 48, borderRadius: 11, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-download" /></svg>Ajouter au portefeuille</button>
      </div>
    </div>
    <BottomNav active="centres" />
  </PhoneFrame>
);

Object.assign(window, { CjsOnDemandWeb, CjsOnDemandMob });
