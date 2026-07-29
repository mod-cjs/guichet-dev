/* eslint-disable */
// Lot 14 — Bibliothèque de composants (UI kit). Référence visuelle web + mobile.
// Autonome : réutilise tokens, icons, PhoneFrame.

// ---- petites primitives partagées ----
const swInk = "var(--gj-ink)";
const Demo = ({ children, label, col }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</div>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: col ? "stretch" : "center", flexDirection: col ? "column" : "row" }}>{children}</div>
  </div>
);
const Block = ({ title, sub, children }) => (
  <section style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18, breakInside: "avoid" }}>
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 900, color: swInk }}>{title}</h2>
      {sub && <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 3 }}>{sub}</div>}
    </div>
    {children}
  </section>
);

// ===== BOUTONS =====
const btn = (bg, fg, bd) => ({ background: bg, color: fg, border: bd || 0, padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 });
const Buttons = () => (
  <Block title="Boutons" sub="Primaire teal · secondaire bordé · jaune (action mise en avant) · danger · icône">
    <Demo label="Actions">
      <button style={btn("var(--gj-teal-deep)", "#fff")}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-check" /></svg>Primaire</button>
      <button style={btn("#fff", "var(--gj-teal-deep)", "1.5px solid var(--gj-line)")}>Secondaire</button>
      <button style={btn("var(--gj-yellow)", "var(--gj-ink)")}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-bolt" /></svg>Mise en avant</button>
      <button style={btn("#fff", "var(--gj-red)", "1.5px solid var(--gj-line)")}>Danger</button>
      <button style={{ ...btn("transparent", "var(--gj-teal-deep)"), padding: "11px 6px" }}>Lien</button>
    </Demo>
    <Demo label="Tailles & icône">
      <button style={{ ...btn("var(--gj-teal-deep)", "#fff"), padding: "8px 13px", fontSize: 12 }}>Petit</button>
      <button style={btn("var(--gj-teal-deep)", "#fff")}>Moyen</button>
      <button style={{ ...btn("var(--gj-teal-deep)", "#fff"), minHeight: 50, padding: "0 24px", fontSize: 15 }}>Grand</button>
      <button style={{ width: 42, height: 42, borderRadius: 10, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Icône"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bookmark" /></svg></button>
    </Demo>
  </Block>
);

// ===== ONGLETS =====
const Segmented = ({ items, value, onChange }) => (
  <div style={{ display: "inline-flex", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 5 }}>
    {items.map(([id, label, n]) => {
      const on = id === value;
      return (
        <span key={id} onClick={() => onChange(id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", background: on ? "var(--gj-teal-deep)" : "transparent", color: on ? "#fff" : "var(--gj-grey)" }}>
          {label}{n != null && <span style={{ fontSize: 11, fontWeight: 800, background: on ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: on ? "#fff" : "var(--gj-grey)", padding: "1px 7px", borderRadius: 999 }}>{n}</span>}
        </span>
      );
    })}
  </div>
);
const Tabs = () => {
  const [v, setV] = React.useState("all");
  const [v2, setV2] = React.useState("a");
  return (
    <Block title="Onglets (segmented)" sub="Le contrôle d'onglet unique de la plateforme — actif teal + badge compteur. Web et mobile (pleine largeur).">
      <Demo label="Avec compteur"><Segmented items={[["all", "Toutes", 6], ["cours", "En cours", 4], ["clos", "Clôturées", 2]]} value={v} onChange={setV} /></Demo>
      <Demo label="Sans compteur"><Segmented items={[["a", "Inscrits"], ["b", "À venir"], ["c", "Passés"]]} value={v2} onChange={setV2} /></Demo>
    </Block>
  );
};

// ===== CHIPS / FILTRES =====
const Chips = () => {
  const [sel, setSel] = React.useState(0);
  const items = ["Tous", "Ateliers", "Forums", "Formations", "Webinaires", "En ligne"];
  return (
    <Block title="Chips de filtre" sub="Filtres de catégorie — défilants, sélection unique. Distincts des onglets.">
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {items.map((c, i) => (
          <button key={c} onClick={() => setSel(i)} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === sel ? "var(--gj-teal-deep)" : "#fff", color: i === sel ? "#fff" : "var(--gj-grey)", border: i === sel ? 0 : "1.5px solid var(--gj-line)" }}>{c}</button>
        ))}
      </div>
      <Demo label="Chips d'étiquette (compétences)">
        {["Python", "SQL", "Maraîchage", "Gestion"].map((s) => <span key={s} style={{ fontSize: 12, fontWeight: 700, color: "var(--gj-grey)", background: "var(--gj-bg)", border: "1px solid var(--gj-line)", padding: "5px 11px", borderRadius: 999 }}>{s}</span>)}
      </Demo>
    </Block>
  );
};

// ===== PASTILLES DE STATUT =====
const pill = (soft, ink, dot, icon, label) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800, color: ink, background: soft, border: dot ? `1px solid ${dot}` : 0, padding: "4px 11px", borderRadius: 999 }}>
    {icon && <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + icon} /></svg>}{label}
  </span>
);
const Badges = () => (
  <Block title="Pastilles de statut & badges" sub="Couleurs sémantiques : vert succès · jaune attente · bleu info · rouge alerte · gris neutre">
    <Demo label="Statuts">
      {pill("var(--gj-green-soft)", "var(--gj-green-ink)", "var(--gj-green)", "i-check-circle", "Acceptée")}
      {pill("var(--gj-yellow-soft)", "var(--gj-yellow-ink)", "var(--gj-yellow-deep)", "i-clock", "En attente")}
      {pill("var(--gj-blue-soft)", "var(--gj-blue-ink)", "var(--gj-blue)", "i-eye", "Vue")}
      {pill("var(--gj-red-soft)", "var(--gj-red-ink)", "var(--gj-red)", "i-close", "Refusée")}
      {pill("var(--gj-bg)", "var(--gj-grey)", "var(--gj-line-strong)", "i-check", "Envoyée")}
    </Demo>
    <Demo label="Compteurs & notifications">
      <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>Membre CJS</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--gj-green-ink)" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--gj-green)" }} />En ligne</span>
    </Demo>
  </Block>
);

