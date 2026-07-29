/* eslint-disable */
// Shared phone-frame primitives for the Guichet Jeunesse mockups.
// Designed to sit inside a DCArtboard at 390×844 (iPhone 14 logical).

const PhoneFrame = ({ children, sb = true, bottomSafe = true, bg = "var(--gj-bg)" }) => {
  const frame = {
    width: 390, height: 844,
    background: bg,
    fontFamily: "var(--gj-font-sans)",
    color: "var(--color-text-primary)",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    position: "relative",
  };
  return (
    <div style={frame}>
      {sb && <StatusBar />}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {children}
      </div>
      {bottomSafe && <div style={{ height: 18, flexShrink: 0 }} />}
    </div>
  );
};

const StatusBar = ({ dark = false }) => {
  const color = dark ? "#fff" : "var(--gj-ink)";
  const wrap = {
    height: 44, display: "flex", alignItems: "center",
    justifyContent: "space-between", padding: "0 22px",
    fontSize: 15, fontWeight: 700, color, flexShrink: 0,
    letterSpacing: ".2px",
  };
  return (
    <div style={wrap}>
      <span>9:41</span>
      <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true"><path d="M1 9.5h1v-7H1v7zm2 0h1v-7H3v7zm2-1h1v-6H5v6zm2 0h1v-6H7v6zm2-1h1v-5H9v5zm2 0h1v-5h-1v5zm2-1h1v-4h-1v4zm2 0h1v-4h-1v4z"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-hidden="true"><path d="M7.5 2.5c1.9 0 3.7.7 5 2l-1 1.1c-1.1-1-2.5-1.6-4-1.6s-2.9.6-4 1.6l-1-1.1c1.3-1.3 3.1-2 5-2zm0 3c1.1 0 2 .4 2.8 1.1l-1 1c-.5-.4-1.1-.7-1.8-.7s-1.3.3-1.8.7l-1-1c.8-.7 1.7-1.1 2.8-1.1zm0 3.5l1.4-1.4c-.4-.4-.9-.6-1.4-.6s-1 .2-1.4.6L7.5 9z"/></svg>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 13 }}>100</span>
          <span style={{ position: "relative", width: 24, height: 11, border: `1.2px solid ${color}`, borderRadius: 3, opacity: .55 }}>
            <span style={{ position: "absolute", inset: 1.5, background: color, borderRadius: 1.5 }} />
            <span style={{ position: "absolute", right: -3, top: 3, width: 2, height: 5, background: color, borderRadius: 1 }} />
          </span>
        </span>
      </span>
    </div>
  );
};

// TopBar — canonical Guichet Jeunesse top bar (logo + Yaye pill + bell + avatar).
// Matches ui_kits/app/index.html spec exactly.
const TopBar = ({ subtitle, user = "AD", unread = true }) => {
  const wrap = {
    background: "#fff", padding: "8px 12px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    borderBottom: "1px solid var(--gj-line)",
    minHeight: 54, gap: 6, flexShrink: 0,
  };
  const logoWrap = { display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 };
  const divider = { width: 1.5, height: 18, background: "var(--gj-line)", flexShrink: 0 };
  const titleS = { fontSize: 13, fontWeight: 800, color: "var(--gj-ink)", letterSpacing: "-.1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const right = { display: "flex", gap: 6, alignItems: "center", flexShrink: 0 };
  const ybtn = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 10px 5px 5px",
    background: "var(--gj-teal-deep)", color: "#fff",
    border: 0, borderRadius: 999, cursor: "pointer",
    fontFamily: "inherit", fontSize: 11.5, fontWeight: 800,
    minHeight: 36,
  };
  const yav = {
    width: 24, height: 24, borderRadius: "50%",
    background: "linear-gradient(135deg, #19a657 0%, #119178 50%, #027f7e 100%)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 13,
    color: "#fff", flexShrink: 0,
    boxShadow: "0 0 0 1.5px rgba(255,255,255,.3)",
  };
  const aiBadge = {
    background: "var(--gj-yellow)", color: "var(--gj-ink)",
    fontSize: 11, fontWeight: 800, padding: "2px 6px",
    borderRadius: 999, letterSpacing: ".3px",
  };
  const bell = {
    position: "relative", width: 36, height: 36,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", background: "transparent", border: 0,
  };
  const av = {
    width: 32, height: 32, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 11, cursor: "pointer", border: 0,
    fontFamily: "inherit", flexShrink: 0,
  };
  return (
    <div style={wrap}>
      <div style={logoWrap}>
        <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 24, width: "auto", display: "block", flexShrink: 0 }} />
        {subtitle && <span style={divider} />}
        {subtitle && <span style={titleS}>{subtitle}</span>}
      </div>
      <div style={right}>
        {/* La pastille « Y IA » a été retirée : le bouton flottant est le point
            d'entrée unique et permanent vers Yaye, côté web comme mobile. */}
        <button style={bell} aria-label="Notifications">
          <svg className="gj-icon" style={{ width: 20, height: 20, color: "var(--gj-ink)" }}><use href="#i-bell" /></svg>
          {unread && <span style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, background: "var(--gj-red)", borderRadius: "50%", border: "2px solid #fff" }} />}
        </button>
        <button style={av} aria-label="Profil">{user}</button>
      </div>
    </div>
  );
};

