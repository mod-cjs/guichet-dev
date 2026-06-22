/* eslint-disable */
// Lot 14 — Shell de la bibliothèque : sommaire par catégorie (sous-pages) + bascule Web/Mobile.

const KIT_CATS = [
  { id: "fondations", label: "Fondations", icon: "i-resources", web: ["Foundations"], mobile: [] },
  { id: "boutons", label: "Boutons & actions", icon: "i-bolt", web: ["Buttons", "ButtonStates"], mobile: ["MobButtons"] },
  { id: "formulaires", label: "Formulaires", icon: "i-document", web: ["FormsKit", "FieldStates", "ControlStates"], mobile: ["MobForms"] },
  { id: "onglets", label: "Onglets & filtres", icon: "i-filter", web: ["Tabs", "Chips"], mobile: ["MobTabsScreen"] },
  { id: "navigation", label: "Navigation", icon: "i-menu", web: ["NavbarSearch", "NavIdentities"], mobile: ["MobNavScreen"] },
  { id: "cartes", label: "Cartes & listes", icon: "i-home", web: ["Cards", "DataComponents"], mobile: ["MobCardsScreen"] },
  { id: "data", label: "Données & progression", icon: "i-trending", web: ["DataViz", "Progress", "KanbanTimeline"], mobile: [] },
  { id: "surfaces", label: "Surfaces & overlays", icon: "i-layers", web: ["Surfaces"], mobile: ["MobSurfaces"] },
  { id: "etats", label: "États & feedback", icon: "i-info", web: ["ChatModalStates"], mobile: [] },
  { id: "signature", label: "Composants signature", icon: "i-pin", web: ["MapsAndCard", "MiscComponents"], mobile: [] },
  { id: "badges", label: "Pastilles & avatars", icon: "i-profile", web: ["Badges", "Avatars"], mobile: [] },
];

// Petits écrans mobiles supplémentaires
const MobButtons = () => (
  <PhoneFrame>
    <AppHeader title="Boutons" onBack={() => {}} />
    <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
      <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-check" /></svg>Primaire pleine largeur</button>
      <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 48, borderRadius: 11, fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Secondaire</button>
      <button style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", border: 0, minHeight: 48, borderRadius: 11, fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Mise en avant</button>
      <div style={{ display: "flex", gap: 9 }}>
        <button style={{ flex: "0 0 auto", width: 52, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 11 }} aria-label="Icône"><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-chat" /></svg></button>
        <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>Action + icône</button>
      </div>
    </div>
    <FooterCTA primary="Bouton de pied de page" />
  </PhoneFrame>
);

const MobForms = () => {
  const cell = (v, foc) => ({ flex: 1, height: 52, borderRadius: 10, border: `1.5px solid ${foc ? "var(--gj-teal-deep)" : "var(--gj-line)"}`, background: foc ? "var(--gj-teal-soft)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "var(--gj-ink)" });
  return (
    <PhoneFrame>
      <AppHeader title="Formulaires" onBack={() => {}} />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)" }}>Champ de saisie</span><input defaultValue="Awa Diop" aria-label="Champ" style={{ minHeight: 48, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", fontSize: 16, fontFamily: "inherit", background: "#fff", outline: "none" }} /></label>
        <div><div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 7 }}>Code OTP</div><div style={{ display: "flex", gap: 7 }}>{[["4", 0], ["1", 0], ["9", 1], ["", 0], ["", 0], ["", 0]].map(([v, f], i) => <div key={i} style={cell(v, f)}>{v}</div>)}</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", minHeight: 48 }}><svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-search" /></svg><span style={{ flex: 1, fontSize: 15, color: "var(--gj-grey-2)" }}>Rechercher…</span></div>
        <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 11, padding: 14, display: "flex", alignItems: "center", gap: 11, background: "#fff" }}><span style={{ width: 38, height: 38, borderRadius: 9, background: "var(--gj-bg)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-upload" /></svg></span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>Téléverser un document</div><div style={{ fontSize: 11, color: "var(--gj-grey)" }}>PDF, JPG</div></div></div>
      </div>
    </PhoneFrame>
  );
};