// ===== CHAMPS DE FORMULAIRE =====
const Fields = () => (
  <Block title="Champs de formulaire" sub="Saisie, zone de texte, sélecteur de créneau, pas-à-pas numérique, interrupteur">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: swInk }}>Libellé du champ</span>
        <input defaultValue="Awa Diop" aria-label="Libellé du champ" style={{ minHeight: 46, border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 13px", fontSize: 14, fontFamily: "inherit", color: swInk, background: "var(--gj-bg)", outline: "none" }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: swInk }}>Champ vérifié</span>
        <div style={{ minHeight: 46, border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 13px", fontSize: 14, color: "var(--gj-grey-2)", background: "var(--gj-bg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>+221 77 123 45 67<svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-green-ink)" }}><use href="#i-check-circle" /></svg></div>
      </label>
    </div>
    <Demo label="Recherche">
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", minHeight: 44, width: 280 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
        <input placeholder="Rechercher…" aria-label="Rechercher" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 13.5, fontFamily: "inherit", color: swInk }} />
      </div>
    </Demo>
    <Demo label="Interrupteur & pas-à-pas">
      <span style={{ width: 46, height: 27, borderRadius: 999, background: "var(--gj-teal)", position: "relative", display: "inline-block" }}><span style={{ position: "absolute", top: 3, left: 22, width: 21, height: 21, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} /></span>
      <span style={{ width: 46, height: 27, borderRadius: 999, background: "var(--gj-line-strong)", position: "relative", display: "inline-block" }}><span style={{ position: "absolute", top: 3, left: 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} /></span>
      <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid var(--gj-line)", borderRadius: 9, overflow: "hidden", background: "var(--gj-bg)" }}>
        <button style={{ width: 40, height: 40, border: 0, borderRight: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 800, color: "var(--gj-grey)" }}>–</button>
        <span style={{ width: 44, textAlign: "center", fontSize: 15, fontWeight: 800, color: swInk }}>8</span>
        <button style={{ width: 40, height: 40, border: 0, borderLeft: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 800, color: "var(--gj-grey)" }}>+</button>
      </div>
    </Demo>
  </Block>
);

// ===== AVATARS =====
const av = (init, size, grad) => <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: grad, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36 }}>{init}</span>;
const Avatars = () => (
  <Block title="Avatars" sub="Initiales sur dégradé — teal (jeune), bleu (recruteur), doré (agent/admin)">
    <Demo>
      {av("AD", 32, "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))")}
      {av("AD", 40, "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))")}
      {av("AM", 48, "linear-gradient(135deg, var(--gj-blue), var(--gj-blue-ink))")}
      <span style={{ position: "relative", display: "inline-flex" }}>{av("CN", 48, "linear-gradient(135deg, var(--gj-yellow), #C97F03)")}<span style={{ position: "absolute", right: 0, bottom: 0, width: 13, height: 13, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} /></span>
      <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 26, height: 26 }}><use href="#i-profile" /></svg></span>
    </Demo>
  </Block>
);

// ===== CARTES =====
const Cards = () => (
  <Block title="Cartes & listes" sub="Carte standard, ligne de liste, carte d'indicateur (KPI)">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
      <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16, display: "flex", gap: 13, alignItems: "center" }}>
        <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-employment" /></svg></span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14.5, fontWeight: 800, color: swInk }}>Titre de la carte</div><div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>Sous-titre · métadonnée</div></div>
        {pill("var(--gj-green-soft)", "var(--gj-green-ink)", 0, 0, "Actif")}
      </div>
      <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gj-yellow-soft)", color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-calendar" /></svg></span>
        <div style={{ fontSize: 28, fontWeight: 900, color: swInk, marginTop: 10, lineHeight: 1 }}>1 284</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: swInk, marginTop: 5 }}>Indicateur (KPI)</div>
        <div style={{ fontSize: 11, color: "var(--gj-green-ink)", marginTop: 2, fontWeight: 700 }}>+12% ce mois</div>
      </div>
    </div>
    <Demo label="Nudge / encart d'information" col>
      <div style={{ display: "flex", gap: 11, background: "var(--gj-teal-soft)", borderRadius: 12, padding: "13px 15px", alignItems: "center" }}>
        <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href="#i-info" /></svg>
        <div style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 600 }}>Encart d'information contextuel, ton teal.</div>
      </div>
    </Demo>
  </Block>
);

