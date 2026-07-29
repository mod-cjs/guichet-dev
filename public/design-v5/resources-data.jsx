/* eslint-disable */
// Ressources numériques — données + composants visuels partagés (web + mobile).

const RES_TYPES = {
  guide:  { soft: "var(--gj-teal-soft)",   ink: "var(--gj-teal-deep)", band: "#027f7e", label: "Guide",          icon: "i-document" },
  modele: { soft: "var(--gj-blue-soft)",   ink: "var(--gj-blue-ink)",  band: "#1e35ba", label: "Modèle",         icon: "i-resources" },
  kit:    { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)",band: "#7A4E02", label: "Boîte à outils", icon: "i-project" },
  fiche:  { soft: "var(--gj-green-soft)",  ink: "var(--gj-green-ink)", band: "#19a657", label: "Fiche pratique", icon: "i-document" },
};

const RES_CATS = [
  { id: "emploi",    label: "Emploi & candidature",    icon: "i-employment", n: 18, tone: "teal" },
  { id: "entrep",    label: "Créer son entreprise",    icon: "i-project",    n: 24, tone: "yellow" },
  { id: "formation", label: "Formation & compétences", icon: "i-learning",   n: 31, tone: "blue" },
  { id: "demarches", label: "Démarches & droits",      icon: "i-document",   n: 12, tone: "green" },
  { id: "modeles",   label: "Modèles & templates",     icon: "i-resources",  n: 15, tone: "teal" },
];

const CAT_TONE = {
  teal:   { soft: "var(--gj-teal-soft)",   ink: "var(--gj-teal-deep)" },
  yellow: { soft: "var(--gj-yellow-soft)", ink: "var(--gj-yellow-ink)" },
  blue:   { soft: "var(--gj-blue-soft)",   ink: "var(--gj-blue-ink)" },
  green:  { soft: "var(--gj-green-soft)",  ink: "var(--gj-green-ink)" },
};

const RESOURCES = [
  { id: "cv", type: "guide", cat: "emploi", catLabel: "Emploi", title: "Le guide complet du CV gagnant",
    desc: "Toutes les clés pour un CV clair et percutant adapté au marché sénégalais : structure, accroche, mise en page et erreurs à éviter.",
    pages: 24, size: "2,4 Mo", format: "PDF", lang: "Français · audio Wolof", downloads: "3 240", date: "Avril 2026", featured: true, updated: true },
  { id: "bp", type: "modele", cat: "entrep", catLabel: "Entrepreneuriat", title: "Modèle de business plan simplifié",
    desc: "Un canevas prêt à remplir pour structurer ton projet : problème, solution, marché, modèle économique et prévisionnel sur 1 page.",
    pages: "8 sections", size: "180 Ko", format: "DOCX + PDF", lang: "Français", downloads: "2 110", date: "Mars 2026", featured: true },
  { id: "kit-micro", type: "kit", cat: "entrep", catLabel: "Entrepreneuriat", title: "Boîte à outils : lancer sa micro-entreprise",
    desc: "8 documents pour démarrer : étude de marché express, plan de trésorerie, modèle de facture, check-list des démarches NINEA.",
    pages: "8 documents", size: "5,1 Mo", format: "ZIP", lang: "Français", downloads: "1 480", date: "Février 2026", featured: true },
  { id: "entretien", type: "guide", cat: "emploi", catLabel: "Emploi", title: "Réussir son entretien d'embauche",
    desc: "Questions fréquentes, posture, et comment parler de soi avec assurance.",
    pages: 12, size: "1,1 Mo", format: "PDF", lang: "Français · audio Wolof", downloads: "1 920", date: "Avril 2026" },
  { id: "lm", type: "modele", cat: "emploi", catLabel: "Emploi", title: "Modèle de lettre de motivation",
    desc: "Une trame adaptable avec exemples par secteur.",
    pages: "2 pages", size: "90 Ko", format: "DOCX + PDF", lang: "Français", downloads: "2 760", date: "Mars 2026" },
  { id: "finance", type: "guide", cat: "entrep", catLabel: "Entrepreneuriat", title: "Trouver un financement pour son projet",
    desc: "Panorama des dispositifs : DER, microcrédit, bourses CJS et concours.",
    pages: 18, size: "1,8 Mo", format: "PDF", lang: "Français", downloads: "1 340", date: "Mars 2026" },
  { id: "bourse", type: "fiche", cat: "demarches", catLabel: "Démarches", title: "Bien remplir son dossier de bourse",
    desc: "Étapes, pièces à fournir et conseils pour ne rien oublier.",
    pages: 4, size: "320 Ko", format: "PDF", lang: "Français · audio Wolof", downloads: "980", date: "Mai 2026" },
  { id: "pitch", type: "kit", cat: "entrep", catLabel: "Entrepreneuriat", title: "Kit pitch & prise de parole",
    desc: "Trame de pitch 1 minute, slides type et exercices.",
    pages: "5 documents", size: "3,3 Mo", format: "ZIP", lang: "Français", downloads: "760", date: "Janvier 2026" },
];

