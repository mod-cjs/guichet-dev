/* eslint-disable */
// Lot 14 (compléments) — composants manquants + fondations.
// Dépend de component-kit.jsx (Block, Demo, av, pill, btn, swInk, Segmented) + PhoneFrame.

// ============================================================
// FONDATIONS
// ============================================================
const Foundations = () => {
  const sw = (name, v, dark) => (
    <div key={name} style={{ borderRadius: 11, overflow: "hidden", border: "1.5px solid var(--gj-line)" }}>
      <div style={{ height: 54, background: v }} />
      <div style={{ padding: "7px 9px" }}><div style={{ fontSize: 11.5, fontWeight: 800, color: swInk }}>{name}</div><div style={{ fontSize: 11, color: "var(--gj-grey)", fontFamily: "ui-monospace, Menlo, monospace" }}>{v}</div></div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Block title="Couleurs de marque" sub="Tokens du design system — teal (marque), jaune (action), bleu/vert/rouge (sémantique)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {sw("Teal", "var(--gj-teal)")}{sw("Teal deep", "var(--gj-teal-deep)")}{sw("Ink teal", "var(--gj-ink-teal)")}{sw("Jaune", "var(--gj-yellow)")}{sw("Jaune deep", "var(--gj-yellow-deep)")}{sw("Bleu", "var(--gj-blue)")}{sw("Vert", "var(--gj-green)")}{sw("Rouge", "var(--gj-red)")}{sw("Encre", "var(--gj-ink)")}{sw("Gris", "var(--gj-grey)")}
        </div>
      </Block>
      <Block title="Teintes douces (fonds)" sub="Utilisées pour pastilles, encarts et icônes">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {sw("Teal soft", "var(--gj-teal-soft)")}{sw("Jaune soft", "var(--gj-yellow-soft)")}{sw("Bleu soft", "var(--gj-blue-soft)")}{sw("Vert soft", "var(--gj-green-soft)")}{sw("Rouge soft", "var(--gj-red-soft)")}{sw("Fond", "var(--gj-bg)")}
        </div>
      </Block>
      <Block title="Typographie" sub="Échelle de titres et de corps de texte">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: swInk, lineHeight: 1.1 }}>Titre display · 34</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: swInk }}>Titre de page · 24</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: swInk }}>Titre de section · 17</div>
          <div style={{ fontSize: 14, color: swInk, lineHeight: 1.55 }}>Corps de texte · 14 — la lecture des contenus, en interligne confortable.</div>
          <div style={{ fontSize: 12, color: "var(--gj-grey)" }}>Légende / métadonnée · 12</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px" }}>Étiquette · 10,5 majuscules</div>
        </div>
      </Block>
      <Block title="Rayons, ombres & icônes" sub="Rayons d'angle, élévations, jeu d'icônes linéaires">
        <Demo label="Rayons">
          {[8, 11, 14, 999].map((r) => <div key={r} style={{ width: 70, height: 50, borderRadius: r, background: "var(--gj-teal-soft)", border: "1.5px solid var(--gj-teal)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)" }}>{r === 999 ? "pill" : r}</div>)}
        </Demo>
        <Demo label="Ombres">
          <div style={{ width: 90, height: 52, borderRadius: 12, background: "#fff", boxShadow: "var(--gj-shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--gj-grey)" }}>sm</div>
          <div style={{ width: 90, height: 52, borderRadius: 12, background: "#fff", boxShadow: "var(--gj-shadow-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--gj-grey)" }}>md</div>
        </Demo>
        <Demo label="Icônes">
          {["i-home", "i-search", "i-employment", "i-calendar", "i-chat", "i-bell", "i-bookmark", "i-pin", "i-profile", "i-resources", "i-target", "i-shield"].map((ic) => <span key={ic} style={{ width: 40, height: 40, borderRadius: 10, background: "var(--gj-bg)", border: "1px solid var(--gj-line)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-teal-deep)" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + ic} /></svg></span>)}
        </Demo>
      </Block>
    </div>
  );
};

