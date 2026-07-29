/* eslint-disable */
// Lot 8 — Espace Conseiller · WEB. Réutilise AgentSidebar/AgentTopBar (agent-shell.jsx),
// QRGlyph (cjs-card.jsx) + agent-data.jsx.
// Vues : home · resa · benef · fiche · checkin · publish · messages · agenda.

// ---------------------------------------------------------------------
// atoms
// ---------------------------------------------------------------------
const aCard = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 };
// Avatar — initiales par défaut. Une photo réelle peut les recouvrir si un
// identifiant de personne est fourni (id unique : deux homonymes ne partagent
// jamais la même image). En dessous de 56 px, on garde les seules initiales :
// une zone de dépôt n'y est ni lisible ni cliquable.
const aAvatar = (init, size = 40, gold, personId) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, position: "relative", overflow: "hidden",
    background: gold ? "linear-gradient(135deg, var(--gj-yellow), #C97F03)" : "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",
    color: gold ? "var(--gj-ink-teal)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: size * 0.36 }}>
    <span>{init}</span>
    {personId && size >= 56 && (
      <span style={{ position: "absolute", inset: 0 }}>
        <image-slot id={"pers-" + personId} shape="circle" fit="cover" placeholder=" "></image-slot>
      </span>
    )}
  </span>
);
const aMeta = (icon, label, color) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: color || "var(--gj-grey)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 13, height: 13, color: color || "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
  </span>
);
const aStatusPill = (status) => {
  const s = A_STATUS[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: s.ink, background: s.soft, border: `1px solid ${s.dot}`, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + s.icon} /></svg>{s.label}
    </span>
  );
};
const ProfileRing = ({ pct, size = 34 }) => {
  const r = (size - 5) / 2, c = 2 * Math.PI * r;
  const col = pct >= 75 ? "var(--gj-green)" : pct >= 50 ? "var(--gj-yellow-deep)" : "var(--gj-red)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--gj-line)" strokeWidth="3.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct/100)} transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: size*0.26, fontWeight: 900, fill: "var(--gj-ink)" }}>{pct}</text>
    </svg>
  );
};

