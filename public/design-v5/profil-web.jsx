/* eslint-disable */
// Profil Bénéficiaire — version WEB (desktop).
// Réutilise BenefSidebar + BenefTopBar (web-dashboard.jsx).
// 2 états : consultation (default) + édition (formulaire).

// ---------------------------------------------------------------------
// Small shared atoms
// ---------------------------------------------------------------------
const profCard = {
  background: "#fff", border: "1.5px solid var(--gj-line)",
  borderRadius: 12, padding: 18,
  display: "flex", flexDirection: "column", gap: 14,
};
const profCardHead = (title, action) => (
  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
    <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-ink)" }}>{title}</h2>
    {action}
  </div>
);
const editLink = (label = "Modifier", onClick) => (
  <button onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit",
    fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)",
  }}>
    <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-settings" /></svg>{label}
  </button>
);

// Circular completion meter
const CompletionRing = ({ pct = 72, size = 96, stroke = 9 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth={stroke} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--gj-yellow)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} />
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 22, fontWeight: 900, fill: "#fff" }}>{pct}%</text>
      <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 11, fontWeight: 800, fill: "rgba(255,255,255,.8)", letterSpacing: ".5px" }}>COMPLÉTÉ</text>
    </svg>
  );
};

// Field display row (consultation)
const FieldRow = ({ label, value, mono, verified, missing }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</div>
    <div style={{
      fontSize: 14, fontWeight: missing ? 700 : 700,
      color: missing ? "var(--gj-grey-2)" : "var(--gj-ink)",
      fontFamily: mono ? "ui-monospace, Menlo, monospace" : "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      {missing ? <span style={{ fontStyle: "italic", fontWeight: 600 }}>Non renseigné</span> : value}
      {verified && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "1px 7px", borderRadius: 999 }}>
          <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-check" /></svg>Vérifié
        </span>
      )}
    </div>
  </div>
);

// Editable input (édition)
const FieldInput = ({ label, value, hint, full }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, gridColumn: full ? "1 / -1" : "auto" }}>
    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)" }}>{label}</span>
    <input defaultValue={value} placeholder={hint} style={{
      minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 9,
      padding: "0 13px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)",
      background: "var(--gj-bg)", outline: "none",
    }} />
  </label>
);

const Chip = ({ children, removable, tone = "neutral" }) => {
  const tones = {
    neutral: { bg: "var(--gj-bg)", fg: "var(--gj-ink)", bd: "var(--gj-line)" },
    teal: { bg: "var(--gj-teal-soft)", fg: "var(--gj-teal-deep)", bd: "transparent" },
    yellow: { bg: "var(--gj-yellow-soft)", fg: "var(--gj-yellow-ink)", bd: "transparent" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: t.bg, color: t.fg, border: `1.5px solid ${t.bd}`,
      padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700,
    }}>
      {children}
      {removable && <svg className="gj-icon" style={{ width: 12, height: 12, opacity: .55, cursor: "pointer" }}><use href="#i-close" /></svg>}
    </span>
  );
};

const LangBar = ({ lang, level, pct }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ width: 110, flexShrink: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{lang}</div>
      <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{level}</div>
    </div>
    <div style={{ flex: 1, height: 7, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "var(--gj-teal)", borderRadius: 4 }} />
    </div>
  </div>
);

