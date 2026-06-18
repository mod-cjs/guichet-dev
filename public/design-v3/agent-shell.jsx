/* eslint-disable */
// Lot 8 — Espace Conseiller · shell (AgentSidebar foncée + AgentTopBar).
// Identité back-office distincte du bénéficiaire : sidebar ink-teal sombre.

const AgentSidebar = ({ active = "home", onNavChange = () => {} }) => {
  const wrap = {
    width: 260, flexShrink: 0, background: "var(--gj-ink-teal)", color: "#fff",
    borderRight: "1px solid rgba(255,255,255,.08)", padding: 14,
    display: "flex", flexDirection: "column", gap: 2, height: "100%", overflowY: "auto",
  };
  const brandBox = { display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 14px", borderBottom: "1px solid rgba(255,255,255,.1)", marginBottom: 10 };
  const userChip = {
    display: "flex", alignItems: "center", gap: 10, padding: "10px",
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 12, marginBottom: 8,
  };
  const avatar = {
    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
    background: "linear-gradient(135deg, var(--gj-yellow), #E0A93B)",
    color: "var(--gj-ink-teal)", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 13,
  };
  const sectionH = { fontSize: 9.5, color: "rgba(255,255,255,.45)", fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", padding: "14px 10px 5px" };
  const linkBase = {
    display: "flex", alignItems: "center", gap: 11, padding: "10px", borderRadius: 9,
    fontSize: 13, color: "rgba(255,255,255,.72)", fontWeight: 600, cursor: "pointer", minHeight: 40,
    background: "transparent", border: 0, textAlign: "left", fontFamily: "inherit", width: "100%",
  };
  const linkActive = { background: "var(--gj-teal)", color: "#fff", fontWeight: 800, boxShadow: "0 4px 14px rgba(0,178,135,.35)" };
  const badge = (muted) => ({
    marginLeft: "auto", background: muted ? "rgba(255,255,255,.12)" : "var(--gj-yellow)",
    color: muted ? "rgba(255,255,255,.7)" : "var(--gj-ink-teal)",
    fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 10,
  });

  const sections = [
    { items: [{ id: "home", icon: "i-home", label: "Tableau de bord" }] },
    { title: "Activité du centre", items: [
      { id: "resa", icon: "i-calendar", label: "Réservations", badge: "4" },
      { id: "rdv", icon: "i-clock", label: "Agenda & RDV", badge: "5", muted: true },
      { id: "checkin", icon: "i-target", label: "Check-in présence" },
      { id: "messages", icon: "i-chat", label: "Messagerie", badge: "2" },
    ]},
    { title: "Gestion", items: [
      { id: "benef", icon: "i-users", label: "Bénéficiaires", badge: "1 284", muted: true },
      { id: "publish", icon: "i-employment", label: "Publications", badge: "1", muted: true },
    ]},
    { title: "Compte", items: [
      { id: "settings", icon: "i-settings", label: "Paramètres" },
    ]},
  ];

  return (
    <aside style={wrap}>
      <div style={brandBox}>
        <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 28, width: "auto", filter: "brightness(0) invert(1)" }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-yellow)", letterSpacing: ".5px", textTransform: "uppercase", lineHeight: 1.2, borderLeft: "1px solid rgba(255,255,255,.2)", paddingLeft: 9 }}>Espace<br />conseiller</span>
      </div>

      <div style={userChip}>
        <span style={avatar}>{AGENT.initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.2 }}>{AGENT.name}</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)", marginTop: 2 }}>{AGENT.role}</div>
        </div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.8)", background: "rgba(255,255,255,.06)", padding: "7px 10px", borderRadius: 8, marginBottom: 4 }}>
        <svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-yellow)" }}><use href="#i-pin" /></svg>{AGENT.centre}
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

      <div style={{ marginTop: "auto", padding: "11px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, display: "flex", alignItems: "center", gap: 9 }}>
        <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-yellow)", flexShrink: 0 }}><use href="#i-info" /></svg>
        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.7)", lineHeight: 1.4 }}>Centre d'aide & guide conseiller</div>
      </div>
    </aside>
  );
};

const AgentTopBar = ({ title, sub }) => {
  const wrap = {
    background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 24px",
    display: "flex", alignItems: "center", gap: 14, minHeight: 64, flexShrink: 0,
  };
  const iconBtn = {
    width: 42, height: 42, display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10,
    color: "var(--gj-grey)", cursor: "pointer", position: "relative", flexShrink: 0,
  };
  return (
    <div style={wrap}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <h1 style={{ fontSize: 18, fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1.2 }}>{title}</h1>}
        {sub && <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", minHeight: 42, width: 280 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
        <input placeholder="Rechercher un bénéficiaire…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 13.5, fontFamily: "inherit", color: "var(--gj-ink)" }} />
      </div>
      <button style={iconBtn} aria-label="Notifications">
        <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bell" /></svg>
        <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>4</span>
      </button>
      <button style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "0 16px", minHeight: 42, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
        <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-plus" /></svg>Publier
      </button>
    </div>
  );
};

Object.assign(window, { AgentSidebar, AgentTopBar });
