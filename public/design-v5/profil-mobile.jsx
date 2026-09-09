/* eslint-disable */
// Profil Bénéficiaire — version MOBILE (390×844).
// Réutilise PhoneFrame, AppHeader, BottomNav, FooterCTA (phone.jsx).
// 2 états : consultation (default) + édition (formulaire).

// ---------------------------------------------------------------------
// Mobile atoms
// ---------------------------------------------------------------------
const mCard = {
  background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14,
  padding: 15, display: "flex", flexDirection: "column", gap: 12,
};
const mCardHead = (title, action) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <h2 style={{ fontSize: 15, fontWeight: 900, color: "var(--gj-ink)" }}>{title}</h2>
    {action}
  </div>
);
const mEditBtn = (
  <button style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)", padding: 4 }}>
    <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-settings" /></svg>Modifier
  </button>
);
const mChip = (label, tone = "neutral", removable) => {
  const tones = {
    neutral: { bg: "var(--gj-bg)", fg: "var(--gj-ink)", bd: "var(--gj-line)" },
    teal: { bg: "var(--gj-teal-soft)", fg: "var(--gj-teal-deep)", bd: "transparent" },
  };
  const t = tones[tone];
  return (
    <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: t.bg, color: t.fg, border: `1.5px solid ${t.bd}`, padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
      {label}
      {removable && <svg className="gj-icon" style={{ width: 12, height: 12, opacity: .5 }}><use href="#i-close" /></svg>}
    </span>
  );
};
const mField = (label, value, opts = {}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "9px 0", borderBottom: opts.last ? 0 : "1px solid var(--gj-line)" }}>
    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</span>
    <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--gj-ink)", fontFamily: opts.mono ? "ui-monospace, Menlo, monospace" : "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
      {value}
      {opts.verified && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "1px 7px", borderRadius: 999 }}><svg className="gj-icon" style={{ width: 10, height: 10 }}><use href="#i-check" /></svg>Vérifié</span>}
    </span>
  </div>
);
const mInput = (label, value, extra) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)" }}>{label}{extra}</span>
    <input defaultValue={value} style={{ minHeight: 48, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", fontSize: 16, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" }} />
  </label>
);
const mLang = (lang, level, pct) => (
  <div key={lang} style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ width: 92, flexShrink: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{lang}</div>
      <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{level}</div>
    </div>
    <div style={{ flex: 1, height: 7, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "var(--gj-teal)", borderRadius: 4 }} />
    </div>
  </div>
);
const mToggle = (on) => (
  <span style={{ width: 44, height: 26, borderRadius: 999, flexShrink: 0, position: "relative", background: on ? "var(--gj-teal)" : "var(--gj-line-strong)" }}>
    <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
  </span>
);

// ---------------------------------------------------------------------
// Mobile header card
// ---------------------------------------------------------------------
const MobileProfileHero = () => {
  const wrap = {
    background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)",
    color: "#fff", borderRadius: 16, padding: 18, position: "relative", overflow: "hidden", flexShrink: 0,
    display: "flex", flexDirection: "column", gap: 14,
  };
  const metaPill = { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", padding: "4px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 };
  return (
    <section style={wrap}>
      <span style={{ position: "absolute", right: -50, top: -55, width: 200, height: 200, background: "radial-gradient(circle, rgba(248,163,9,.2), transparent 60%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <div style={{ position: "relative", width: 72, height: 72, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--gj-teal), #19a657)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 26, boxShadow: "0 0 0 3px rgba(255,255,255,.18)" }}>
          AD
          <button style={{ position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: "50%", background: "var(--gj-yellow)", color: "var(--gj-ink)", border: "2px solid var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Changer la photo">
            <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-camera" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.15 }}>Awa Diop</h1>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 999, marginTop: 6 }}>
            <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check-circle" /></svg>MEMBRE CJS
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", position: "relative" }}>
        <span style={metaPill}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-yellow)" }}><use href="#i-pin" /></svg>Tambacounda</span>
        <span style={metaPill}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-yellow)" }}><use href="#i-users" /></svg>22 ans · Femme</span>
        <span style={metaPill}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-yellow)" }}><use href="#i-learning" /></svg>Bac+2</span>
      </div>
    </section>
  );
};

// Completion nudge
const MobileCompletion = () => (
  <div style={{ background: "linear-gradient(135deg, var(--gj-yellow-soft), #fff)", border: "1.5px solid var(--gj-yellow)", borderRadius: 14, padding: 15, display: "flex", flexDirection: "column", gap: 11 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 32, fontWeight: 900, color: "var(--gj-yellow-ink)", lineHeight: 1 }}>72%</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "var(--gj-ink)" }}>Profil presque complet</div>
        <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>Ajoute ton CV pour débloquer <b style={{ color: "var(--gj-yellow-ink)" }}>+18%</b> et 3× plus d'opps.</div>
      </div>
    </div>
    <div style={{ height: 7, background: "#fff", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: "72%", background: "var(--gj-yellow)" }} />
    </div>
    <button style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", border: 0, minHeight: 46, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-upload" /></svg>Téléverser mon CV
    </button>
  </div>
);