// ---------------------------------------------------------------------
// Profile header band
// ---------------------------------------------------------------------
const ProfileHeader = ({ onEdit }) => {
  const wrap = {
    background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)",
    color: "#fff", borderRadius: 16, padding: "22px 26px",
    position: "relative", overflow: "hidden", flexShrink: 0,
    display: "flex", alignItems: "center", gap: 22,
  };
  const glow = { position: "absolute", right: -60, top: -70, width: 260, height: 260, background: "radial-gradient(circle, rgba(248,163,9,.18), transparent 60%)", pointerEvents: "none" };
  const avatar = {
    width: 92, height: 92, borderRadius: "50%", flexShrink: 0, position: "relative",
    background: "linear-gradient(135deg, var(--gj-teal), #19a657)",
    color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 34, boxShadow: "0 0 0 4px rgba(255,255,255,.18)",
  };
  const camBtn = {
    position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: "50%",
    background: "var(--gj-yellow)", color: "var(--gj-ink)", border: "2.5px solid var(--gj-teal-deep)",
    display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };
  const metaPill = {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)",
    padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
  };
  return (
    <section style={wrap}>
      <span style={glow} />
      <div style={{ position: "relative", ...avatar, overflow: "visible" }}>
        <span style={{ position: "relative" }}>AD</span>
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>
          <image-slot id="profil-awa-web" shape="circle" fit="cover" placeholder=" "></image-slot>
        </span>
        <button style={camBtn} aria-label="Changer la photo"><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-camera" /></svg></button>
      </div>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>Awa Diop</h1>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "3px 9px", borderRadius: 999, letterSpacing: ".3px" }}>
            <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-check-circle" /></svg>MEMBRE CJS
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <span style={metaPill}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-yellow)" }}><use href="#i-pin" /></svg>Tambacounda</span>
          <span style={metaPill}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-yellow)" }}><use href="#i-users" /></svg>22 ans · Femme</span>
          <span style={metaPill}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-yellow)" }}><use href="#i-learning" /></svg>Licence 2 Gestion</span>
          <span style={metaPill}><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-yellow)" }}><use href="#i-calendar" /></svg>Membre depuis 03/2025</span>
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 9, flexShrink: 0, alignItems: "stretch" }}>
        <button onClick={onEdit} style={{
          background: "var(--gj-yellow)", color: "var(--gj-ink)", border: 0,
          padding: "10px 16px", borderRadius: 8, fontWeight: 800, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap",
        }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-settings" /></svg>Modifier mon profil</button>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------
// Right rail cards
// ---------------------------------------------------------------------
const CompletionChecklist = () => {
  const items = [
    { label: "Identité & contact", done: true },
    { label: "Objectif & secteurs visés", done: true },
    { label: "Compétences & langues", done: true },
    { label: "Formation", done: true },
    { label: "Téléphone vérifié", done: true },
    { label: "Ajouter ton CV", done: false, gain: "+18%", strong: true },
    { label: "Une expérience pro", done: false, gain: "+6%" },
    { label: "Photo de profil", done: false, gain: "+4%" },
  ];
  return (
    <div style={profCard}>
      {profCardHead("Complétion du profil")}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 34, fontWeight: 900, color: "var(--gj-teal-deep)", lineHeight: 1 }}>72%</div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "72%", background: "linear-gradient(90deg, var(--gj-teal), var(--gj-teal-deep))", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 5 }}>Plus que 3 étapes pour un profil béton.</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9,
            background: it.strong ? "var(--gj-yellow-soft)" : "transparent",
            border: it.strong ? "1.5px solid var(--gj-yellow)" : "1.5px solid transparent",
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: it.done ? "var(--gj-green)" : "#fff",
              border: it.done ? 0 : "1.5px solid var(--gj-line-strong)",
              color: "#fff",
            }}>
              {it.done && <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-check" /></svg>}
            </span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: it.strong ? 800 : 600, color: it.done ? "var(--gj-grey)" : "var(--gj-ink)", textDecoration: it.done ? "none" : "none" }}>{it.label}</span>
            {it.gain && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)" }}>{it.gain}</span>}
            {!it.done && <svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg>}
          </div>
        ))}
      </div>
    </div>
  );
};

const DocItem = ({ icon, name, meta, status }) => {
  const map = {
    ok: { bg: "var(--gj-green-soft)", fg: "var(--gj-green-ink)", label: "Vérifié", ic: "i-check" },
    pending: { bg: "var(--gj-blue-soft)", fg: "var(--gj-blue-ink)", label: "Ajouté", ic: "i-check" },
    missing: { bg: "var(--gj-yellow-soft)", fg: "var(--gj-yellow-ink)", label: "Manquant", ic: "i-plus" },
  };
  const s = map[status];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--gj-line)" }}>
      <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: "var(--gj-bg)", color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + icon} /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{meta}</div>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: s.fg, background: s.bg, padding: "3px 9px", borderRadius: 999 }}>
        <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + s.ic} /></svg>{s.label}
      </span>
    </div>
  );
};

