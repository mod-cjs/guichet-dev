/* eslint-disable */
// Dashboard Bénéficiaire — version WEB (desktop).
// Based on canonical ui_kits/utilisateur/index.html — stripped of programme names.

// =====================================================================
// Shared chrome — Sidebar (canonical ProShell pattern adapted for bénéficiaire)
// =====================================================================
const BenefSidebar = ({ active = "home", onNavChange = () => {} }) => {
  const wrap = {
    background: "#fff", borderRight: "1px solid var(--gj-line)",
    padding: "16px 12px", height: "100%",
    display: "flex", flexDirection: "column", gap: 4,
    overflowY: "auto", flexShrink: 0,
  };
  const brandBox = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "4px 6px 16px" };
  const brandSub = { fontSize: 9.5, color: "var(--gj-teal-deep)", letterSpacing: ".5px", textTransform: "uppercase", fontWeight: 800 };

  const userChip = {
    background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)",
    borderRadius: 10, padding: "10px 12px",
    display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
    cursor: "pointer",
  };
  const avatar = {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",
    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 13, flexShrink: 0,
  };
  const userName = { fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.2 };
  const userMeta = { fontSize: 10.5, color: "var(--gj-grey)", marginTop: 2 };

  const sectionH = {
    fontSize: 9.5, color: "var(--gj-grey)", fontWeight: 800,
    letterSpacing: ".4px", textTransform: "uppercase",
    padding: "12px 10px 4px",
  };
  const linkBase = {
    display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
    borderRadius: 8, fontSize: 13, color: "var(--gj-grey)", fontWeight: 600,
    cursor: "pointer", minHeight: 38, transition: ".12s",
    background: "transparent", border: 0, textAlign: "left", fontFamily: "inherit",
    width: "100%",
  };
  const linkActive = { background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", fontWeight: 800 };
  const linkBadge = {
    marginLeft: "auto", background: "var(--gj-red)", color: "#fff",
    fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 10,
  };
  const linkBadgeMuted = {
    marginLeft: "auto", background: "var(--gj-line)", color: "var(--gj-grey)",
    fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 10,
  };

  const sections = [
    { items: [
      { id: "home",    icon: "i-home",    label: "Accueil" },
    ]},
    { title: "Opportunités", items: [
      { id: "opps-all", icon: "i-target",       label: "Toutes",                badge: "1 240", badgeMuted: true },
      { id: "emploi",   icon: "i-employment",   label: "Emploi & Stages",       badge: "428",   badgeMuted: true },
      { id: "bourse",   icon: "i-funding",      label: "Bourses & Financement", badge: "186",   badgeMuted: true },
      { id: "format",   icon: "i-learning",     label: "Formations",            badge: "143",   badgeMuted: true },
      { id: "concours", icon: "i-trending",     label: "Concours & Appels",     badge: "67",    badgeMuted: true },
      { id: "saved",    icon: "i-bookmark",     label: "Mes sauvegardes",       badge: "12",    badgeMuted: true },
    ]},
    { title: "Mon parcours", items: [
      { id: "cand",     icon: "i-document",     label: "Mes candidatures",     badge: "3" },
      { id: "events",   icon: "i-calendar",     label: "Événements & ateliers" },
      { id: "resources",icon: "i-resources",    label: "Ressources" },
      { id: "centres",  icon: "i-pin",          label: "Centres CJS" },
      { id: "messages", icon: "i-chat",         label: "Messagerie",           badge: "2" },
    ]},
    { title: "Mon compte", items: [
      { id: "profile", icon: "i-user",          label: "Mon profil",           badge: "72 %", badgeMuted: true },
      { id: "incl",    icon: "i-eye",           label: "Inclusion & accessibilité" },
      { id: "settings",icon: "i-settings",      label: "Paramètres" },
    ]},
  ];

  // Yaye persistent CTA at bottom of sidebar
  const yayeFoot = {
    marginTop: "auto", padding: "12px 10px",
    background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))",
    borderRadius: 12, color: "#fff",
    display: "flex", flexDirection: "column", gap: 8,
    position: "relative", overflow: "hidden",
  };

  return (
    <aside style={wrap}>
      <div style={brandBox}>
        <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 30, width: "auto" }} />
        <div style={brandSub}>Mon espace</div>
      </div>

      <div style={userChip}>
        <span style={avatar}>AD</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={userName}>Awa Diop</div>
          <div style={userMeta}>Tambacounda · 22 ans</div>
        </div>
        <svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg>
      </div>

      {sections.map((s, i) => (
        <React.Fragment key={i}>
          {s.title && <div style={sectionH}>{s.title}</div>}
          {s.items.map(item => {
            const on = item.id === active;
            return (
              <button key={item.id} onClick={() => onNavChange(item.id)} style={{ ...linkBase, ...(on ? linkActive : null) }}>
                <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + item.icon} /></svg>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span style={item.badgeMuted ? linkBadgeMuted : linkBadge}>{item.badge}</span>}
              </button>
            );
          })}
        </React.Fragment>
      ))}

      <div style={yayeFoot}>
        <span style={{ position: "absolute", right: -40, top: -40, width: 120, height: 120, background: "radial-gradient(circle, rgba(249,196,0,.25), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #19A757, #0A807F)",
            color: "#fff", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 16,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 2px rgba(255,255,255,.2)", flexShrink: 0,
          }}>Y</div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
            <div>
              <span style={{ fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 14, background: "linear-gradient(135deg, #fff, var(--gj-yellow))", WebkitBackgroundClip: "text", color: "transparent" }}>Yaye</span>
              <span style={{ background: "var(--gj-yellow)", color: "var(--gj-teal-deep)", fontSize: 8.5, fontWeight: 900, padding: "1px 5px", borderRadius: 999, marginLeft: 5, letterSpacing: ".3px" }}>IA</span>
            </div>
            <div style={{ fontSize: 10, opacity: .85, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7BE5B5" }} />
              en ligne
            </div>
          </div>
        </div>
        <button style={{
          background: "var(--gj-yellow)", color: "var(--gj-teal-deep)",
          border: 0, padding: "8px 12px", borderRadius: 8,
          fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
          position: "relative",
        }}>Demander à Yaye →</button>
      </div>
    </aside>
  );
};

