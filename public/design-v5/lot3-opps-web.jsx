/* eslint-disable */
// Lot 3 — Opportunités · Web (desktop)
//   W1 — Liste + filtres latéraux + recherche (état par défaut)
//   W2 — Liste + slide-over détail (sur clic d'une opp)
//   W3 — Modal "Postuler" (formulaire pré-rempli)
//   W4 — État "aucun résultat" (illustration + reset)

// =====================================================================
// Shared filter chip
// =====================================================================
const FilterCheck = ({ label, count, on, color = "teal" }) => (
  <label style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 4px", cursor: "pointer",
    fontSize: 13, color: "var(--gj-ink)",
  }}>
    <span style={{
      width: 18, height: 18, borderRadius: 5,
      border: `1.5px solid ${on ? `var(--gj-${color})` : "var(--gj-line-strong)"}`,
      background: on ? `var(--gj-${color})` : "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {on && <svg className="gj-icon" style={{ width: 12, height: 12, color: "#fff" }}><use href="#i-check" /></svg>}
    </span>
    <span style={{ flex: 1, fontWeight: on ? 700 : 500 }}>{label}</span>
    <span style={{ fontSize: 11, color: "var(--gj-grey)", fontWeight: 700 }}>{count}</span>
  </label>
);

// =====================================================================
// FilterPanel (web sidebar) — used in list pages
// =====================================================================
const WebFilterPanel = () => {
  const wrap = {
    background: "#fff", border: "1.5px solid var(--gj-line)",
    borderRadius: 12, padding: 16,
    display: "flex", flexDirection: "column", gap: 4,
    position: "sticky", top: 18,
    maxHeight: "calc(100vh - 80px)", overflowY: "auto",
  };
  const head = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 8, borderBottom: "1px solid var(--gj-line)",
  };
  const sectH = {
    fontSize: 11, fontWeight: 800, color: "var(--gj-grey)",
    textTransform: "uppercase", letterSpacing: ".4px",
    margin: "14px 0 4px",
  };
  const chipRow = { display: "flex", flexWrap: "wrap", gap: 6 };
  const chip = (on, label) => (
    <button key={label} style={{
      background: on ? "var(--gj-teal-soft)" : "#fff",
      border: `1.5px solid ${on ? "var(--gj-teal)" : "var(--gj-line)"}`,
      color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)",
      borderRadius: 999, padding: "6px 11px",
      fontSize: 12, fontWeight: on ? 800 : 600,
      cursor: "pointer", fontFamily: "inherit", minHeight: 32,
    }}>{label}</button>
  );

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-teal-deep)" }}><use href="#i-filter" /></svg>
          <h3 style={{ fontSize: 14, fontWeight: 900 }}>Filtres <span style={{ fontSize: 11, fontWeight: 800, background: "var(--gj-teal-deep)", color: "#fff", padding: "1px 6px", borderRadius: 999, marginLeft: 4 }}>4</span></h3>
        </div>
        <button style={{ background: "transparent", border: 0, fontSize: 12, fontWeight: 800, color: "var(--gj-grey)", cursor: "pointer", fontFamily: "inherit" }}>Tout effacer</button>
      </div>

      <div style={sectH}>Type</div>
      <FilterCheck label="Emploi" count={186} on />
      <FilterCheck label="Stage" count={142} on />
      <FilterCheck label="Bourse" count={94} />
      <FilterCheck label="Formation" count={143} />
      <FilterCheck label="Concours / Appel à projets" count={67} />
      <FilterCheck label="Volontariat" count={52} />

      <div style={sectH}>Domaine</div>
      <FilterCheck label="Numérique / Tech" count={94} on />
      <FilterCheck label="Agriculture & élevage" count={87} />
      <FilterCheck label="Commerce / Marketing" count={62} />
      <FilterCheck label="Santé" count={41} />
      <FilterCheck label="Éducation" count={38} />
      <FilterCheck label="BTP / Énergie" count={29} />
      <button style={{ alignSelf: "flex-start", background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: "4px 4px", fontFamily: "inherit" }}>+ 6 autres domaines</button>

      <div style={sectH}>Région</div>
      <div style={chipRow}>
        {["Dakar", "Thiès", "Saint-Louis", "Tambacounda", "Ziguinchor"].map(r => chip(r === "Dakar" || r === "Tambacounda", r))}
        <button style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: "6px 4px", fontFamily: "inherit" }}>+ 9</button>
      </div>

      <div style={sectH}>Deadline</div>
      <FilterCheck label="Moins de 7 jours" count={28} color="red" />
      <FilterCheck label="Moins de 30 jours" count={184} />
      <FilterCheck label="Sans limite" count={210} />

      <div style={sectH}>Rémunération</div>
      <FilterCheck label="Payée" count={312} />
      <FilterCheck label="Bourse / aide" count={94} />
      <FilterCheck label="Bénévolat" count={52} />

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--gj-line)" }}>
        <button style={{
          width: "100%", background: "var(--gj-teal-deep)", color: "#fff",
          border: 0, padding: "10px 14px", borderRadius: 10,
          fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        }}>Appliquer 4 filtres · 124 résultats</button>
      </div>
    </div>
  );
};

