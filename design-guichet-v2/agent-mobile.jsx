/* eslint-disable */
// Lot 8 — Espace Conseiller · MOBILE (390×844). Réutilise PhoneFrame, AppHeader,
// BottomNav, QRGlyph + agent-data.jsx. Persona terrain : scanner, valider, répondre.

// Bottom nav agent (5 onglets)
const AgentBottomNav = ({ active = "home", nav = () => {} }) => {
  const items = [
    { id: "home", icon: "i-home", label: "Accueil" },
    { id: "resa", icon: "i-calendar", label: "Résa", badge: 4 },
    { id: "checkin", icon: "i-target", label: "Scan" },
    { id: "messages", icon: "i-chat", label: "Messages", badge: 2 },
    { id: "benef", icon: "i-users", label: "Jeunes" },
  ];
  return (
    <div style={{ display: "flex", borderTop: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0, paddingBottom: 6 }}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button key={it.id} onClick={() => nav(it.id)} style={{ flex: 1, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "9px 0 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)", position: "relative" }}>
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

// Agent app header (dark, distinct from beneficiary)
const AgentMobHeader = ({ title, sub, onBack }) => (
  <div style={{ background: "var(--gj-ink-teal)", color: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
    {onBack && <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 9, border: 0, background: "rgba(255,255,255,.1)", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href="#i-chevron-left" /></svg></button>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 1 }}>{sub}</div>}
    </div>
    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--gj-yellow), #E0A93B)", color: "var(--gj-ink-teal)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{AGENT.initials}</span>
  </div>
);

const mAvatar = (init, size = 40, gold) => (
  <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0,
    background: gold ? "linear-gradient(135deg, var(--gj-yellow), #E0A93B)" : "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",
    color: gold ? "var(--gj-ink-teal)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.36 }}>{init}</span>
);
const mMeta = (icon, label, color) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: color || "var(--gj-grey)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 13, height: 13, color: color || "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
  </span>
);

// =====================================================================
// DASHBOARD
// =====================================================================
const MobAgentHome = ({ nav }) => (
  <PhoneFrame>
    <AgentMobHeader title="Bonjour Cheikh 👋" sub="CJS Tambacounda · Jeu. 8 juin" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {A_STATS.map((s, i) => {
          const tone = { teal: ["var(--gj-teal-soft)", "var(--gj-teal-deep)"], yellow: ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], blue: ["var(--gj-blue-soft)", "var(--gj-blue-ink)"], green: ["var(--gj-green-soft)", "var(--gj-green-ink)"] }[s.tone];
          return (
            <div key={i} onClick={() => s.urgent && nav("resa")} style={{ background: "#fff", border: s.urgent ? "1.5px solid var(--gj-yellow)" : "1px solid var(--gj-line)", borderRadius: 13, padding: 13 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: tone[0], color: tone[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + s.icon} /></svg></span>
              <div style={{ fontSize: 23, fontWeight: 900, color: "var(--gj-ink)", marginTop: 9, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--gj-ink)", marginTop: 4 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900 }}>À valider</h2>
          <button onClick={() => nav("resa")} style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Tout voir →</button>
        </div>
        {A_RESA.filter((r) => r.status === "attente").slice(0, 3).map((r, i, arr) => {
          const k = A_RES_KIND[r.kind];
          return (
            <div key={r.id} onClick={() => nav("resa")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0 }}>
              <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + k.icon} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{r.res}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)" }}>{r.who} · {r.date}</div>
              </div>
              <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)" }}><use href="#i-chevron-right" /></svg>
            </div>
          );
        })}
      </div>
      <button onClick={() => nav("checkin")} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 52, borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-target" /></svg>Scanner les présences</button>
    </div>
    <AgentBottomNav active="home" nav={nav} />
  </PhoneFrame>
);

// =====================================================================
// RÉSERVATIONS
// =====================================================================
const MobAgentResa = ({ nav }) => (
  <PhoneFrame>
    <AgentMobHeader title="Réservations" sub="4 à valider" />
    <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 14px" }}>
      <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "10px 0" }}>
        {["À valider (4)", "Acceptées", "Refusées", "Toutes"].map((c, i) => (
          <span key={c} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>
        ))}
      </div>
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
      {A_RESA.filter((r) => r.status === "attente").map((r) => {
        const k = A_RES_KIND[r.kind];
        return (
          <div key={r.id} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", gap: 11 }}>
              <span style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: k.soft, color: k.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href={"#" + k.icon} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{r.res}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                  {mAvatar(r.init, 22)}<span style={{ fontSize: 12, fontWeight: 700, color: "var(--gj-ink)" }}>{r.who}</span>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 7, flexWrap: "wrap" }}>{mMeta("i-calendar", r.date)}{mMeta("i-clock", r.slot)}</div>
                <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 6, fontStyle: "italic" }}>« {r.motif} »</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, borderTop: "1px solid var(--gj-line)", paddingTop: 11 }}>
              <button style={{ flex: 1, background: "var(--gj-green)", color: "#fff", border: 0, minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-check" /></svg>Accepter</button>
              <button style={{ flex: 1, background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-close" /></svg>Refuser</button>
            </div>
          </div>
        );
      })}
    </div>
    <AgentBottomNav active="resa" nav={nav} />
  </PhoneFrame>
);