// Skinny topbar — search + notif bell + chevron menu (sidebar handles brand+user)
const BenefTopBar = () => {
  const wrap = {
    background: "#fff", borderBottom: "1px solid var(--gj-line)",
    padding: "10px 24px", display: "flex", alignItems: "center", gap: 14,
    minHeight: 60, flexShrink: 0,
  };
  const search = {
    flex: 1, maxWidth: 520, display: "flex", alignItems: "center", gap: 8,
    background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)",
    borderRadius: 10, padding: "0 14px", minHeight: 42,
  };
  const iconBtn = {
    width: 42, height: 42, display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10,
    color: "var(--gj-grey)", cursor: "pointer", position: "relative", flexShrink: 0,
  };
  return (
    <div style={wrap}>
      <div style={search}>
        <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
        <input placeholder="Rechercher une opportunité, un centre, un atelier…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)" }} />
        <kbd style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 4, padding: "1px 5px", color: "var(--gj-grey-2)" }}>⌘ K</kbd>
      </div>
      <span style={{ flex: 1 }} />
      <button style={iconBtn} aria-label="Sauvegardés">
        <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bookmark" /></svg>
      </button>
      <button style={iconBtn} aria-label="Notifications">
        <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bell" /></svg>
        <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>3</span>
      </button>
      <button style={iconBtn} aria-label="Aide">
        <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-info" /></svg>
      </button>
    </div>
  );
};

