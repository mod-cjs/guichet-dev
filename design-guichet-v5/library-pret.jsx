/* eslint-disable */
// Bibliothèque physique des centres CJS — prêt (check-out) & retour (check-in).
// Partagé : conseiller (web + mobile) + admin (web).
// Dépend de resources-data.jsx (BookCover, BookShelf, RES_TYPES).

// ---------------------------------------------------------------------
// Données — livres physiques du centre + emprunts
// ---------------------------------------------------------------------
const LIB_BOOKS = [
  { id: "b1", title: "Créer son entreprise au Sénégal", type: "kit", author: "ADEPME", cote: "ENT-012", copies: 3, out: 1, pages: 214 },
  { id: "b2", title: "Guide du premier emploi", type: "guide", author: "CJS Éditions", cote: "EMP-004", copies: 5, out: 3, pages: 96 },
  { id: "b3", title: "L'agroécologie en pratique", type: "guide", author: "ISRA", cote: "AGR-021", copies: 2, out: 2, pages: 168 },
  { id: "b4", title: "Comptabilité simplifiée du GIE", type: "modele", author: "Chambre des métiers", cote: "GES-008", copies: 4, out: 0, pages: 122 },
  { id: "b5", title: "Réussir son business plan", type: "kit", author: "ADEPME", cote: "ENT-015", copies: 3, out: 1, pages: 140 },
  { id: "b6", title: "Le wolof des affaires", type: "guide", author: "IFAN", cote: "LAN-002", copies: 2, out: 0, pages: 88 },
  { id: "b7", title: "Couture & mode : lancer son atelier", type: "kit", author: "CJS Éditions", cote: "ART-006", copies: 2, out: 1, pages: 104 },
  { id: "b8", title: "Droit du travail sénégalais", type: "guide", author: "Ministère du Travail", cote: "DRT-001", copies: 3, out: 0, pages: 260 },
];

const LIB_LOANS = [
  { id: "l1", book: LIB_BOOKS[1], who: "Awa Diop", init: "AD", card: "CJS-2024-08841", outDate: "24 juin", due: "8 juil.", status: "encours" },
  { id: "l2", book: LIB_BOOKS[2], who: "Moussa Ba", init: "MB", card: "CJS-2023-04512", outDate: "12 juin", due: "26 juin", status: "retard", late: 8 },
  { id: "l3", book: LIB_BOOKS[0], who: "Fatou Sall", init: "FS", card: "CJS-2025-11203", outDate: "28 juin", due: "12 juil.", status: "encours" },
  { id: "l4", book: LIB_BOOKS[2], who: "Ibrahima Kane", init: "IK", card: "CJS-2024-07733", outDate: "10 juin", due: "24 juin", status: "retard", late: 10 },
  { id: "l5", book: LIB_BOOKS[4], who: "Aminata Ndiaye", init: "AN", card: "CJS-2025-09102", outDate: "30 juin", due: "14 juil.", status: "encours" },
  { id: "l6", book: LIB_BOOKS[6], who: "Ousmane Diallo", init: "OD", card: "CJS-2023-02218", outDate: "2 juin", due: "16 juin", status: "rendu", back: "15 juin" },
];

const LOAN_STATUS = {
  encours: { label: "En cours", soft: "var(--gj-teal-soft)", ink: "var(--gj-teal-deep)" },
  retard: { label: "En retard", soft: "var(--gj-red-soft)", ink: "var(--gj-red-ink)" },
  rendu: { label: "Rendu", soft: "var(--gj-green-soft)", ink: "var(--gj-green-ink)" },
};