// =====================================================================
// CHECK-IN (scan QR plein écran)
// =====================================================================
const MobAgentCheckin = ({ nav }) => {
  const present = A_ATTENDEES.filter((a) => a.in).length;
  return (
    <PhoneFrame>
      <AgentMobHeader title="Check-in" sub="Atelier CV · Salle A" />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", display: "flex", flexDirection: "column" }}>
        {/* scanner */}
        <div style={{ position: "relative", background: "#0E1513", aspectRatio: "1 / 1", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 42%, #1d2b27, #0E1513)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", padding: 11, borderRadius: 12, transform: "rotate(-4deg)", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}><QRGlyph size={140} plain /></div>
          </div>
          <div style={{ position: "absolute", inset: "18%", border: "3px solid rgba(255,255,255,.85)", borderRadius: 18, boxShadow: "0 0 0 9999px rgba(0,0,0,.3)" }} />
          {["tl","tr","bl","br"].map((c) => (
            <span key={c} style={{ position: "absolute", width: 28, height: 28, border: "4px solid var(--gj-yellow)",
              borderTop: c[0]==="t"?undefined:"none", borderBottom: c[0]==="b"?undefined:"none", borderLeft: c[1]==="l"?undefined:"none", borderRight: c[1]==="r"?undefined:"none",
              borderRadius: c==="tl"?"10px 0 0 0":c==="tr"?"0 10px 0 0":c==="bl"?"0 0 0 10px":"0 0 10px 0",
              top: c[0]==="t"?"17%":undefined, bottom: c[0]==="b"?"17%":undefined, left: c[1]==="l"?"17%":undefined, right: c[1]==="r"?"17%":undefined }} />
          ))}
          <div style={{ position: "absolute", left: "18%", right: "18%", top: "50%", height: 2.5, background: "var(--gj-yellow)", boxShadow: "0 0 12px var(--gj-yellow)" }} />
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>Place la carte CJS dans le cadre</div>
        </div>
        {/* last scan toast */}
        <div style={{ margin: 14, marginBottom: 0, display: "flex", alignItems: "center", gap: 10, background: "var(--gj-green-soft)", border: "1.5px solid var(--gj-green)", borderRadius: 12, padding: "11px 13px" }}>
          <svg className="gj-icon" style={{ width: 20, height: 20, color: "var(--gj-green-ink)", flexShrink: 0 }}><use href="#i-check-circle" /></svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-green-ink)" }}>Ndèye Gueye pointée</div>
            <div style={{ fontSize: 11, color: "var(--gj-green-ink)", opacity: .8 }}>14:05 · 4ᵉ présence</div>
          </div>
        </div>
        {/* presence list */}
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ fontSize: 14, fontWeight: 900 }}>Présence</h2>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)" }}>{present}/{A_ATTENDEES.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {A_ATTENDEES.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 11, padding: "9px 11px" }}>
                {mAvatar(a.init, 34)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{a.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--gj-grey)" }}>{a.in ? `Pointé à ${a.at}` : a.commune}</div>
                </div>
                {a.in
                  ? <svg className="gj-icon" style={{ width: 22, height: 22, color: "var(--gj-green)" }}><use href="#i-check-circle" /></svg>
                  : <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "6px 12px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Pointer</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <AgentBottomNav active="checkin" nav={nav} />
    </PhoneFrame>
  );
};

