/* eslint-disable */
// Lot 10 — Espace Recruteur · shell (RecruteurSidebar accent bleu + RecruteurTopBar).
// Identité distincte : sidebar blanche, accent bleu, chip entreprise.

const RecruteurSidebar = ({ active = "home", onNavChange = () => {} }) => {
  const wrap = { width: 256, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--gj-line)", padding: 14, display: "flex", flexDirection: "column", gap: 2, height: "100%", overflowY: "auto" };
  const brandBox = { display: "flex", alignItems: "center", gap: 9, padding: "4px 6px 13px", borderBottom: "1px solid var(--gj-line)", marginBottom: 10 };
  const companyChip = {
    display: "flex", alignItems: "center", gap: 11, padding: 11, borderRadius: 12, marginBottom: 8,
    background: "linear-gradient(135deg, var(--gj-blue-soft), #fff)", border: "1.5px solid var(--gj-blue)",
  };
  const sectionH = { fontSize: 11, color: "var(--gj-grey)", fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", padding: "14px 10px 5px" };
  const linkBase = { display: "flex", alignItems: "center", gap: 11, padding: "10px", borderRadius: 9, fontSize: 13, color: "var(--gj-grey)", fontWeight: 600, cursor: "pointer", minHeight: 40, background: "transparent", border: 0, textAlign: "left", fontFamily: "inherit", width: "100%" };
  const linkActive = { background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", fontWeight: 800 };
  const badge = (muted) => ({ marginLeft: "auto", background: muted ? "var(--gj-line)" : "var(--gj-blue)", color: muted ? "var(--gj-grey)" : "#fff", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 10 });

  const sections = [
    { items: [{ id: "home", icon: "i-home", label: "Tableau de bord" }] },
    { title: "Recrutement", items: [
      { id: "offers", icon: "i-employment", label: "Mes offres", badge: "2" },
      { id: "pipeline", icon: "i-target", label: "Candidatures", badge: "6", },
      { id: "interviews", icon: "i-calendar", label: "Entretiens", badge: "2", muted: true },
      { id: "messages", icon: "i-chat", label: "Messagerie", badge: "1" },
    ]},
    { title: "Entreprise", items: [
      { id: "company", icon: "i-users", label: "Profil entreprise" },
      { id: "settings", icon: "i-settings", label: "Paramètres" },
    ]},
  ];

  return (
    <aside style={wrap}>
      <div style={brandBox}>
        <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 27, width: "auto" }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-blue-ink)", letterSpacing: ".5px", textTransform: "uppercase", lineHeight: 1.2, borderLeft: "1px solid var(--gj-line)", paddingLeft: 9 }}>Espace<br />recruteur</span>
      </div>

      <div style={companyChip}>
        <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "var(--gj-blue)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>S</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "var(--gj-ink)" }}>{RECRUTEUR.company}</div>
          <div style={{ fontSize: 11, color: "var(--gj-blue-ink)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check-circle" /></svg>Partenaire vérifié
          </div>
        </div>
      </div>

      {sections.map((s, i) => (
        <React.Fragment key={i}>
          {s.title && <div style={sectionH}>{s.title}</div>}
          {s.items.map((item) => {
            const on = item.id === active;
            return (
              <button key={item.id} onClick={() => onNavChange(item.id)} style={{ ...linkBase, ...(on ? linkActive : null) }}>
                <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + item.icon} /></svg>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span style={badge(item.muted)}>{item.badge}</span>}
              </button>
            );
          })}
        </React.Fragment>
      ))}

      <div style={{ marginTop: "auto", padding: 12, background: "var(--gj-blue-soft)", borderRadius: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-blue-ink)" }}>Besoin de profils ?</div>
        <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 3, lineHeight: 1.4 }}>Publie une offre et touche 1 284 jeunes du réseau CJS.</div>
        <button onClick={() => onNavChange("offerForm")} style={{ width: "100%", marginTop: 10, background: "var(--gj-blue)", color: "#fff", border: 0, minHeight: 40, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>+ Nouvelle offre</button>
      </div>
    </aside>
  );
};

const RecruteurTopBar = ({ title, sub }) => (
  <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, minHeight: 64, flexShrink: 0 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      {title && <h1 style={{ fontSize: 18, fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1.2 }}>{title}</h1>}
      {sub && <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>{sub}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", minHeight: 42, width: 260 }}>
      <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
      <input placeholder="Rechercher un candidat…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 13.5, fontFamily: "inherit", color: "var(--gj-ink)" }} />
    </div>
    <button style={{ width: 42, height: 42, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10, color: "var(--gj-grey)", cursor: "pointer", position: "relative", flexShrink: 0 }} aria-label="Notifications">
      <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bell" /></svg>
      <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>6</span>
    </button>
    <span style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, var(--gj-blue), var(--gj-blue-ink))", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{RECRUTEUR.initials}</span>
  </div>
);

Object.assign(window, { RecruteurSidebar, RecruteurTopBar });