const LIB_RAYONS = [
  { code: "EMP", label: "Emploi & candidature", type: "guide", n: 8, shelf: "Étagère A · haut" },
  { code: "ENT", label: "Entrepreneuriat", type: "kit", n: 11, shelf: "Étagère A · milieu" },
  { code: "AGR", label: "Agriculture & élevage", type: "guide", n: 7, shelf: "Étagère B · haut" },
  { code: "GES", label: "Gestion & comptabilité", type: "modele", n: 6, shelf: "Étagère B · milieu" },
  { code: "DRT", label: "Droit & démarches", type: "fiche", n: 4, shelf: "Étagère B · bas" },
  { code: "LAN", label: "Langues", type: "guide", n: 3, shelf: "Étagère C · haut" },
  { code: "ART", label: "Artisanat & métiers", type: "kit", n: 3, shelf: "Étagère C · bas" },
];

const libAvatar = (init, size = 38) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.34 }}>{init}</span>
);

const loanPill = (status) => {
  const s = LOAN_STATUS[status];
  return <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: s.soft, color: s.ink, whiteSpace: "nowrap" }}>{s.label}</span>;
};

// Carte de prêt (personne d'abord — pattern « carte personne »)
const LoanCard = ({ l, compact }) => (
  <div style={{ background: "#fff", border: l.status === "retard" ? "1.5px solid var(--gj-red)" : "1.5px solid var(--gj-line)", borderRadius: 13, padding: compact ? 13 : 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {libAvatar(l.init, compact ? 34 : 40)}
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: compact ? 13.5 : 15, fontWeight: 900, color: "var(--gj-ink)" }}>{l.who}</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--gj-grey)", marginTop: 1, fontFamily: "var(--gj-font-mono, monospace)" }}>{l.card}</span>
        </span>
      </span>
      {loanPill(l.status)}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 10, padding: "9px 11px", borderRadius: 10, background: "var(--gj-bg)" }}>
      <span style={{ width: 26, height: 34, borderRadius: "2px 5px 5px 2px", flexShrink: 0, background: (RES_TYPES[l.book.type] || RES_TYPES.guide).band, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "#fff" }}><use href={"#" + (RES_TYPES[l.book.type] || RES_TYPES.guide).icon} /></svg></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.book.title}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>Cote {l.book.cote}</span>
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-calendar" /></svg>Prêté le {l.outDate}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: l.status === "retard" ? "var(--gj-red-ink)" : "var(--gj-grey)", fontWeight: l.status === "retard" ? 800 : 600 }}>
        <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-clock" /></svg>
        {l.status === "rendu" ? "Rendu le " + l.back : "Retour " + l.due}{l.late ? " · +" + l.late + " j" : ""}
      </span>
      <span style={{ flex: 1 }} />
      {l.status !== "rendu" && (
        <button onClick={() => window.gjToast && window.gjToast("Retour enregistré — « " + l.book.title + " »")} style={{ background: "var(--gj-green)", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg>Retour</button>
      )}
      {l.status === "retard" && (
        <button onClick={() => window.gjToast && window.gjToast("Rappel envoyé à " + l.who + " (WhatsApp)", "info")} style={{ background: "#fff", color: "var(--gj-red-ink)", border: "1.5px solid var(--gj-line)", padding: "8px 12px", borderRadius: 9, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Relancer</button>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------
// Modal — Nouveau prêt (check-out) : livre → bénéficiaire (QR ou recherche) → confirmer
// ---------------------------------------------------------------------
const LibCheckoutModal = ({ onClose }) => {
  const [step, setStep] = React.useState(1);
  const book = LIB_BOOKS[4];
  const stepDot = (n, lbl) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: step >= n ? "var(--gj-teal-deep)" : "var(--gj-bg)", color: step >= n ? "#fff" : "var(--gj-grey)", border: step >= n ? 0 : "1.5px solid var(--gj-line)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{step > n ? "✓" : n}</span>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: step >= n ? "var(--gj-ink)" : "var(--gj-grey)" }}>{lbl}</span>
    </span>
  );
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(14,31,27,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Nouveau prêt" style={{ background: "#fff", borderRadius: 18, width: 560, maxHeight: "88%", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "17px 22px", borderBottom: "1.5px solid var(--gj-line)" }}>
          <span style={{ width: 40, height: 40, borderRadius: 11, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-resources" /></svg></span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16.5, fontWeight: 900 }}>Nouveau prêt</h2>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>Check-out d'un livre du centre</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 34, height: 34, borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 18, padding: "14px 22px", borderBottom: "1px solid var(--gj-line)" }}>
          {stepDot(1, "Livre")}{stepDot(2, "Bénéficiaire")}{stepDot(3, "Confirmer")}
        </div>
        <div style={{ padding: 22 }}>
          {step === 1 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", minHeight: 44, marginBottom: 14 }}>
                <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
                <input placeholder="Titre ou cote (ex : ENT-015)…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 13.5, fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {LIB_BOOKS.slice(3, 6).map((b, i) => {
                  const dispo = b.copies - b.out;
                  const sel = b.id === book.id;
                  return (
                    <button key={b.id} onClick={() => setStep(2)} disabled={dispo === 0} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 11, cursor: dispo ? "pointer" : "not-allowed", fontFamily: "inherit", textAlign: "left", background: sel ? "var(--gj-teal-soft)" : "#fff", border: sel ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", opacity: dispo ? 1 : .55 }}>
                      <span style={{ width: 30, height: 40, borderRadius: "2px 6px 6px 2px", flexShrink: 0, background: (RES_TYPES[b.type] || RES_TYPES.guide).band, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "#fff" }}><use href={"#" + (RES_TYPES[b.type] || RES_TYPES.guide).icon} /></svg></span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{b.title}</span>
                        <span style={{ display: "block", fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{b.author} · Cote {b.cote}</span>
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: dispo ? "var(--gj-green-soft)" : "var(--gj-red-soft)", color: dispo ? "var(--gj-green-ink)" : "var(--gj-red-ink)", flexShrink: 0 }}>{dispo ? dispo + " dispo" : "0 dispo"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <button onClick={() => setStep(3)} style={{ borderRadius: 13, border: "2px dashed var(--gj-teal-deep)", background: "var(--gj-teal-soft)", padding: "18px 14px", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 46, height: 46, borderRadius: 12, background: "var(--gj-teal-deep)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-target" /></svg></span>
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: "var(--gj-teal-deep)" }}>Scanner la carte CJS</span>
                  <span style={{ fontSize: 11, color: "var(--gj-grey)", textAlign: "center", lineHeight: 1.4 }}>Le QR de la carte identifie le jeune en 1 s</span>
                </button>
                <div style={{ borderRadius: 13, border: "1.5px solid var(--gj-line)", padding: "14px", display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)" }}>Ou rechercher</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 11px", minHeight: 40 }}>
                    <svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
                    <input placeholder="Nom ou n° de carte…" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 12.5, fontFamily: "inherit", minWidth: 0 }} />
                  </div>
                  <button onClick={() => setStep(3)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                    {libAvatar("AD", 30)}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>Awa Diop</span>
                      <span style={{ display: "block", fontSize: 11, color: "var(--gj-grey)" }}>CJS-2024-08841 · 1 emprunt en cours</span>
                    </span>
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", display: "flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-teal-deep)" }}><use href="#i-info" /></svg>Maximum 2 emprunts simultanés par bénéficiaire.</div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div style={{ background: "var(--gj-bg)", borderRadius: 13, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  {libAvatar("AD", 40)}
                  <span>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 900, color: "var(--gj-ink)" }}>Awa Diop</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--gj-grey)", fontFamily: "monospace" }}>CJS-2024-08841</span>
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)" }}>Carte valide</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ width: 28, height: 38, borderRadius: "2px 5px 5px 2px", flexShrink: 0, background: (RES_TYPES[book.type] || RES_TYPES.guide).band, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 13, height: 13, color: "#fff" }}><use href={"#" + (RES_TYPES[book.type] || RES_TYPES.guide).icon} /></svg></span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{book.title}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--gj-grey)" }}>Cote {book.cote} · {book.author}</span>
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>Durée du prêt</div>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: "var(--gj-ink)", marginTop: 3 }}>14 jours</div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>Retour attendu</div>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: "var(--gj-teal-deep)", marginTop: 3 }}>18 juillet 2026</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 12, display: "flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-whatsapp)" }}><use href="#i-chat" /></svg>Un rappel WhatsApp sera envoyé 2 jours avant l'échéance.</div>
            </div>
          )}
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1.5px solid var(--gj-line)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {step > 1 && <button onClick={() => setStep(step - 1)} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Retour</button>}
          {step < 3
            ? <button onClick={() => setStep(step + 1)} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "11px 22px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Continuer</button>
            : <button onClick={() => { window.gjToast && window.gjToast("Prêt enregistré — retour attendu le 18 juillet"); onClose(); }} style={{ background: "var(--gj-green)", color: "#fff", border: 0, padding: "11px 22px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-check" /></svg>Confirmer le prêt</button>}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// CONSEILLER · WEB — Bibliothèque du centre (catalogue + emprunts)
// ---------------------------------------------------------------------
const AgentLibrary = ({ onCheckout }) => {
  const [tab, setTab] = React.useState("catalogue");
  const tabs = [["catalogue", "Catalogue", LIB_BOOKS.length], ["encours", "Emprunts en cours", 4], ["retard", "Retards", 2], ["classement", "Classement", LIB_RAYONS.length], ["histo", "Historique", 26]];
  const loans = tab === "retard" ? LIB_LOANS.filter((l) => l.status === "retard") : tab === "histo" ? LIB_LOANS.filter((l) => l.status === "rendu") : LIB_LOANS.filter((l) => l.status !== "rendu");
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* stats + action */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          {[["42", "livres au catalogue"], ["4", "emprunts en cours"], ["2", "retards", "var(--gj-red-ink)"]].map(([n, lbl, c]) => (
            <div key={lbl} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: "13px 18px" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: c || "var(--gj-ink)", lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 4, fontWeight: 600 }}>{lbl}</div>
            </div>
          ))}
          <span style={{ flex: 1 }} />
          <button onClick={onCheckout} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "12px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Nouveau prêt</button>
        </div>
        {/* tabs (pattern candidatures) */}
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 4, marginBottom: 18, width: "fit-content" }}>
          {tabs.map(([k, lbl, n]) => (
            <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 9, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, background: tab === k ? "var(--gj-teal-deep)" : "transparent", color: tab === k ? "#fff" : "var(--gj-grey)" }}>
              {lbl}<span style={{ fontSize: 11, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: tab === k ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: tab === k ? "#fff" : "var(--gj-grey)" }}>{n}</span>
            </button>
          ))}
        </div>

        {tab === "catalogue" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 900 }}>Étagère du centre</h2>
              <span style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>Livres physiques empruntables avec la carte CJS</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "22px 18px" }}>
              {LIB_BOOKS.map((b) => {
                const dispo = b.copies - b.out;
                return (
                  <div key={b.id} style={{ position: "relative" }}>
                    <span style={{ position: "absolute", top: -8, right: -4, zIndex: 2, fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: dispo ? "var(--gj-green)" : "var(--gj-red)", color: "#fff", boxShadow: "0 3px 8px rgba(0,0,0,.2)" }}>{dispo ? dispo + "/" + b.copies + " dispo" : "Tout prêté"}</span>
                    <BookCover res={{ ...b, format: "LIVRE", downloads: "Cote " + b.cote }} w={170} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === "classement" ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 900 }}>Classement de la bibliothèque</h2>
              <span style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>Rayons, cotes et emplacements physiques</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {LIB_RAYONS.map((r) => {
                const t = RES_TYPES[r.type];
                return (
                  <div key={r.code} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: 16, display: "flex", alignItems: "center", gap: 13 }}>
                    <span style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: t.band, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, letterSpacing: ".5px" }}>{r.code}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "var(--gj-ink)" }}>{r.label}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-resources" /></svg>{r.n} livres</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-pin" /></svg>{r.shelf}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: t.soft, color: t.ink, flexShrink: 0 }}>{t.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 14, display: "flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-teal-deep)" }}><use href="#i-info" /></svg>La cote d'un livre = rayon + numéro (ex : ENT-015). Elle figure sur le dos du livre et dans le catalogue.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {loans.map((l) => <LoanCard key={l.id} l={l} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// CONSEILLER · MOBILE — Bibliothèque (terrain : retour rapide + scan)