// =====================================================================
// LEGACY top nav kept for backward compat (not used in dashboard anymore)
// =====================================================================
const WebDashTopNav = ({ active = "home", notifBadge = true, onYaye }) => {
  const wrap = {
    background: "#fff",
    borderBottom: "1px solid var(--gj-line)",
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 24px", minHeight: 64, flexShrink: 0,
    position: "sticky", top: 0, zIndex: 30,
  };
  const link = (on) => ({
    padding: "14px 12px", fontSize: 13,
    color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
    fontWeight: on ? 800 : 600,
    borderBottom: `3px solid ${on ? "var(--gj-teal)" : "transparent"}`,
    cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1,
  });
  return (
    <nav style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 30 }} />
      </div>
      <div style={{ display: "flex", gap: 2, flex: "0 1 auto", overflowX: "auto" }}>
        <span style={link(active === "home")}>Accueil</span>
        <span style={link(active === "opps")}>Opportunités</span>
        <span style={link(active === "cand")}>Mes candidatures</span>
        <span style={link(active === "centres")}>Centres CJS</span>
        <span style={link(active === "messages")}>Messagerie</span>
      </div>
      <div style={{
        flex: 1, maxWidth: 420, margin: "0 8px",
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)",
        borderRadius: 10, padding: "0 12px", minHeight: 40,
      }}>
        <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
        <input placeholder="Rechercher une opportunité…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 13, fontFamily: "inherit", color: "var(--gj-ink)" }} />
        <kbd style={{ fontFamily: "ui-monospace,monospace", fontSize: 10, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 4, padding: "1px 5px", color: "var(--gj-grey-2)" }}>⌘ K</kbd>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
        <button onClick={onYaye} style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "5px 12px 5px 5px", background: "var(--gj-teal-deep)",
          color: "#fff", border: 0, borderRadius: 999,
          cursor: "pointer", fontWeight: 800, fontSize: 12,
          fontFamily: "inherit",
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, #19A757 0%, #159D60 50%, #0A807F 100%)",
            color: "#fff", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 14,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 1.5px rgba(255,255,255,.3)", flexShrink: 0,
          }}>Y</span>
          <span>Yaye</span>
          <span style={{ background: "var(--gj-yellow)", color: "var(--gj-teal-deep)", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 999, letterSpacing: ".3px" }}>IA</span>
        </button>
        <button style={{ width: 38, height: 38, borderRadius: 8, border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }} aria-label="Sauvegardés">
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bookmark" /></svg>
        </button>
        <button style={{ width: 38, height: 38, borderRadius: 8, border: 0, background: "transparent", cursor: "pointer", position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }} aria-label="Notifications">
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bell" /></svg>
          {notifBadge && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, background: "var(--gj-red)", borderRadius: "50%", border: "2px solid #fff" }} />}
        </button>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", cursor: "pointer",
          background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",
          color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 13,
        }}>AD</div>
      </div>
    </nav>
  );
};

// =====================================================================
// Greeting hero
// =====================================================================
const WebDashHero = () => {
  const hero = {
    background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)",
    color: "#fff", borderRadius: 16, padding: "24px 28px",
    position: "relative", overflow: "hidden",
    display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center",
  };
  const glow = { position: "absolute", right: -50, top: -50, width: 280, height: 280, background: "radial-gradient(circle, rgba(249,196,0,.18), transparent 60%)", pointerEvents: "none" };
  return (
    <section style={hero}>
      <span style={glow} />
      <div style={{ position: "relative" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, marginBottom: 6 }}>
          Bonjour <span style={{ color: "var(--gj-yellow)" }}>Awa</span>
        </h1>
        <p style={{ fontSize: 14, opacity: .92, lineHeight: 1.55, maxWidth: 580 }}>
          Tu as <b style={{ color: "var(--gj-yellow)" }}>3 candidatures en cours</b> et <b style={{ color: "var(--gj-yellow)" }}>8 opportunités</b> à 80%+ ton profil cette semaine. La bourse agricole ferme dans <b style={{ color: "var(--gj-yellow)" }}>3 jours</b> — on s'y met ?
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={{
            background: "var(--gj-yellow)", color: "var(--gj-ink)",
            padding: "11px 18px", borderRadius: 8, fontWeight: 800, fontSize: 13,
            border: 0, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>Explorer les opportunités <svg className="gj-icon gj-icon--xs"><use href="#i-arrow-right" /></svg></button>
          <button style={{
            background: "rgba(255,255,255,.12)", color: "#fff",
            border: "1.5px solid rgba(255,255,255,.25)",
            padding: "11px 18px", borderRadius: 8, fontWeight: 800, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}><svg className="gj-icon gj-icon--xs"><use href="#i-chat" /></svg> Parler à Yaye</button>
        </div>
      </div>
      <div style={{
        position: "relative", background: "rgba(255,255,255,.08)",
        border: "1px solid rgba(255,255,255,.18)", borderRadius: 14,
        padding: "14px 16px", width: 280, flexShrink: 0,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "linear-gradient(135deg, #19A757, #0A807F)",
            color: "#fff", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 18,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 2px rgba(255,255,255,.2)",
          }}>Y</span>
          <div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 900, fontFamily: "Georgia, serif", background: "linear-gradient(135deg, #fff, var(--gj-yellow))", WebkitBackgroundClip: "text", color: "transparent" }}>Yaye</span>
              <span style={{ background: "var(--gj-yellow)", color: "var(--gj-teal-deep)", fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 999, marginLeft: 6 }}>IA</span>
            </div>
            <div style={{ fontSize: 11, opacity: .85 }}>en ligne · répond en ~3 s</div>
          </div>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, background: "rgba(255,255,255,.06)", padding: "9px 11px", borderRadius: 8 }}>
          « Tu hésites entre le stage et la bourse ? Pose-moi la question. »
        </div>
        <button style={{
          alignSelf: "flex-start", background: "var(--gj-yellow)",
          color: "var(--gj-teal-deep)", padding: "6px 12px",
          borderRadius: 7, fontWeight: 800, fontSize: 11.5,
          border: 0, cursor: "pointer", fontFamily: "inherit",
        }}>Ouvrir le chat →</button>
      </div>
    </section>
  );
};