const MobSurfaces = () => (
  <PhoneFrame>
    <AppHeader title="Feuille montante" onBack={() => {}} />
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--gj-bg)" }}>
      <div style={{ padding: 16 }}><div style={{ height: 12, width: "50%", background: "var(--gj-line)", borderRadius: 4, opacity: .5 }} /></div>
      <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderRadius: "20px 20px 0 0", padding: "10px 16px 18px", boxShadow: "0 -8px 30px rgba(0,0,0,.2)" }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--gj-line-strong)", margin: "0 auto 14px" }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-ink)", marginBottom: 12 }}>Filtrer les résultats</div>
        {["Type de contrat", "Région", "Rémunération"].map((l) => <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid var(--gj-line)" }}><span style={{ fontSize: 14, fontWeight: 700, color: "var(--gj-ink)" }}>{l}</span><svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg></div>)}
        <button style={{ width: "100%", marginTop: 14, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, fontFamily: "inherit" }}>Voir 24 résultats</button>
      </div>
    </div>
  </PhoneFrame>
);

// ===== SHELL =====
const KitApp = () => {
  const [cat, setCat] = React.useState("fondations");
  const [view, setView] = React.useState("web");
  const c = KIT_CATS.find((x) => x.id === cat);
  const names = (view === "web" ? c.web : c.mobile) || [];
  const empty = names.length === 0;

  const sidebar = {
    width: 250, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--gj-line)",
    padding: 14, display: "flex", flexDirection: "column", gap: 2, height: "100%", overflowY: "auto",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", height: "100vh", background: "var(--gj-bg)", fontFamily: "var(--gj-font-sans)" }}>
      <aside style={sidebar}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 6px 13px", borderBottom: "1px solid var(--gj-line)", marginBottom: 8 }}>
          <img src="assets/logo-guichet.png" alt="Guichet Jeunesse" style={{ height: 26 }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-teal-deep)", letterSpacing: ".5px", textTransform: "uppercase", lineHeight: 1.2, borderLeft: "1px solid var(--gj-line)", paddingLeft: 9 }}>Bibliothèque<br />composants</span>
        </div>
        {KIT_CATS.map((k) => {
          const on = k.id === cat;
          return (
            <button key={k.id} onClick={() => setCat(k.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: on ? 800 : 600, color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)", background: on ? "var(--gj-teal-soft)" : "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}>
              <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + k.icon} /></svg>
              <span style={{ flex: 1 }}>{k.label}</span>
              {on && <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-chevron-right" /></svg>}
            </button>
          );
        })}
      </aside>

      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* topbar */}
        <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 28px", minHeight: 66, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 19, fontWeight: 900, color: "var(--gj-ink)" }}>{c.label}</h1>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>Design system Guichet Jeunesse · {view === "web" ? "interface web" : "interface mobile"}</div>
          </div>
          <div style={{ display: "inline-flex", gap: 5, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: 4 }}>
            {[["web", "Web", "i-home"], ["mobile", "Mobile", "i-profile"]].map(([id, label, ic]) => {
              const on = id === view;
              return <button key={id} onClick={() => setView(id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 15px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", border: 0, background: on ? "var(--gj-teal-deep)" : "transparent", color: on ? "#fff" : "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href={"#" + ic} /></svg>{label}</button>;
            })}
          </div>
        </div>

        {/* content */}
        <div style={{ flex: 1, overflowY: "auto", padding: view === "web" ? "24px 28px 60px" : 24 }}>
          {empty ? (
            <div style={{ maxWidth: 760, margin: "40px auto 0", textAlign: "center", color: "var(--gj-grey)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><svg className="gj-icon" style={{ width: 30, height: 30 }}><use href={"#" + c.icon} /></svg></div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gj-ink)" }}>« {c.label} » — composants {view === "web" ? "web" : "mobile"}</div>
              <div style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>Cette catégorie se présente surtout en {view === "web" ? "mobile" : "web"}. Bascule la vue en haut à droite pour la voir.</div>
            </div>
          ) : view === "web" ? (
            <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
              {names.map((n) => { const C = window[n]; return C ? <C key={n} /> : null; })}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
              {names.map((n) => { const C = window[n]; return C ? <div key={n} style={{ transform: "scale(.92)", transformOrigin: "top center" }}><C /></div> : null; })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { KitApp, MobButtons, MobForms, MobSurfaces, KIT_CATS });