// =====================================================================
// catKey — mappe un libellé de catégorie sur son couple de couleurs officiel
// =====================================================================
const CAT_MAP = [
  [/emploi|cdi|cdd|poste/i,          "emploi"],
  [/stage|alternance|apprentissage/i,"stage"],
  [/formation|bootcamp|atelier|module/i, "formation"],
  [/bourse|financement|subvention|appel [àa] projets?|concours|aide/i, "financement"],
  [/volontariat|mentorat|service civique|b[ée]n[ée]volat/i, "volontariat"],
  [/[ée]v[ée]nement|forum|salon|conf[ée]rence/i, "evenement"],
];
const catKey = (label) => {
  const hit = (CAT_MAP.find(([re]) => re.test(label || "")) || [null, "neutre"])[1];
  return { key: hit, bg: "var(--cat-" + hit + "-soft)", fg: "var(--cat-" + hit + "-ink)", solid: "var(--cat-" + hit + ")" };
};
window.catKey = catKey;

// =====================================================================
// OppListCard (web) — full row, with favorite button
// =====================================================================
const OppListCard = ({ tag, tagTone = "cjs", title, org, region, deadline, type, salary, fav = false, sector }) => {
  // Code couleur catégorie (retour design V3) : 1 type d'offre = 1 couleur.
  // Le rouge ne code plus le type — il est réservé à l'urgence de date limite.
  const catLabel = (tag || "").split("·")[0].trim();
  const jLabel = ((tag || "").split("·")[1] || "").trim();
  const t = catKey(catLabel);
  // signalétique sectorielle : grande tuile picto (reconnaître avant de lire)
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
      borderRadius: 12, padding: 14,
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16,
      cursor: "pointer", alignItems: "center",
      transition: "border-color .15s, box-shadow .15s",
    }}>
      {/* tuile sectorielle */}
      <div style={{ position: "relative", width: 86, alignSelf: "stretch", minHeight: 96, borderRadius: 10, background: secBg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg className="gj-icon" style={{ position: "absolute", right: -12, bottom: -14, width: 58, height: 58, opacity: .22, color: "#fff" }}><use href={"#" + secIcon} /></svg>
        <svg className="gj-icon" style={{ width: 34, height: 34, color: "#fff", position: "relative" }}><use href={"#" + secIcon} /></svg>
        <span style={{ position: "absolute", top: 6, left: 6, width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,.94)", color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{(org || "?")[0]}</span>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
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
          {/* Le score de correspondance a été retiré des cartes : un pourcentage
              opaque n'aide pas la décision et laisse croire à un classement automatique. */}
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, color: "var(--gj-ink)", marginBottom: 4 }}>{title}</h3>
        <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginBottom: 10 }}>{org}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11.5, color: "var(--gj-grey)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg className="gj-icon gj-icon--xs"><use href="#i-pin" /></svg>{region}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg className="gj-icon gj-icon--xs"><use href="#i-employment" /></svg>{type}
          </span>
          {salary && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg className="gj-icon gj-icon--xs"><use href="#i-funding" /></svg>{salary}
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 800, color: deadline.urgent ? "var(--gj-red)" : "var(--gj-grey)" }}>
            <svg className="gj-icon gj-icon--xs"><use href="#i-clock" /></svg>{deadline.label}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, justifyContent: "space-between" }}>
        <button aria-label="Sauvegarder" style={{
          width: 38, height: 38, borderRadius: "50%",
          border: "1.5px solid var(--gj-line)",
          background: fav ? "var(--gj-yellow-soft)" : "#fff",
          color: fav ? "var(--gj-yellow-ink)" : "var(--gj-grey)",
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-bookmark" /></svg>
        </button>
        <button style={{
          background: "#fff", color: "var(--gj-teal-deep)",
          border: "1.5px solid var(--gj-line-strong)", padding: "8px 14px", borderRadius: 8,
          fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
        }}>Voir l'offre <svg className="gj-icon gj-icon--xs"><use href="#i-arrow-right" /></svg></button>
      </div>
    </article>
  );
};