// =====================================================================
// MESSAGERIE (inbox + thread)
// =====================================================================
const MobAgentMessages = ({ nav }) => {
  const [open, setOpen] = React.useState(null);
  const t = open ? A_THREADS.find((x) => x.id === open) : null;
  if (t) {
    return (
      <PhoneFrame>
        <AgentMobHeader title={t.who} sub={t.online ? "● en ligne" : "hors ligne"} onBack={() => setOpen(null)} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>Aujourd'hui</div>
          {t.msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "78%", background: m.me ? "var(--gj-teal-deep)" : "#fff", color: m.me ? "#fff" : "var(--gj-ink)", border: m.me ? 0 : "1px solid var(--gj-line)", borderRadius: m.me ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.45 }}>
                {m.t}<div style={{ fontSize: 10, opacity: .6, marginTop: 4, textAlign: "right" }}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderTop: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          <input placeholder="Écris un message…" style={{ flex: 1, minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" }} />
          <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame>
      <AgentMobHeader title="Messagerie" sub="2 non lus" />
      <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
        {A_THREADS.map((th) => (
          <div key={th.id} onClick={() => setOpen(th.id)} style={{ display: "flex", gap: 11, padding: "13px 15px", borderBottom: "1px solid var(--gj-line)", cursor: "pointer" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {mAvatar(th.init, 46)}
              {th.online && <span style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{th.who}</span>
                <span style={{ fontSize: 10.5, color: "var(--gj-grey-2)", flexShrink: 0 }}>{th.time}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: th.unread ? "var(--gj-ink)" : "var(--gj-grey)", fontWeight: th.unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.last}</span>
                {th.unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999, background: "var(--gj-teal-deep)", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{th.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <AgentBottomNav active="messages" nav={nav} />
    </PhoneFrame>
  );
};

// =====================================================================
// BÉNÉFICIAIRES (liste + fiche)
// =====================================================================
const MobAgentBenef = ({ nav }) => {
  const [open, setOpen] = React.useState(null);
  const b = open ? A_BENEF.find((x) => x.id === open) : null;
  if (b) {
    const ring = b.profil >= 75 ? "var(--gj-green)" : b.profil >= 50 ? "var(--gj-yellow-deep)" : "var(--gj-red)";
    return (
      <PhoneFrame>
        <AgentMobHeader title={b.name} sub={`${b.age} ans · ${b.commune}`} onBack={() => setOpen(null)} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
          <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15, display: "flex", gap: 14, alignItems: "center" }}>
            {mAvatar(b.init, 56)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: "var(--gj-ink)" }}>{b.name}</div>
              <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 9px", borderRadius: 999, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", marginTop: 5, display: "inline-block" }}>{b.statut}</span>
            </div>
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
              <circle cx="26" cy="26" r="22" fill="none" stroke="var(--gj-line)" strokeWidth="5" />
              <circle cx="26" cy="26" r="22" fill="none" stroke={ring} strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - b.profil / 100)} transform="rotate(-90 26 26)" />
              <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 13, fontWeight: 900, fill: "var(--gj-ink)" }}>{b.profil}</text>
            </svg>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15 }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Informations</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[["Objectif", b.objectif], ["Niveau", b.niveau], ["Candidatures", `${b.cand} envoyées`], ["Téléphone", b.tel], ["Membre depuis", b.since]].map(([l, v], i, arr) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0 }}>
                  <span style={{ fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}>{l}</span>
                  <span style={{ fontSize: 12.5, color: "var(--gj-ink)", fontWeight: 800, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--gj-yellow-soft)", borderRadius: 12, padding: 13 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 4 }}>Note interne</div>
            <div style={{ fontSize: 12.5, color: "var(--gj-ink)", lineHeight: 1.5 }}>Très motivée. À orienter vers la bourse DER avant le 4 juin.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 9, padding: 14, background: "#fff", borderTop: "1px solid var(--gj-line)", flexShrink: 0 }}>
          <button onClick={() => nav("messages")} style={{ flex: 1, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 48, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chat" /></svg>Message</button>
          <button style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 48, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-calendar" /></svg>RDV</button>
        </div>
        <AgentBottomNav active="benef" nav={nav} />
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame>
      <AgentMobHeader title="Bénéficiaires" sub="1 284 jeunes" />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 13px", minHeight: 44 }}>
          <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-search" /></svg>
          <span style={{ flex: 1, fontSize: 14, color: "var(--gj-grey-2)" }}>Rechercher un bénéficiaire…</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--gj-bg)" }}>
        {A_BENEF.map((b) => (
          <div key={b.id} onClick={() => setOpen(b.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, padding: 12, cursor: "pointer" }}>
            {mAvatar(b.init, 44)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{b.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{b.commune} · {b.niveau} · {b.objectif}</div>
            </div>
            <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)", flexShrink: 0 }}><use href="#i-chevron-right" /></svg>
          </div>
        ))}
      </div>
      <AgentBottomNav active="benef" nav={nav} />
    </PhoneFrame>
  );
};

// =====================================================================
// APP wrapper
// =====================================================================
const MobAgentApp = ({ start = "home" }) => {
  const [s, setS] = React.useState(start);
  const nav = (x) => setS(x);
  if (s === "resa") return <MobAgentResa nav={nav} />;
  if (s === "checkin") return <MobAgentCheckin nav={nav} />;
  if (s === "messages") return <MobAgentMessages nav={nav} />;
  if (s === "benef") return <MobAgentBenef nav={nav} />;
  return <MobAgentHome nav={nav} />;
};

Object.assign(window, { AgentBottomNav, MobAgentHome, MobAgentResa, MobAgentCheckin, MobAgentMessages, MobAgentBenef, MobAgentApp });
