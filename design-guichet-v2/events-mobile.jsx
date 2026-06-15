/* eslint-disable */
// Événements — version MOBILE (390×844). Réutilise PhoneFrame, AppHeader,
// BottomNav, FooterCTA (phone.jsx), QRGlyph (cjs-card.jsx) et events-data.jsx.

// ---------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------
const mEvCover = (ev, h = 96) => {
  const t = EV_TONES[ev.type];
  const md = EV_MODE[ev.mode];
  return (
    <div style={{ position: "relative", height: h, background: t.grad, color: "#fff", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 12, flexShrink: 0 }}>
      <svg className="gj-icon" style={{ position: "absolute", right: -12, bottom: -16, width: 92, height: 92, opacity: .16 }}><use href={"#" + t.icon} /></svg>
      <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
        <div style={{ background: "rgba(255,255,255,.95)", color: t.ink, borderRadius: 9, padding: "5px 9px", textAlign: "center", lineHeight: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 900 }}>{ev.d}</div>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", marginTop: 2 }}>{ev.m}</div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,.22)", padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 800, height: "fit-content" }}>
          <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + md.icon} /></svg>{ev.mode}
        </span>
      </div>
      <span style={{ position: "relative", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.28)", padding: "3px 9px", borderRadius: 999, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".3px" }}>{t.label}</span>
    </div>
  );
};

const mEvMetaRow = (icon, label) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--gj-ink)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 15, height: 15, color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href={"#" + icon} /></svg>{label}
  </div>
);

const MobileEvCard = ({ ev, onOpen }) => (
  <div onClick={onOpen} style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
    {mEvCover(ev)}
    <div style={{ padding: 13, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.25, color: "var(--gj-ink)" }}>{ev.title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {mEvMetaRow("i-calendar", `${ev.weekday} ${ev.d} ${ev.m} · ${ev.time}`)}
        {mEvMetaRow(EV_MODE[ev.mode].icon, ev.place)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, borderTop: "1px solid var(--gj-line)" }}>
        {ev.seats <= 5 && <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gj-red)", background: "var(--gj-red-soft)", padding: "3px 9px", borderRadius: 999 }}>{ev.seats} places</span>}
        <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-green-ink)" }}>{ev.price}</span>
        <span style={{ flex: 1 }} />
        {ev.registered
          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 800, color: "var(--gj-green-ink)" }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-check-circle" /></svg>Inscrit·e</span>
          : <span style={{ background: "var(--gj-teal-deep)", color: "#fff", padding: "8px 15px", borderRadius: 8, fontWeight: 800, fontSize: 12.5 }}>S'inscrire</span>}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// LIST