const DocumentsCard = () => (
  <div style={profCard}>
    {profCardHead("CV & documents")}
    {/* CV upload nudge */}
    <div style={{
      border: "2px dashed var(--gj-yellow)", background: "var(--gj-yellow-soft)",
      borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-upload" /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--gj-ink)" }}>Ajoute ton CV</div>
        <div style={{ fontSize: 11.5, color: "var(--gj-yellow-ink)", marginTop: 1 }}>PDF, JPG ou photo · débloque +18% du profil</div>
      </div>
      <button style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", border: 0, padding: "9px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Téléverser</button>
    </div>
    <div>
      <DocItem icon="i-document" name="Pièce d'identité (CNI)" meta="Ajoutée le 14/03/2025 · 1,2 Mo" status="ok" />
      <DocItem icon="i-learning" name="Attestation de scolarité" meta="Ajoutée le 02/04/2025 · 840 Ko" status="pending" />
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0" }}>
        <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: "var(--gj-bg)", color: "var(--gj-grey-2)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-mail" /></svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-grey)" }}>Lettre de motivation type</div>
          <div style={{ fontSize: 11, color: "var(--gj-grey-2)", marginTop: 1 }}>Recommandé pour candidater plus vite</div>
        </div>
        <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "7px 12px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>
      </div>
    </div>
  </div>
);

// Inclusion toggles (maps to tokens.css accessibility data-attributes)
const Toggle = ({ on }) => (
  <span style={{
    width: 42, height: 24, borderRadius: 999, flexShrink: 0, position: "relative",
    background: on ? "var(--gj-teal)" : "var(--gj-line-strong)", transition: ".15s", cursor: "pointer",
  }}>
    <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: ".15s" }} />
  </span>
);

