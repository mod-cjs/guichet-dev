/* eslint-disable */
// Lot 10 — Espace Recruteur · MOBILE (390×844). Réutilise PhoneFrame + recruteur-data.jsx.

const RecBottomNav = ({ active = "home", nav = () => {} }) => {
  const items = [
    { id: "home", icon: "i-home", label: "Accueil" },
    { id: "offers", icon: "i-employment", label: "Offres" },
    { id: "pipeline", icon: "i-target", label: "Candidats", badge: 6 },
    { id: "messages", icon: "i-chat", label: "Messages", badge: 1 },
  ];
  return (
    <div style={{ display: "flex", borderTop: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0, paddingBottom: 6 }}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button key={it.id} onClick={() => nav(it.id)} style={{ flex: 1, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "9px 0 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--gj-blue-ink)" : "var(--gj-grey)" }}>
            <span style={{ position: "relative" }}>
              <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + it.icon} /></svg>
              {it.badge && <span style={{ position: "absolute", top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 999, background: "var(--gj-red)", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", padding: "0 3px" }}>{it.badge}</span>}
            </span>
            <span style={{ fontSize: 10, fontWeight: on ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const RecMobHeader = ({ title, sub, onBack }) => (
  <div style={{ background: "var(--gj-blue-ink)", color: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
    {onBack && <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 9, border: 0, background: "rgba(255,255,255,.14)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-chevron-left" /></svg></button>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 1 }}>{sub}</div>}
    </div>
    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.18)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{RECRUTEUR.initials}</span>
  </div>
);

const rmAvatar = (init, size = 40) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36 }}>{init}</span>
);
const rmMatch = (m) => {
  const col = m >= 85 ? ["var(--gj-green-soft)", "var(--gj-green-ink)"] : m >= 70 ? ["var(--gj-teal-soft)", "var(--gj-teal-deep)"] : ["var(--gj-bg)", "var(--gj-grey)"];
  return <span style={{ fontSize: 10, fontWeight: 800, color: col[1], background: col[0], padding: "2px 8px", borderRadius: 999 }}>{m}%</span>;
};

// DASHBOARD
const RecMobHome = ({ nav }) => (
  <PhoneFrame>
    <RecMobHeader title="Bonjour Aïda 👋" sub="Sonatel · recrutement" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {R_STATS.map((s, i) => {
          const tone = { teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], green: ["var(--gj-green-soft)", "var(--gj-green-ink)"] }[s.tone];
          return (
            <div key={i} onClick={() => s.urgent && nav("pipeline")} style={{ background: "#fff", border: s.urgent ? "1.5px solid var(--gj-yellow)" : "1px solid var(--gj-line)", borderRadius: 13, padding: 13 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: tone[0], color: tone[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + s.icon} /></svg></span>
              <div style={{ fontSize: 22, fontWeight: 900, color: "var(--gj-ink)", marginTop: 9, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gj-ink)", marginTop: 4 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900 }}>À examiner</h2>
          <button onClick={() => nav("pipeline")} style={{ background: "transparent", border: 0, color: "var(--gj-blue-ink)", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Pipeline →</button>
        </div>
        {R_CANDIDATES.filter((c) => c.col === "recue").map((c, i, arr) => (
          <div key={c.id} onClick={() => nav("candidate")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0 }}>
            {rmAvatar(c.init, 36)}
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{c.name}</div><div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{c.niveau}</div></div>
            {rmMatch(c.match)}
          </div>
        ))}
      </div>
      <button onClick={() => nav("offers")} style={{ background: "var(--gj-blue)", color: "#fff", border: 0, minHeight: 50, borderRadius: 12, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-plus" /></svg>Publier une offre</button>
    </div>
    <RecBottomNav active="home" nav={nav} />
  </PhoneFrame>
);

// OFFRES (liste simple)
const RecMobOffers = ({ nav }) => (
  <PhoneFrame>
    <RecMobHeader title="Mes offres" sub="4 offres" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
      {R_OFFERS.map((o) => {
        const st = OFFER_STATUS[o.status];
        return (
          <div key={o.id} onClick={() => o.status === "Active" && nav("pipeline")} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, cursor: o.status === "Active" ? "pointer" : "default" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.25 }}>{o.title}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: st.soft, color: st.ink, whiteSpace: "nowrap", flexShrink: 0 }}>{o.status}</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 5 }}>{o.type} · {o.region}</div>
            {o.status !== "En validation CJS" && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--gj-line)" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-blue-ink)" }}>{o.appli} candidatures</span>
                {o.nouveau > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "var(--gj-red)", padding: "2px 8px", borderRadius: 999 }}>{o.nouveau} nouv.</span>}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: "var(--gj-grey-2)" }}>{o.deadline}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
    <RecBottomNav active="offers" nav={nav} />
  </PhoneFrame>
);

// PIPELINE mobile (colonnes empilées, par onglet)
const RecMobPipeline = ({ nav }) => {
  const [col, setCol] = React.useState("recue");
  const list = R_CANDIDATES.filter((c) => c.col === col);
  return (
    <PhoneFrame>
      <RecMobHeader title="Candidatures" sub="Stage Data Science" onBack={() => nav("home")} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 14px" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "10px 0" }}>
          {PIPE_COLS.map((c) => {
            const on = c.id === col;
            const n = R_CANDIDATES.filter((x) => x.col === c.id).length;
            return <span key={c.id} onClick={() => setCol(c.id)} style={{ flexShrink: 0, padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", background: on ? "var(--gj-blue)" : "#fff", color: on ? "#fff" : "var(--gj-grey)", border: on ? 0 : "1.5px solid var(--gj-line)" }}>{c.label} ({n})</span>;
          })}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
        {list.map((c) => (
          <div key={c.id} onClick={() => nav("candidate")} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              {rmAvatar(c.init, 42)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{c.age} ans · {c.commune} · {c.niveau}</div>
              </div>
              {rmMatch(c.match)}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {c.skills.map((s) => <span key={s} style={{ fontSize: 10.5, fontWeight: 700, color: "var(--gj-grey)", background: "var(--gj-bg)", border: "1px solid var(--gj-line)", padding: "3px 9px", borderRadius: 999 }}>{s}</span>)}
            </div>
          </div>
        ))}
      </div>
      <RecBottomNav active="pipeline" nav={nav} />
    </PhoneFrame>
  );
};

// FICHE CANDIDAT mobile
const RecMobCandidate = ({ nav }) => {
  const c = R_CAND_DETAIL;
  return (
    <PhoneFrame>
      <RecMobHeader title="Candidat" onBack={() => nav("pipeline")} />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)" }}>
        <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: 16, display: "flex", gap: 13, alignItems: "center" }}>
          {rmAvatar(c.init, 56)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "var(--gj-ink)" }}>{c.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{c.age} ans · {c.commune} · {c.niveau}</div>
            <div style={{ marginTop: 6 }}><span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "3px 10px", borderRadius: 999 }}>{c.match}% match</span></div>
          </div>
        </div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15 }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Adéquation au poste</h2>
            {c.criteria.map((cr, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: cr.ok ? "var(--gj-green)" : "var(--gj-bg)", border: cr.ok ? 0 : "1.5px solid var(--gj-line-strong)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 12, height: 12, color: cr.ok ? "#fff" : "var(--gj-grey-2)" }}><use href={"#" + (cr.ok ? "i-check" : "i-close")} /></svg></span>
                <span style={{ fontSize: 13, fontWeight: cr.ok ? 700 : 600, color: cr.ok ? "var(--gj-ink)" : "var(--gj-grey)" }}>{cr.label}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15 }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Compétences</h2>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{c.skills.map((s) => <span key={s} style={{ fontSize: 12, fontWeight: 700, color: "var(--gj-blue-ink)", background: "var(--gj-blue-soft)", padding: "6px 11px", borderRadius: 999 }}>{s}</span>)}</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15 }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>Motivation</h2>
            <p style={{ fontSize: 13, color: "var(--gj-ink)", lineHeight: 1.55, margin: 0 }}>{c.motivation}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, padding: 13 }}>
            <span style={{ width: 30, height: 36, borderRadius: 4, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 8.5, flexShrink: 0 }}>PDF</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--gj-ink)" }}>CV_Awa_Diop_2026.pdf</span>
            <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-blue-ink)" }}><use href="#i-download" /></svg>
          </div>
        </div>
      </div>
      <div style={{ padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)", display: "flex", gap: 9, flexShrink: 0 }}>
        <button onClick={() => nav("messages")} style={{ flex: "0 0 auto", width: 52, background: "#fff", color: "var(--gj-blue-ink)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Message"><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-chat" /></svg></button>
        <button style={{ flex: 1, background: "var(--gj-blue)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-calendar" /></svg>Planifier un entretien</button>
      </div>
    </PhoneFrame>
  );
};

// MESSAGERIE mobile
const RecMobMessages = ({ nav }) => {
  const [open, setOpen] = React.useState(null);
  const t = open ? R_THREADS.find((x) => x.id === open) : null;
  if (t) {
    return (
      <PhoneFrame>
        <RecMobHeader title={t.who} sub={t.online ? "● en ligne" : "hors ligne"} onBack={() => setOpen(null)} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>Aujourd'hui</div>
          {t.msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "78%", background: m.me ? "var(--gj-blue)" : "#fff", color: m.me ? "#fff" : "var(--gj-ink)", border: m.me ? 0 : "1px solid var(--gj-line)", borderRadius: m.me ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.45 }}>{m.t}<div style={{ fontSize: 10, opacity: .6, marginTop: 4, textAlign: "right" }}>{m.time}</div></div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderTop: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          <input placeholder="Écris un message…" style={{ flex: 1, minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" }} />
          <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-blue)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame>
      <RecMobHeader title="Messagerie" sub="candidats · 1 non lu" />
      <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
        {R_THREADS.map((th) => (
          <div key={th.id} onClick={() => setOpen(th.id)} style={{ display: "flex", gap: 11, padding: "13px 15px", borderBottom: "1px solid var(--gj-line)", cursor: "pointer" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>{rmAvatar(th.init, 46)}{th.online && <span style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} />}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{th.who}</span><span style={{ fontSize: 10.5, color: "var(--gj-grey-2)", flexShrink: 0 }}>{th.time}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: th.unread ? "var(--gj-ink)" : "var(--gj-grey)", fontWeight: th.unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.last}</span>
                {th.unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999, background: "var(--gj-blue)", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{th.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <RecBottomNav active="messages" nav={nav} />
    </PhoneFrame>
  );
};

const MobRecruteurApp = ({ start = "home" }) => {
  const [s, setS] = React.useState(start);
  const nav = (x) => setS(x);
  if (s === "offers") return <RecMobOffers nav={nav} />;
  if (s === "pipeline") return <RecMobPipeline nav={nav} />;
  if (s === "candidate") return <RecMobCandidate nav={nav} />;
  if (s === "messages") return <RecMobMessages nav={nav} />;
  return <RecMobHome nav={nav} />;
};

Object.assign(window, { MobRecruteurApp, RecMobHome, RecMobOffers, RecMobPipeline, RecMobCandidate, RecMobMessages });