// ---------------------------------------------------------------------
const MobileEvList = ({ nav = () => {} }) => {
  const chips = ["Tous", "Ateliers", "Forums", "Formations", "Webinaires", "En ligne"];
  return (
    <PhoneFrame>
      <AppHeader title="Événements" onBack={() => {}} trailing={(
        <button onClick={() => nav("calendar")} style={{ width: 38, height: 38, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-teal-deep)", flexShrink: 0 }} aria-label="Calendrier">
          <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-calendar" /></svg>
        </button>
      )} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 0 10px" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 14px" }}>
          {chips.map((c, i) => (
            <span key={c} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 13, background: "var(--gj-bg)" }}>
        {EVENTS.map((ev) => <MobileEvCard key={ev.id} ev={ev} onOpen={() => nav(ev.registered ? "confirm" : "detail")} />)}
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// DETAIL (+ état inscrit/confirmation en option)
// ---------------------------------------------------------------------
const MobileEvDetailBody = ({ ev, registered }) => {
  const t = EV_TONES[ev.type];
  const pct = Math.round(((ev.total - ev.seats) / ev.total) * 100);
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)" }}>
      {mEvCover(ev, 132)}
      <div style={{ padding: 15, display: "flex", flexDirection: "column", gap: 16 }}>
        {registered && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-green-soft)", border: "1.5px solid var(--gj-green)", borderRadius: 12, padding: "11px 13px" }}>
            <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-green-ink)" }}><use href="#i-check-circle" /></svg>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-green-ink)" }}>Tu es inscrit·e — rappel 24 h avant.</div>
          </div>
        )}
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.22, color: "var(--gj-ink)" }}>{ev.title}</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg className="gj-icon" style={{ width: 14, height: 14, color: t.ink }}><use href="#i-users" /></svg>{ev.org}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
          {mEvMetaRow("i-calendar", `${ev.weekday} ${ev.d} ${ev.m} ${ev.y}`)}
          {mEvMetaRow("i-clock", ev.time)}
          {mEvMetaRow(EV_MODE[ev.mode].icon, ev.place)}
          <div style={{ paddingTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
              <span style={{ color: ev.seats <= 5 ? "var(--gj-red)" : "var(--gj-grey)" }}>{ev.seats} places restantes</span>
              <span style={{ color: "var(--gj-grey-2)" }}>{ev.price}</span>
            </div>
            <div style={{ height: 7, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: ev.seats <= 5 ? "var(--gj-red)" : "var(--gj-teal)", borderRadius: 4 }} />
            </div>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "var(--gj-ink)", lineHeight: 1.6, margin: 0 }}>{ev.blurb}</p>

        {/* Programme */}
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 12 }}>Programme</h2>
          {EV_PROGRAMME.map((p, i, arr) => (
            <div key={i} style={{ display: "flex", gap: 11 }}>
              <div style={{ width: 44, flexShrink: 0, fontSize: 12, fontWeight: 800, color: t.ink, paddingTop: 1 }}>{p.t}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.ink, marginTop: 3 }} />
                {i < arr.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--gj-line)", margin: "2px 0" }} />}
              </div>
              <div style={{ paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{p.label}</div>
                {p.sub && <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{p.sub}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Intervenants */}
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15, display: "flex", flexDirection: "column", gap: 13 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900 }}>Intervenants</h2>
          {EV_SPEAKERS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{s.initials}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{s.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileEvDetail = ({ nav = () => {} }) => {
  const ev = EVENTS[1]; // Forum (non inscrit)
  return (
    <PhoneFrame>
      <AppHeader title="Détail" onBack={() => nav("list")} trailing={(
        <button style={{ width: 38, height: 38, borderRadius: 8, border: 0, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)", flexShrink: 0 }} aria-label="Partager">
          <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-share" /></svg>
        </button>
      )} />
      <MobileEvDetailBody ev={ev} registered={false} />
      <FooterCTA primary="S'inscrire — gratuit" onPrimary={() => nav("confirm")} />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// CONFIRMATION + QR check-in (sheet ascendante sur le détail)
// ---------------------------------------------------------------------
const MobileEvConfirm = ({ nav = () => {} }) => {
  const ev = EVENTS[0]; // Atelier CV présentiel
  return (
    <PhoneFrame>
      <AppHeader title="Détail" onBack={() => nav("detail")} />
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", filter: "blur(1px)", opacity: .5, pointerEvents: "none", display: "flex", flexDirection: "column" }}>
          <MobileEvDetailBody ev={ev} registered={true} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderRadius: "20px 20px 0 0", padding: "10px 18px 22px", boxShadow: "0 -8px 32px rgba(0,0,0,.2)", maxHeight: "92%", overflowY: "auto" }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: "var(--gj-line-strong)", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6 }}>
            <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--gj-green)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 6px var(--gj-green-soft)" }}>
              <svg className="gj-icon" style={{ width: 30, height: 30 }}><use href="#i-check" /></svg>
            </span>
            <h2 style={{ fontSize: 19, fontWeight: 900, color: "var(--gj-ink)", marginTop: 6 }}>Inscription confirmée !</h2>
            <div style={{ fontSize: 13, color: "var(--gj-grey)", lineHeight: 1.5, maxWidth: 280 }}>Ta place pour <b style={{ color: "var(--gj-ink)" }}>{ev.title}</b> est réservée. Rappel envoyé 24 h avant.</div>
          </div>

          {/* QR check-in — carte CJS blanche */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-teal-deep)", textTransform: "uppercase", letterSpacing: ".5px", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-target" /></svg>Ton billet · check-in sur place
            </div>
            <MyCJSCard />
            <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 8, lineHeight: 1.4 }}>Présente cette carte (ton QR CJS) à l'accueil pour pointer.</div>
          </div>

          <button style={{ width: "100%", marginTop: 14, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 48, borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-calendar" /></svg>Ajouter à mon calendrier
          </button>
          <button onClick={() => nav("mine")} style={{ width: "100%", marginTop: 9, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Voir mes événements</button>
        </div>
      </div>
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// MES ÉVÉNEMENTS (onglets)
// ---------------------------------------------------------------------
const MStars = ({ n }) => (
  <span style={{ display: "inline-flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} viewBox="0 0 24 24" width="16" height="16" style={{ display: "block" }}>
        <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.9 6.7 19.5l1.2-6L3.4 9.3l6-.7z" fill={i <= n ? "var(--gj-yellow)" : "none"} stroke={i <= n ? "var(--gj-yellow-deep)" : "var(--gj-line-strong)"} strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ))}
  </span>
);

const MobileMyEventRow = ({ ev, past, nav = () => {} }) => {
  const t = EV_TONES[ev.type];
  return (
    <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 13, padding: 13, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 50, textAlign: "center", flexShrink: 0, background: t.soft, color: t.ink, borderRadius: 10, padding: "7px 4px" }}>
          <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{ev.d}</div>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>{ev.m}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: t.ink, background: t.soft, padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>{t.label}</span>
            {past && ev.attended && <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 7px", borderRadius: 999 }}>PRÉSENT·E</span>}
            {past && !ev.attended && <span style={{ fontSize: 9, fontWeight: 800, color: "var(--gj-grey)", background: "var(--gj-bg)", padding: "2px 7px", borderRadius: 999 }}>ABSENT·E</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)", marginTop: 4, lineHeight: 1.3 }}>{ev.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{ev.org}{!past && ` · ${ev.time}`}</div>
        </div>
      </div>
      {past && ev.attended && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingTop: 10, borderTop: "1px solid var(--gj-line)" }}>
          {ev.rated > 0 ? <React.Fragment><span style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 700 }}>Ton avis</span><MStars n={ev.rated} /></React.Fragment> : <span onClick={() => nav("feedback")} style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-yellow-ink)", display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}><MStars n={0} />Noter</span>}
          <span style={{ flex: 1 }} />
          {ev.attestation && <button onClick={() => nav("feedback")} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "8px 12px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-download" /></svg>Attestation</button>}
        </div>
      )}
      {!past && (
        <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid var(--gj-line)" }}>
          <button onClick={() => nav("confirm")} style={{ flex: 1, background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 42, borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-target" /></svg>Mon billet</button>
          <button onClick={() => nav("detail")} style={{ flex: 1, background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", minHeight: 42, borderRadius: 9, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Détails</button>
        </div>
      )}
    </div>
  );
};

const MobileMyEvents = ({ tab: tabProp = "inscrits", nav = () => {} }) => {
  const [tab, setTab] = React.useState(tabProp);
  const tabs = [{ id: "inscrits", label: "Inscrits", n: 3 }, { id: "passes", label: "Passés", n: 3 }];
  const inscrits = [EVENTS[0], EVENTS[1], EVENTS[3]];
  return (
    <PhoneFrame>
      <AppHeader title="Mes événements" onBack={() => nav("list")} />
      <div style={{ background: "#fff", borderBottom: "1px solid var(--gj-line)", padding: "0 14px 12px" }}>
        <div style={{ display: "flex", gap: 6, background: "var(--gj-bg)", borderRadius: 11, padding: 4 }}>
          {tabs.map((t) => {
            const on = t.id === tab;
            return (
              <span key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 8, fontSize: 13.5, fontWeight: 800, cursor: "pointer", background: on ? "#fff" : "transparent", color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)", boxShadow: on ? "var(--gj-shadow-sm)" : "none" }}>
                {t.label} <span style={{ fontSize: 11, opacity: .7 }}>({t.n})</span>
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12, background: "var(--gj-bg)" }}>
        {tab === "passes" ? (
          <React.Fragment>
            <div style={{ display: "flex", gap: 9, background: "var(--gj-teal-soft)", borderRadius: 12, padding: "12px 13px", alignItems: "center" }}>
              <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href="#i-check-circle" /></svg>
              <div style={{ fontSize: 12, color: "var(--gj-teal-deep)", fontWeight: 700, lineHeight: 1.4 }}>2 participations · télécharge tes attestations et note les ateliers.</div>
            </div>
            {PAST_EVENTS.map((ev) => <MobileMyEventRow key={ev.id} ev={ev} past nav={nav} />)}
          </React.Fragment>
        ) : inscrits.map((ev) => <MobileMyEventRow key={ev.id} ev={ev} nav={nav} />)}
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// CALENDRIER (juin 2026)
// ---------------------------------------------------------------------
const MobileEvCalendar = ({ nav = () => {} }) => {
  const evByDay = {};
  EVENTS.forEach((e) => { if (e.m === "Juin") (evByDay[e.d] = evByDay[e.d] || []).push(e); });
  const dow = ["L", "M", "M", "J", "V", "S", "D"];
  const juneList = EVENTS.filter((e) => e.m === "Juin");
  return (
    <PhoneFrame>
      <AppHeader title="Calendrier" onBack={() => nav("list")} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg></button>
            <span style={{ fontSize: 15, fontWeight: 900 }}>Juin 2026</span>
            <button style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-right" /></svg></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {dow.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: 30 }).map((_, idx) => {
              const day = idx + 1;
              const has = (evByDay[day] || []).length > 0;
              return (
                <div key={day} style={{ aspectRatio: "1 / 1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: has ? "var(--gj-teal-soft)" : "transparent", border: has ? "1.5px solid var(--gj-teal)" : "1.5px solid transparent" }}>
                  <span style={{ fontSize: 13, fontWeight: has ? 900 : 600, color: has ? "var(--gj-teal-deep)" : "var(--gj-ink)" }}>{day}</span>
                  {has && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gj-teal-deep)" }} />}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>Ce mois-ci</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {juneList.map((e) => {
              const t = EV_TONES[e.type];
              return (
                <div key={e.id} onClick={() => nav("detail")} style={{ display: "flex", gap: 11, background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 12, padding: 11, alignItems: "center", cursor: "pointer" }}>
                  <div style={{ width: 46, textAlign: "center", flexShrink: 0, background: t.soft, color: t.ink, borderRadius: 9, padding: "6px 4px" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{e.d}</div>
                    <div style={{ fontSize: 8.5, fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>{e.m}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.3 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + EV_MODE[e.mode].icon} /></svg>{e.mode} · {e.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <BottomNav active="explore" />
    </PhoneFrame>
  );
};

// ---------------------------------------------------------------------
// APRÈS PARTICIPATION — attestation + avis
// ---------------------------------------------------------------------
const MobileEvFeedback = ({ nav = () => {} }) => {
  const ev = PAST_EVENTS[0];
  const t = EV_TONES[ev.type];
  return (
    <PhoneFrame>
      <AppHeader title="Après l'événement" onBack={() => nav("mine")} />
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14, background: "var(--gj-bg)" }}>
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 15, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 52, textAlign: "center", flexShrink: 0, background: t.soft, color: t.ink, borderRadius: 10, padding: "8px 4px" }}>
            <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1 }}>{ev.d}</div>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>{ev.m}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 8px", borderRadius: 999 }}>PRÉSENT·E</span>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--gj-ink)", marginTop: 5, lineHeight: 1.25 }}>{ev.title}</div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2 }}>{ev.org}</div>
          </div>
        </div>

        {/* Attestation */}
        <div style={{ background: "linear-gradient(135deg, var(--gj-teal-soft), #fff)", border: "1.5px solid var(--gj-teal)", borderRadius: 14, padding: 15, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: "#fff", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg className="gj-icon" style={{ width: 22, height: 22 }}><use href="#i-document" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--gj-ink)" }}>Attestation de participation</div>
            <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>Délivrée par le CJS · PDF officiel</div>
          </div>
          <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, width: 44, height: 44, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-label="Télécharger">
            <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-download" /></svg>
          </button>
        </div>

        {/* Avis */}
        <div style={{ background: "#fff", border: "1px solid var(--gj-line)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 15.5, fontWeight: 900, color: "var(--gj-ink)" }}>Comment c'était ?</h2>
            <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>Ton avis aide les autres jeunes à choisir.</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} viewBox="0 0 24 24" width="38" height="38" style={{ display: "block" }}>
                <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.9 6.7 19.5l1.2-6L3.4 9.3l6-.7z" fill={i <= 4 ? "var(--gj-yellow)" : "none"} stroke={i <= 4 ? "var(--gj-yellow-deep)" : "var(--gj-line-strong)"} strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            ))}
          </div>
          <textarea placeholder="Un mot sur l'atelier (facultatif)…" rows={3} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none", resize: "none", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {["Intervenants au top", "Bien organisé", "Trop court"].map((c) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "7px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700 }}><svg className="gj-icon" style={{ width: 12, height: 12, color: "var(--gj-teal-deep)" }}><use href="#i-plus" /></svg>{c}</span>
            ))}
          </div>
        </div>
      </div>
      <FooterCTA primary="Envoyer mon avis" onPrimary={() => nav("mine")} />
    </PhoneFrame>
  );
};

const MobileEventsApp = ({ start = "list" }) => {
  const [s, setS] = React.useState(start);
  const nav = (x) => setS(x);
  if (s === "detail") return <MobileEvDetail nav={nav} />;
  if (s === "confirm") return <MobileEvConfirm nav={nav} />;
  if (s === "mine") return <MobileMyEvents tab="inscrits" nav={nav} />;
  if (s === "minePast") return <MobileMyEvents tab="passes" nav={nav} />;
  if (s === "calendar") return <MobileEvCalendar nav={nav} />;
  if (s === "feedback") return <MobileEvFeedback nav={nav} />;
  return <MobileEvList nav={nav} />;
};

Object.assign(window, { MobileEvList, MobileEvDetail, MobileEvConfirm, MobileMyEvents, MobileEvCalendar, MobileEvFeedback, MobileEventsApp });