// Sommaire (table des matières) pour le lecteur — guide CV
const RES_TOC = [
  { n: "1", label: "Pourquoi ton CV compte", page: 3 },
  { n: "2", label: "La structure idéale", page: 6 },
  { n: "3", label: "Rédiger une accroche qui marque", page: 10 },
  { n: "4", label: "Mettre en valeur son expérience", page: 14 },
  { n: "5", label: "Les 7 erreurs à éviter", page: 18 },
  { n: "6", label: "Modèles prêts à l'emploi", page: 21 },
];

// ---------------------------------------------------------------------
// FauxPage — aperçu de document (feuille blanche avec faux contenu)
// ---------------------------------------------------------------------
const FauxPage = ({ band = "#027f7e", w = 200, radius = 8, shadow = true, heading = true }) => {
  const bar = (width, c = "var(--gj-line-strong)", h = 6) => (
    <div style={{ height: h, width, background: c, borderRadius: 3 }} />
  );
  return (
    <div style={{ width: w, aspectRatio: "1 / 1.32", background: "#fff", borderRadius: radius, border: "1px solid var(--gj-line)", boxShadow: shadow ? "0 8px 24px rgba(0,0,0,.12)" : "none", padding: w * 0.11, display: "flex", flexDirection: "column", gap: w * 0.055, overflow: "hidden" }}>
      {heading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: w * 0.02 }}>
          <div style={{ height: w * 0.05, width: "55%", background: band, borderRadius: 3 }} />
          <div style={{ height: w * 0.028, width: "38%", background: "var(--gj-line-strong)", borderRadius: 3, opacity: .7 }} />
        </div>
      )}
      {bar("100%", "var(--gj-line)", w * 0.022)}
      {bar("100%", "var(--gj-line)", w * 0.022)}
      {bar("82%", "var(--gj-line)", w * 0.022)}
      <div style={{ height: w * 0.022 }} />
      <div style={{ height: w * 0.04, width: "44%", background: band, borderRadius: 3, opacity: .85 }} />
      {bar("100%", "var(--gj-line)", w * 0.022)}
      {bar("94%", "var(--gj-line)", w * 0.022)}
      {bar("100%", "var(--gj-line)", w * 0.022)}
      {bar("70%", "var(--gj-line)", w * 0.022)}
      {/* callout */}
      <div style={{ marginTop: "auto", background: "var(--gj-bg)", borderLeft: `3px solid ${band}`, borderRadius: 4, padding: w * 0.05, display: "flex", flexDirection: "column", gap: 5 }}>
        {bar("80%", "var(--gj-line-strong)", w * 0.022)}
        {bar("60%", "var(--gj-line-strong)", w * 0.022)}
      </div>
    </div>
  );
};

