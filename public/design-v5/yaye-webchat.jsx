/* eslint-disable */
// Lot 15 — Yaye en panneau latéral droit sur une page web (ouvert depuis le bouton flottant).

const YayeWebChatPage = () => {
  const yav = (size) => (
    <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#19a657,#027f7e)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: "var(--gj-font-sans)", fontSize: size * 0.5, boxShadow: "0 0 0 2px rgba(255,255,255,.25)" }}>Y</span>
  );
  const oppMini = (typeKey, title, org, lieu, duree, action) => {
    const t = OPP_TYPES[typeKey];
    return (
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, overflow: "hidden", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", background: t.soft }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: t.c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + t.icon} /></svg></span>
          <span style={{ fontSize: 11, fontWeight: 900, color: t.c, textTransform: "uppercase", letterSpacing: ".4px" }}>{t.label}</span>
          <span style={{ flex: 1 }} /><span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 800, color: t.c }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-clock" /></svg>{duree}</span>
        </div>
        <div style={{ padding: "10px 11px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div><div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.25 }}>{title}</div><div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 3 }}>{org} · {lieu}</div></div>
          <button style={{ background: "var(--gj-action)", color: "#fff", border: 0, minHeight: 38, borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{action}<svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    );
  };
  const bot = { alignSelf: "flex-start", maxWidth: "88%", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: "16px 16px 16px 4px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.5, color: "var(--gj-ink)" };
  const usr = { alignSelf: "flex-end", maxWidth: "88%", background: "var(--gj-teal-deep)", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.5 };

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--gj-bg)", overflow: "hidden", fontFamily: "var(--gj-font-sans)" }}>
      {/* page applicative (sidebar + contenu) — atténuée car le chat est ouvert */}
      <aside style={{ width: 230, flexShrink: 0, background: "#fff", borderRight: "1px solid var(--gj-line)", padding: 14, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 6px 13px", borderBottom: "1px solid var(--gj-line)", marginBottom: 8 }}><img src="assets/logo-guichet.png" alt="Guichet Jeunesse" style={{ height: 26 }} /></div>
        {[["i-home", "Accueil", false], ["i-search", "Opportunités", true], ["i-document", "Mes candidatures", false], ["i-bookmark", "Mes sauvegardes", false], ["i-profile", "Profil", false]].map(([ic, l, on]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: on ? 800 : 600, color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)", background: on ? "var(--gj-teal-soft)" : "transparent" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + ic} /></svg>{l}</div>
        ))}
      </aside>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", minHeight: 62, display: "flex", alignItems: "center", padding: "0 24px" }}><h1 style={{ fontSize: 18, fontWeight: 900, color: "var(--gj-ink)" }}>Opportunités</h1></div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14, alignContent: "start" }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16, opacity: .6 }}>
              <div style={{ height: 26, width: 90, background: "var(--gj-bg)", borderRadius: 999, marginBottom: 12 }} />
              <div style={{ height: 13, width: "85%", background: "var(--gj-bg)", borderRadius: 5, marginBottom: 7 }} />
              <div style={{ height: 11, width: "55%", background: "var(--gj-bg)", borderRadius: 5 }} />
              <div style={{ height: 40, background: "var(--gj-bg)", borderRadius: 9, marginTop: 14 }} />
            </div>
          ))}
        </div>
      </div>
      {/* overlay léger */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,40,32,.12)", pointerEvents: "none" }} />
      {/* PANNEAU CHAT DROIT */}
      <div style={{ width: 400, flexShrink: 0, background: "#fff", borderLeft: "1px solid var(--gj-line)", boxShadow: "-12px 0 40px rgba(0,0,0,.12)", display: "flex", flexDirection: "column", position: "relative", zIndex: 2 }}>
        {/* header */}
        <div style={{ background: "var(--gj-teal-deep)", color: "#fff", padding: "13px 16px", display: "flex", alignItems: "center", gap: 11, position: "relative" }}>
          {yav(38)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 18, background: "linear-gradient(135deg,#fff,var(--gj-yellow))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Yaye</span><span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "2px 6px", borderRadius: 999 }}>IA</span></div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>En ligne · répond en quelques secondes</div>
          </div>
          <button style={{ width: 34, height: 34, borderRadius: 8, border: 0, background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Réduire"><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-chevron-right" /></svg></button>
          <button style={{ width: 34, height: 34, borderRadius: 8, border: 0, background: "rgba(255,255,255,.12)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Fermer"><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-close" /></svg></button>
        </div>
        {/* messages */}
        <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
          <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 999, padding: "3px 10px" }}>Aujourd'hui</span>
          <div style={bot}>Bonjour Awa. Sur quoi puis-je t'aider aujourd'hui ?</div>
          <div style={usr}>Trouve-moi un stage en agriculture près de Tambacounda</div>
          <div style={{ alignSelf: "flex-start", maxWidth: "92%" }}>
            <div style={bot}>Voici l'opportunité la plus proche de ton profil :</div>
            {oppMini("stage", "Stage en agronomie · maraîchage", "GIE Diaobé", "Tambacounda", "6 mois", "Postuler")}
          </div>
          <div style={{ alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 6, maxWidth: "92%", marginTop: 2 }}>
            {["Montre-m'en d'autres", "Aide-moi à postuler"].map(t => <button key={t} style={{ background: "#fff", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)", borderRadius: 999, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-sparkle" /></svg>{t}</button>)}
          </div>
        </div>
        {/* input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 6px 0 16px", minHeight: 44, background: "var(--gj-bg)" }}><span style={{ flex: 1, fontSize: 13.5, color: "var(--gj-grey-2)" }}>Écris ton message à Yaye…</span>{/* Saisie vocale retirée pour l'instant : la barre n'accepte que l'écrit. */}</div>
          <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Envoyer"><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { YayeWebChatPage });