// ---------------------------------------------------------------------
// Section cards (mobile)
// ---------------------------------------------------------------------
const MobileTimeline = () => {
  const items = [
    { kind: "Formation", icon: "i-learning", tone: "teal", title: "Licence 2 — Gestion", org: "Univ. Assane Seck · à distance", date: "2023 — en cours", current: true },
    { kind: "Expérience", icon: "i-agriculture", tone: "yellow", title: "Stagiaire vente & récolte", org: "Coopérative maraîchère de Tamba", date: "3 mois · 2023" },
    { kind: "Formation", icon: "i-document", tone: "teal", title: "Baccalauréat série G", org: "Lycée de Tambacounda · Mention B", date: "2022" },
  ];
  const toneMap = {
    teal: { bg: "var(--gj-teal-soft)", fg: "var(--gj-teal-deep)" },
    yellow: { bg: "var(--gj-yellow-soft)", fg: "var(--gj-yellow-ink)" },
  };
  return (
    <div style={mCard}>
      {mCardHead("Formation & expériences", (
        <button style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)", padding: 4 }}>
          <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-plus" /></svg>Ajouter
        </button>
      ))}
      <div>
        {items.map((it, i, arr) => {
          const t = toneMap[it.tone];
          return (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: t.bg, color: t.fg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + it.icon} /></svg>
                </span>
                {i < arr.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--gj-line)", margin: "3px 0" }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 16 : 0, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.fg, background: t.bg, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>{it.kind}</span>
                  {it.current && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 7px", borderRadius: 999 }}>EN COURS</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", marginTop: 4 }}>{it.title}</div>
                <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>{it.org}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey-2)", marginTop: 2, fontWeight: 700 }}>{it.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MobileDocs = () => (
  <div style={mCard}>
    {mCardHead("CV & documents")}
    <div style={{ border: "2px dashed var(--gj-yellow)", background: "var(--gj-yellow-soft)", borderRadius: 12, padding: 13, display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-upload" /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--gj-ink)" }}>Ajoute ton CV</div>
        <div style={{ fontSize: 11, color: "var(--gj-yellow-ink)", marginTop: 1 }}>+18% du profil</div>
      </div>
    </div>
    {[
      { icon: "i-document", name: "Pièce d'identité (CNI)", meta: "Ajoutée · 1,2 Mo", st: "ok" },
      { icon: "i-learning", name: "Attestation de scolarité", meta: "Ajoutée · 840 Ko", st: "pending" },
    ].map((d, i) => {
      const map = { ok: { bg: "var(--gj-green-soft)", fg: "var(--gj-green-ink)", l: "Vérifié" }, pending: { bg: "var(--gj-blue-soft)", fg: "var(--gj-blue-ink)", l: "Ajouté" } };
      const s = map[d.st];
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, paddingTop: i === 0 ? 2 : 0 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "var(--gj-bg)", color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + d.icon} /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{d.name}</div>
            <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{d.meta}</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 800, color: s.fg, background: s.bg, padding: "3px 8px", borderRadius: 999, flexShrink: 0 }}>
            <svg className="gj-icon" style={{ width: 10, height: 10 }}><use href="#i-check" /></svg>{s.l}
          </span>
        </div>
      );
    })}
  </div>
);

const MobileInclusion = () => {
  const rows = [
    { icon: "i-eye", label: "Contraste élevé", on: false },
    { icon: "i-light", label: "Mode FALC (facile à lire)", on: false },
    { icon: "i-play", label: "Lecture audio en Wolof", on: false },
  ];
  return (
    <div style={mCard}>
      {mCardHead("Inclusion & accessibilité")}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 8 }}>Taille du texte</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["S", "M", "L", "XL"].map((s) => (
            <button key={s} style={{ flex: 1, minHeight: 44, borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: s === "S" ? 12 : s === "M" ? 14 : s === "L" ? 16 : 18, background: s === "M" ? "var(--gj-teal-soft)" : "#fff", border: s === "M" ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: s === "M" ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{s}</button>
          ))}
        </div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, paddingTop: 10, borderTop: "1px solid var(--gj-line)" }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href={"#" + r.icon} /></svg>
          </span>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)" }}>{r.label}</span>
          {mToggle(r.on)}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------