// =====================================================================
// KPI strip
// =====================================================================
const WebDashKPIs = () => {
  const grid = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 };
  const card = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 16, display: "flex", alignItems: "flex-start", gap: 12 };
  const ic = (tone) => ({
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    background: `var(--gj-${tone}-soft)`,
    color: tone === "yellow" ? "var(--gj-yellow-ink)" : `var(--gj-${tone})`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  });
  return (
    <section style={grid}>
      <div style={card}>
        <span style={ic("teal")}><svg className="gj-icon gj-icon--md"><use href="#i-document" /></svg></span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>3</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 4, fontWeight: 600 }}>Candidatures en cours</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", marginTop: 4 }}>+1 cette semaine</div>
        </div>
      </div>
      <div style={card}>
        <span style={ic("yellow")}><svg className="gj-icon gj-icon--md"><use href="#i-sparkle" /></svg></span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>8</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 4, fontWeight: 600 }}>Opps recommandées</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", marginTop: 4 }}>90%+ match</div>
        </div>
      </div>
      <div style={card}>
        <span style={ic("blue")}><svg className="gj-icon gj-icon--md"><use href="#i-bookmark" /></svg></span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>12</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 4, fontWeight: 600 }}>Sauvegardées</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-red)", marginTop: 4 }}>2 expirent bientôt</div>
        </div>
      </div>
      <div style={card}>
        <span style={ic("red")}><svg className="gj-icon gj-icon--md"><use href="#i-user" /></svg></span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>72&nbsp;%</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 4, fontWeight: 600 }}>Profil complété</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", marginTop: 4 }}>+18% avec ton CV</div>
        </div>
      </div>
    </section>
  );
};

// =====================================================================
// Section helper
// =====================================================================
const SectionH = ({ title, lede, more }) => (
  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 900 }}>{title}</h2>
      {lede && <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>{lede}</div>}
    </div>
    {more && <span style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>{more}</span>}
  </div>
);

