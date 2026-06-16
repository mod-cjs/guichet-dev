/* eslint-disable */
// Lot 13 — États système (chargement, erreur, hors-ligne, vide). Web + mobile.
// Autonome : réutilise PhoneFrame (phone.jsx) pour le mobile.

// --- Skeleton primitives ---
const sk = (w, h, r) => ({ width: w, height: h, borderRadius: r || 6, background: "linear-gradient(90deg, var(--gj-bg) 25%, #eef3f1 37%, var(--gj-bg) 63%)", backgroundSize: "400% 100%", animation: "gjsk 1.4s ease infinite" });
const skStyle = document.createElement("style");
skStyle.textContent = "@keyframes gjsk{0%{background-position:100% 0}100%{background-position:-100% 0}}";
document.head.appendChild(skStyle);

const SkCard = () => (
  <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
    <div style={sk(48, 48, 12)} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={sk("62%", 13)} />
      <div style={sk("40%", 11)} />
    </div>
    <div style={sk(74, 34, 9)} />
  </div>
);

// --- Generic centered state (error / offline / empty) ---
const StateBlock = ({ icon, tone, title, body, primary, secondary, compact }) => {
  const g = { red: ["var(--gj-red-soft)", "var(--gj-red)"], grey: ["var(--gj-bg)", "var(--gj-grey)"], teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"] }[tone] || ["var(--gj-bg)", "var(--gj-grey)"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: compact ? "30px 22px" : "10px 24px", maxWidth: 380, margin: "0 auto" }}>
      <span style={{ width: 84, height: 84, borderRadius: 24, background: g[0], color: g[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg className="gj-icon" style={{ width: 40, height: 40 }}><use href={"#" + icon} /></svg>
      </span>
      <h2 style={{ fontSize: compact ? 19 : 22, fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1.2 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--gj-grey)", lineHeight: 1.55, margin: 0 }}>{body}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginTop: 6 }}>
        {primary && <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 11, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{primary.icon && <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + primary.icon} /></svg>}{primary.label}</button>}
        {secondary && <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 48, borderRadius: 11, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{secondary}</button>}
      </div>
    </div>
  );
};

// Bandeau hors-ligne (sticky)
const OfflineBanner = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-ink)", color: "#fff", padding: "11px 16px", fontSize: 13, fontWeight: 700 }}>
    <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-yellow)" }}><use href="#i-globe" /></svg>
    <span style={{ flex: 1 }}>Tu es hors-ligne — les données affichées peuvent dater.</span>
    <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-yellow)" }}>Réessayer</span>
  </div>
);

// ============================ WEB ============================
const WebStates = ({ state = "loading" }) => {
  const shell = (inner, banner) => (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden" }}>
      <BenefSidebar active="cand" />
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {banner}
        <BenefTopBar />
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px 40px" }}>{inner}</div>
      </div>
    </div>
  );
  if (state === "loading") {
    return shell(
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ ...sk(220, 26), marginBottom: 8 }} />
        <div style={{ ...sk(320, 14), marginBottom: 22 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 15, display: "flex", flexDirection: "column", gap: 12 }}><div style={sk(36,36,10)} /><div style={sk("70%",22)} /><div style={sk("50%",11)} /></div>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[0,1,2,3].map(i => <SkCard key={i} />)}</div>
      </div>
    );
  }
  if (state === "error") {
    return shell(<div style={{ paddingTop: 60 }}><StateBlock icon="i-alert" tone="red" title="Oups, une erreur est survenue" body="Nous n'avons pas pu charger tes candidatures. Ce n'est pas de ta faute — réessaie dans un instant." primary={{ label: "Réessayer", icon: "i-target" }} secondary="Contacter le support" /></div>);
  }
  if (state === "offline") {
    return shell(
      <div style={{ paddingTop: 60 }}><StateBlock icon="i-globe" tone="grey" title="Pas de connexion internet" body="Vérifie ta connexion (Wifi ou données mobiles). Tes données enregistrées restent accessibles hors-ligne." primary={{ label: "Réessayer", icon: "i-target" }} secondary="Voir le contenu hors-ligne" /></div>,
      <OfflineBanner />
    );
  }
  // empty
  return shell(<div style={{ paddingTop: 60 }}><StateBlock icon="i-document" tone="teal" title="Aucune candidature pour l'instant" body="Quand tu postuleras à une opportunité, tu suivras son avancement ici. Yaye a déjà 8 offres pour ton profil." primary={{ label: "Explorer les opportunités", icon: "i-search" }} /></div>);
};

// ============================ MOBILE ============================
const MobileStates = ({ state = "loading" }) => {
  if (state === "loading") {
    return (
      <PhoneFrame>
        <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={sk(120, 18)} /><span style={{ flex: 1 }} /><div style={sk(34, 34, 8)} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
          {[0,1,2,3,4].map(i => <SkCard key={i} />)}
        </div>
      </PhoneFrame>
    );
  }
  if (state === "offline") {
    return (
      <PhoneFrame>
        <OfflineBanner />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gj-bg)" }}>
          <StateBlock compact icon="i-globe" tone="grey" title="Pas de connexion" body="Vérifie ton Wifi ou tes données mobiles, puis réessaie." primary={{ label: "Réessayer", icon: "i-target" }} secondary="Contenu hors-ligne" />
        </div>
      </PhoneFrame>
    );
  }
  const map = {
    error: { icon: "i-alert", tone: "red", title: "Une erreur est survenue", body: "Impossible de charger le contenu. Réessaie dans un instant.", primary: { label: "Réessayer", icon: "i-target" }, secondary: "Support" },
    empty: { icon: "i-bookmark", tone: "teal", title: "Rien ici… pour l'instant", body: "Tu n'as encore rien sauvegardé. Mets de côté les opportunités qui t'intéressent.", primary: { label: "Explorer", icon: "i-search" } },
  }[state];
  return (
    <PhoneFrame>
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "14px 16px", fontSize: 16, fontWeight: 900, color: "var(--gj-ink)", flexShrink: 0 }}>{state === "error" ? "Erreur" : "Mes sauvegardes"}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gj-bg)" }}>
        <StateBlock compact {...map} />
      </div>
    </PhoneFrame>
  );
};

Object.assign(window, { WebStates, MobileStates, SkCard, StateBlock, OfflineBanner });
