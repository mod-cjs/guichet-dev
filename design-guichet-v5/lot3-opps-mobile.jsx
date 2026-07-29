/* eslint-disable */
// Lot 3 — Opportunités · Mobile
//   M1 — Liste + chips + recherche (état par défaut)
//   M2 — Bottom-sheet filtres ouverts
//   M3 — Détail opportunité (sheet ascendante)
//   M4 — Sheet "Postuler" (formulaire)
//   M5 — Confirmation envoyée (avec preview WhatsApp)
//   M6 — État vide (aucun résultat)

// =====================================================================
// Shared mini opp card (mobile list)
// =====================================================================
const MobileOppRowCard = ({ tag, tagTone = "cjs", title, org, region, deadline, salary, match, fav = false }) => {
  // Code couleur catégorie (retour design V3) — rouge = urgence uniquement
  const CATS = { emploi: /emploi|cdi|cdd|poste/i, stage: /stage|alternance|apprentissage/i, formation: /formation|bootcamp|atelier|module/i, financement: /bourse|financement|subvention|appel [àa] projets?|concours|aide/i, volontariat: /volontariat|mentorat|service civique|b[ée]n[ée]volat/i, evenement: /[ée]v[ée]nement|forum|salon|conf[ée]rence/i };
  const catLabel = (tag || "").split("·")[0].trim();
  const jLabel = ((tag || "").split("·")[1] || "").trim();
  const catK = Object.keys(CATS).find((k) => CATS[k].test(catLabel)) || "neutre";
  const t = { bg: "var(--cat-" + catK + "-soft)", fg: "var(--cat-" + catK + "-ink)" };
  const SECTORS = [
    [/data|num[ée]rique|dev|web|informatique/i, ["i-desktop", "var(--prog-brm, linear-gradient(135deg,#1e35ba,#162c5e))"]],
    [/agro|mara[iî]ch|agri/i, ["i-agriculture", "var(--prog-yeah, linear-gradient(135deg,#027f7e,#014B4A))"]],
    [/bourse|mobilit[ée]|master|étude/i, ["i-funding", "var(--prog-yaakaar, linear-gradient(135deg,#f8a309,#C97F03))"]],
    [/animateur|communautaire|social/i, ["i-engagement", "var(--prog-yjc, linear-gradient(135deg,#19a657,#0E6234))"]],
    [/formation|bootcamp/i, ["i-learning", "var(--prog-edupop, linear-gradient(135deg,#027f7e,#162c5e))"]],
  ];
  const found = SECTORS.find(([re]) => re.test(title)) || [null, ["i-employment", "linear-gradient(135deg,var(--gj-teal),var(--gj-teal-deep))"]];
  const [secIcon, secBg] = found[1];
  return (
    <article style={{
      background: "#fff", border: "1.5px solid var(--gj-line)",
      borderRadius: 12, padding: 12,
      display: "flex", gap: 12,
    }}>
      {/* tuile sectorielle */}
      <div style={{ position: "relative", width: 68, alignSelf: "stretch", minHeight: 84, borderRadius: 10, background: secBg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg className="gj-icon" style={{ position: "absolute", right: -10, bottom: -12, width: 46, height: 46, opacity: .22, color: "#fff" }}><use href={"#" + secIcon} /></svg>
        <svg className="gj-icon" style={{ width: 27, height: 27, color: "#fff", position: "relative" }}><use href={"#" + secIcon} /></svg>
        <span style={{ position: "absolute", top: 5, left: 5, width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,.94)", color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{(org || "?")[0]}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, fontWeight: 800,
          background: t.bg, color: t.fg,
          padding: "2px 8px", borderRadius: 999,
          letterSpacing: ".4px", textTransform: "uppercase",
        }}>{catLabel}</span>
        {jLabel && (
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
            background: deadline.urgent ? "var(--gj-red)" : "var(--gj-bg)",
            color: deadline.urgent ? "#fff" : "var(--gj-grey)",
            border: deadline.urgent ? 0 : "1px solid var(--gj-line)",
          }}>{jLabel}</span>
        )}
        {/* Score de correspondance retiré des cartes (voir lot3-opps-web.jsx). */}
        <button style={{
          marginLeft: "auto", width: 30, height: 30, borderRadius: "50%",
          border: "1.5px solid var(--gj-line)",
          background: fav ? "var(--gj-yellow-soft)" : "#fff",
          color: fav ? "var(--gj-yellow-ink)" : "var(--gj-grey)",
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
        }} aria-label="Sauvegarder">
          <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-bookmark" /></svg>
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3, color: "var(--gj-ink)" }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>{org}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "var(--gj-grey)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <svg className="gj-icon gj-icon--xs"><use href="#i-pin" /></svg>{region}
        </span>
        {salary && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <svg className="gj-icon gj-icon--xs"><use href="#i-funding" /></svg>{salary}
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: deadline.urgent ? "var(--gj-red)" : "var(--gj-grey)", fontWeight: deadline.urgent ? 800 : 600 }}>
          <svg className="gj-icon gj-icon--xs"><use href="#i-clock" /></svg>{deadline.label}
        </span>
      </div>
      </div>
    </article>
  );
};