// ---------------------------------------------------------------------
const MobAgentLibrary = ({ nav }) => {
  const [tab, setTab] = React.useState("encours");
  const tabs = [["encours", "En cours", 4], ["retard", "Retards", 2], ["catalogue", "Catalogue", 42]];
  const loans = tab === "retard" ? LIB_LOANS.filter((l) => l.status === "retard") : LIB_LOANS.filter((l) => l.status !== "rendu");
  return (
    <PhoneFrame>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--gj-ink-teal)", color: "#fff", flexShrink: 0 }}>
        <button onClick={() => nav("more")} aria-label="Retour" style={{ width: 40, height: 40, borderRadius: 10, border: 0, background: "rgba(255,255,255,.1)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-arrow-left" /></svg></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>Bibliothèque</div>
          <div style={{ fontSize: 11, opacity: .75 }}>42 livres · 4 emprunts · 2 retards</div>
        </div>
        <button onClick={() => window.gjToast && window.gjToast("Scanner ouvert — présente la carte CJS", "info")} aria-label="Scanner une carte" style={{ width: 44, height: 44, borderRadius: 12, border: "2px solid var(--gj-yellow)", background: "transparent", color: "var(--gj-yellow)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-target" /></svg></button>
      </div>
      <div style={{ display: "flex", gap: 4, background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "8px 14px", flexShrink: 0 }}>
        {tabs.map(([k, lbl, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, borderRadius: 9, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800, background: tab === k ? "var(--gj-teal-deep)" : "var(--gj-bg)", color: tab === k ? "#fff" : "var(--gj-grey)" }}>{lbl}<span style={{ fontSize: 11 }}>({n})</span></button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, background: "var(--gj-bg)", display: "flex", flexDirection: "column", gap: 11 }}>
        {tab === "catalogue" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 14px" }}>
            {LIB_BOOKS.slice(0, 6).map((b) => {
              const dispo = b.copies - b.out;
              return (
                <div key={b.id} style={{ position: "relative" }}>
                  <span style={{ position: "absolute", top: -7, right: -3, zIndex: 2, fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: dispo ? "var(--gj-green)" : "var(--gj-red)", color: "#fff" }}>{dispo ? dispo + " dispo" : "0 dispo"}</span>
                  <BookCover res={{ ...b, format: "LIVRE", downloads: b.cote }} w={158} />
                </div>
              );
            })}
          </div>
        ) : (
          loans.map((l) => <LoanCard key={l.id} l={l} compact />)
        )}
      </div>
      <div style={{ padding: "10px 14px 14px", background: "#fff", borderTop: "1px solid var(--gj-line)", flexShrink: 0 }}>
        <button onClick={() => window.gjToast && window.gjToast("Scanner ouvert — scanne la carte CJS puis la cote du livre", "info")} style={{ width: "100%", background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 12, fontWeight: 900, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-plus" /></svg>Nouveau prêt (scanner)</button>
      </div>
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// ADMIN · WEB — Bibliothèque réseau (stock national + CRUD livre)
// ---------------------------------------------------------------------
const AdminLibrary = () => {
  const [addModal, setAddModal] = React.useState(false);
  const centres = [
    ["CJS Tambacounda", 42, 4, 2], ["CJS Dakar-Plateau", 118, 22, 3], ["CJS Saint-Louis", 74, 9, 1],
    ["CJS Ziguinchor", 51, 6, 0], ["CJS Kaolack", 38, 5, 2], ["CJS Thiès", 66, 11, 1],
  ];
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1, position: "relative" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          {[["389", "livres dans le réseau"], ["57", "emprunts en cours"], ["9", "retards", "var(--gj-red-ink)"], ["94 %", "taux de retour", "var(--gj-green-ink)"]].map(([n, lbl, c]) => (
            <div key={lbl} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 13, padding: "13px 18px" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: c || "var(--gj-ink)", lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 4, fontWeight: 600 }}>{lbl}</div>
            </div>
          ))}
          <span style={{ flex: 1 }} />
          <button onClick={() => setAddModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-blue)", color: "#fff", border: 0, padding: "12px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Ajouter un livre</button>
        </div>

        {/* top emprunts */}
        <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 12 }}>Top des emprunts — 30 derniers jours</h2>
          <BookShelf>
            {LIB_BOOKS.slice(0, 5).map((b, i) => (
              <div key={b.id} style={{ position: "relative" }}>
                <span style={{ position: "absolute", top: -8, left: -6, zIndex: 2, width: 26, height: 26, borderRadius: "50%", background: "var(--gj-yellow)", color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, boxShadow: "0 3px 8px rgba(0,0,0,.2)" }}>{i + 1}</span>
                <BookCover res={{ ...b, format: "LIVRE", downloads: (34 - i * 5) + " prêts" }} w={132} />
              </div>
            ))}
          </BookShelf>
        </div>

        {/* stock par centre */}
        <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px", padding: "11px 18px", background: "var(--gj-bg)", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>
            <span>Centre</span><span>Livres</span><span>Emprunts</span><span>Retards</span><span></span>
          </div>
          {centres.map(([c, n, e, r]) => (
            <div key={c} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 100px", padding: "13px 18px", borderTop: "1px solid var(--gj-line)", alignItems: "center", fontSize: 13 }}>
              <span style={{ fontWeight: 800, color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-teal-deep)" }}><use href="#i-pin" /></svg>{c}</span>
              <span style={{ fontWeight: 700 }}>{n}</span>
              <span style={{ fontWeight: 700, color: "var(--gj-teal-deep)" }}>{e}</span>
              <span style={{ fontWeight: 800, color: r ? "var(--gj-red-ink)" : "var(--gj-grey)" }}>{r || "—"}</span>
              <button onClick={() => window.gjToast && window.gjToast("Inventaire " + c + " exporté (CSV)", "info")} style={{ background: "#fff", color: "var(--gj-blue-ink)", border: "1.5px solid var(--gj-line)", padding: "7px 10px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Inventaire</button>
            </div>
          ))}
        </div>
      </div>

      {/* CRUD — ajouter un livre */}
      {addModal && (
        <div onClick={() => setAddModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(14,31,27,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ajouter un livre" style={{ background: "#fff", borderRadius: 18, width: 520, boxShadow: "0 24px 60px rgba(0,0,0,.3)", padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 900, marginBottom: 16 }}>Ajouter un livre au catalogue</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Titre", "Ex : Guide de l'apiculture", "1 / -1"], ["Auteur / éditeur", "Ex : ISRA"], ["Cote", "Ex : AGR-022"], ["Catégorie", "Guide pratique"], ["Nombre d'exemplaires", "2"], ["Centre(s)", "CJS Tambacounda"]].map(([lbl, ph, span]) => (
                <label key={lbl} style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: span || "auto" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-ink)" }}>{lbl}</span>
                  <input placeholder={ph} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 9, minHeight: 42, padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: 0 }} />
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setAddModal(false)} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => { setAddModal(false); window.gjToast && window.gjToast("Livre ajouté au catalogue"); }} style={{ background: "var(--gj-blue)", color: "#fff", border: 0, padding: "11px 22px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { LIB_BOOKS, LIB_LOANS, LIB_RAYONS, AgentLibrary, LibCheckoutModal, MobAgentLibrary, AdminLibrary, LoanCard });