// AppHeader — top bar with optional back, leading slot (avatar/logo), title, trailing icon.
const AppHeader = ({ title, subtitle, onBack, leading, trailing, dark = false }) => {
  const wrap = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px 12px",
    background: dark ? "transparent" : "#fff",
    borderBottom: dark ? "0" : "1px solid var(--gj-line)",
    color: dark ? "#fff" : "var(--gj-ink)",
    flexShrink: 0,
  };
  const back = {
    width: 36, height: 36, borderRadius: 8, border: 0,
    background: "transparent", cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    color: "inherit", flexShrink: 0, fontFamily: "inherit",
  };
  const body = { flex: 1, minWidth: 0 };
  const t = { fontSize: 17, fontWeight: 800, lineHeight: 1.2 };
  const s = { fontSize: 12, opacity: .7, marginTop: 1 };
  return (
    <div style={wrap}>
      {onBack !== undefined && (
        <button style={back} onClick={onBack} aria-label="Retour">
          <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-chevron-left" /></svg>
        </button>
      )}
      {leading}
      <div style={body}>
        <div style={t}>{title}</div>
        {subtitle && <div style={s}>{subtitle}</div>}
      </div>
      {trailing}
    </div>
  );
};

// BottomNav — 5-tab nav (Centres = physical CJS centers + QR check-in card).
const BottomNav = ({ active = "home" }) => {
  const wrap = {
    display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
    background: "#fff",
    borderTop: "1px solid var(--gj-line)",
    paddingTop: 6, paddingBottom: 8,
    flexShrink: 0,
    boxShadow: "var(--gj-shadow-bottom-nav)",
  };
  const item = (on, icon, label) => {
    const color = on ? "var(--gj-teal-deep)" : "var(--gj-grey)";
    return (
      <button style={{
        background: "transparent", border: 0, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "4px 0", color, fontFamily: "inherit",
        minHeight: 48, position: "relative",
      }}>
        {on && <span style={{ position: "absolute", top: -6, width: 28, height: 3, background: "var(--gj-teal-deep)", borderRadius: "0 0 3px 3px" }} />}
        <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + icon} /></svg>
        <span style={{ fontSize: 11, fontWeight: on ? 800 : 600 }}>{label}</span>
      </button>
    );
  };
  return (
    <div style={wrap}>
      {item(active === "home", "i-home", "Accueil")}
      {item(active === "explore", "i-search", "Explorer")}
      {item(active === "cand", "i-document", "Candidatures")}
      {item(active === "centres", "i-pin", "Centres CJS")}
      {item(active === "profile", "i-user", "Profil")}
    </div>
  );
};