const InclusionCard = () => {
  const rows = [
    { icon: "i-eye", label: "Contraste élevé", sub: "Renforce la lisibilité", on: false },
    { icon: "i-light", label: "Mode FALC", sub: "Facile à lire et à comprendre", on: false },
    { icon: "i-play", label: "Lecture audio en Wolof", sub: "Écouter les contenus", on: false },
  ];
  const sizes = ["S", "M", "L", "XL"];
  return (
    <div style={profCard}>
      {profCardHead("Inclusion & accessibilité")}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 8 }}>Taille du texte</div>
        <div style={{ display: "flex", gap: 6 }}>
          {sizes.map((s) => (
            <button key={s} style={{
              flex: 1, minHeight: 40, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
              fontWeight: 800, fontSize: s === "S" ? 12 : s === "M" ? 14 : s === "L" ? 16 : 18,
              background: s === "M" ? "var(--gj-teal-soft)" : "#fff",
              border: s === "M" ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)",
              color: s === "M" ? "var(--gj-teal-deep)" : "var(--gj-grey)",
            }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderTop: "1px solid var(--gj-line)" }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + r.icon} /></svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{r.sub}</div>
            </div>
            <Toggle on={r.on} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Page dédiée — Inclusion & accessibilité (onglet sidebar "incl")
// ---------------------------------------------------------------------
const InclusionPage = () => {
  const [lang, setLang] = React.useState("fr");
  const T = {
    fr: { title: "Inclusion & accessibilité", sub: "Adapte l'application à tes besoins. Tes préférences sont enregistrées et appliquées partout.", langTitle: "Langue de l'application", langSub: "Choisis la langue de l'interface et des contenus audio." },
    wo: { title: "Boole ak yokkute", sub: "Defaral app bi ci sa soxla. Sa tànneef yi dañu leen di denc te jëfandikoo fépp.", langTitle: "Làkku app bi", langSub: "Tànnal làkk wu nga bëgg ci interface bi ak audio yi." },
    ff: { title: "Naatnaagu e jokkondiral", sub: "Hawrindir jaaynde nden e haaju maa. Suɓagol maa ina maraa kala nokku.", langTitle: "Ɗemngal jaaynde nden", langSub: "Suɓo ɗemngal ngal njiɗɗaa wonande interface e audio." },
  };
  const t = T[lang] || T.fr;
  const langs = [
    { code: "fr", label: "Français", sub: "Langue officielle" },
    { code: "wo", label: "Wolof", sub: "Wolof" },
    { code: "ff", label: "Pulaar / Peul", sub: "Pulaar" },
    { code: "srr", label: "Sérère", sub: "Sereer" },
    { code: "dyu", label: "Diola", sub: "Joola" },
    { code: "mnk", label: "Mandingue", sub: "Mandinka" },
  ];
  const sizes = [["S", "Petit", 13], ["M", "Normal", 15], ["L", "Grand", 18], ["XL", "Très grand", 22]];
  const groups = [
    { title: "Vision", rows: [
      { icon: "i-eye", label: "Contraste élevé", sub: "Renforce le contraste des textes et bordures", on: false },
      { icon: "i-light", label: "Réduire les animations", sub: "Limite les mouvements à l'écran", on: false },
      { icon: "i-resources", label: "Espacement du texte", sub: "Interlignes et lettres plus aérés", on: false },
    ]},
    { title: "Lecture & compréhension", rows: [
      { icon: "i-light", label: "Mode FALC", sub: "Facile à lire et à comprendre — phrases simplifiées", on: false },
      { icon: "i-play", label: "Lecture audio en Wolof", sub: "Écouter les contenus à voix haute", on: true },
      { icon: "i-play", label: "Lecture audio en Français", sub: "Écouter les contenus à voix haute", on: false },
    ]},
    { title: "Navigation", rows: [
      { icon: "i-target", label: "Navigation clavier renforcée", sub: "Met en évidence l'élément sélectionné", on: true },
      { icon: "i-search", label: "Guide de lecture", sub: "Une règle suit le curseur pour garder la ligne", on: false },
    ]},
  ];
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* hero */}
      <section style={{ background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)", color: "#fff", borderRadius: 16, padding: "22px 26px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <span style={{ position: "absolute", right: -50, top: -60, width: 220, height: 220, background: "radial-gradient(circle, rgba(248,163,9,.18), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: "rgba(255,255,255,.14)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 26, height: 26, color: "var(--gj-yellow)" }}><use href="#i-eye" /></svg></span>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>{t.title}</h1>
            <div style={{ fontSize: 13, opacity: .9, marginTop: 4, lineHeight: 1.45, maxWidth: 480 }}>{t.sub}</div>
          </div>
        </div>
      </section>

      {/* langue de l'application */}
      <div style={{ ...profCard }}>
        {profCardHead(t.langTitle)}
        <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: -4, marginBottom: 4 }}>{t.langSub}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {langs.map((l) => {
            const on = l.code === lang;
            return (
            <button key={l.code} onClick={() => setLang(l.code)} style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 56, padding: "0 14px", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", textAlign: "left", background: on ? "var(--gj-teal-soft)" : "#fff", border: on ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: on ? "var(--gj-teal-deep)" : "var(--gj-bg)", color: on ? "#fff" : "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, textTransform: "uppercase" }}>{l.code.slice(0, 2)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{l.label}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{l.sub}</span>
              </span>
              {on && <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href="#i-check-circle" /></svg>}
            </button>
          ); })}
        </div>
      </div>

      {/* taille du texte */}
      <div style={{ ...profCard }}>
        {profCardHead("Taille du texte")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {sizes.map(([k, lbl, fs], i) => (
            <button key={k} style={{ minHeight: 72, borderRadius: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, background: i === 1 ? "var(--gj-teal-soft)" : "#fff", border: i === 1 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: i === 1 ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>
              <span style={{ fontWeight: 900, fontSize: fs }}>Aa</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{lbl}</span>
            </button>
          ))}
        </div>
      </div>

      {/* groupes de réglages */}
      {groups.map((g, gi) => (
        <div key={gi} style={{ ...profCard }}>
          {profCardHead(g.title)}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {g.rows.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0", borderTop: i === 0 ? 0 : "1px solid var(--gj-line)" }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + r.icon} /></svg></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>{r.sub}</div>
                </div>
                <Toggle on={r.on} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* démo FALC — avant/après réel */}
      <FalcDemoCard />

      {/* rappel barre flottante */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--gj-teal-soft)", borderRadius: 12, padding: "14px 16px" }}>
        <svg className="gj-icon" style={{ width: 20, height: 20, color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href="#i-info" /></svg>
        <div style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>Ces réglages sont aussi accessibles partout grâce au <b>bouton d'accessibilité</b> flottant, en bas à gauche de l'écran.</div>
      </div>
    </div>
  );
};

// Démo FALC : le même contenu en version standard et en version Facile À Lire et à Comprendre
const FalcDemoCard = () => {
  const [falc, setFalc] = React.useState(false);
  return (
    <div style={{ ...profCard }}>
      {profCardHead("Aperçu du mode FALC")}
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: -4, marginBottom: 10 }}>Le même contenu, réécrit en Facile À Lire et à Comprendre. Essaie :</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[[false, "Texte standard"], [true, "Version FALC"]].map(([v, lbl]) => (
          <button key={lbl} onClick={() => setFalc(v)} style={{ flex: 1, minHeight: 44, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, background: falc === v ? "var(--gj-teal-deep)" : "#fff", color: falc === v ? "#fff" : "var(--gj-grey)", border: falc === v ? 0 : "1.5px solid var(--gj-line)" }}>{lbl}</button>
        ))}
      </div>
      {!falc ? (
        <div style={{ background: "var(--gj-bg)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 14.5, fontWeight: 900, color: "var(--gj-ink)" }}>Candidature — pièces justificatives requises</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--gj-ink)", marginTop: 8 }}>Afin de finaliser votre candidature, veuillez joindre l'ensemble des pièces justificatives mentionnées dans l'offre, notamment votre curriculum vitae actualisé ainsi qu'une copie de votre pièce d'identification nationale en cours de validité. Tout dossier incomplet ne pourra être traité.</p>
        </div>
      ) : (
        <div style={{ background: "var(--gj-yellow-soft)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-ink)", lineHeight: 1.4 }}>Pour postuler, il faut 2 documents :</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {[["i-document", "Ton CV (ta vie professionnelle, à jour)"], ["i-profile", "Ta carte d'identité (pas périmée)"]].map(([ic, txt]) => (
              <div key={txt} style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", borderRadius: 10, padding: "11px 13px" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + ic} /></svg></span>
                <span style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, letterSpacing: ".015em", color: "var(--gj-ink)" }}>{txt}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", marginTop: 12, lineHeight: 1.5 }}>S'il manque un document, ta demande ne part pas.</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Left column cards (consultation)
// ---------------------------------------------------------------------
const IdentityCard = ({ onEdit }) => (
  <div style={profCard}>
    {profCardHead("Identité & contact", editLink("Modifier", onEdit))}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px" }}>
      <FieldRow label="Prénom" value="Awa" />
      <FieldRow label="Nom" value="Diop" />
      <FieldRow label="Date de naissance" value="12 mars 2004" />
      <FieldRow label="Sexe" value="Femme" />
      <FieldRow label="N° CNI" value="1 2004 1978 00456" mono />
      <FieldRow label="Niveau d'étude" value="Bac + 2" />
      <FieldRow label="Téléphone" value="+221 77 123 45 67" verified />
      <FieldRow label="E-mail" value="awa.diop@gmail.com" />
      <FieldRow label="Région · Commune" value="Tambacounda" />
    </div>
  </div>
);

const ObjectiveCard = ({ onEdit }) => (
  <div style={profCard}>
    {profCardHead("Objectif & secteurs visés", editLink("Modifier", onEdit))}
    <div style={{ background: "var(--gj-teal-soft)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12 }}>
      <span style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-target" /></svg>
      </span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", textTransform: "uppercase", letterSpacing: ".4px" }}>Mon objectif</div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--gj-ink)", lineHeight: 1.45, marginTop: 3 }}>
          Lancer une micro-entreprise de maraîchage et obtenir un financement de démarrage.
        </div>
      </div>
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 9 }}>Secteurs visés</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Chip tone="teal"><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-agriculture" /></svg>Agriculture & agro-alimentaire</Chip>
        <Chip tone="teal"><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-project" /></svg>Entrepreneuriat</Chip>
        <Chip tone="teal"><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-globe" /></svg>Environnement</Chip>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 9 }}>Type recherché</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-teal-deep)" }}><use href="#i-funding" /></svg>Bourse / Financement</Chip>
          <Chip><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-teal-deep)" }}><use href="#i-learning" /></svg>Formation</Chip>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 9 }}>Mobilité</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-teal-deep)" }}><use href="#i-pin" /></svg>Tambacounda</Chip>
          <Chip><svg className="gj-icon" style={{ width: 13, height: 13, color: "var(--gj-teal-deep)" }}><use href="#i-pin" /></svg>Kédougou</Chip>
        </div>
      </div>
    </div>
  </div>
);

const SkillsCard = ({ onEdit }) => (
  <div style={profCard}>
    {profCardHead("Compétences & langues", editLink("Modifier", onEdit))}
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 9 }}>Compétences</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Maraîchage", "Gestion de projet", "Comptabilité de base", "Bureautique (Word/Excel)", "Réseaux sociaux", "Vente & négociation"].map((s) => <Chip key={s}>{s}</Chip>)}
      </div>
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 12 }}>Langues</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <LangBar lang="Wolof" level="Langue maternelle" pct={100} />
        <LangBar lang="Français" level="Courant" pct={82} />
        <LangBar lang="Anglais" level="Intermédiaire" pct={50} />
        <LangBar lang="Pulaar" level="Notions" pct={30} />
      </div>
    </div>
  </div>
);