// ===== PROGRESSION =====
const Progress = () => (
  <Block title="Progression" sub="Barre, jauge circulaire, pipeline à étapes, timeline">
    <Demo label="Barres" col>
      <div style={{ height: 8, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden", width: 280 }}><div style={{ height: "100%", width: "72%", background: "linear-gradient(90deg, var(--gj-teal), var(--gj-teal-deep))", borderRadius: 4 }} /></div>
    </Demo>
    <Demo label="Jauge & pipeline">
      <svg width="58" height="58" viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" fill="none" stroke="var(--gj-line)" strokeWidth="6" /><circle cx="29" cy="29" r="24" fill="none" stroke="var(--gj-teal)" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * 0.28} transform="rotate(-90 29 29)" /><text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 15, fontWeight: 900, fill: swInk }}>72%</text></svg>
      <div style={{ display: "flex", alignItems: "center", flex: 1, maxWidth: 240 }}>
        {[1, 2, 3, 4, 5].map((n, i) => (<React.Fragment key={n}><span style={{ width: 11, height: 11, borderRadius: "50%", background: n <= 3 ? "var(--gj-teal)" : "var(--gj-line)" }} />{i < 4 && <span style={{ flex: 1, height: 2.5, background: n < 3 ? "var(--gj-teal)" : "var(--gj-line)" }} />}</React.Fragment>))}
      </div>
    </Demo>
  </Block>
);

// ===== WEB SHOWCASE =====
const WebKit = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <Buttons /><Tabs /><Chips /><Badges /><Fields /><Avatars /><Cards /><Progress />
  </div>
);

// ===== MOBILE SHOWCASE (dans des PhoneFrame) =====
const MobTabsScreen = () => {
  const [v, setV] = React.useState("all");
  return (
    <PhoneFrame>
      <AppHeader title="Onglets & filtres" onBack={() => {}} />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 14, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Onglets (pleine largeur)</div>
          <div style={{ display: "flex", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 5 }}>
            {[["all", "Toutes", 6], ["cours", "En cours", 4], ["clos", "Clôt.", 2]].map(([id, label, n]) => {
              const on = id === v;
              return <span key={id} onClick={() => setV(id)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer", background: on ? "var(--gj-teal-deep)" : "transparent", color: on ? "#fff" : "var(--gj-grey)" }}>{label}<span style={{ fontSize: 11, fontWeight: 800, background: on ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: on ? "#fff" : "var(--gj-grey)", padding: "1px 6px", borderRadius: 999 }}>{n}</span></span>;
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Chips de filtre (défilants)</div>
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
            {["Tous", "Ateliers", "Forums", "Formations", "Webinaires"].map((c, i) => <span key={c} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Boutons pleine largeur</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <button style={{ ...btn("var(--gj-teal-deep)", "#fff"), minHeight: 50, width: "100%", fontSize: 15 }}>Action primaire</button>
            <button style={{ ...btn("#fff", "var(--gj-teal-deep)", "1.5px solid var(--gj-line)"), minHeight: 48, width: "100%" }}>Action secondaire</button>
          </div>
        </div>
      </div>
      <BottomNav active="home" />
    </PhoneFrame>
  );
};

const MobCardsScreen = () => (
  <PhoneFrame>
    <AppHeader title="Cartes & statuts" onBack={() => {}} />
    <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 13, display: "flex", gap: 12, alignItems: "center" }}>
        {av("AD", 44, "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))")}
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 800, color: swInk }}>Élément de liste</div><div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>Sous-titre · métadonnée</div></div>
        <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["1 284", "Inscrits", "teal"], ["72%", "Profil", "yellow"]].map(([v, l, t], i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: t === "teal" ? "var(--gj-teal-deep)" : "var(--gj-yellow-ink)", lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: swInk, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {pill("var(--gj-green-soft)", "var(--gj-green-ink)", 0, "i-check-circle", "Acceptée")}
        {pill("var(--gj-yellow-soft)", "var(--gj-yellow-ink)", 0, "i-clock", "En attente")}
        {pill("var(--gj-red-soft)", "var(--gj-red-ink)", 0, "i-close", "Refusée")}
      </div>
      <div style={{ display: "flex", gap: 11, background: "var(--gj-teal-soft)", borderRadius: 12, padding: "13px 15px", alignItems: "center" }}>
        <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href="#i-info" /></svg>
        <div style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 600 }}>Encart d'information contextuel.</div>
      </div>
    </div>
    <BottomNav active="home" />
  </PhoneFrame>
);

Object.assign(window, { WebKit, MobTabsScreen, MobCardsScreen });