const SAMPLE_M = [
  { tag: "STAGE · J-3", tagTone: "urgent", title: "Stage Data Science · 6 mois", org: "Sonatel — Innovation", region: "Dakar", salary: "350 000 F/mois", deadline: { label: "J-3", urgent: true }, fav: true },
  { tag: "EMPLOI · J-12", tagTone: "cjs", title: "Développeur Web Junior", org: "Wave Mobile Money", region: "Dakar", salary: "500 000 F", deadline: { label: "J-12" } },
  { tag: "BOURSE · J-9", tagTone: "partner", title: "Bourse mobilité Master 2", org: "MESRI", region: "International", salary: "frais + 80k F", deadline: { label: "J-9" } },
  { tag: "STAGE · J-18", tagTone: "cjs", title: "Stage agronomie · Coopérative", org: "GIE Diaobé", region: "Tambacounda", salary: "180 000 F/mois", deadline: { label: "J-18" }, fav: true },
];

// =====================================================================
// M1 — Liste opportunités (mobile)
// =====================================================================
const MobileOppList = ({ empty = false }) => {
  const searchWrap = {
    padding: "10px 14px", background: "#fff",
    borderBottom: "1px solid var(--gj-line)",
    display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
  };
  const searchBox = {
    flex: 1, display: "flex", alignItems: "center", gap: 8,
    background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)",
    borderRadius: 10, padding: "0 12px", minHeight: 44,
  };

  const chipRow = {
    display: "flex", gap: 6, padding: "10px 14px",
    overflowX: "auto", background: "#fff",
    borderBottom: "1px solid var(--gj-line)", flexShrink: 0,
  };
  const chip = (on, label, icon, removable) => (
    <button key={label} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "7px 12px",
      background: on ? "var(--gj-teal-soft)" : "#fff",
      border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
      color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
      borderRadius: 999, fontSize: 12, fontWeight: on ? 800 : 600,
      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", minHeight: 34,
    }}>
      {icon && <svg className="gj-icon gj-icon--xs"><use href={"#" + icon} /></svg>}
      {label}
      {removable && <svg className="gj-icon gj-icon--xs" style={{ marginLeft: 2 }}><use href="#i-close" /></svg>}
    </button>
  );

  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Explorer" user="AD" />
      <div style={searchWrap}>
        <div style={searchBox}>
          <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
          <span style={{ fontSize: 13.5, color: "var(--gj-ink)", flex: 1, fontWeight: 600 }}>data science</span>
          <button style={{ width: 22, height: 22, border: 0, background: "var(--gj-line)", color: "var(--gj-grey)", borderRadius: "50%", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-close" /></svg>
          </button>
        </div>
        <button style={{
          width: 44, height: 44, border: "1.5px solid var(--gj-line)",
          background: "#fff", borderRadius: 10, position: "relative",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--gj-teal-deep)",
        }} aria-label="Filtres">
          <svg className="gj-icon gj-icon--sm"><use href="#i-filter" /></svg>
          <span style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "var(--gj-teal-deep)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>4</span>
        </button>
      </div>
      <div style={chipRow}>
        {chip(true, "Emploi", "i-employment", true)}
        {chip(true, "Stage", null, true)}
        {chip(true, "Dakar", "i-pin", true)}
        {chip(true, "Numérique", null, true)}
        {chip(false, "Tri · Pertinence")}
      </div>
      <div style={{ padding: "10px 14px 4px", fontSize: 11, color: "var(--gj-grey)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>
        <b style={{ color: "var(--gj-ink)" }}>{empty ? 0 : 124} opportunités</b> trouvées
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 16px" }}>
        {empty ? <MobileEmptyState /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SAMPLE_M.map((o, i) => <MobileOppRowCard key={i} {...o} />)}
            <button style={{
              marginTop: 4, background: "#fff", color: "var(--gj-teal-deep)",
              border: "1.5px solid var(--gj-line)", padding: "12px", borderRadius: 10,
              fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>Charger 20 résultats de plus</button>
          </div>
        )}
      </div>

      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// =====================================================================
// M2 — Liste + bottom-sheet filtres ouverts
// =====================================================================
const MobileOppListWithFilters = () => {
  // Reuse MobileOppList chrome but overlay a filter sheet on top.
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Explorer" user="AD" />
      <div style={{ flex: 1, overflowY: "hidden", background: "var(--gj-bg)", padding: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SAMPLE_M.slice(0, 2).map((o, i) => <MobileOppRowCard key={i} {...o} />)}
        </div>
      </div>
      {/* overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,42,36,.4)", zIndex: 40 }} />
      {/* sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "#fff", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -10px 30px rgba(0,0,0,.2)", zIndex: 50,
        maxHeight: "82%", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
          <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--gj-line-strong)" }} />
        </div>
        <div style={{ padding: "0 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 900 }}>Filtres <span style={{ fontSize: 11, fontWeight: 800, background: "var(--gj-teal-deep)", color: "#fff", padding: "2px 8px", borderRadius: 999, marginLeft: 4 }}>4</span></h3>
          <button style={{ background: "transparent", border: 0, fontSize: 12.5, fontWeight: 800, color: "var(--gj-grey)", cursor: "pointer", fontFamily: "inherit" }}>Tout effacer</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 18px 12px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Type</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["Emploi", true], ["Stage", true], ["Bourse", false], ["Formation", false], ["Concours", false], ["Volontariat", false]].map(([l, on]) => (
                <button key={l} style={{
                  background: on ? "var(--gj-teal-soft)" : "#fff",
                  border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
                  color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
                  borderRadius: 999, padding: "8px 12px",
                  fontSize: 12, fontWeight: on ? 800 : 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Domaine</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["Numérique", true], ["Agriculture", false], ["Commerce", false], ["Santé", false], ["Éducation", false], ["BTP", false]].map(([l, on]) => (
                <button key={l} style={{
                  background: on ? "var(--gj-teal-soft)" : "#fff",
                  border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
                  color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
                  borderRadius: 999, padding: "8px 12px",
                  fontSize: 12, fontWeight: on ? 800 : 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Région</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["Dakar", true], ["Thiès", false], ["Tambacounda", false], ["Saint-Louis", false], ["Ziguinchor", false], ["+ 9 régions", false]].map(([l, on]) => (
                <button key={l} style={{
                  background: on ? "var(--gj-teal-soft)" : "#fff",
                  border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
                  color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
                  borderRadius: 999, padding: "8px 12px",
                  fontSize: 12, fontWeight: on ? 800 : 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Deadline</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["< 7 jours", false], ["< 30 jours", true], ["Sans limite", false]].map(([l, on]) => (
                <button key={l} style={{
                  background: on ? "var(--gj-teal-soft)" : "#fff",
                  border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
                  color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
                  borderRadius: 999, padding: "8px 12px",
                  fontSize: 12, fontWeight: on ? 800 : 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 18px 18px", borderTop: "1.5px solid var(--gj-line)" }}>
          <button style={{
            width: "100%", background: "var(--gj-teal-deep)", color: "#fff",
            border: 0, minHeight: 52, borderRadius: 12,
            fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>Voir les 124 résultats <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    </PhoneFrame>
  );
};

// =====================================================================
// M3 — Détail opportunité (sheet ascendante)
// =====================================================================
const MobileOppDetailSheet = () => {
  const overlay = { position: "absolute", inset: 0, background: "rgba(10,42,36,.5)", zIndex: 40 };
  const sheet = {
    position: "absolute", left: 0, right: 0, bottom: 0,
    background: "#fff", borderRadius: "20px 20px 0 0",
    boxShadow: "0 -12px 36px rgba(0,0,0,.22)", zIndex: 50,
    height: "94%", display: "flex", flexDirection: "column",
    overflow: "hidden",
  };
  const hero = {
    background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))",
    color: "#fff", padding: "8px 16px 18px",
    position: "relative", overflow: "hidden", flexShrink: 0,
  };
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Explorer" user="AD" />
      <div style={{ flex: 1, overflowY: "hidden", background: "var(--gj-bg)", padding: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SAMPLE_M.slice(0, 1).map((o, i) => <MobileOppRowCard key={i} {...o} />)}
        </div>
      </div>
      <div style={overlay} />
      <div style={sheet}>
        {/* grab + close */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0", position: "relative" }}>
          <span style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(255,255,255,.4)", position: "absolute", top: 8 }} />
        </div>
        <div style={hero}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <button style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "1.5px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.08)",
              color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }} aria-label="Fermer"><svg className="gj-icon gj-icon--sm"><use href="#i-close" /></svg></button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.08)",
                color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }} aria-label="Partager"><svg className="gj-icon gj-icon--sm"><use href="#i-share" /></svg></button>
              <button style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.08)",
                color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }} aria-label="Sauvegarder"><svg className="gj-icon gj-icon--sm"><use href="#i-bookmark" /></svg></button>
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, background: "var(--gj-red)", color: "#fff", padding: "4px 10px", borderRadius: 999, letterSpacing: ".4px", marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
            STAGE · CLÔTURE J-3
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2 }}>Stage Data Science · 6 mois</h2>
          <div style={{ fontSize: 12.5, opacity: .9, marginTop: 4 }}>
            <b>Sonatel</b> · Dakar Plateau
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {[
              { i: "i-pin", l: "Dakar" },
              { i: "i-funding", l: "350 000 F/mois" },
              { i: "i-clock", l: "Décision 14j" },
            ].map((m, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.12)", padding: "5px 10px", borderRadius: 999 }}>
                <svg className="gj-icon gj-icon--xs"><use href={"#" + m.i} /></svg>{m.l}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)",
            border: "1.5px solid var(--gj-line)", borderRadius: 12,
            padding: 12, display: "flex", gap: 10, alignItems: "center",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg, #19a657, #027f7e)",
              color: "#fff", fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 17,
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>Y</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-teal-deep)" }}>
                <span style={{ fontFamily: "var(--gj-font-sans)", fontSize: 13 }}>Yaye :</span>
                <span style={{ background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", fontSize: 11, fontWeight: 900, padding: "1px 6px", borderRadius: 999, marginLeft: 6 }}>94%</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>
                Tu remplis 4/5 critères. Ajoute ton projet portfolio.
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Description</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--gj-ink)" }}>
              Rejoins la cellule Innovation pour construire des modèles prédictifs sur 9M de comptes (churn, scoring crédit Wave). Encadré par un Lead Data, tu présentes ton projet final au comité de direction.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Profil</div>
            <ul style={{ fontSize: 13.5, lineHeight: 1.7, paddingLeft: 18, color: "var(--gj-ink)", margin: 0 }}>
              <li>Bac+3 à Bac+5 (stats, info)</li>
              <li>Python · SQL souhaité</li>
              <li>Autonome, bon FR</li>
            </ul>
          </div>
        </div>

        <div style={{
          flexShrink: 0, padding: "12px 14px 16px", background: "#fff",
          borderTop: "1.5px solid var(--gj-line)",
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <button style={{
            width: 50, height: 50, borderRadius: 12,
            border: "1.5px solid var(--gj-line)", background: "#fff",
            color: "var(--gj-teal-deep)", cursor: "pointer", flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }} aria-label="Sauvegarder"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-bookmark" /></svg></button>
          <button style={{
            flex: 1, background: "var(--gj-action)", color: "#fff",
            border: 0, minHeight: 50, borderRadius: 12,
            fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>Postuler maintenant <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    </PhoneFrame>
  );
};

// =====================================================================
// M4 — Sheet "Postuler"
// =====================================================================
const MobileApplySheet = () => {
  const body = { flex: 1, overflowY: "auto", padding: "16px 14px 12px", background: "var(--gj-bg)", display: "flex", flexDirection: "column", gap: 14 };
  const label = (lbl, req) => (
    <label style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", textTransform: "uppercase", letterSpacing: ".5px", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
      {lbl} {req && <span style={{ color: "var(--gj-red)" }}>*</span>}
    </label>
  );
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <div style={{
        background: "#fff", padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: "1.5px solid var(--gj-line)", flexShrink: 0,
      }}>
        <button style={{ width: 36, height: 36, border: 0, background: "transparent", cursor: "pointer", color: "var(--gj-grey)" }} aria-label="Fermer">
          <svg className="gj-icon"><use href="#i-close" /></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>Postuler</div>
          <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Stage Data Science · Sonatel</div>
        </div>
      </div>
      <div style={body}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--gj-green-soft)", color: "var(--gj-green-ink)",
          padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--gj-green)",
          fontSize: 12, fontWeight: 700,
        }}>
          <svg className="gj-icon gj-icon--sm"><use href="#i-check-circle" /></svg>
          <span style={{ flex: 1 }}>Pré-rempli depuis ton profil. Vérifie et ajuste.</span>
        </div>

        <div>
          {label("Identité")}
          <div style={{
            background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10,
            padding: 12, display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",
                color: "#fff", fontWeight: 800, fontSize: 13,
                display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>AD</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Awa Diop · 22 ans</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>+221 77 654 32 10 · Tambacounda</div>
              </div>
            </div>
            <button style={{
              alignSelf: "flex-start", background: "transparent", border: 0,
              color: "var(--gj-teal-deep)", fontSize: 11.5, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit", padding: 0,
            }}>Modifier dans mon profil →</button>
          </div>
        </div>

        <div>
          {label("Pourquoi cette opportunité ?", true)}
          <textarea
            defaultValue="Le stage Data Science chez Sonatel correspond à ce que je cherche : un terrain à grande échelle pour mettre en pratique Python et scikit-learn. J'ai porté un mini-projet de scoring crédit étudiant en L2."
            style={{
              width: "100%", border: "1.5px solid var(--gj-line)",
              borderRadius: 10, padding: 12, minHeight: 110,
              fontFamily: "inherit", fontSize: 13, lineHeight: 1.5,
              outline: "none", resize: "vertical", color: "var(--gj-ink)",
              background: "#fff",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "transparent", border: 0, color: "var(--gj-teal-deep)",
              fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", padding: 0,
            }}>
              <svg className="gj-icon gj-icon--xs"><use href="#i-sparkle" /></svg> Yaye m'aide
            </button>
            <span style={{ fontSize: 11, color: "var(--gj-grey)" }}>248 / 1000</span>
          </div>
        </div>

        <div>
          {label("CV (facultatif)")}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 12, background: "#fff",
            border: "1.5px solid var(--gj-line)", borderRadius: 10,
          }}>
            <div style={{ width: 32, height: 40, borderRadius: 4, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, flexShrink: 0 }}>PDF</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>CV_Awa_Diop_2026.pdf</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>238 Ko · coffre-fort</div>
            </div>
            <button style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Changer</button>
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 10, cursor: "pointer", fontSize: 11.5, color: "var(--gj-ink)", lineHeight: 1.45 }}>
          <span style={{
            width: 18, height: 18, borderRadius: 5,
            border: "1.5px solid var(--gj-teal)",
            background: "var(--gj-teal)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
          }}>
            <svg className="gj-icon" style={{ width: 12, height: 12, color: "#fff" }}><use href="#i-check" /></svg>
          </span>
          <span>J'accepte que Sonatel reçoive mon profil CJS et me contacte.</span>
        </label>
      </div>
      <div style={{ padding: "12px 14px 16px", background: "#fff", borderTop: "1.5px solid var(--gj-line)", flexShrink: 0, display: "flex", gap: 9 }}>
        <button onClick={() => window.gjToast && window.gjToast("Brouillon enregistré — reprends quand tu veux", "info")} style={{
          flex: "0 0 auto", background: "#fff", color: "var(--gj-grey)",
          border: "1.5px solid var(--gj-line)", minHeight: 52, borderRadius: 12, padding: "0 14px",
          fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
        }}>Brouillon</button>
        <button style={{
          flex: 1, background: "var(--gj-action)", color: "#fff",
          border: 0, minHeight: 52, borderRadius: 12,
          fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          Envoyer ma candidature <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
        </button>
      </div>
      <div style={{ padding: "0 14px 14px", background: "#fff", flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "var(--gj-grey)", textAlign: "center", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, width: "100%", justifyContent: "center" }}>
          <svg className="gj-icon gj-icon--xs" style={{ color: "var(--gj-whatsapp)" }}><use href="#i-chat" /></svg>
          Confirmation sur WhatsApp +221 77 654 32 10
        </div>
      </div>
    </PhoneFrame>
  );
};