// MAIN — consultation
// ---------------------------------------------------------------------
const MobileProfile = ({ nav = () => {} }) => {
  const scroll = { flex: 1, overflowY: "auto", padding: "14px 14px 24px", display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" };
  return (
    <PhoneFrame>
      <AppHeader
        title="Mon profil"
        trailing={(
          <button onClick={() => nav("edit")} style={{ width: 38, height: 38, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-teal-deep)", flexShrink: 0 }} aria-label="Modifier">
            <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-settings" /></svg>
          </button>
        )}
      />
      <div style={scroll}>
        <MobileProfileHero />
        <MobileCompletion />

        <div style={mCard}>
          {mCardHead("Identité & contact", mEditBtn)}
          <div>
            {mField("Prénom · Nom", "Awa Diop")}
            {mField("Date de naissance", "12 mars 2004 · 22 ans")}
            {mField("Sexe", "Femme")}
            {mField("N° CNI", "1 2004 1978 00456", { mono: true })}
            {mField("Téléphone", "+221 77 123 45 67", { verified: true })}
            {mField("E-mail", "awa.diop@gmail.com")}
            {mField("Région · Commune", "Tambacounda", { last: true })}
          </div>
        </div>

        <div style={mCard}>
          {mCardHead("Objectif & secteurs", mEditBtn)}
          <div style={{ background: "var(--gj-teal-soft)", borderRadius: 11, padding: 13, display: "flex", gap: 11 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-target" /></svg>
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)", lineHeight: 1.45 }}>
              Lancer une micro-entreprise de maraîchage et obtenir un financement de démarrage.
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {mChip("Agriculture", "teal")}
            {mChip("Entrepreneuriat", "teal")}
            {mChip("Environnement", "teal")}
          </div>
        </div>

        <div style={mCard}>
          {mCardHead("Compétences & langues", mEditBtn)}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {["Maraîchage", "Gestion de projet", "Comptabilité", "Bureautique", "Réseaux sociaux", "Vente"].map((s) => mChip(s))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, paddingTop: 4, borderTop: "1px solid var(--gj-line)" }}>
            {mLang("Wolof", "Langue maternelle", 100)}
            {mLang("Français", "Courant", 82)}
            {mLang("Anglais", "Intermédiaire", 50)}
            {mLang("Pulaar", "Notions", 30)}
          </div>
        </div>

        <MobileTimeline />
        <MobileDocs />
        <MobileInclusion />
      </div>
      <BottomNav active="profile" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// MAIN — édition (formulaire)
// ---------------------------------------------------------------------
const MobileProfileEdit = ({ nav = () => {} }) => {
  const scroll = { flex: 1, overflowY: "auto", padding: "14px 14px 20px", display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" };
  return (
    <PhoneFrame>
      <AppHeader title="Modifier le profil" subtitle="Brouillon enregistré" onBack={() => nav("view")} />
      <div style={scroll}>
        {/* avatar */}
        <div style={{ ...mCard, flexDirection: "row", alignItems: "center", gap: 13 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--gj-teal), #19a657)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22 }}>AD</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>Photo de profil</div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>+4% du profil</div>
          </div>
          <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "10px 13px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Changer</button>
        </div>

        <div style={mCard}>
          {mCardHead("Identité & contact")}
          {mInput("Prénom", "Awa")}
          {mInput("Nom", "Diop")}
          {mInput("Date de naissance", "12/03/2004")}
          {mInput("Sexe", "Femme")}
          {mInput("N° CNI", "1 2004 1978 00456")}
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)" }}>Téléphone <span style={{ color: "var(--gj-green-ink)" }}>· vérifié</span></span>
            <div style={{ minHeight: 48, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", fontSize: 16, color: "var(--gj-grey-2)", background: "var(--gj-bg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              +221 77 123 45 67
              <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-green-ink)" }}><use href="#i-check-circle" /></svg>
            </div>
          </label>
          {mInput("E-mail", "awa.diop@gmail.com")}
          {mInput("Région · Commune", "Tambacounda")}
        </div>

        <div style={mCard}>
          {mCardHead("Objectif & secteurs")}
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)" }}>Mon objectif</span>
            <textarea defaultValue="Lancer une micro-entreprise de maraîchage et obtenir un financement de démarrage." rows={3} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none", resize: "none", lineHeight: 1.5 }} />
          </label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {mChip("Agriculture", "teal", true)}
            {mChip("Entrepreneuriat", "teal", true)}
            {mChip("Environnement", "teal", true)}
            <button style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px dashed var(--gj-line-strong)", color: "var(--gj-teal-deep)", padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-plus" /></svg>Ajouter
            </button>
          </div>
        </div>
      </div>
      <FooterCTA primary="Enregistrer" secondary="Annuler" onPrimary={() => nav("view")} onSecondary={() => nav("view")} />
    </PhoneFrame>
  );
};

const MobileProfileApp = ({ start = "view" }) => {
  const [s, setS] = React.useState(start);
  const nav = (x) => setS(x);
  if (s === "edit") return <MobileProfileEdit nav={nav} />;
  return <MobileProfile nav={nav} />;
};

Object.assign(window, { MobileProfile, MobileProfileEdit, MobileProfileApp });