// Vignette compacte pour les cartes (couverture)
const ResThumb = ({ type, h = 150 }) => {
  const t = RES_TYPES[type];
  return (
    <div style={{ position: "relative", height: h, background: `linear-gradient(135deg, ${t.soft}, #fff)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      <svg className="gj-icon" style={{ position: "absolute", left: -16, bottom: -20, width: 110, height: 110, opacity: .12, color: t.ink }}><use href={"#" + t.icon} /></svg>
      <div style={{ transform: "rotate(-4deg)" }}>
        <FauxPage band={t.band} w={h * 0.62} />
      </div>
      <span style={{ position: "absolute", top: 10, right: 10, display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", color: t.ink, border: `1.5px solid ${t.soft}`, padding: "4px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".3px" }}>
        <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + t.icon} /></svg>{t.label}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------
// BookCover — couverture de livre générée en CSS (médiathèque = étagère)
// ---------------------------------------------------------------------
const BookCover = ({ res, w = 148, caption = true }) => {
  const t = RES_TYPES[res.type];
  const h = Math.round(w * 1.38);
  return (
    <div style={{ width: w, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
      <div style={{ position: "relative", width: w, height: h, borderRadius: "4px 10px 10px 4px", background: `linear-gradient(150deg, ${t.band} 0%, ${t.band} 55%, rgba(0,0,0,.28) 140%)`, boxShadow: "0 10px 22px rgba(10,40,32,.22), inset -2px 0 5px rgba(255,255,255,.12)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* dos du livre */}
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 9, background: "rgba(0,0,0,.28)" }} />
        <span style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,.22)" }} />
        {/* picto catégorie en fond */}
        <svg className="gj-icon" style={{ position: "absolute", right: -w * 0.12, bottom: -w * 0.12, width: w * 0.55, height: w * 0.55, opacity: .2, color: "#fff" }}><use href={"#" + t.icon} /></svg>
        {/* contenu couverture */}
        <div style={{ position: "relative", padding: `${w * 0.09}px ${w * 0.09}px ${w * 0.09}px ${w * 0.16}px`, display: "flex", flexDirection: "column", height: "100%" }}>
          <span style={{ fontSize: Math.max(11, w * 0.062), fontWeight: 800, color: "rgba(255,255,255,.85)", textTransform: "uppercase", letterSpacing: ".6px" }}>{t.label}</span>
          <span style={{ fontSize: Math.max(12, w * 0.092), fontWeight: 900, color: "#fff", lineHeight: 1.2, marginTop: 6, minHeight: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{res.title}</span>
          <span style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: Math.max(11, w * 0.058), fontWeight: 900, color: t.band, background: "rgba(255,255,255,.95)", padding: "2px 7px", borderRadius: 5 }}>{(res.format || "PDF").split(" ")[0]}</span>
            {(res.lang || "").includes("Wolof") && <span style={{ width: w * 0.13, height: w * 0.13, borderRadius: "50%", background: "rgba(255,255,255,.95)", color: t.band, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: w * 0.075, height: w * 0.075 }}><use href="#i-play" /></svg></span>}
          </span>
        </div>
      </div>
      {caption && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: Math.max(11, w * 0.07), color: "var(--gj-grey)", fontWeight: 600, minWidth: 0 }}>
          <svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-grey-2)", flexShrink: 0 }}><use href="#i-download" /></svg>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{res.downloads || "—"}</span>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>{typeof res.pages === "number" ? res.pages + " p." : res.pages}</span>
        </div>
      )}
    </div>
  );
};

// Étagère — rangée de livres avec tablette bois
const BookShelf = ({ children }) => (
  <div style={{ position: "relative", paddingBottom: 14 }}>
    <div style={{ display: "flex", gap: 18, alignItems: "flex-end", overflowX: "auto", padding: "4px 6px 12px" }}>{children}</div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, height: 9, borderRadius: 4, background: "linear-gradient(180deg, #C97F03, #7A4E02)", boxShadow: "0 4px 8px rgba(10,40,32,.18)" }} />
  </div>
);

Object.assign(window, { RES_TYPES, RES_CATS, CAT_TONE, RESOURCES, RES_TOC, FauxPage, ResThumb, BookCover, BookShelf });