// =====================================================================
// M5 — Confirmation envoyée (avec preview WhatsApp)
// =====================================================================
const MobileApplyConfirmation = () => {
  return (
    <PhoneFrame bg="var(--gj-bg)">
      <TopBar subtitle="Candidature envoyée" user="AD" />
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 16px", display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
        {/* Success icon */}
        <div style={{ position: "relative", width: 100, height: 100, marginTop: 6 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "var(--gj-green-soft)",
          }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "3px solid var(--gj-green)",
            animation: "gj-pulse-live 2s infinite",
          }} />
          <div style={{
            position: "absolute", inset: 18, borderRadius: "50%",
            background: "var(--gj-green)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,170,90,.4)",
          }}>
            <svg className="gj-icon" style={{ width: 36, height: 36 }}><use href="#i-check" /></svg>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>Candidature envoyée</h1>
          <p style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 6, lineHeight: 1.5 }}>
            <b style={{ color: "var(--gj-ink)" }}>Sonatel</b> vient de recevoir ton dossier.<br />
            Réponse sous 14 jours · suis l'avancée dans tes candidatures.
          </p>
        </div>

        {/* WhatsApp preview */}
        <div style={{
          width: "100%", background: "#fff",
          border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 0,
          overflow: "hidden", textAlign: "left",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--gj-whatsapp)", color: "#fff" }}>
            <svg className="gj-icon gj-icon--sm"><use href="#i-chat" /></svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>WhatsApp · Guichet Jeunesse</div>
              <div style={{ fontSize: 11, opacity: .9 }}>+221 77 654 32 10 · à l'instant</div>
            </div>
          </div>
          <div style={{
            padding: "14px 16px", background: "#E2F1F1",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{
              alignSelf: "flex-start", background: "#fff",
              padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
              boxShadow: "0 1px 2px rgba(0,0,0,.08)", maxWidth: "92%",
              fontSize: 13, lineHeight: 1.5, color: "var(--gj-ink)",
            }}>
              <b>Awa</b>, ta candidature pour <b>Stage Data Science · Sonatel</b> a bien été envoyée.<br/>
              Réf. <b style={{ color: "var(--gj-teal-deep)" }}>CAND-2026-04823</b>.<br/>
              Tu reçois un nouveau message dès qu'il y a une mise à jour.
              <div style={{ fontSize: 11, color: "var(--gj-grey-2)", marginTop: 4, textAlign: "right" }}>9:41</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
          <button style={{
            background: "var(--gj-teal-deep)", color: "#fff",
            border: 0, minHeight: 50, borderRadius: 12,
            fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            Voir mes candidatures <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
          </button>
          <button style={{
            background: "#fff", color: "var(--gj-teal-deep)",
            border: "1.5px solid var(--gj-line)", minHeight: 46,
            borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
          }}>Découvrir 3 opps similaires</button>
        </div>
      </div>
      <BottomNav active="cand" />
    </PhoneFrame>
  );
};

// =====================================================================
// M6 — État vide
// =====================================================================
const MobileEmptyState = () => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
    padding: "40px 18px 20px", gap: 14,
  }}>
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="var(--gj-teal-soft)" />
      <circle cx="52" cy="50" r="22" fill="#fff" stroke="var(--gj-teal-deep)" strokeWidth="3" />
      <line x1="70" y1="68" x2="88" y2="86" stroke="var(--gj-teal-deep)" strokeWidth="5" strokeLinecap="round" />
      <line x1="42" y1="50" x2="62" y2="50" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="44" x2="58" y2="44" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="56" x2="55" y2="56" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="92" cy="32" r="7" fill="var(--gj-yellow)" />
    </svg>
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 900 }}>Aucune opportunité trouvée</h3>
      <p style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 6, lineHeight: 1.5 }}>
        Tes 4 filtres sont trop restrictifs.<br />Élargis ou réinitialise pour voir plus.
      </p>
    </div>
    <button style={{
      background: "var(--gj-teal-deep)", color: "#fff",
      border: 0, padding: "11px 20px", borderRadius: 10,
      fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>Réinitialiser les filtres</button>

    <div style={{
      marginTop: 8, padding: 12, background: "var(--gj-teal-soft)",
      border: "1.5px solid var(--gj-line)", borderRadius: 10,
      display: "flex", gap: 10, alignItems: "center",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "linear-gradient(135deg, #19a657, #027f7e)",
        color: "#fff", fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 16,
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>Y</div>
      <div style={{ flex: 1, textAlign: "left", fontSize: 12, color: "var(--gj-ink)", lineHeight: 1.4 }}>
        Demande à <b>Yaye</b> de chercher pour toi.
      </div>
    </div>
  </div>
);

Object.assign(window, { MobileOppList, MobileOppListWithFilters, MobileOppDetailSheet, MobileApplySheet, MobileApplyConfirmation, MobileEmptyState, MobileOppRowCard, SAMPLE_M });