// =====================================================================
// Opp card (web) — AppCard v1.5 pattern
// =====================================================================
const WebOppCard = ({ tag, tagTone = "cjs", title, org, meta = [], match, cta, width }) => {
  const tones = {
    urgent: { bg: "var(--gj-red-soft)", fg: "var(--gj-red-ink)" },
    cjs: { bg: "var(--gj-teal-soft)", fg: "var(--gj-teal-deep)" },
    partner: { bg: "var(--gj-yellow-soft)", fg: "var(--gj-yellow-ink)" },
    info: { bg: "var(--gj-blue-soft)", fg: "var(--gj-blue-ink)" },
    success: { bg: "var(--gj-green-soft)", fg: "var(--gj-green-ink)" },
  };
  const t = tones[tagTone] || tones.cjs;
  return (
    <div style={{
      background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12,
      padding: 16, display: "flex", flexDirection: "column", gap: 8,
      width: width || "auto", flexShrink: width ? 0 : undefined,
    }}>
      {tag && <span style={{
        alignSelf: "flex-start", fontSize: 9.5, fontWeight: 800,
        background: t.bg, color: t.fg, padding: "2px 8px",
        borderRadius: 999, letterSpacing: ".4px", textTransform: "uppercase",
      }}>{tag}</span>}
      <div style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.3, color: "var(--gj-ink)" }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "var(--gj-grey)", lineHeight: 1.35 }}>{org}</div>
      {meta.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "var(--gj-grey)", marginTop: 4 }}>
          {meta.map((m, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {m.icon && <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + m.icon} /></svg>}
              {m.label}
            </span>
          ))}
        </div>
      )}
      {match && (
        <span style={{
          alignSelf: "flex-start", fontSize: 9, fontWeight: 800,
          background: "var(--gj-green-soft)", color: "var(--gj-green-ink)",
          padding: "2px 7px", borderRadius: 999, marginTop: 2, letterSpacing: ".3px",
        }}>{match}</span>
      )}
      {cta && (
        <button style={{
          background: "var(--gj-teal-deep)", color: "#fff",
          fontSize: 12.5, fontWeight: 800, padding: "9px 12px",
          borderRadius: 8, border: 0, cursor: "pointer", marginTop: 6,
          fontFamily: "inherit",
        }}>{cta}</button>
      )}
    </div>
  );
};

// =====================================================================
// Candidatures tracker (web)
// =====================================================================
const WebDashTracker = () => {
  const wrap = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden" };
  const row = {
    display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 14, alignItems: "center",
    padding: "14px 16px", borderBottom: "1px solid var(--gj-line)",
  };
  const ic = (tone) => ({
    width: 44, height: 44, borderRadius: 10,
    background: `var(--gj-${tone}-soft)`,
    color: tone === "yellow" ? "var(--gj-yellow-ink)" : `var(--gj-${tone})`,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  });
  const stages = (cur, total = 5) => (
    <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", fontSize: 10.5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i < cur ? "var(--gj-green)" : i === cur ? "var(--gj-yellow)" : "var(--gj-line-strong)",
          boxShadow: i === cur ? "0 0 0 3px var(--gj-yellow-soft)" : "none",
        }} />
      ))}
    </div>
  );
  return (
    <div style={wrap}>
      <div style={row}>
        <span style={ic("red")}><svg className="gj-icon gj-icon--md"><use href="#i-agriculture" /></svg></span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 }}>Bourse agricole — Micro-initiative maraîchère</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>Déposée le 14 mai · J-3 avant clôture</div>
          {stages(2)}
          <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 4 }}>Étape 3/5 — <b style={{ color: "var(--gj-ink)" }}>Revue conseiller CJS</b></div>
        </div>
        <button style={{ background: "var(--gj-teal-deep)", color: "#fff", padding: "9px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, border: 0, cursor: "pointer", fontFamily: "inherit" }}>Compléter dossier</button>
      </div>
      <div style={row}>
        <span style={ic("teal")}><svg className="gj-icon gj-icon--md"><use href="#i-employment" /></svg></span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 }}>Stage Data Science · Sonatel</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>Entretien planifié — 26 mai · 10h</div>
          {stages(3)}
          <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 4 }}>Étape 4/5 — <b style={{ color: "var(--gj-ink)" }}>Entretien</b></div>
        </div>
        <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "9px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Préparer →</button>
      </div>
      <div style={{ ...row, borderBottom: 0 }}>
        <span style={ic("green")}><svg className="gj-icon gj-icon--md"><use href="#i-check-circle" /></svg></span>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.3 }}>Bourse mobilité — UCAD Master 2</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>Acceptée · démarrage 1er juin</div>
          {stages(5)}
          <div style={{ fontSize: 11, color: "var(--gj-green-ink)", fontWeight: 800, marginTop: 4 }}>Bravo Awa — confirme avant le 1er juin</div>
        </div>
        <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "9px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Détails</button>
      </div>
    </div>
  );
};

