/* eslint-disable */
// Ressources numériques — version MOBILE (390×844). Réutilise PhoneFrame,
// AppHeader, BottomNav, FooterCTA (phone.jsx) + resources-data.jsx.

const mResThumb = (type, size = 70) => {
  const t = RES_TYPES[type];
  return (
    <div style={{ width: size, height: size, borderRadius: 12, flexShrink: 0, background: `linear-gradient(135deg, ${t.soft}, #fff)`, border: "1px solid var(--gj-line)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
      <div style={{ transform: "rotate(-5deg)" }}><FauxPage band={t.band} w={size * 0.5} radius={4} shadow={false} /></div>
    </div>
  );
};

const mResMeta = (icon, label) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--gj-grey)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
  </span>
);

const MobileResCard = ({ res, onOpen }) => {
  const t = RES_TYPES[res.type];
  return (
    <div onClick={onOpen} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 13, display: "flex", gap: 13, cursor: "pointer" }}>
      {mResThumb(res.type, 76)}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start", background: t.soft, color: t.ink, padding: "2px 8px", borderRadius: 999, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".3px" }}>
          <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + t.icon} /></svg>{t.label}
        </span>
        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25, color: "var(--gj-ink)" }}>{res.title}</div>
        <div style={{ display: "flex", gap: 11, flexWrap: "wrap", marginTop: "auto" }}>
          {mResMeta("i-document", `${res.format.split(" ")[0]} · ${res.pages}`)}
          {res.lang.includes("Wolof") && mResMeta("i-play", "Audio WO")}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// HOME