// ============================================================
// FORMULAIRES — composants manquants
// ============================================================
const OtpField = () => {
  const cell = (v, foc) => ({ width: 46, height: 56, borderRadius: 10, border: `1.5px solid ${foc ? "var(--gj-teal-deep)" : "var(--gj-line)"}`, background: foc ? "var(--gj-teal-soft)" : "var(--gj-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: swInk });
  return (
    <Block title="Code de vérification (OTP)" sub="Saisie du code SMS à 6 chiffres — onboarding & connexion">
      <Demo>
        <div style={cell("3")}>3</div><div style={cell("9")}>9</div><div style={cell("2")}>2</div><div style={cell("7", true)}>7</div><div style={cell("")}></div><div style={cell("")}></div>
      </Demo>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>Renvoyer le code dans <b style={{ color: swInk }}>0:48</b></div>
    </Block>
  );
};

const ChoiceControls = () => {
  const [rad, setRad] = React.useState(1);
  const [chk, setChk] = React.useState({ 0: true, 2: true });
  return (
    <Block title="Cases à cocher, radios & sélecteurs" sub="Filtres, consentements, formulaires">
      <Demo label="Cases à cocher (filtres)" col>
        {["Emploi", "Stage", "Bourse"].map((l, i) => (
          <label key={l} onClick={() => setChk({ ...chk, [i]: !chk[i] })} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, fontWeight: chk[i] ? 800 : 600, color: swInk }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: chk[i] ? 0 : "1.5px solid var(--gj-line-strong)", background: chk[i] ? "var(--gj-teal-deep)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{chk[i] && <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg>}</span>{l}
          </label>
        ))}
      </Demo>
      <Demo label="Boutons radio" col>
        {["Présentiel", "En ligne", "Hybride"].map((l, i) => (
          <label key={l} onClick={() => setRad(i)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, fontWeight: rad === i ? 800 : 600, color: swInk }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${rad === i ? "var(--gj-teal-deep)" : "var(--gj-line-strong)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{rad === i && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gj-teal-deep)" }} />}</span>{l}
          </label>
        ))}
      </Demo>
      <Demo label="Liste déroulante (select)">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 46, border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 14px", background: "var(--gj-bg)", minWidth: 220 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: swInk }}>Région · Tambacounda</span>
          <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-chevron-down" /></svg>
        </div>
      </Demo>
    </Block>
  );
};