// =====================================================================
// Side cards
// =====================================================================
const WebDashEvents = () => {
  const card = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 };
  const evRow = { display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--gj-line)", alignItems: "center" };
  const dateBox = { flexShrink: 0, width: 48, textAlign: "center", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", borderRadius: 8, padding: "6px 4px" };
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: 14, fontWeight: 900 }}>Événements à venir</h3>
        <span style={{ fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Voir tous →</span>
      </div>
      <div>
        {[
          { d: 22, m: "Mai", t: "Atelier CV — CJS Tamba", s: "14h–17h · 5 places restantes" },
          { d: 28, m: "Mai", t: "Forum emploi Diamniadio", s: "9h–18h · 40 recruteurs" },
          { d: 2, m: "Juin", t: "Démarrage Bootcamp Data", s: "CJS Dakar · 8 semaines" },
        ].map((e, i, arr) => (
          <div key={i} style={{ ...evRow, borderBottom: i === arr.length - 1 ? 0 : "1px solid var(--gj-line)" }}>
            <div style={dateBox}>
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{e.d}</div>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>{e.m}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.3 }}>{e.t}</div>
              <div style={{ fontSize: 10.5, color: "var(--gj-grey)", marginTop: 1 }}>{e.s}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WebDashCenters = () => {
  const card = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 };
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: 14, fontWeight: 900 }}>Centres CJS près de toi</h3>
        <span style={{ fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Carte →</span>
      </div>
      <div>
        {[
          { n: "CJS Tambacounda", a: "Av. Léopold Sédar Senghor · wifi gratuit", km: "2.4 km" },
          { n: "CJS Kédougou", a: "Quartier Lawol · réservation salle", km: "189 km" },
          { n: "CJS Kaolack", a: "Médina Baye · scan badge", km: "220 km" },
        ].map((c, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i === arr.length - 1 ? 0 : "1px solid var(--gj-line)" }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--gj-yellow-soft)", color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg className="gj-icon gj-icon--sm"><use href="#i-pin" /></svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{c.n}</div>
              <div style={{ fontSize: 10.5, color: "var(--gj-grey)", marginTop: 1 }}>{c.a}</div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", whiteSpace: "nowrap" }}>{c.km}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WebDashProfileNudge = () => (
  <div style={{
    background: "linear-gradient(135deg, var(--gj-yellow-soft), #fff)",
    border: "1.5px solid var(--gj-yellow)",
    borderRadius: 12, padding: 16,
    display: "flex", flexDirection: "column", gap: 10,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 38, fontWeight: 900, color: "var(--gj-yellow-ink)", lineHeight: 1 }}>72%</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 900, color: "var(--gj-ink)" }}>Profil presque complet</div>
        <div style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.45, marginTop: 2 }}>Ajoute ton CV pour débloquer 3× plus d'opps pertinentes.</div>
      </div>
    </div>
    <div style={{ height: 6, background: "#fff", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: "72%", background: "var(--gj-yellow)" }} />
    </div>
    <button style={{
      background: "var(--gj-yellow)", color: "var(--gj-ink)",
      border: 0, padding: "10px 14px", borderRadius: 8,
      fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    }}>Compléter mon profil <svg className="gj-icon gj-icon--xs"><use href="#i-arrow-right" /></svg></button>
  </div>
);