// FAB — Yaye floating action button (used over dashboards).
const YayeFab = ({ bottom = 76 }) => (
  <button style={{
    position: "absolute", right: 18, bottom,
    width: 58, height: 58, borderRadius: "50%",
    background: "var(--gj-teal-deep)",
    color: "#fff", border: 0, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 24px rgba(7,77,57,.45)",
    zIndex: 20,
  }} aria-label="Yaye">
    <span style={{
      position: "absolute", inset: -4, borderRadius: "50%",
      border: "2px solid var(--gj-yellow)", opacity: 0,
      animation: "gj-pulse-yaye 2.5s ease-out infinite",
    }} />
    <span style={{
      position: "absolute", top: -2, right: -2,
      background: "var(--gj-yellow)", color: "var(--gj-ink)",
      fontSize: 11, fontWeight: 900, padding: "2px 5px",
      borderRadius: 999, letterSpacing: ".3px",
      boxShadow: "0 0 0 2px var(--gj-bg)",
    }}>IA</span>
    <svg className="gj-icon" style={{ width: 24, height: 24 }}><use href="#i-chat" /></svg>
  </button>
);

// Progress bar — used by onboarding stepper.
const StepBar = ({ step, total }) => {
  const pct = (step / total) * 100;
  return (
    <div style={{ padding: "10px 16px 6px", background: "#fff", flexShrink: 0 }}>
      <div style={{ height: 4, background: "var(--gj-bg)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--gj-teal)", borderRadius: 3, transition: "width .35s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--gj-grey)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>
        <span>Étape {step} / {total}</span>
        <span>{Math.round(pct)} %</span>
      </div>
    </div>
  );
};

// FooterCTA — sticky bottom action area used in form flows.
// La couleur d'action (magenta) est réservée aux CTA de conversion : elle est
// déduite du libellé pour rester cohérente sur tous les flux (retour design V3).
const CTA_CONVERSION = /postuler|inscri|envoyer|d[ée]poser|valider|candidat|soumettre|r[ée]server/i;
const FooterCTA = ({ primary, secondary, onPrimary, onSecondary }) => (
  <div style={{
    padding: 14, background: "#fff",
    borderTop: "1px solid var(--gj-line)",
    display: "flex", gap: 8, flexShrink: 0,
  }}>
    {secondary && (
      <button onClick={onSecondary} style={{
        flex: "0 0 auto", background: "#fff",
        color: "var(--gj-teal-deep)",
        border: "1.5px solid var(--gj-line)",
        padding: "0 18px", minHeight: 48,
        borderRadius: 10, fontWeight: 700, fontSize: 14,
        cursor: "pointer", fontFamily: "inherit",
      }}>{secondary}</button>
    )}
    <button onClick={onPrimary} style={{
      flex: 1, background: CTA_CONVERSION.test(primary || "") ? "var(--gj-action)" : "var(--gj-teal-deep)",
      color: "#fff", border: 0,
      padding: "0 18px", minHeight: 48,
      borderRadius: 10, fontWeight: 800, fontSize: 15,
      cursor: "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    }}>{primary} <svg className="gj-icon gj-icon--sm" aria-hidden="true"><use href="#i-arrow-right" /></svg></button>
  </div>
);

// SnFlag — drapeau Sénégal en SVG (remplace l'emoji 🇸🇳 — violation règle #7)
const SnFlag = ({ size = 18 }) => (
  <svg viewBox="0 0 30 20" width={size * 1.5} height={size} style={{ display: "inline-block", verticalAlign: "middle", borderRadius: 2, overflow: "hidden", flexShrink: 0 }} aria-label="Sénégal">
    <rect x="0" y="0" width="10" height="20" fill="#00853F" />
    <rect x="10" y="0" width="10" height="20" fill="#FDEF42" />
    <rect x="20" y="0" width="10" height="20" fill="#E31B23" />
    <path d="M15 7 L15.95 9.91 L19 9.91 L16.53 11.69 L17.47 14.59 L15 12.82 L12.53 14.59 L13.47 11.69 L11 9.91 L14.05 9.91 Z" fill="#00853F" />
  </svg>
);

Object.assign(window, { PhoneFrame, StatusBar, TopBar, AppHeader, BottomNav, YayeFab, StepBar, FooterCTA, SnFlag });