const Dropzone = () => (
  <Block title="Dépôt de fichier & sélection" sub="Téléversement (CV, justificatifs) et cartes de sélection (objectifs / intérêts)">
    <Demo label="Zone de dépôt" col>
      <div style={{ border: "2px dashed var(--gj-line-strong)", borderRadius: 11, padding: 18, display: "flex", alignItems: "center", gap: 13, background: "var(--gj-bg)", maxWidth: 440 }}>
        <span style={{ width: 42, height: 42, borderRadius: 10, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-upload" /></svg></span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 800, color: swInk }}>Téléverser un document</div><div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>PDF, JPG · 5 Mo max</div></div>
        <button style={{ ...btn("#fff", "var(--gj-teal-deep)", "1.5px solid var(--gj-line)"), padding: "8px 13px", fontSize: 12 }}>Parcourir</button>
      </div>
    </Demo>
    <Demo label="Cartes de sélection (multi-choix)">
      {[["i-employment", "Emploi", true], ["i-project", "Entrepreneuriat", false], ["i-learning", "Formation", true]].map(([ic, l, on]) => (
        <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 120, padding: "16px 10px", borderRadius: 13, cursor: "pointer", background: on ? "var(--gj-teal-soft)" : "#fff", border: on ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", position: "relative" }}>
          {on && <span style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: "var(--gj-teal-deep)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg></span>}
          <svg className="gj-icon" style={{ width: 26, height: 26, color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}><use href={"#" + ic} /></svg>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: swInk }}>{l}</span>
        </div>
      ))}
    </Demo>
  </Block>
);

const A11ySelectors = () => {
  const [sz, setSz] = React.useState(1); const [lg, setLg] = React.useState("fr");
  return (
    <Block title="Sélecteurs d'accessibilité" sub="Taille du texte (Aa) et langue — page Inclusion">
      <Demo label="Taille du texte">
        {[["S", 13], ["M", 15], ["L", 18], ["XL", 22]].map(([k, fs], i) => <button key={k} onClick={() => setSz(i)} style={{ minWidth: 56, minHeight: 56, borderRadius: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 900, fontSize: fs, background: sz === i ? "var(--gj-teal-soft)" : "#fff", border: sz === i ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: sz === i ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>Aa</button>)}
      </Demo>
      <Demo label="Langue">
        {[["fr", "Français"], ["wo", "Wolof"], ["ff", "Pulaar"]].map(([c, l]) => <button key={c} onClick={() => setLg(c)} style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, background: lg === c ? "var(--gj-teal-soft)" : "#fff", border: lg === c ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: lg === c ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}><span style={{ width: 26, height: 26, borderRadius: 7, background: lg === c ? "var(--gj-teal-deep)" : "var(--gj-bg)", color: lg === c ? "#fff" : "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{c.slice(0, 2)}</span>{l}</button>)}
      </Demo>
    </Block>
  );
};

const FormsKit = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <Fields /><OtpField /><ChoiceControls /><Dropzone /><A11ySelectors />
  </div>
);

// ============================================================
// SURFACES & OVERLAYS
// ============================================================
const Surfaces = () => (
  <Block title="Surfaces & overlays" sub="Panneau latéral (slide-over), feuille montante (bottom-sheet), modale centrée, fil d'Ariane">
    <Demo label="Fil d'Ariane (breadcrumb)">
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--gj-grey)" }}>
        <span style={{ color: "var(--gj-teal-deep)", fontWeight: 700 }}>Médiathèque</span><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-chevron-right" /></svg>
        <span style={{ color: "var(--gj-teal-deep)", fontWeight: 700 }}>Emploi</span><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-chevron-right" /></svg>
        <span style={{ fontWeight: 700, color: swInk }}>Guide du CV</span>
      </div>
    </Demo>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
      {/* slide-over */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Panneau latéral (slide-over)</div>
        <div style={{ position: "relative", height: 220, border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden", background: "var(--gj-bg)" }}>
          <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "72%", background: "#fff", borderLeft: "1px solid var(--gj-line)", boxShadow: "-8px 0 30px rgba(0,0,0,.16)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ height: 12, width: 90, background: "var(--gj-line)", borderRadius: 4 }} /><span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--gj-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-close" /></svg></span></div>
            <div style={{ height: 64, background: "var(--gj-teal-soft)", borderRadius: 10 }} />
            <div style={{ height: 9, width: "90%", background: "var(--gj-line)", borderRadius: 4 }} /><div style={{ height: 9, width: "70%", background: "var(--gj-line)", borderRadius: 4 }} />
            <button style={{ ...btn("var(--gj-teal-deep)", "#fff"), marginTop: "auto" }}>Action</button>
          </div>
        </div>
      </div>
      {/* bottom sheet */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Feuille montante (mobile)</div>
        <div style={{ position: "relative", height: 220, border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden", background: "var(--gj-bg)" }}>
          <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderRadius: "18px 18px 0 0", padding: "10px 16px 16px", boxShadow: "0 -8px 30px rgba(0,0,0,.18)" }}>
            <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--gj-line-strong)", margin: "0 auto 12px" }} />
            <div style={{ height: 11, width: "55%", background: "var(--gj-line)", borderRadius: 4, marginBottom: 10 }} />
            {[0, 1].map(i => <div key={i} style={{ height: 40, background: "var(--gj-bg)", borderRadius: 9, marginBottom: 8 }} />)}
            <button style={{ ...btn("var(--gj-teal-deep)", "#fff"), width: "100%", minHeight: 46 }}>Confirmer</button>
          </div>
        </div>
      </div>
      {/* modale centrée */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Modale centrée</div>
        <div style={{ position: "relative", height: 220, border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden", background: "var(--gj-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)" }} />
          <div style={{ position: "relative", width: "82%", background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 20px 50px rgba(0,0,0,.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-check-circle" /></svg></span><div style={{ height: 11, width: 110, background: "var(--gj-line)", borderRadius: 4 }} /></div>
            <div style={{ height: 9, width: "92%", background: "var(--gj-line)", borderRadius: 4, marginBottom: 6 }} /><div style={{ height: 9, width: "60%", background: "var(--gj-line)", borderRadius: 4 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}><button style={{ ...btn("#fff", "var(--gj-grey)", "1.5px solid var(--gj-line)"), padding: "8px 14px", fontSize: 12 }}>Annuler</button><button style={{ ...btn("var(--gj-teal-deep)", "#fff"), padding: "8px 14px", fontSize: 12 }}>Confirmer</button></div>
          </div>
        </div>
      </div>
    </div>
    <Demo label="Sélecteur date / heure (planification)">
      <div style={{ display: "flex", gap: 7 }}>{[["Lun", "9"], ["Mar", "10"], ["Mer", "11"], ["Jeu", "12"]].map(([d, n], i) => <button key={n} style={{ width: 54, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "center", background: i === 2 ? "var(--gj-teal-deep)" : "#fff", border: i === 2 ? 0 : "1.5px solid var(--gj-line)", color: i === 2 ? "#fff" : swInk }}><div style={{ fontSize: 11, fontWeight: 700, opacity: .8 }}>{d}</div><div style={{ fontSize: 16, fontWeight: 900 }}>{n}</div></button>)}</div>
      <div style={{ display: "flex", gap: 7 }}>{["09:00", "10:00", "11:30"].map((s, i) => <button key={s} style={{ minHeight: 42, padding: "0 14px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, background: i === 1 ? "var(--gj-teal-soft)" : "#fff", border: i === 1 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: i === 1 ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{s}</button>)}</div>
    </Demo>
  </Block>
);

// ============================================================
// DONNÉES — tableau, notifications, étoiles, cover événement
// ============================================================
const DataComponents = () => (
  <Block title="Tableau, notifications, notation & cover" sub="Affichages de données des espaces admin, événements et notifications">
    <Demo label="Tableau de données" col>
      <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.6fr", gap: 12, padding: "11px 16px", background: "var(--gj-bg)", borderBottom: "1.5px solid var(--gj-line)", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}><span>Utilisateur</span><span>Rôle</span><span>Statut</span><span></span></div>
        {[["Awa Diop", "Bénéficiaire", "Actif"], ["Aïda Mbaye", "Recruteur", "Actif"]].map(([n, r, s], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.6fr", gap: 12, padding: "11px 16px", borderBottom: i === 0 ? "1px solid var(--gj-line)" : 0, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>{av(n.split(" ").map(x => x[0]).join(""), 30, "linear-gradient(135deg,var(--gj-teal),var(--gj-teal-deep))")}<span style={{ fontSize: 13, fontWeight: 800, color: swInk }}>{n}</span></div>
            <span style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>{r}</span>
            <span>{pill("var(--gj-green-soft)", "var(--gj-green-ink)", 0, 0, s)}</span>
            <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-grey-2)", justifySelf: "end" }}><use href="#i-chevron-right" /></svg>
          </div>
        ))}
      </div>
    </Demo>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Liste de notifications</div>
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 12, overflow: "hidden" }}>
          {[["i-employment", "Nouvelle offre pour toi", "2 h", true], ["i-calendar", "Rappel : atelier demain", "5 h", false]].map(([ic, t, time, unread], i) => (
            <div key={i} style={{ display: "flex", gap: 11, padding: "12px 14px", borderBottom: i === 0 ? "1px solid var(--gj-line)" : 0, background: unread ? "var(--gj-teal-soft)" : "#fff", alignItems: "center" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href={"#" + ic} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: unread ? 800 : 600, color: swInk }}>{t}</div><div style={{ fontSize: 11, color: "var(--gj-grey)" }}>il y a {time}</div></div>
              {unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gj-teal-deep)", flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Notation (étoiles) & cover événement</div>
        <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5].map(i => <svg key={i} viewBox="0 0 24 24" width="26" height="26"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.9 6.7 19.5l1.2-6L3.4 9.3l6-.7z" fill={i <= 4 ? "var(--gj-yellow)" : "none"} stroke={i <= 4 ? "var(--gj-yellow-deep)" : "var(--gj-line-strong)"} strokeWidth="1.4" strokeLinejoin="round" /></svg>)}
        </div>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1.5px solid var(--gj-line)" }}>
          <div style={{ height: 80, background: "var(--prog-yeah, linear-gradient(135deg,var(--gj-teal),var(--gj-teal-deep)))", position: "relative", padding: 10 }}>
            <div style={{ background: "rgba(255,255,255,.95)", color: "var(--gj-teal-deep)", borderRadius: 9, padding: "4px 8px", textAlign: "center", width: "fit-content", lineHeight: 1 }}><div style={{ fontSize: 18, fontWeight: 900 }}>22</div><div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Mai</div></div>
            <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.22)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>Atelier</span>
          </div>
          <div style={{ padding: 11 }}><div style={{ fontSize: 13, fontWeight: 800, color: swInk }}>Atelier CV</div></div>
        </div>
      </div>
    </div>
    <Demo label="Toast / message de confirmation" col>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--gj-ink)", color: "#fff", padding: "12px 16px", borderRadius: 11, fontSize: 13, fontWeight: 700, boxShadow: "var(--gj-shadow-md)", maxWidth: 360 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--gj-green)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg></span>
        <span style={{ flex: 1 }}>Candidature envoyée avec succès</span>
        <span style={{ color: "var(--gj-yellow)", fontWeight: 800, cursor: "pointer" }}>Annuler</span>
      </div>
    </Demo>
  </Block>
);

Object.assign(window, { Foundations, FormsKit, Surfaces, DataComponents, OtpField, ChoiceControls, Dropzone, A11ySelectors });
