/* eslint-disable */
// Lot 12 — Compléments bénéficiaire · MOBILE (390×844). Réutilise PhoneFrame, AppHeader,
// BottomNav + benef-extra-data.jsx.

const mbxAvatar = (init, tone, size = 44) => {
  const g = TONE_MAP[tone] || TONE_MAP.teal;
  return <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: g[0], color: g[1], display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.38 }}>{init}</span>;
};
const mbxToggle = (on) => (
  <span style={{ width: 44, height: 26, borderRadius: 999, flexShrink: 0, position: "relative", background: on ? "var(--gj-teal)" : "var(--gj-line-strong)" }}>
    <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
  </span>
);

// MESSAGERIE
const MobileBenefMessages = () => {
  const [open, setOpen] = React.useState(null);
  const t = open ? B_THREADS.find((x) => x.id === open) : null;
  if (t) {
    return (
      <PhoneFrame>
        <AppHeader title={t.who} subtitle={t.online ? "● en ligne" : t.role} onBack={() => setOpen(null)} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>Aujourd'hui</div>
          {t.msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "78%", background: m.me ? "var(--gj-teal-deep)" : "#fff", color: m.me ? "#fff" : "var(--gj-ink)", border: m.me ? 0 : "1px solid var(--gj-line)", borderRadius: m.me ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.45 }}>{m.t}<div style={{ fontSize: 10, opacity: .6, marginTop: 4, textAlign: "right" }}>{m.time}</div></div>
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
      <AppHeader title="Messagerie" subtitle="1 non lu" onBack={() => {}} />
      <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
        {B_THREADS.map((th) => (
          <div key={th.id} onClick={() => setOpen(th.id)} style={{ display: "flex", gap: 11, padding: "13px 15px", borderBottom: "1px solid var(--gj-line)", cursor: "pointer" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {mbxAvatar(th.init, th.tone, 46)}
              {th.online && <span style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>{th.who}{th.ai && <span style={{ background: "var(--gj-yellow)", color: "var(--gj-teal-deep)", fontSize: 8, fontWeight: 900, padding: "1px 5px", borderRadius: 999 }}>IA</span>}</span>
                <span style={{ fontSize: 10.5, color: "var(--gj-grey-2)", flexShrink: 0 }}>{th.time}</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--gj-grey)", marginTop: 1 }}>{th.role}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: th.unread ? "var(--gj-ink)" : "var(--gj-grey)", fontWeight: th.unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.last}</span>
                {th.unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999, background: "var(--gj-teal-deep)", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{th.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// MES SAUVEGARDES
const MobileBenefSaved = () => {
  const chips = ["Tout (12)", "Emplois", "Bourses", "Ressources"];
  return (
    <PhoneFrame>
      <AppHeader title="Mes sauvegardes" onBack={() => {}} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 0 10px" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 14px" }}>
          {chips.map((c, i) => <span key={c} style={{ flexShrink: 0, padding: "8px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 11, background: "var(--gj-bg)" }}>
        {B_SAVED.map((s) => {
          const g = TONE_MAP[s.tone];
          return (
            <div key={s.id} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", gap: 12 }}>
              <span style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: g[0], color: g[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href={"#" + s.icon} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: g[1], background: g[0], padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>{s.type}</span>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)", marginTop: 5, lineHeight: 1.25 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2 }}>{s.org} · {s.meta}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-teal-deep)", marginTop: 4 }}>{s.deadline}</div>
              </div>
              <svg className="gj-icon" style={{ width: 19, height: 19, color: "var(--gj-yellow-ink)", flexShrink: 0 }}><use href="#i-bookmark" /></svg>
            </div>
          );
        })}
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// NOTIFICATIONS
const MobileBenefNotifs = () => (
  <PhoneFrame>
    <AppHeader title="Notifications" subtitle="2 non lues" onBack={() => {}} trailing={(
      <button style={{ width: 38, height: 38, borderRadius: 8, border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-teal-deep)", flexShrink: 0 }} aria-label="Tout lu"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-check" /></svg></button>
    )} />
    <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
      {B_NOTIFS.map((n) => {
        const g = TONE_MAP[n.tone];
        return (
          <div key={n.id} style={{ display: "flex", gap: 12, padding: "14px 15px", borderBottom: "1px solid var(--gj-line)", alignItems: "flex-start", background: n.unread ? "var(--gj-teal-soft)" : "#fff" }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: g[0], color: g[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href={"#" + n.icon} /></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
              <div style={{ fontSize: 10.5, color: "var(--gj-grey-2)", marginTop: 4 }}>{n.time}</div>
            </div>
            {n.unread && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gj-teal)", flexShrink: 0, marginTop: 6 }} />}
          </div>
        );
      })}
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>Préférences</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {B_NOTIF_PREFS.slice(0, 4).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--gj-bg)", border: "1px solid var(--gj-line)", borderRadius: 12, padding: "11px 13px" }}>
              <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-grey)", flexShrink: 0 }}><use href={"#" + p.icon} /></svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)" }}>{p.label}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{p.sub}</div>
              </div>
              {mbxToggle(p.on)}
            </div>
          ))}
        </div>
      </div>
    </div>
    <BottomNav active="explore" />
  </PhoneFrame>
);

Object.assign(window, { MobileBenefMessages, MobileBenefSaved, MobileBenefNotifs });