// =====================================================================
// Search + sort header
// =====================================================================
const WebOppListHeader = ({ results = 124, query = "data science" }) => (
  <div>
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
      <div style={{
        flex: 1, minWidth: 320,
        display: "flex", alignItems: "center", gap: 10,
        background: "#fff", border: "1.5px solid var(--gj-line)",
        borderRadius: 10, padding: "0 14px", minHeight: 46,
      }}>
        <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
        <input
          defaultValue={query}
          placeholder="Rechercher dans le titre ou la description…"
          style={{ flex: 1, border: 0, outline: 0, fontSize: 14, background: "transparent", fontFamily: "inherit", color: "var(--gj-ink)" }}
        />
        <kbd style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, background: "var(--gj-bg)", border: "1px solid var(--gj-line)", borderRadius: 4, padding: "2px 6px", color: "var(--gj-grey)" }}>⌘ K</kbd>
      </div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#fff", border: "1.5px solid var(--gj-line)",
        borderRadius: 10, padding: "0 14px", minHeight: 46,
        fontSize: 13, fontWeight: 700, cursor: "pointer",
      }}>
        <span style={{ color: "var(--gj-grey)" }}>Trier par</span>
        <span style={{ color: "var(--gj-ink)" }}>Pertinence</span>
        <svg className="gj-icon gj-icon--xs" style={{ color: "var(--gj-grey)" }}><use href="#i-chevron-down" /></svg>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2, color: "var(--gj-ink)" }}>
          {results} opportunités{query ? <> · « <span style={{ color: "var(--gj-teal-deep)" }}>{query}</span> »</> : null}
        </h1>
        <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 4 }}>
          4 filtres actifs · mis à jour il y a 1 min
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--gj-grey)", fontWeight: 700 }}>
        <span style={{ padding: "5px 8px", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
          Emploi <svg className="gj-icon gj-icon--xs"><use href="#i-close" /></svg>
        </span>
        <span style={{ padding: "5px 8px", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
          Stage <svg className="gj-icon gj-icon--xs"><use href="#i-close" /></svg>
        </span>
        <span style={{ padding: "5px 8px", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
          Numérique <svg className="gj-icon gj-icon--xs"><use href="#i-close" /></svg>
        </span>
        <span style={{ padding: "5px 8px", background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
          Dakar, Tambacounda <svg className="gj-icon gj-icon--xs"><use href="#i-close" /></svg>
        </span>
      </div>
    </div>
  </div>
);

const WebOppPagination = () => {
  const pill = (on, label) => ({
    minWidth: 36, height: 36, padding: "0 10px",
    border: `1.5px solid ${on ? "var(--gj-teal-deep)" : "var(--gj-line)"}`,
    background: on ? "var(--gj-teal-deep)" : "#fff",
    color: on ? "#fff" : "var(--gj-ink)",
    borderRadius: 8, fontWeight: 800, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
  });
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid var(--gj-line)" }}>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>
        Page <b style={{ color: "var(--gj-ink)" }}>1</b> sur 7 · résultats 1–20 sur 124
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={pill(false)}><svg className="gj-icon gj-icon--xs"><use href="#i-chevron-left" /></svg></button>
        <button style={pill(true, "1")}>1</button>
        <button style={pill(false, "2")}>2</button>
        <button style={pill(false, "3")}>3</button>
        <span style={{ alignSelf: "center", color: "var(--gj-grey)", fontWeight: 700 }}>…</span>
        <button style={pill(false, "7")}>7</button>
        <button style={pill(false)}><svg className="gj-icon gj-icon--xs"><use href="#i-chevron-right" /></svg></button>
      </div>
    </div>
  );
};

// =====================================================================
// Sample data (5 opps)
// =====================================================================
const SAMPLE_OPPS = [
  { tag: "STAGE · J-3", tagTone: "urgent", title: "Stage Data Science · 6 mois", org: "Sonatel — Direction Innovation",
    region: "Dakar Plateau", type: "Stage rémunéré", salary: "350 000 F/mois",
    deadline: { label: "Postuler avant le 29 mai", urgent: true }, fav: true },
  { tag: "EMPLOI · J-12", tagTone: "cjs", title: "Développeur Web Junior · CDI", org: "Wave Mobile Money",
    region: "Dakar Almadies", type: "CDI", salary: "à partir de 500 000 F",
    deadline: { label: "Postuler avant le 7 juin" } },
  { tag: "BOURSE · J-9", tagTone: "partner", title: "Bourse mobilité numérique · Master 2", org: "Ministère de l'Enseignement Supérieur",
    region: "International (France, Maroc)", type: "Bourse complète", salary: "frais + 80 000 F/mois",
    deadline: { label: "Postuler avant le 4 juin" } },
  { tag: "EMPLOI · J-30", tagTone: "info", title: "Analyste BI · CDD 12 mois", org: "Société Générale Sénégal",
    region: "Dakar", type: "CDD 12 mois", salary: "négociable",
    deadline: { label: "Postuler avant le 25 juin" } },
  { tag: "STAGE · J-18", tagTone: "cjs", title: "Stage agronomie · Coopérative régionale", org: "GIE Diaobé · maraîchage",
    region: "Tambacounda", type: "Stage 6 mois", salary: "180 000 F/mois",
    deadline: { label: "Postuler avant le 13 juin" }, fav: true },
];

// =====================================================================
// W1 — Liste opportunités (état par défaut)
// =====================================================================
const WebOppList = ({ withDetail = false, withApplyModal = false, empty = false }) => {
  const root = {
    display: "grid", gridTemplateColumns: "260px 1fr",
    height: "100%", background: "var(--gj-bg)",
    overflow: "hidden", position: "relative",
  };
  const main = { display: "flex", flexDirection: "column", overflow: "hidden" };
  const page = { display: "grid", gridTemplateColumns: "280px 1fr", gap: 22, padding: "22px 28px 30px", overflowY: "auto", flex: 1 };
  return (
    <div style={root}>
      <BenefSidebar active="emploi" />
      <div style={main}>
        <BenefTopBar />
        <div style={page}>
          <WebFilterPanel />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {empty ? (
              <WebEmptyState />
            ) : (
              <>
                <WebOppListHeader />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {SAMPLE_OPPS.map((o, i) => <OppListCard key={i} {...o} />)}
                </div>
                <WebOppPagination />
              </>
            )}
          </div>
        </div>
      </div>

      {withDetail && <WebOppSlideOver />}
      {withApplyModal && <WebApplyModal />}
    </div>
  );
};

// =====================================================================
// W2 — Slide-over détail
// =====================================================================
const WebOppSlideOver = () => {
  const overlay = { position: "absolute", inset: 0, background: "rgba(10, 42, 36, .35)", zIndex: 40 };
  const panel = {
    position: "absolute", right: 0, top: 0, bottom: 0,
    width: 620, background: "#fff",
    boxShadow: "-12px 0 40px rgba(0,0,0,.18)",
    display: "flex", flexDirection: "column",
    zIndex: 50,
    animation: "slide-in .25s ease",
  };
  // hero band
  const hero = {
    background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))",
    color: "#fff", padding: "20px 24px 24px",
    position: "relative", overflow: "hidden", flexShrink: 0,
  };
  const ghostBtn = {
    width: 36, height: 36, borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,.3)",
    background: "rgba(255,255,255,.08)",
    color: "#fff", cursor: "pointer", display: "inline-flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  const body = { flex: 1, overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 20 };
  const sectH = { fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 };
  const keyValGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const kvCard = {
    background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)",
    borderRadius: 10, padding: "10px 12px",
  };

  return (
    <>
      <style>{`@keyframes slide-in{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div style={overlay} />
      <aside style={panel}>
        {/* URL bar pour rappeler le slug SEO */}
        <div style={{
          background: "var(--gj-ink-teal)", color: "rgba(255,255,255,.85)",
          padding: "6px 14px", fontSize: 11,
          fontFamily: "ui-monospace, monospace",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid rgba(255,255,255,.08)", flexShrink: 0,
        }}>
          <svg className="gj-icon gj-icon--xs" style={{ color: "var(--gj-yellow)" }}><use href="#i-shield" /></svg>
          <span style={{ color: "rgba(255,255,255,.55)" }}>guichetjeunesse.sn</span>
          <span style={{ color: "var(--gj-yellow)" }}>/opportunites/</span>
          <span style={{ color: "#fff" }}>stage-data-science-sonatel-2026</span>
          <span style={{ flex: 1 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,.55)" }}>
            <svg className="gj-icon gj-icon--xs"><use href="#i-eye" /></svg>
            <b style={{ color: "#fff" }}>1 248</b> vues
          </span>
        </div>
        <div style={hero}>
          <span style={{ position: "absolute", right: -50, top: -60, width: 220, height: 220, background: "radial-gradient(circle, rgba(248,163,9,.18), transparent 60%)", pointerEvents: "none" }} />
          <svg className="gj-icon" style={{ position: "absolute", right: -18, bottom: -24, width: 130, height: 130, opacity: .14, color: "#fff", pointerEvents: "none" }}><use href="#i-desktop" /></svg>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, position: "relative" }}>
            <button style={ghostBtn} aria-label="Retour"><svg className="gj-icon gj-icon--sm"><use href="#i-chevron-left" /></svg></button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={ghostBtn} aria-label="Partager"><svg className="gj-icon gj-icon--sm"><use href="#i-share" /></svg></button>
              <button style={ghostBtn} aria-label="Sauvegarder"><svg className="gj-icon gj-icon--sm"><use href="#i-bookmark" /></svg></button>
              <button style={ghostBtn} aria-label="Fermer"><svg className="gj-icon gj-icon--sm"><use href="#i-close" /></svg></button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, position: "relative", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, background: "var(--cat-stage)", color: "#fff", padding: "4px 10px", borderRadius: 999, letterSpacing: ".4px", textTransform: "uppercase" }}>Stage</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, background: "var(--gj-red)", color: "#fff", padding: "4px 10px", borderRadius: 999, letterSpacing: ".4px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
              Clôture J-3
            </span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-.2px", position: "relative" }}>
            Stage Data Science · 6 mois
          </h2>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 4, position: "relative" }}>
            <b>Sonatel</b> — Direction Innovation · Dakar Plateau
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, position: "relative" }}>
            {[
              { i: "i-pin", l: "Dakar" },
              { i: "i-funding", l: "350 000 F/mois" },
              { i: "i-clock", l: "Décision sous 14j" },
              { i: "i-target", l: "Numérique" },
            ].map((m, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.12)", padding: "5px 10px", borderRadius: 999 }}>
                <svg className="gj-icon gj-icon--xs"><use href={"#" + m.i} /></svg>
                {m.l}
              </span>
            ))}
          </div>
        </div>

        <div style={body}>
          {/* Yaye match insight */}
          <div style={{
            background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)",
            border: "1.5px solid var(--gj-line)", borderRadius: 12,
            padding: 14, display: "flex", gap: 12, alignItems: "center",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #19a657, #027f7e)",
              color: "#fff", fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 20,
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: "0 0 0 2px rgba(0,122,92,.1)",
            }}>Y</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-teal-deep)" }}>
                <span style={{ fontFamily: "var(--gj-font-sans)", fontSize: 14 }}>Yaye dit :</span>
                <span style={{ background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999, marginLeft: 6 }}>94% match</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 3, lineHeight: 1.45 }}>
                Tu remplis 4/5 critères. Il te manque juste 1 projet portfolio à mentionner.
              </div>
            </div>
          </div>

          {/* Key facts grid */}
          <div>
            <div style={sectH}>Détails de l'offre</div>
            <div style={keyValGrid}>
              <div style={kvCard}>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", textTransform: "uppercase", fontWeight: 800, letterSpacing: ".4px" }}>Type</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>Stage rémunéré · 6 mois</div>
              </div>
              <div style={kvCard}>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", textTransform: "uppercase", fontWeight: 800, letterSpacing: ".4px" }}>Rémunération</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>350 000 FCFA / mois</div>
              </div>
              <div style={kvCard}>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", textTransform: "uppercase", fontWeight: 800, letterSpacing: ".4px" }}>Lieu</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>Dakar Plateau · hybride 2j/sem.</div>
              </div>
              <div style={kvCard}>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", textTransform: "uppercase", fontWeight: 800, letterSpacing: ".4px" }}>Domaine</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>Data Science · BI</div>
              </div>
            </div>
          </div>

          <div>
            <div style={sectH}>Description du poste</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--gj-ink)" }}>
              Rejoins la cellule Innovation de Sonatel pour construire des modèles prédictifs sur la data client (churn, segmentation, scoring crédit Wave). Encadré par un Lead Data, tu auras accès à un dataset de 9M de comptes et tu présenteras ton projet final au comité de direction.
            </p>
            <ul style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 18, color: "var(--gj-ink)" }}>
              <li>Construire & déployer 2 modèles de scoring (Python, scikit-learn)</li>
              <li>Co-piloter un dashboard temps réel (PowerBI ou Looker)</li>
              <li>Présenter tes résultats devant 3 directions métier</li>
            </ul>
          </div>

          <div>
            <div style={sectH}>Profil recherché — où en es-tu ?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Bac+3 à Bac+5 (statistique, info, ingénierie)", true],
                ["Python obligatoire", true],
                ["SQL souhaité", true],
                ["Git apprécié", true],
                ["Projet portfolio à présenter", false],
              ].map(([label, ok], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: ok ? "var(--gj-green-soft)" : "var(--gj-yellow-soft)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: ok ? "var(--gj-green)" : "var(--gj-yellow-deep)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + (ok ? "i-check" : "i-plus")} /></svg></span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)" }}>{label}</span>
                  {!ok && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-yellow-ink)" }}>À compléter</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logos partenaires — gage de crédibilité (retour design V3) */}
        <div style={{ flexShrink: 0, padding: "12px 24px", background: "var(--gj-bg)", borderTop: "1px solid var(--gj-line)", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--gj-grey)", flexShrink: 0 }}>Offre portée par</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {["Sonatel", "Ministère de la Jeunesse", "CJS"].map((n) => (
              <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 8, padding: "5px 10px" }}>
                <span style={{ width: 22, height: 22, borderRadius: 5, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{n[0]}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gj-ink)" }}>{n}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Sticky action footer */}
        <div style={{
          flexShrink: 0, background: "#fff",
          borderTop: "1.5px solid var(--gj-line)",
          padding: "14px 24px",
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <button style={{
            width: 50, height: 50, borderRadius: 12,
            border: "1.5px solid var(--gj-line)", background: "#fff",
            color: "var(--gj-teal-deep)", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }} aria-label="Sauvegarder"><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-bookmark" /></svg></button>
          <button style={{
            width: 50, height: 50, borderRadius: 12,
            border: "1.5px solid var(--gj-line)", background: "#fff",
            color: "var(--gj-teal-deep)", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }} aria-label="Partager"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-share" /></svg></button>
          <button style={{
            flex: 1, background: "var(--gj-action)", color: "#fff",
            border: 0, minHeight: 50, borderRadius: 12,
            fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            Postuler maintenant <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
          </button>
        </div>
      </aside>
    </>
  );
};

// =====================================================================
// W3 — Modal Postuler (pré-rempli SSO)
// =====================================================================
const WebApplyModal = () => {
  const overlay = {
    position: "absolute", inset: 0, background: "rgba(10, 42, 36, .55)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70,
    padding: 28,
  };
  const modal = {
    background: "#fff", borderRadius: 16,
    width: "min(680px, 100%)", maxHeight: "90%",
    display: "flex", flexDirection: "column", overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0,0,0,.4)",
  };
  const head = {
    padding: "18px 24px", display: "flex", alignItems: "center", gap: 12,
    borderBottom: "1.5px solid var(--gj-line)", flexShrink: 0,
  };
  const body = { padding: "22px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, flex: 1 };
  const label = (lbl, req) => (
    <label style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", textTransform: "uppercase", letterSpacing: ".5px", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
      {lbl} {req && <span style={{ color: "var(--gj-red)" }}>*</span>}
    </label>
  );
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={head}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg className="gj-icon gj-icon--md"><use href="#i-employment" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 900 }}>Postuler · Stage Data Science · 6 mois</h2>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>Sonatel · Direction Innovation · clôture dans 3 jours</div>
          </div>
          <button style={{ width: 36, height: 36, border: 0, background: "transparent", cursor: "pointer", color: "var(--gj-grey)" }} aria-label="Fermer">
            <svg className="gj-icon"><use href="#i-close" /></svg>
          </button>
        </div>

        <div style={body}>
          {/* Pre-fill notice */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--gj-green-soft)", color: "var(--gj-green-ink)",
            padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--gj-green)",
            fontSize: 12.5, fontWeight: 700,
          }}>
            <svg className="gj-icon gj-icon--sm"><use href="#i-check-circle" /></svg>
            <span style={{ flex: 1 }}>Pré-rempli depuis ton profil · vérifie et ajuste si besoin.</span>
          </div>

          {/* Identité (locked) */}
          <div>
            {label("Identité (issue de ton profil)")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",
                  color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 12, flexShrink: 0,
                }}>AD</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Awa Diop</div>
                  <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>+221 77 654 32 10</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10 }}>
                <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href="#i-pin" /></svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Tambacounda · 22 ans</div>
                  <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>Bac+2 · Licence 2 Stats</div>
                </div>
              </div>
            </div>
          </div>

          {/* Motivation */}
          <div>
            {label("Pourquoi cette opportunité ?", true)}
            <textarea
              defaultValue="Le stage Data Science chez Sonatel est exactement ce que je cherche : un terrain à grande échelle (9M de comptes) qui me permettra de mettre en pratique mes connaissances en Python et scikit-learn, tout en travaillant sur des problèmes métier concrets (scoring, segmentation). J'ai porté un mini-projet de scoring crédit étudiant en L2 — je peux le présenter en entretien."
              style={{
                width: "100%", border: "1.5px solid var(--gj-line)",
                borderRadius: 10, padding: 14, minHeight: 130,
                fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.5,
                outline: "none", resize: "vertical", color: "var(--gj-ink)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <button style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", border: 0, color: "var(--gj-teal-deep)",
                fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", padding: 0,
              }}>
                <svg className="gj-icon gj-icon--xs"><use href="#i-sparkle" /></svg> Aide-moi à écrire (Yaye)
              </button>
              <span style={{ fontSize: 11, color: "var(--gj-grey)" }}>438 / 1 000 caractères</span>
            </div>
          </div>

          {/* CV attach */}
          <div>
            {label("CV (PDF ou Doc)")}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", background: "#fff",
              border: "1.5px solid var(--gj-line)", borderRadius: 10,
            }}>
              <div style={{ width: 38, height: 46, borderRadius: 4, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, letterSpacing: ".3px", flexShrink: 0 }}>PDF</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>CV_Awa_Diop_2026.pdf</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>238 Ko · ajouté depuis ton coffre-fort · 03/2026</div>
              </div>
              <button style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Changer</button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 6 }}>
              Optionnel — tu peux postuler sans CV, le recruteur verra ton profil.
            </div>
          </div>

          {/* Consent */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10, cursor: "pointer", fontSize: 12, color: "var(--gj-ink)", lineHeight: 1.5 }}>
            <span style={{
              width: 18, height: 18, borderRadius: 5,
              border: "1.5px solid var(--gj-teal)",
              background: "var(--gj-teal)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
            }}>
              <svg className="gj-icon" style={{ width: 12, height: 12, color: "#fff" }}><use href="#i-check" /></svg>
            </span>
            <span>J'accepte que Sonatel reçoive mon profil CJS et me contacte. Tes données restent stockées au Sénégal — <a style={{ color: "var(--gj-teal-deep)", fontWeight: 800 }}>en savoir plus</a>.</span>
          </label>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1.5px solid var(--gj-line)", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 12, color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg className="gj-icon gj-icon--sm" style={{ color: "var(--gj-whatsapp)" }}><use href="#i-chat" /></svg>
            Confirmation envoyée sur WhatsApp +221 77 654 32 10
          </span>
          <button onClick={() => window.gjToast && window.gjToast("Brouillon enregistré — tu peux reprendre plus tard", "info")} style={{
            background: "#fff", color: "var(--gj-grey)",
            border: "1.5px solid var(--gj-line)", padding: "0 18px", minHeight: 46,
            borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Brouillon</button>
          <button style={{
            background: "var(--gj-action)", color: "#fff",
            border: 0, padding: "0 22px", minHeight: 46,
            borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            Envoyer ma candidature <svg className="gj-icon gj-icon--sm"><use href="#i-arrow-right" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// W4 — État vide
// =====================================================================
const WebEmptyState = () => (
  <div style={{
    background: "#fff", border: "1.5px solid var(--gj-line)",
    borderRadius: 14, padding: "48px 32px",
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
    gap: 14,
  }}>
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="var(--gj-teal-soft)" />
      <circle cx="52" cy="50" r="22" fill="#fff" stroke="var(--gj-teal-deep)" strokeWidth="3" />
      <line x1="70" y1="68" x2="88" y2="86" stroke="var(--gj-teal-deep)" strokeWidth="5" strokeLinecap="round" />
      <line x1="42" y1="50" x2="62" y2="50" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="44" x2="58" y2="44" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="42" y1="56" x2="55" y2="56" stroke="var(--gj-grey-2)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="92" cy="32" r="7" fill="var(--gj-yellow)" />
      <text x="92" y="36" textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--gj-ink)">!</text>
    </svg>
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 900 }}>Aucune opportunité avec ces filtres</h3>
      <p style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 6, maxWidth: 380, lineHeight: 1.55 }}>
        Tes 5 filtres sont trop restrictifs. Élargis ta région ou retire un domaine pour voir plus de résultats.
      </p>
    </div>
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      <button style={{
        background: "#fff", color: "var(--gj-teal-deep)",
        border: "1.5px solid var(--gj-line)", padding: "11px 18px",
        borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
      }}>Élargir la région</button>
      <button style={{
        background: "var(--gj-teal-deep)", color: "#fff",
        border: 0, padding: "11px 20px",
        borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}>Réinitialiser les filtres <svg className="gj-icon gj-icon--xs"><use href="#i-arrow-right" /></svg></button>
    </div>
    <div style={{
      marginTop: 14, padding: 14, background: "var(--gj-teal-soft)",
      border: "1.5px solid var(--gj-line)", borderRadius: 10,
      display: "flex", gap: 12, alignItems: "center", maxWidth: 440,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        background: "linear-gradient(135deg, #19a657, #027f7e)",
        color: "#fff", fontFamily: "var(--gj-font-sans)", fontWeight: 900, fontSize: 17,
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>Y</div>
      <div style={{ flex: 1, textAlign: "left", fontSize: 12.5, color: "var(--gj-ink)", lineHeight: 1.45 }}>
        <b>Yaye peut t'aider :</b> dis-moi ce que tu cherches en une phrase, je te trouve des opportunités proches.
      </div>
    </div>
  </div>
);

Object.assign(window, { WebOppList, WebOppSlideOver, WebApplyModal, WebEmptyState, WebFilterPanel, OppListCard, catKey });