// =====================================================================
// DASHBOARD
// =====================================================================
const AgentDashboard = ({ nav }) => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Bonjour Cheikh 👋</h1>
        <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Jeudi 8 juin 2026 · voici l'activité du jour à CJS Tambacounda.</div>
      </div>
    </div>

    {/* stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {A_STATS.map((s, i) => {
        const tone = { teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"], green: ["var(--gj-green-soft)", "var(--gj-green-ink)"] }[s.tone];
        return (
          <div key={i} onClick={() => s.urgent && nav("resa")} style={{ ...aCard, padding: 16, cursor: s.urgent ? "pointer" : "default", borderColor: s.urgent ? "var(--gj-yellow)" : "var(--gj-line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: tone[0], color: tone[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href={"#" + s.icon} /></svg></span>
              {s.urgent && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-yellow-ink)", background: "var(--gj-yellow-soft)", padding: "2px 8px", borderRadius: 999 }}>ACTION</span>}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--gj-ink)", marginTop: 12, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gj-ink)", marginTop: 6 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>{s.delta}</div>
          </div>
        );
      })}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "start" }}>
      {/* à valider */}
      <div style={aCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900 }}>Réservations à valider</h2>
          <button onClick={() => nav("resa")} style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Tout voir →</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {A_RESA.filter((r) => r.status === "attente").slice(0, 3).map((r) => {
            const k = A_RES_KIND[r.kind];
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--gj-line)" }}>
                <span style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + k.icon} /></svg></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{r.res}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{r.who} · {r.date} · {r.slot}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); window.gjToast && window.gjToast("Réservation de " + r.who + " acceptée — notification envoyée"); }} style={{ width: 34, height: 34, borderRadius: 8, border: 0, background: "var(--gj-green)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Accepter"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg></button>
                  <button onClick={(e) => { e.stopPropagation(); window.gjToast && window.gjToast("Réservation refusée — motif demandé", "error"); }} style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-red)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Refuser"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-close" /></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* agenda du jour */}
      <div style={aCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900 }}>Aujourd'hui</h2>
          <button onClick={() => nav("rdv")} style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Agenda →</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {A_RDV.slice(0, 4).map((r, i, arr) => (
            <div key={r.id} style={{ display: "flex", gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
              <div style={{ width: 44, flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "var(--gj-ink)" }}>{r.time}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey-2)" }}>{r.dur}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: r.status === "atelier" ? "var(--gj-yellow-deep)" : "var(--gj-teal)", marginTop: 4 }} />
                {i < arr.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--gj-line)", margin: "3px 0" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{r.who}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{r.type} · {r.topic}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// =====================================================================
// RÉSERVATIONS (file + accepter/refuser/proposer + détail)
// =====================================================================
const ResaActionRow = ({ r, onOpen }) => {
  const k = A_RES_KIND[r.kind];
  return (
    <div style={{ ...aCard, padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + k.icon} /></svg></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {aAvatar(r.init, 40)}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 900, color: "var(--gj-ink)" }}>{r.who}</span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{r.age} ans · demandé {r.asked}</span>
              </span>
            </span>
            {aStatusPill(r.status)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 13, fontWeight: 800, color: k.ink }}>
            <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href={"#" + k.icon} /></svg>{r.res}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 9, flexWrap: "wrap" }}>
            {aMeta("i-calendar", r.date)}{aMeta("i-clock", r.slot)}{aMeta("i-users", `${r.people} pers.`)}
            {r.justif && aMeta("i-document", "Justificatif joint", "var(--gj-blue-ink)")}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>« {r.motif} »</div>
        </div>
      </div>
      {r.note && (
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: A_STATUS[r.status].soft, borderRadius: 9, padding: "10px 12px", fontSize: 12, color: A_STATUS[r.status].ink, fontWeight: 600 }}>
          <svg className="gj-icon" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }}><use href={"#" + A_STATUS[r.status].icon} /></svg>{r.note}
        </div>
      )}
      {r.status === "attente" && (
        <div style={{ display: "flex", gap: 9, borderTop: "1px solid var(--gj-line)", paddingTop: 13 }}>
          <button onClick={onOpen} style={{ background: "var(--gj-green)", color: "#fff", border: 0, padding: "10px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-check" /></svg>Accepter</button>
          <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "10px 16px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-calendar" /></svg>Proposer un créneau</button>
          <button style={{ background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "10px 16px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-close" /></svg>Refuser</button>
          <span style={{ flex: 1 }} />
          {r.justif && <button style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "10px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Voir le justificatif</button>}
        </div>
      )}
    </div>
  );
};

const AgentResa = ({ onDecision }) => {
  const tabs = [["all", "Toutes", A_RESA.length], ["attente", "À valider", 4], ["acceptee", "Acceptées", 1], ["refusee", "Refusées", 1]];
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Réservations de ressources</h1>
        <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Valide les demandes de salle, véhicule et poste informatique.</div>
        <div style={{ display: "flex", gap: 6, margin: "18px 0", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 5, width: "fit-content" }}>
          {tabs.map(([id, label, n], i) => (
            <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", background: i === 1 ? "var(--gj-teal-deep)" : "transparent", color: i === 1 ? "#fff" : "var(--gj-grey)" }}>
              {label}<span style={{ fontSize: 11, fontWeight: 800, background: i === 1 ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: i === 1 ? "#fff" : "var(--gj-grey)", padding: "1px 7px", borderRadius: 999 }}>{n}</span>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {A_RESA.map((r) => <ResaActionRow key={r.id} r={r} onOpen={onDecision} />)}
        </div>
      </div>
    </div>
  );
};

// Modal de décision (accepter avec message / proposer créneau)
const ResaDecisionModal = ({ onClose }) => {
  const r = A_RESA[0];
  const slots = ["08h – 10h", "10h – 12h", "14h – 16h", "16h – 18h"];
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 28 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(560px, 100%)", maxHeight: "90%", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.4)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 10, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href="#i-check-circle" /></svg></span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16.5, fontWeight: 900 }}>Accepter la réservation</h2>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>{r.res} · {r.who} · {r.date}</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, border: 0, background: "transparent", cursor: "pointer", color: "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-close" /></svg></button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>Créneau accordé</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {slots.map((s, i) => <button key={s} style={{ padding: "9px 15px", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 2 ? "var(--gj-teal-soft)" : "#fff", border: i === 2 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: i === 2 ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{s}</button>)}
            </div>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 8 }}>Le créneau demandé (14h – 16h) est disponible.</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-ink)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Message au bénéficiaire (facultatif)</div>
            <textarea defaultValue="Bonjour Awa, ta réservation est confirmée. Présente ta carte CJS à l'accueil. À bientôt !" rows={3} style={{ width: "100%", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none", resize: "none", lineHeight: 1.5 }} />
          </div>
          <div style={{ display: "flex", gap: 9, alignItems: "center", background: "var(--gj-green-soft)", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "var(--gj-green-ink)", fontWeight: 600 }}>
            <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-chat" /></svg>Le bénéficiaire sera notifié par SMS + dans l'app.
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1.5px solid var(--gj-line)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={() => { window.gjToast && window.gjToast("Réservation acceptée — " + r.who + " sera notifié(e)"); onClose(); }} style={{ background: "var(--gj-green)", color: "#fff", border: 0, padding: "11px 22px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>Confirmer l'acceptation</button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// BÉNÉFICIAIRES (annuaire + fiche)
// =====================================================================
const AgentBenefList = ({ onOpen }) => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Bénéficiaires</h1>
        <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>1 284 jeunes inscrits à CJS Tambacounda.</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-filter" /></svg>Filtrer</button>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-download" /></svg>Exporter</button>
      </div>
    </div>
    <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1.6fr 0.8fr 1fr 0.4fr", gap: 14, padding: "12px 18px", borderBottom: "1.5px solid var(--gj-line)", background: "var(--gj-bg)", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>
        <span>Bénéficiaire</span><span>Commune</span><span>Objectif</span><span>Profil</span><span>Statut</span><span></span>
      </div>
      {A_BENEF.map((b) => (
        <div key={b.id} onClick={onOpen} style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 1.6fr 0.8fr 1fr 0.4fr", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--gj-line)", alignItems: "center", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            {aAvatar(b.init, 38)}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{b.name}</div>
              <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{b.age} ans · {b.niveau} · {b.cand} candidatures</div>
            </div>
          </div>
          <span style={{ fontSize: 12.5, color: "var(--gj-ink)" }}>{b.commune}</span>
          <span style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>{b.objectif}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><ProfileRing pct={b.profil} /></div>
          <span><span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: b.statut === "Actif" ? "var(--gj-green-soft)" : "var(--gj-yellow-soft)", color: b.statut === "Actif" ? "var(--gj-green-ink)" : "var(--gj-yellow-ink)", whiteSpace: "nowrap" }}>{b.statut}</span></span>
          <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)", justifySelf: "end" }}><use href="#i-chevron-right" /></svg>
        </div>
      ))}
    </div>
  </div>
);

const AgentBenefDetail = ({ onBack, nav }) => {
  const b = A_BENEF[0];
  const kv = (label, val) => (
    <div><div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</div><div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)", marginTop: 2 }}>{val}</div></div>
  );
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 14, padding: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Bénéficiaires</button>
        {/* header */}
        <div style={{ ...aCard, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          {aAvatar(b.init, 64, false, b.id)}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--gj-ink)" }}>{b.name}</h1>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)" }}>{b.statut}</span>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              {aMeta("i-pin", b.commune)}{aMeta("i-users", `${b.age} ans · ${b.sex}`)}{aMeta("i-learning", b.niveau)}{aMeta("i-phone", b.tel)}{aMeta("i-calendar", `Inscrit·e ${b.since}`)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button onClick={() => nav("messages")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "10px 15px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-chat" /></svg>Message</button>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "10px 15px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-calendar" /></svg>Planifier RDV</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginTop: 20, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={aCard}>
              <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>Informations</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 18px" }}>
                {kv("Objectif", b.objectif)}{kv("Niveau d'étude", b.niveau)}{kv("Candidatures", `${b.cand} envoyées`)}
                {kv("Dernière activité", b.last)}{kv("Téléphone", b.tel)}{kv("Membre depuis", b.since)}
              </div>
            </div>
            {/* historique réservations */}
            <div style={aCard}>
              <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>Historique des réservations</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {A_RESA.filter((r) => r.who === b.name).concat(A_RESA.filter(r=>r.who!==b.name).slice(0,1)).slice(0,3).map((r, idx) => {
                  const k = A_RES_KIND[r.kind];
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--gj-line)" }}>
                      <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + k.icon} /></svg></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{r.res}</div>
                        <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{r.date} · {r.slot}</div>
                      </div>
                      {aStatusPill(r.status)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* aside: profil + notes */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...aCard, alignItems: "center", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
              <ProfileRing pct={b.profil} size={84} />
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>Profil complété</div>
              <div style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.4 }}>Il manque le CV et une expérience pour atteindre 90%.</div>
            </div>
            <div style={aCard}>
              <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>Notes internes</h2>
              <div style={{ background: "var(--gj-yellow-soft)", borderRadius: 9, padding: "11px 13px", fontSize: 12.5, color: "var(--gj-ink)", lineHeight: 1.5 }}>
                Très motivée. Projet maraîchage solide — à orienter vers la bourse DER avant la clôture du 4 juin.
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 6 }}>C. Ndiaye · 2 mai 2026</div>
              </div>
              <button style={{ marginTop: 10, width: "100%", background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px dashed var(--gj-line-strong)", padding: "9px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-plus" /></svg>Ajouter une note</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AgentDashboard, AgentResa, ResaDecisionModal, AgentBenefList, AgentBenefDetail, aCard, aAvatar, aMeta, aStatusPill, ProfileRing });
