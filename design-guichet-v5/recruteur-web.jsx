/* eslint-disable */
// Lot 10 — Espace Recruteur · WEB. Réutilise RecruteurSidebar/RecruteurTopBar + recruteur-data.jsx.
// Vues : home · offers · offerForm · pipeline · candidate · interview(modal) · messages.

const rAvatar = (init, size = 40) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36 }}>{init}</span>
);
const matchBadge = (m, big) => {
  const col = m >= 85 ? ["var(--gj-green-soft)", "var(--gj-green-ink)"] : m >= 70 ? ["var(--gj-teal-soft)", "var(--gj-teal-deep)"] : ["var(--gj-bg)", "var(--gj-grey)"];
  return <span style={{ fontSize: big ? 12 : 10, fontWeight: 800, color: col[1], background: col[0], padding: big ? "4px 10px" : "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{m}% match</span>;
};
const rCard = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 };

// =====================================================================
// DASHBOARD
// =====================================================================
const RecDashboard = ({ nav }) => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Bonjour Aïda 👋</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Voici l'activité de recrutement de Sonatel sur le Guichet Jeunesse.</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {R_STATS.map((s, i) => {
        const tone = { teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], green: ["var(--gj-green-soft)", "var(--gj-green-ink)"] }[s.tone];
        return (
          <div key={i} onClick={() => s.urgent && nav("pipeline")} style={{ ...rCard, padding: 16, cursor: s.urgent ? "pointer" : "default", borderColor: s.urgent ? "var(--gj-yellow)" : "var(--gj-line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: tone[0], color: tone[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + s.icon} /></svg></span>
              {s.urgent && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-yellow-ink)", background: "var(--gj-yellow-soft)", padding: "2px 8px", borderRadius: 999 }}>ACTION</span>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--gj-ink)", marginTop: 12, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gj-ink)", marginTop: 6 }}>{s.label}</div>
            {s.delta && <div style={{ fontSize: 11, color: "var(--gj-green-ink)", marginTop: 2, fontWeight: 700 }}>{s.delta}</div>}
          </div>
        );
      })}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "start" }}>
      {/* offres actives */}
      <div style={rCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900 }}>Offres actives</h2>
          <button onClick={() => nav("offers")} style={{ background: "transparent", border: 0, color: "var(--gj-blue-ink)", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Toutes →</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {R_OFFERS.filter((o) => o.status === "Active").map((o) => (
            <div key={o.id} onClick={() => nav("pipeline")} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0", borderBottom: "1px solid var(--gj-line)", cursor: "pointer" }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-employment" /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{o.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{o.appli} candidatures · {o.views} vues · clôture {o.deadline}</div>
              </div>
              {o.nouveau > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "var(--gj-red)", padding: "3px 9px", borderRadius: 999 }}>{o.nouveau} nouv.</span>}
            </div>
          ))}
        </div>
      </div>
      {/* à examiner */}
      <div style={rCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900 }}>À examiner</h2>
          <button onClick={() => nav("pipeline")} style={{ background: "transparent", border: 0, color: "var(--gj-blue-ink)", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Pipeline →</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {R_CANDIDATES.filter((c) => c.col === "recue").slice(0, 4).map((c) => (
            <div key={c.id} onClick={() => nav("candidate")} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
              {rAvatar(c.init, 36)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{c.niveau}</div>
              </div>
              {matchBadge(c.match)}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// =====================================================================
// OFFRES
// =====================================================================
const RecOffers = ({ nav }) => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Mes offres</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>4 offres · 2 actives, 1 en validation, 1 clôturée.</div>
        </div>
        <button onClick={() => nav("offerForm")} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-blue)", color: "#fff", border: 0, padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Nouvelle offre</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {R_OFFERS.map((o) => {
          const st = OFFER_STATUS[o.status];
          return (
            <div key={o.id} style={{ ...rCard, padding: 16, display: "flex", alignItems: "center", gap: 15 }}>
              <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: o.status === "Clôturée" ? "var(--gj-bg)" : "linear-gradient(135deg,#1e35ba,#162c5e)", color: o.status === "Clôturée" ? "var(--gj-grey)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                <svg className="gj-icon" style={{ position: "absolute", right: -8, bottom: -9, width: 32, height: 32, opacity: .25 }}><use href="#i-employment" /></svg>
                <svg className="gj-icon" style={{ width: 22, height: 22, position: "relative" }}><use href="#i-employment" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--gj-ink)" }}>{o.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: st.soft, color: st.ink }}>{o.status}</span>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap", fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 600 }}>
                  <span>{o.type} · {o.region}</span>
                  {o.status !== "En validation CJS" && <span>{o.appli} candidatures</span>}
                  {o.views > 0 && <span>{o.views} vues</span>}
                  {o.deadline !== "—" && <span>{o.deadline}</span>}
                </div>
              </div>
              {o.status === "Active" && <button onClick={() => nav("pipeline")} style={{ background: "var(--gj-blue)", color: "#fff", border: 0, padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, position: "relative" }}>Voir candidatures{o.nouveau > 0 && <span style={{ position: "absolute", top: -7, right: -7, minWidth: 18, height: 18, borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", padding: "0 4px" }}>{o.nouveau}</span>}</button>}
              <button style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-label="Gérer"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-settings" /></svg></button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const RecOfferForm = ({ onBack }) => {
  const lbl = (t, req) => <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 7 }}>{t}{req && <span style={{ color: "var(--gj-red)" }}> *</span>}</div>;
  const inp = { width: "100%", minHeight: 46, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" };
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-blue-ink)", marginBottom: 14, padding: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Mes offres</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)", marginBottom: 16 }}>Publier une offre</h1>
        <div style={{ ...rCard, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>{lbl("Type de contrat", true)}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["Emploi (CDI/CDD)", "Stage", "Alternance", "Volontariat"].map((t, i) => <button key={t} style={{ padding: "10px 16px", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 1 ? "var(--gj-blue-soft)" : "#fff", border: i === 1 ? "1.5px solid var(--gj-blue)" : "1.5px solid var(--gj-line)", color: i === 1 ? "var(--gj-blue-ink)" : "var(--gj-grey)" }}>{t}</button>)}</div></div>
          <div>{lbl("Intitulé du poste", true)}<input defaultValue="Stage Data Science · 6 mois" style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{lbl("Domaine", true)}<input defaultValue="Numérique / Data" style={inp} /></div>
            <div>{lbl("Lieu", true)}<input defaultValue="Dakar Plateau" style={inp} /></div>
            <div>{lbl("Rémunération")}<input defaultValue="350 000 FCFA / mois" style={inp} /></div>
            <div>{lbl("Date de clôture", true)}<input defaultValue="29/05/2026" style={inp} /></div>
          </div>
          <div>{lbl("Description du poste", true)}<textarea defaultValue="Rejoins la cellule Innovation de Sonatel pour construire des modèles prédictifs sur la data client…" rows={4} style={{ ...inp, minHeight: "auto", padding: "12px 14px", resize: "none", lineHeight: 1.5 }} /></div>
          <div>{lbl("Compétences requises")}<div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{["Python", "SQL", "scikit-learn"].map((s) => <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-blue-soft)", color: "var(--gj-blue-ink)", padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700 }}>{s}<svg className="gj-icon" style={{ width: 12, height: 12, opacity: .6 }}><use href="#i-close" /></svg></span>)}<button style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px dashed var(--gj-line-strong)", color: "var(--gj-blue-ink)", padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-plus" /></svg>Ajouter</button></div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-yellow-soft)", borderRadius: 12, padding: "13px 16px", marginTop: 16 }}>
          <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-yellow-ink)" }}><use href="#i-info" /></svg>
          <div style={{ fontSize: 12.5, color: "var(--gj-yellow-ink)", fontWeight: 600 }}>Ton offre sera <b>validée par le CJS</b> (24–48 h) avant publication aux jeunes.</div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onBack} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "12px 20px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Brouillon</button>
          <button style={{ background: "var(--gj-action)", color: "#fff", border: 0, padding: "12px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>Soumettre pour validation</button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// PIPELINE KANBAN
// =====================================================================
const PipeCard = ({ c, onOpen }) => (
  <div onClick={onOpen} draggable style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: 12, cursor: "pointer", display: "flex", flexDirection: "column", gap: 9, boxShadow: "var(--gj-shadow-sm)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {rAvatar(c.init, 36)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{c.name}</div>
        <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{c.age} ans · {c.commune}</div>
      </div>
      {c.fav && <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-yellow-deep)" }}><use href="#i-bookmark" /></svg>}
    </div>
    <div style={{ fontSize: 11, color: "var(--gj-grey)", fontWeight: 600 }}>{c.niveau}</div>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {c.skills.slice(0, 3).map((s) => <span key={s} style={{ fontSize: 11, fontWeight: 700, color: "var(--gj-grey)", background: "var(--gj-bg)", border: "1px solid var(--gj-line)", padding: "2px 8px", borderRadius: 999 }}>{s}</span>)}
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--gj-line)", paddingTop: 9 }}>
      {matchBadge(c.match)}
      <span style={{ fontSize: 11, color: "var(--gj-grey-2)" }}>{c.applied}</span>
    </div>
  </div>
);

const RecPipeline = ({ onOpen }) => {
  const counts = (col) => R_CANDIDATES.filter((c) => c.col === col).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "18px 28px 14px", borderBottom: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--gj-ink)" }}>Stage Data Science · 6 mois</h1>
          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)" }}>Active</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 700 }}>23 candidatures · clôture J-3</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: 20, background: "var(--gj-bg)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 300px)", gap: 16, height: "100%" }}>
          {PIPE_COLS.map((col) => (
            <div key={col.id} style={{ display: "flex", flexDirection: "column", background: "rgba(0,0,0,.015)", borderRadius: 14, border: "1px solid var(--gj-line)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 14px", borderBottom: "1px solid var(--gj-line)", background: col.soft, flexShrink: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: col.dot }} />
                <span style={{ fontSize: 13, fontWeight: 900, color: "var(--gj-ink)" }}>{col.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", background: "#fff", padding: "1px 8px", borderRadius: 999 }}>{counts(col.id)}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 11, display: "flex", flexDirection: "column", gap: 10 }}>
                {R_CANDIDATES.filter((c) => c.col === col.id).map((c) => <PipeCard key={c.id} c={c} onOpen={() => onOpen(c)} />)}
                <button style={{ background: "transparent", border: "1.5px dashed var(--gj-line-strong)", borderRadius: 10, padding: "9px", color: "var(--gj-grey)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Ajouter</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { RecDashboard, RecOffers, RecOfferForm, RecPipeline, PipeCard, rAvatar, matchBadge, rCard });