const TimelineCard = () => {
  const items = [
    { kind: "Formation", icon: "i-learning", tone: "teal", title: "Licence 2 — Gestion", org: "Université Assane Seck · Ziguinchor (à distance)", date: "2023 — en cours", current: true },
    { kind: "Expérience", icon: "i-agriculture", tone: "yellow", title: "Stagiaire vente & récolte", org: "Coopérative maraîchère de Tambacounda", date: "Juin — Août 2023 · 3 mois" },
    { kind: "Engagement", icon: "i-engagement", tone: "blue", title: "Bénévole sensibilisation", org: "Association Jeunesse & Environnement", date: "2022 — 2023" },
    { kind: "Formation", icon: "i-document", tone: "teal", title: "Baccalauréat série G", org: "Lycée de Tambacounda · Mention Bien", date: "2022" },
  ];
  const toneMap = {
    teal: { bg: "var(--gj-teal-soft)", fg: "var(--gj-teal-deep)" },
    yellow: { bg: "var(--gj-yellow-soft)", fg: "var(--gj-yellow-ink)" },
    blue: { bg: "var(--gj-blue-soft)", fg: "var(--gj-blue-ink)" },
  };
  return (
    <div style={profCard}>
      {profCardHead("Formation & expériences", (
        <button style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)" }}>
          <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-plus" /></svg>Ajouter
        </button>
      ))}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((it, i, arr) => {
          const t = toneMap[it.tone];
          return (
            <div key={i} style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: t.bg, color: t.fg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + it.icon} /></svg>
                </span>
                {i < arr.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--gj-line)", margin: "4px 0" }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 18 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.fg, background: t.bg, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".4px" }}>{it.kind}</span>
                  {it.current && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 8px", borderRadius: 999 }}>EN COURS</span>}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)", marginTop: 5 }}>{it.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>{it.org}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey-2)", marginTop: 3, fontWeight: 700 }}>{it.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// EDIT STATE — formulaire
// ---------------------------------------------------------------------
const EditForm = ({ onCancel }) => {
  const sectionTitle = (t, sub) => (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-ink)" }}>{t}</h2>
      {sub && <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760, margin: "0 auto", width: "100%" }}>
      {/* banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: "16px 18px" }}>
        <button onClick={onCancel} style={{ width: 40, height: 40, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)", flexShrink: 0 }}>
          <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-chevron-left" /></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--gj-ink)" }}>Modifier mon profil</h1>
          <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>Les champs vérifiés (téléphone) ne sont pas modifiables ici.</div>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-grey)", background: "var(--gj-bg)", padding: "6px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--gj-yellow)" }} />Brouillon enregistré
        </span>
      </div>

      {/* Avatar row */}
      <div style={{ ...profCard, flexDirection: "row", alignItems: "center", gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--gj-teal), #19a657)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 26 }}>AD</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>Photo de profil</div>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>JPG ou PNG · 2 Mo max · améliore ton profil de +4%</div>
        </div>
        <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "10px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-upload" /></svg>Téléverser
        </button>
      </div>

      {/* Identité */}
      <div style={profCard}>
        {sectionTitle("Identité & contact")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 16px" }}>
          <FieldInput label="Prénom" value="Awa" />
          <FieldInput label="Nom" value="Diop" />
          <FieldInput label="Date de naissance" value="12/03/2004" />
          <FieldInput label="Sexe" value="Femme" />
          <FieldInput label="N° CNI" value="1 2004 1978 00456" />
          <FieldInput label="Niveau d'étude" value="Bac + 2" />
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)" }}>Téléphone <span style={{ color: "var(--gj-green-ink)" }}>· vérifié</span></span>
            <div style={{ minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 13px", fontSize: 14, color: "var(--gj-grey-2)", background: "var(--gj-bg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              +221 77 123 45 67
              <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-green-ink)" }}><use href="#i-check-circle" /></svg>
            </div>
          </label>
          <FieldInput label="E-mail" value="awa.diop@gmail.com" />
          <FieldInput label="Région · Commune" value="Tambacounda" full />
        </div>
      </div>

      {/* Objectif */}
      <div style={profCard}>
        {sectionTitle("Objectif & secteurs visés")}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)" }}>Mon objectif</span>
          <textarea defaultValue="Lancer une micro-entreprise de maraîchage et obtenir un financement de démarrage." rows={2} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "11px 13px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none", resize: "none", lineHeight: 1.5 }} />
        </label>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 9 }}>Secteurs visés</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip tone="teal" removable>Agriculture & agro-alimentaire</Chip>
            <Chip tone="teal" removable>Entrepreneuriat</Chip>
            <Chip tone="teal" removable>Environnement</Chip>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px dashed var(--gj-line-strong)", color: "var(--gj-teal-deep)", padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-plus" /></svg>Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Compétences */}
      <div style={profCard}>
        {sectionTitle("Compétences")}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Maraîchage", "Gestion de projet", "Comptabilité de base", "Bureautique (Word/Excel)", "Réseaux sociaux", "Vente & négociation"].map((s) => <Chip key={s} removable>{s}</Chip>)}
          <button style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px dashed var(--gj-line-strong)", color: "var(--gj-teal-deep)", padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-plus" /></svg>Ajouter
          </button>
        </div>
      </div>

      {/* footer actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingBottom: 8 }}>
        <button onClick={onCancel} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "12px 22px", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
        <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "12px 26px", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>Enregistrer
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------
const WebProfile = ({ editing = false }) => {
  const [edit, setEdit] = React.useState(editing);
  const [tab, setTab] = React.useState(editing === "incl" ? "incl" : "profile");
  const root = { display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden" };
  const main = { display: "flex", flexDirection: "column", overflow: "hidden" };
  const page = { padding: "22px 28px 40px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", flex: 1 };
  const twoCol = { display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start", flexShrink: 0 };
  return (
    <div style={root}>
      <BenefSidebar active={tab === "incl" ? "incl" : "profile"} onNavChange={(id) => { if (id === "incl") { setTab("incl"); setEdit(false); } else if (id === "profile") { setTab("profile"); setEdit(false); } }} />
      <div style={main}>
        <BenefTopBar />
        <div style={page}>
          {tab === "incl" ? (
            <InclusionPage />
          ) : edit ? (
            <EditForm onCancel={() => setEdit(false)} />
          ) : (
            <React.Fragment>
              <ProfileHeader onEdit={() => setEdit(true)} />
              <div style={twoCol}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <IdentityCard onEdit={() => setEdit(true)} />
                  <ObjectiveCard onEdit={() => setEdit(true)} />
                  <SkillsCard onEdit={() => setEdit(true)} />
                  <TimelineCard />
                </div>
                <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <CompletionChecklist />
                  <DocumentsCard />
                </aside>
              </div>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { WebProfile });