// =====================================================================
// MAIN — Dashboard Web (sidebar shell + content)
// =====================================================================
const WebDashboard = ({ yayeOpen = false }) => {
  const root = {
    display: "grid", gridTemplateColumns: "260px 1fr",
    height: "100%", background: "var(--gj-bg)",
    overflow: "hidden", position: "relative",
  };
  const main = { display: "flex", flexDirection: "column", overflow: "hidden" };
  const page = {
    padding: "22px 28px 40px",
    display: "flex", flexDirection: "column", gap: 22,
    overflowY: "auto", flex: 1,
  };
  const twoCol = { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 22 };

  return (
    <div style={root}>
      <BenefSidebar active="home" />
      <div style={main}>
        <BenefTopBar />
        <div style={page}>
          <WebDashHero />
          <WebDashKPIs />

          {/* À ne pas rater carousel */}
          <section>
            <SectionH title="À ne pas rater" lede="Clôture imminente · sélection pour ton profil" more="Voir tout →" />
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
              <WebOppCard width={280} tag="J-3 · URGENT" tagTone="urgent" title="Bourse agricole — maraîchage" org="jusqu'à 600 000 FCFA · Tambacounda" meta={[{ icon: "i-pin", label: "Tambacounda" }, { icon: "i-users", label: "18–35 ans" }]} match="92% match" cta="Candidater" />
              <WebOppCard width={280} tag="STAGE · J-9" tagTone="info" title="Stage Data Science · 6 mois" org="Sonatel · Dakar Plateau" meta={[{ icon: "i-pin", label: "Dakar" }, { icon: "i-funding", label: "350k/mois" }]} match="87% match" cta="Candidater" />
              <WebOppCard width={280} tag="ALTERNANCE · J-12" tagTone="partner" title="Marketing digital · 12 mois" org="Senegal Airlines · Diass" meta={[{ icon: "i-pin", label: "Diass" }, { icon: "i-employment", label: "Alternance" }]} match="76% match" />
              <WebOppCard width={280} tag="CONCOURS · J-21" tagTone="partner" title="Concours Jeunes Entrepreneurs 2026" org="National · 2.5M FCFA + coaching" meta={[{ icon: "i-users", label: "16–30 ans" }]} cta="Voir critères" />
            </div>
          </section>

          <section style={twoCol}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div>
                <SectionH title="Mes candidatures en cours" lede="3 dossiers · 1 attend ta réponse" more="Voir toutes →" />
                <WebDashTracker />
              </div>
              <div>
                <SectionH title="Pour toi · toutes catégories" lede="Triées par pertinence selon ton profil" more="Filtres ⚙" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <WebOppCard tag="ATELIER · J-2" tagTone="partner" title="Atelier CV — CJS Tamba" org="22 mai · 14h–17h · présentiel" meta={[{ icon: "i-pin", label: "Tambacounda" }, { icon: "i-users", label: "5 places restantes" }]} cta="Réserver" />
                  <WebOppCard tag="MENTORAT · 3 PLACES" tagTone="cjs" title="Coaching création d'entreprise · 1-à-1" org="Réseau mentors CJS · 3 mois" meta={[{ icon: "i-users", label: "47 mentors" }]} cta="Postuler" />
                  <WebOppCard tag="APPEL À PROJETS · J-18" tagTone="partner" title="Youth Empowerment Fund" org="Union européenne · jusqu'à 25 000 €" meta={[{ icon: "i-users", label: "14–30 ans" }]} />
                  <WebOppCard tag="ARTICLE · TÉMOIGNAGE" tagTone="info" title="Du Guichet à mon entreprise — Fatima, Ziguinchor" org="5 min · 478 lectures" />
                </div>
              </div>
            </div>
            <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <MyCJSCard />
              <WebDashProfileNudge />
              <WebDashEvents />
              <WebDashCenters />
              <div style={{ background: "var(--gj-teal-deep)", color: "#fff", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.15)", color: "var(--gj-yellow)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-chat" /></svg>
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>Pas d'internet ?</div>
                    <div style={{ fontSize: 11.5, opacity: .85, lineHeight: 1.45, marginTop: 2 }}>Yaye répond aussi sur WhatsApp.</div>
                  </div>
                </div>
                <span style={{ color: "var(--gj-yellow)", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>800 200 200 →</span>
              </div>
            </aside>
          </section>
        </div>
      </div>

      {/* Yaye side panel overlay */}
      {yayeOpen && <WebDashYayePanel />}
    </div>
  );
};

// =====================================================================
// Yaye side panel (overlay state)
// =====================================================================
const WebDashYayePanel = () => {
  const panel = {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: 420, background: "#fff",
    borderLeft: "1.5px solid var(--gj-line)",
    boxShadow: "-10px 0 40px rgba(0,0,0,.18)",
    display: "flex", flexDirection: "column",
    zIndex: 60, animation: "yaye-slide .25s ease",
  };
  const head = {
    background: "var(--gj-teal-deep)", color: "#fff",
    padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
    position: "relative", flexShrink: 0,
  };
  const body = {
    flex: 1, overflowY: "auto", padding: "14px 14px 8px",
    background: "#F5FAF8",
    display: "flex", flexDirection: "column", gap: 8,
  };
  const bubble = (from) => ({
    maxWidth: "84%", padding: "10px 14px", borderRadius: 14,
    background: from === "bot" ? "#fff" : "var(--gj-teal-deep)",
    color: from === "bot" ? "var(--gj-ink)" : "#fff",
    border: from === "bot" ? "1px solid var(--gj-line)" : 0,
    borderBottomLeftRadius: from === "bot" ? 4 : 14,
    borderBottomRightRadius: from === "bot" ? 14 : 4,
    fontSize: 13.5, lineHeight: 1.45,
    alignSelf: from === "bot" ? "flex-start" : "flex-end",
    boxShadow: from === "bot" ? "none" : "0 2px 8px rgba(0,122,92,.18)",
  });
  const opt = {
    background: "#fff", border: "1.5px solid var(--gj-teal-deep)",
    color: "var(--gj-teal-deep)", borderRadius: 999,
    padding: "8px 14px", fontSize: 12.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
    minHeight: 38,
  };
  return (
    <div style={panel}>
      <style>{`@keyframes yaye-slide{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div style={head}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg, #19A757, #0A807F)",
          color: "#fff", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 19,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 2px rgba(255,255,255,.25)",
        }}>Y</div>
        <div style={{ flex: 1, lineHeight: 1.15 }}>
          <div>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 900, background: "linear-gradient(135deg, #fff, var(--gj-yellow))", WebkitBackgroundClip: "text", color: "transparent" }}>Yaye</span>
            <span style={{ background: "var(--gj-yellow)", color: "var(--gj-teal-deep)", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 999, marginLeft: 6, letterSpacing: ".4px" }}>IA</span>
          </div>
          <div style={{ fontSize: 11, opacity: .9, marginTop: 1, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7BE5B5" }} />
            en ligne · agit sur ton compte
          </div>
        </div>
        <button style={{ width: 32, height: 32, border: 0, background: "transparent", color: "#fff", cursor: "pointer" }} aria-label="Fermer">
          <svg className="gj-icon"><use href="#i-close" /></svg>
        </button>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "linear-gradient(90deg, var(--gj-yellow) 0%, var(--gj-yellow) 25%, transparent 25%)" }} />
      </div>
      <div style={body}>
        <div style={{ alignSelf: "center", fontSize: 10, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 999, padding: "3px 10px", marginBottom: 4 }}>Aujourd'hui · 9:41</div>
        <div style={bubble("bot")}>Salama Awa. J'ai 3 opportunités à 90%+ match pour toi à Tambacounda — toutes en agri / projet.</div>
        <div style={bubble("user")}>Trouve-moi un stage en agro, près de chez moi, payé.</div>
        <div style={bubble("bot")}>Reçu. J'ai filtré 247 offres → 2 collent vraiment. Je te montre&nbsp;?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          <button style={opt}>Voir les 2 offres <span style={{ marginLeft: "auto", opacity: .55 }}>→</span></button>
          <button style={opt}>Élargis à Kédougou aussi <span style={{ marginLeft: "auto", opacity: .55 }}>→</span></button>
          <button style={opt}>Postule pour moi <span style={{ marginLeft: "auto", opacity: .55 }}>→</span></button>
        </div>
      </div>
      <div style={{ padding: 12, background: "#fff", borderTop: "1px solid var(--gj-line)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <button style={{ width: 38, height: 38, border: 0, background: "transparent", color: "var(--gj-grey)", cursor: "pointer" }}>
          <svg className="gj-icon"><use href="#i-attach" /></svg>
        </button>
        <div style={{ flex: 1, border: "1.5px solid var(--gj-line)", padding: "10px 14px", fontSize: 13, background: "var(--gj-bg)", borderRadius: 999, color: "var(--gj-grey-2)" }}>Demande à Yaye…</div>
        <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-arrow-up" /></svg>
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { WebDashboard, WebDashYayePanel, WebDashTopNav, BenefSidebar, BenefTopBar });
