/* eslint-disable */
// Ressources numériques — version WEB. Réutilise BenefSidebar/BenefTopBar
// (web-dashboard.jsx) + resources-data.jsx.
// Vues : home · list · detail · reader.

const resMeta = (icon, label) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
  </span>
);

// ---------------------------------------------------------------------
// Resource card (grid)
// ---------------------------------------------------------------------
const ResCard = ({ res, onOpen }) => {
  const t = RES_TYPES[res.type];
  return (
    <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer" }} onClick={onOpen}>
      <ResThumb type={res.type} h={150} />
      <div style={{ padding: 15, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.28, color: "var(--gj-ink)" }}>{res.title}</div>
        <div style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{res.desc}</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
          {resMeta("i-document", `${res.format} · ${res.pages}`)}
          {resMeta("i-download", res.downloads)}
        </div>
        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--gj-line)" }}>
          {res.lang.includes("Wolof") && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "3px 8px", borderRadius: 999 }}>
              <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-play" /></svg>Audio WO
            </span>
          )}
          <span style={{ flex: 1 }} />
          <button onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "9px 15px", borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-eye" /></svg>Lire
          </button>
        </div>
      </div>
    </div>
  );
};

const ResRow = ({ res, rank, onOpen }) => {
  const t = RES_TYPES[res.type];
  return (
    <div onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderBottom: "1px solid var(--gj-line)", cursor: "pointer" }}>
      {rank && <span style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-line-strong)", width: 22, flexShrink: 0 }}>{rank}</span>}
      <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + t.icon} /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.3 }}>{res.title}</div>
        <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{t.label} · {res.format} · {res.downloads} téléchargements</div>
      </div>
      <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)", flexShrink: 0 }}><use href="#i-chevron-right" /></svg>
    </div>
  );
};