// ---------------------------------------------------------------------
const MobileResHome = ({ nav = () => {} }) => {
  const featured = RESOURCES.filter((r) => r.featured);
  return (
    <PhoneFrame>
      <AppHeader title="Médiathèque" onBack={() => {}} />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)" }}>
        {/* hero */}
        <div style={{ background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)", color: "#fff", padding: "16px 16px 18px", position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", right: -40, top: -50, width: 170, height: 170, background: "radial-gradient(circle, rgba(249,196,0,.16), transparent 60%)" }} />
          <div style={{ position: "relative", fontSize: 18, fontWeight: 900, lineHeight: 1.25 }}>Guides, modèles & outils gratuits</div>
          <div style={{ position: "relative", fontSize: 12.5, opacity: .9, marginTop: 5, lineHeight: 1.45 }}>Tout pour préparer ta candidature et ton projet.</div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "0 13px", minHeight: 46, marginTop: 14 }}>
            <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
            <span style={{ flex: 1, fontSize: 14, color: "var(--gj-grey-2)" }}>Rechercher une ressource…</span>
          </div>
        </div>

        <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* categories */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 11 }}>Catégories</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {RES_CATS.map((c) => {
                const tone = CAT_TONE[c.tone];
                return (
                  <div key={c.id} onClick={() => nav("list")} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: tone.soft, color: tone.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + c.icon} /></svg>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.2 }}>{c.label}</div>
                      <div style={{ fontSize: 10.5, color: "var(--gj-grey)", marginTop: 2 }}>{c.n} ressources</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* featured */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 11 }}>
              <h2 style={{ fontSize: 15, fontWeight: 900 }}>Mises en avant</h2>
              <span onClick={() => nav("list")} style={{ fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 800 }}>Tout voir →</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {featured.map((r) => <MobileResCard key={r.id} res={r} onOpen={() => nav("detail")} />)}
            </div>
          </div>
        </div>
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// LIST
// ---------------------------------------------------------------------
const MobileResList = ({ nav = () => {} }) => {
  const chips = ["Tous", "Guides", "Modèles", "Boîtes à outils", "Audio Wolof"];
  return (
    <PhoneFrame>
      <AppHeader title="Emploi & candidature" subtitle="8 ressources" onBack={() => nav("home")} trailing={(
        <button style={{ width: 38, height: 38, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)", flexShrink: 0 }} aria-label="Rechercher">
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-search" /></svg>
        </button>
      )} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 0 10px" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 14px" }}>
          {chips.map((c, i) => (
            <span key={c} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
        {RESOURCES.map((r) => <MobileResCard key={r.id} res={r} onOpen={() => nav("detail")} />)}
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// DETAIL
// ---------------------------------------------------------------------
const MobileResDetail = ({ nav = () => {} }) => {
  const res = RESOURCES[0];
  const t = RES_TYPES[res.type];
  const metaRow = (icon, label, val) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--gj-line)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}>
        <svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{val}</span>
    </div>
  );
  return (
    <PhoneFrame>
      <AppHeader title="Ressource" onBack={() => nav("list")} trailing={(
        <button style={{ width: 38, height: 38, borderRadius: 8, border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)", flexShrink: 0 }} aria-label="Sauver">
          <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-bookmark" /></svg>
        </button>
      )} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 18, background: "var(--gj-bg)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
          <FauxPage band={t.band} w={150} />
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: t.soft, color: t.ink, padding: "4px 11px", borderRadius: 999, fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px" }}>
              <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + t.icon} /></svg>{t.label} · {res.catLabel}
            </span>
            <h1 style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.25, color: "var(--gj-ink)", marginTop: 10 }}>{res.title}</h1>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "var(--gj-ink)", lineHeight: 1.6, margin: 0 }}>{res.desc}</p>

        {res.lang.includes("Wolof") && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", padding: "12px 14px", borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
            <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-play" /></svg>Version audio en Wolof disponible
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: "4px 15px" }}>
          {metaRow("i-document", "Format", res.format)}
          {metaRow("i-resources", "Contenu", res.pages)}
          {metaRow("i-download", "Taille", res.size)}
          {metaRow("i-globe", "Langue", res.lang)}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-grey-2)" }}><use href="#i-calendar" /></svg>Mis à jour</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{res.date}</span>
          </div>
        </div>

        {/* sommaire */}
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 12 }}>Au sommaire</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RES_TOC.map((s) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{s.n}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)" }}>{s.label}</span>
                <span style={{ fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>p.{s.page}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)", display: "flex", gap: 9, flexShrink: 0 }}>
        <button style={{ flex: "0 0 auto", width: 52, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Télécharger">
          <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-download" /></svg>
        </button>
        <button onClick={() => nav("reader")} style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-eye" /></svg>Lire en ligne
        </button>
      </div>
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// READER
// ---------------------------------------------------------------------
const MobileResReader = ({ nav = () => {} }) => {
  const res = RESOURCES[0];
  const t = RES_TYPES[res.type];
  return (
    <PhoneFrame bg="#2A302E">
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#1F2422", color: "#fff", flexShrink: 0 }}>
        <button onClick={() => nav("detail")} style={{ width: 36, height: 36, border: 0, background: "transparent", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Retour">
          <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-chevron-left" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{res.title}</div>
          <div style={{ fontSize: 10.5, opacity: .6 }}>{res.format} · page 3 / 24</div>
        </div>
        <button style={{ width: 36, height: 36, border: 0, background: "transparent", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Écouter">
          <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-play" /></svg>
        </button>
      </div>

      {/* pages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, background: "#2A302E" }}>
        {[3, 4].map((p) => (
          <div key={p} style={{ position: "relative" }}>
            <FauxPage band={t.band} w={300} radius={3} />
            <span style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 700 }}>page {p}</span>
          </div>
        ))}
      </div>

      {/* bottom toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#1F2422", color: "#fff", flexShrink: 0 }}>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.08)", border: 0, color: "#fff", padding: "9px 13px", borderRadius: 9, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
          <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-menu" /></svg>Sommaire
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <button style={{ width: 36, height: 36, border: 0, background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg></button>
          <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 54, textAlign: "center" }}>3 / 24</span>
          <button style={{ width: 36, height: 36, border: 0, background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-right" /></svg></button>
        </div>
        <button style={{ width: 40, height: 40, border: 0, background: "var(--gj-teal)", color: "#fff", cursor: "pointer", borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Télécharger">
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-download" /></svg>
        </button>
      </div>
    </PhoneFrame>
  );
};

const MobileResApp = ({ start = "home" }) => {
  const [s, setS] = React.useState(start);
  const nav = (x) => setS(x);
  if (s === "list") return <MobileResList nav={nav} />;
  if (s === "detail") return <MobileResDetail nav={nav} />;
  if (s === "reader") return <MobileResReader nav={nav} />;
  return <MobileResHome nav={nav} />;
};

Object.assign(window, { MobileResHome, MobileResList, MobileResDetail, MobileResReader, MobileResApp });
