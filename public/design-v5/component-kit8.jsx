/* eslint-disable */
// Lot 14 — Compléments mobiles : états de boutons, états de champs,
// surfaces superposées (modale, menu d'actions, toast, hors-ligne).

const k8Sec = { fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" };
const k8Card = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 14, display: "flex", flexDirection: "column", gap: 11 };
const k8Scroll = { flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 16, display: "flex", flexDirection: "column", gap: 16 };

const MobButtonStates = () => (
  <PhoneFrame>
    <AppHeader title="États des boutons" onBack={() => {}} />
    <div style={k8Scroll}>
      <div style={k8Card}>
        <span style={k8Sec}>Action de conversion</span>
        <button style={{ background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit" }}>Repos</button>
        <button style={{ background: "var(--gj-action-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit" }}>Pressé</button>
        <button style={{ background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit", outline: "3px solid var(--gj-action-soft)", outlineOffset: 2 }}>Focus clavier</button>
        <button disabled style={{ background: "var(--gj-line)", color: "var(--gj-grey)", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit" }}>Désactivé</button>
        <button style={{ background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, opacity: .85 }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "#fff" }} />Envoi en cours…
        </button>
      </div>
      <div style={k8Card}>
        <span style={k8Sec}>Bouton flottant & barre d'action</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ width: 56, height: 56, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", boxShadow: "0 8px 22px rgba(2,127,126,.32)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Discuter avec Yaye"><svg className="gj-icon" style={{ width: 24, height: 24 }}><use href="#i-chat" /></svg></button>
          <button style={{ minHeight: 48, borderRadius: 999, border: 0, background: "var(--gj-teal-deep)", color: "#fff", padding: "0 20px", fontWeight: 800, fontSize: 14, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-plus" /></svg>Étendu</button>
        </div>
      </div>
      <div style={k8Card}>
        <span style={k8Sec}>Action destructrice</span>
        <button style={{ background: "#fff", color: "var(--gj-red-ink)", border: "1.5px solid var(--gj-red)", minHeight: 48, borderRadius: 11, fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Retirer ma candidature</button>
      </div>
    </div>
  </PhoneFrame>
);

const MobFieldStates = () => {
  const base = { minHeight: 50, borderRadius: 10, padding: "0 14px", fontSize: 16, fontFamily: "inherit", background: "#fff", outline: "none", width: "100%" };
  const lbl = (t) => <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)" }}>{t}</span>;
  const help = (t, c) => <span style={{ fontSize: 12, color: c, lineHeight: 1.4 }}>{t}</span>;
  return (
    <PhoneFrame>
      <AppHeader title="États des champs" onBack={() => {}} />
      <div style={k8Scroll}>
        <div style={k8Card}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Repos")}<input defaultValue="" placeholder="Ton prénom" style={{ ...base, border: "1.5px solid var(--gj-line)" }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Actif")}<input defaultValue="Awa" style={{ ...base, border: "2px solid var(--gj-teal-deep)", background: "var(--gj-teal-soft)" }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Erreur")}<input defaultValue="77 12" style={{ ...base, border: "2px solid var(--gj-red)" }} />{help("Numéro incomplet — 9 chiffres attendus.", "var(--gj-red-ink)")}</label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Validé")}<span style={{ position: "relative" }}><input defaultValue="77 123 45 67" style={{ ...base, border: "1.5px solid var(--gj-green)", paddingRight: 44 }} /><svg className="gj-icon" style={{ position: "absolute", right: 14, top: 16, width: 18, height: 18, color: "var(--gj-green)" }}><use href="#i-check" /></svg></span></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>{lbl("Désactivé")}<input disabled defaultValue="CJS-2026-04871" style={{ ...base, border: "1.5px solid var(--gj-line)", background: "var(--gj-bg)", color: "var(--gj-grey)" }} /></label>
        </div>
        <div style={k8Card}>
          <span style={k8Sec}>Sélecteur en feuille montante</span>
          <button style={{ ...base, border: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700, color: "var(--gj-ink)", cursor: "pointer" }}>Région · Tambacounda<svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-chevron-down" /></svg></button>
          <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden" }}>
            {["Dakar", "Tambacounda", "Ziguinchor", "Saint-Louis"].map((r, i) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 14px", borderTop: i ? "1px solid var(--gj-line)" : 0, background: r === "Tambacounda" ? "var(--gj-teal-soft)" : "#fff" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", border: r === "Tambacounda" ? 0 : "2px solid var(--gj-line-strong)", background: r === "Tambacounda" ? "var(--gj-teal-deep)" : "#fff", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{r === "Tambacounda" && <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg>}</span>
                <span style={{ fontSize: 15, fontWeight: r === "Tambacounda" ? 800 : 600, color: "var(--gj-ink)" }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={k8Card}>
          <span style={k8Sec}>Interrupteurs & cases</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gj-ink)" }}>Alertes WhatsApp</span>
            <span style={{ width: 48, height: 28, borderRadius: 999, background: "var(--gj-teal-deep)", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", right: 3, top: 3, width: 22, height: 22, borderRadius: "50%", background: "#fff" }} /></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gj-grey)" }}>Notifications par SMS</span>
            <span style={{ width: 48, height: 28, borderRadius: 999, background: "var(--gj-line-strong)", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", left: 3, top: 3, width: 22, height: 22, borderRadius: "50%", background: "#fff" }} /></span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
};

const MobOverlays = () => (
  <PhoneFrame>
    <AppHeader title="Surfaces superposées" onBack={() => {}} />
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--gj-bg)" }}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {[80, 100, 60].map((w, i) => <span key={i} style={{ height: 12, width: w + "%", borderRadius: 5, background: "var(--gj-line)", opacity: .6 }} />)}
      </div>
      {/* bandeau hors-ligne */}
      <div style={{ position: "absolute", top: 10, left: 14, right: 14, zIndex: 95, display: "flex", alignItems: "center", gap: 9, background: "var(--gj-yellow-soft)", border: "1px solid var(--gj-yellow)", borderRadius: 10, padding: "10px 12px" }}>
        <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-yellow-ink)", flexShrink: 0 }}><use href="#i-alert" /></svg>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gj-yellow-ink)", lineHeight: 1.4 }}>Hors ligne — tes actions seront envoyées au retour du réseau.</span>
      </div>
      {/* Confirmation destructrice — patron du produit (candidatures-mobile.jsx) :
          feuille ancrée en bas, poignée, rôle alertdialog, boutons empilés,
          action destructrice en premier. */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(14,31,27,.5)", display: "flex", alignItems: "flex-end", zIndex: 90 }}>
        <div role="alertdialog" aria-label="Confirmer le retrait" style={{ background: "#fff", borderRadius: "18px 18px 0 0", padding: "20px 18px 26px", width: "100%" }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--gj-line-strong)", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-alert" /></svg></span>
            <div>
              <h2 style={{ fontSize: 15.5, fontWeight: 900 }}>Retirer cette candidature ?</h2>
              <p style={{ fontSize: 12.5, color: "var(--gj-grey)", lineHeight: 1.5, marginTop: 5 }}>Action irréversible — le recruteur sera informé.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
            <button style={{ background: "var(--gj-red)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>Retirer définitivement</button>
            <button style={{ background: "#fff", color: "var(--gj-ink)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>Garder ma candidature</button>
          </div>
        </div>
      </div>
      {/* toast */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 268, zIndex: 95, display: "flex", justifyContent: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "var(--gj-ink-teal)", color: "#fff", padding: "11px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--gj-green)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg></span>
          Candidature retirée
        </span>
      </div>
    </div>
  </PhoneFrame>
);

Object.assign(window, { MobButtonStates, MobFieldStates, MobOverlays });