// ---------------------------------------------------------------------
// HOME — médiathèque
// ---------------------------------------------------------------------
const ResHomeContent = ({ onOpen, onCat }) => {
  const featured = RESOURCES.filter((r) => r.featured);
  const top = RESOURCES.slice(0, 5);
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 26 }}>
      {/* Hero / search */}
      <section style={{ background: "linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)", color: "#fff", borderRadius: 16, padding: "26px 28px", position: "relative", overflow: "hidden" }}>
        <span style={{ position: "absolute", right: -50, top: -60, width: 240, height: 240, background: "radial-gradient(circle, rgba(248,163,9,.16), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: 620 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15 }}>Médiathèque du Guichet Jeunesse</h1>
          <p style={{ fontSize: 14.5, opacity: .92, lineHeight: 1.55, marginTop: 8 }}>Guides, modèles et boîtes à outils gratuits pour préparer ta candidature, créer ton entreprise et avancer dans tes démarches.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "0 14px", minHeight: 48, marginTop: 18, maxWidth: 480 }}>
            <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
            <input placeholder="Rechercher un guide, un modèle…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)" }} />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>Explorer par catégorie</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {RES_CATS.map((c) => {
            const tone = CAT_TONE[c.tone];
            return (
              <div key={c.id} onClick={onCat} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
                <span style={{ width: 44, height: 44, borderRadius: 11, background: tone.soft, color: tone.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + c.icon} /></svg>
                </span>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.25 }}>{c.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 700 }}>{c.n} ressources</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>Mises en avant</h2>
          <span onClick={onCat} style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Tout voir →</span>
        </div>
        <BookShelf>
          {featured.map((r) => <div key={r.id} onClick={() => onOpen && onOpen(r)}><BookCover res={r} w={158} /></div>)}
        </BookShelf>
      </section>

      {/* Top downloads — étagère */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>Les plus téléchargés</h2>
        <BookShelf>
          {top.map((r, i) => (
            <div key={r.id} onClick={() => onOpen && onOpen(r)} style={{ position: "relative" }}>
              <span style={{ position: "absolute", top: -8, left: -6, zIndex: 2, width: 26, height: 26, borderRadius: "50%", background: "var(--gj-yellow)", color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,.2)" }}>{i + 1}</span>
              <BookCover res={r} w={132} />
            </div>
          ))}
        </BookShelf>
      </section>
    </div>
  );
};

// ---------------------------------------------------------------------
// LIST — par catégorie
// ---------------------------------------------------------------------
const ResFilters = () => {
  const group = (title, children) => (
    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--gj-line)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
  const check = (label, count, on) => (
    <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", cursor: "pointer", fontSize: 13, color: "var(--gj-ink)", fontWeight: on ? 800 : 600 }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: on ? 0 : "1.5px solid var(--gj-line-strong)", background: on ? "var(--gj-teal-deep)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        {on && <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-check" /></svg>}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>{count}</span>
    </label>
  );
  const pill = (label, on) => (
    <button style={{ padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--gj-teal-soft)" : "#fff", border: on ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{label}</button>
  );
  return (
    <aside style={{ width: 230, flexShrink: 0, alignSelf: "flex-start" }}>
      <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900 }}>Filtres</h3>
          <span style={{ fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Réinitialiser</span>
        </div>
        {group("Type", (
          <div>
            {check("Guides", 9, true)}
            {check("Modèles", 6, false)}
            {check("Boîtes à outils", 4, false)}
            {check("Fiches pratiques", 7, false)}
          </div>
        ))}
        {group("Format", (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{pill("Tous", true)}{pill("PDF", false)}{pill("DOCX", false)}{pill("ZIP", false)}</div>
        ))}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>Langue</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{pill("Français", true)}{pill("Audio Wolof", false)}</div>
        </div>
      </div>
    </aside>
  );
};

const ResListContent = ({ onOpen, onBack }) => {
  const list = RESOURCES;
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <ResFilters />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "var(--gj-grey)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span onClick={onBack} style={{ color: "var(--gj-teal-deep)", fontWeight: 700, cursor: "pointer" }}>Médiathèque</span>
          <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-chevron-right" /></svg>
          <span style={{ fontWeight: 700, color: "var(--gj-ink)" }}>Emploi & candidature</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Emploi & candidature</h1>
            <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>{list.length} ressources · guides, modèles et fiches pratiques</div>
          </div>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            Trier : Populaires <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-chevron-right" /></svg>
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "22px 18px" }}>
          {list.map((r) => <div key={r.id} onClick={() => onOpen && onOpen(r)}><BookCover res={r} w={150} /></div>)}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// DETAIL — fiche ressource
// ---------------------------------------------------------------------
const ResActionCard = ({ res, onRead }) => {
  const t = RES_TYPES[res.type];
  const row = (icon, label, val) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--gj-line)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}>
        <svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{val}</span>
    </div>
  );
  return (
    <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18, position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      {row("i-document", "Format", res.format)}
      {row("i-resources", "Contenu", res.pages)}
      {row("i-download", "Taille", res.size)}
      {row("i-globe", "Langue", res.lang)}
      {row("i-calendar", "Mis à jour", res.date)}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0 4px", fontSize: 12, color: "var(--gj-grey)" }}>
        <svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-teal-deep)" }}><use href="#i-download" /></svg>
        <b style={{ color: "var(--gj-ink)" }}>{res.downloads}</b> téléchargements · gratuit
      </div>
      <button onClick={onRead} style={{ marginTop: 8, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-eye" /></svg>Lire en ligne
      </button>
      <button style={{ marginTop: 9, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 46, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-download" /></svg>Télécharger ({res.format.split(" ")[0]})
      </button>
      <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
        <button style={{ flex: 1, background: "transparent", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-bookmark" /></svg>Sauver
        </button>
        <button style={{ flex: 1, background: "transparent", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-share" /></svg>Partager
        </button>
      </div>
    </div>
  );
};

const ResDetailContent = ({ res, onBack, onRead, onOpen }) => {
  const t = RES_TYPES[res.type];
  const related = RESOURCES.filter((r) => r.cat === res.cat && r.id !== res.id).slice(0, 3);
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 16, padding: 0 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Retour à la médiathèque
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 26, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", gap: 22 }}>
            <div style={{ flexShrink: 0 }}><FauxPage band={t.band} w={150} /></div>
            <div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: t.soft, color: t.ink, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px" }}>
                <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + t.icon} /></svg>{t.label} · {res.catLabel}
              </span>
              <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2, color: "var(--gj-ink)", marginTop: 12 }}>{res.title}</h1>
              <p style={{ fontSize: 14.5, color: "var(--gj-ink)", lineHeight: 1.6, marginTop: 10 }}>{res.desc}</p>
              {res.lang.includes("Wolof") && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", padding: "9px 13px", borderRadius: 10, fontSize: 12.5, fontWeight: 800, marginTop: 14 }}>
                  <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-play" /></svg>Version audio en Wolof disponible
                </div>
              )}
            </div>
          </div>

          {/* Sommaire */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Au sommaire</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 22px" }}>
              {RES_TOC.map((s) => (
                <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{s.n}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)" }}>{s.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--gj-grey-2)", fontWeight: 700 }}>p.{s.page}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aperçu */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Aperçu</h2>
            <div style={{ display: "flex", gap: 16, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 20, overflowX: "auto" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                  <FauxPage band={t.band} w={150} />
                  <span style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)" }}>p.{i + 1}</span>
                </div>
              ))}
              <div style={{ flexShrink: 0, alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--gj-teal-deep)", cursor: "pointer", padding: "0 10px" }} onClick={onRead}>
                <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--gj-teal-soft)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-arrow-right" /></svg>
                </span>
                <span style={{ fontSize: 12, fontWeight: 800 }}>Tout lire</span>
              </div>
            </div>
          </div>

          {/* Related */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Ressources liées</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {related.map((r) => <div key={r.id} onClick={() => onOpen && onOpen(r)}><BookCover res={r} w={140} /></div>)}
            </div>
          </div>
        </div>

        <ResActionCard res={res} onRead={onRead} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// READER — lecteur PDF
// ---------------------------------------------------------------------
const ResReaderContent = ({ res, onBack }) => {
  const t = RES_TYPES[res.type];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#202020" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", background: "#0E1C3C", color: "#fff", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
          <svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-chevron-left" /></svg>Retour
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{res.title}</div>
          <div style={{ fontSize: 11, opacity: .6 }}>{res.format} · {res.pages}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.08)", borderRadius: 8, padding: "4px 6px" }}>
          <button style={{ width: 30, height: 30, border: 0, background: "transparent", color: "#fff", cursor: "pointer", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg></button>
          <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 64, textAlign: "center" }}>3 / 24</span>
          <button style={{ width: 30, height: 30, border: 0, background: "transparent", color: "#fff", cursor: "pointer", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-right" /></svg></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.08)", borderRadius: 8, padding: "4px 10px", fontSize: 12.5, fontWeight: 700 }}>
          <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-search" /></svg>100 %
        </div>
        <button style={{ width: 38, height: 38, border: 0, background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer", borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Écouter"><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-play" /></svg></button>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-teal)", color: "#fff", border: 0, padding: "9px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
          <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-download" /></svg>Télécharger
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* sommaire */}
        <aside style={{ width: 240, background: "#202020", color: "#fff", flexShrink: 0, overflowY: "auto", padding: "16px 12px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", opacity: .55, padding: "0 8px 10px" }}>Sommaire</div>
          {RES_TOC.map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 8, background: i === 0 ? "rgba(255,255,255,.1)" : "transparent", cursor: "pointer", marginBottom: 2 }}>
              <span style={{ fontSize: 11.5, fontWeight: 900, color: i === 0 ? "var(--gj-yellow)" : "rgba(255,255,255,.5)", width: 14 }}>{s.n}</span>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? "#fff" : "rgba(255,255,255,.75)", lineHeight: 1.3 }}>{s.label}</span>
              <span style={{ fontSize: 11, opacity: .45 }}>{s.page}</span>
            </div>
          ))}
        </aside>

        {/* pages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          {[3, 4].map((p) => (
            <div key={p} style={{ position: "relative" }}>
              <FauxPage band={t.band} w={420} radius={4} />
              <span style={{ position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)", fontSize: 11.5, color: "rgba(255,255,255,.5)", fontWeight: 700 }}>page {p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// SHELL
// ---------------------------------------------------------------------
const WebResources = ({ view = "home" }) => {
  const [v, setV] = React.useState(view);
  const [res, setRes] = React.useState(RESOURCES[0]);
  const root = { display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden" };
  const main = { display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" };
  const page = { padding: "22px 28px 40px", overflowY: "auto", flex: 1 };
  const openDetail = (r) => { setRes(r || RESOURCES[0]); setV("detail"); };
  if (v === "reader") {
    return (
      <div style={root}>
        <BenefSidebar active="resources" onNavChange={(id) => { if (id === "resources") setV("home"); }} />
        <div style={main}>
          <ResReaderContent res={res} onBack={() => setV("detail")} />
        </div>
      </div>
    );
  }
  let content;
  if (v === "home") content = <ResHomeContent onOpen={openDetail} onCat={() => setV("list")} />;
  else if (v === "list") content = <ResListContent onOpen={openDetail} onBack={() => setV("home")} />;
  else if (v === "detail") content = <ResDetailContent res={res} onBack={() => setV("home")} onRead={() => setV("reader")} onOpen={openDetail} />;
  return (
    <div style={root}>
      <BenefSidebar active="resources" onNavChange={(id) => { if (id === "resources") setV("home"); }} />
      <div style={main}>
        <BenefTopBar />
        <div style={page}>{content}</div>
      </div>
    </div>
  );
};

Object.assign(window, { WebResources });
