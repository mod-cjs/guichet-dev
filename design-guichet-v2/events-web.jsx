/* eslint-disable */
// Événements — version WEB. Réutilise BenefSidebar/BenefTopBar (web-dashboard.jsx),
// QRGlyph (cjs-card.jsx) et le dataset events-data.jsx.
// Vues : list · detail · registered · mine · minePast · calendar.

// ---------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------
const evCard = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" };

const EvCover = ({ ev, height = 116, big = false }) => {
  const t = EV_TONES[ev.type];
  const md = EV_MODE[ev.mode];
  return (
    <div style={{ position: "relative", height, background: t.grad, color: "#fff", flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: big ? 22 : 14 }}>
      <svg className="gj-icon" style={{ position: "absolute", right: -14, bottom: -18, width: big ? 150 : 104, height: big ? 150 : 104, opacity: .16, color: "#fff" }}><use href={"#" + t.icon} /></svg>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div style={{ background: "rgba(255,255,255,.95)", color: t.ink, borderRadius: 10, padding: big ? "8px 12px" : "5px 9px", textAlign: "center", minWidth: big ? 60 : 46, lineHeight: 1 }}>
          <div style={{ fontSize: big ? 28 : 20, fontWeight: 900 }}>{ev.d}</div>
          <div style={{ fontSize: big ? 11 : 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>{ev.m}</div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,.22)", backdropFilter: "blur(4px)", padding: "4px 10px", borderRadius: 999, fontSize: big ? 12 : 10.5, fontWeight: 800 }}>
          <svg className="gj-icon" style={{ width: big ? 13 : 12, height: big ? 13 : 12 }}><use href={"#" + md.icon} /></svg>{ev.mode}
        </span>
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.28)", padding: "3px 9px", borderRadius: 999, fontSize: big ? 11.5 : 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px" }}>
          {t.label}
        </span>
        {ev.urgent && <span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", padding: "3px 9px", borderRadius: 999, fontSize: big ? 11.5 : 10, fontWeight: 900 }}>{ev.seats <= 5 ? `${ev.seats} places` : "Bientôt complet"}</span>}
      </div>
    </div>
  );
};

const evMeta = (icon, label, color) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: color || "var(--gj-grey)", fontWeight: 600 }}>
    <svg className="gj-icon" style={{ width: 13, height: 13, color: color || "var(--gj-grey-2)" }}><use href={"#" + icon} /></svg>{label}
  </span>
);

const SeatsBar = ({ ev }) => {
  const pct = Math.round(((ev.total - ev.seats) / ev.total) * 100);
  const low = ev.seats <= 5;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
        <span style={{ color: low ? "var(--gj-red)" : "var(--gj-grey)" }}>{ev.seats} places restantes</span>
        <span style={{ color: "var(--gj-grey-2)" }}>{pct}% rempli</span>
      </div>
      <div style={{ height: 6, background: "var(--gj-bg)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: low ? "var(--gj-red)" : "var(--gj-teal)", borderRadius: 3 }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// Event card (grid)
// ---------------------------------------------------------------------
const EvCard = ({ ev, onOpen }) => (
  <div style={evCard}>
    <EvCover ev={ev} />
    <div style={{ padding: 15, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
      <div style={{ fontSize: 15.5, fontWeight: 900, lineHeight: 1.25, color: "var(--gj-ink)" }}>{ev.title}</div>
      <div style={{ fontSize: 12, color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", gap: 5 }}>
        <svg className="gj-icon" style={{ width: 12, height: 12, color: EV_TONES[ev.type].ink }}><use href="#i-users" /></svg>{ev.org}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 2 }}>
        {evMeta("i-calendar", `${ev.weekday} ${ev.d} ${ev.m}`)}
        {evMeta("i-clock", ev.time)}
        {evMeta(EV_MODE[ev.mode].icon, ev.place.length > 28 ? ev.place.slice(0, 28) + "…" : ev.place)}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--gj-line)" }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-green-ink)" }}>{ev.price}</span>
        <span style={{ flex: 1 }} />
        {ev.registered ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "8px 13px", borderRadius: 8 }}>
            <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-check-circle" /></svg>Inscrit·e
          </span>
        ) : (
          <button onClick={onOpen} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "9px 16px", borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>S'inscrire</button>
        )}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// Filters rail
// ---------------------------------------------------------------------
const EvFilters = () => {
  const group = (title, children) => (
    <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--gj-line)" }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
  const check = (label, count, on) => (
    <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", cursor: "pointer", fontSize: 13, color: "var(--gj-ink)", fontWeight: on ? 800 : 600 }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: on ? 0 : "1.5px solid var(--gj-line-strong)", background: on ? "var(--gj-teal-deep)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        {on && <svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-check" /></svg>}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>{count}</span>
    </label>
  );
  const pill = (label, on) => (
    <button style={{ padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--gj-teal-soft)" : "#fff", border: on ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: on ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{label}</button>
  );
  return (
    <aside style={{ width: 234, flexShrink: 0, alignSelf: "flex-start", position: "sticky", top: 0 }}>
      <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900 }}>Filtres</h3>
          <span style={{ fontSize: 11.5, color: "var(--gj-teal-deep)", fontWeight: 800, cursor: "pointer" }}>Réinitialiser</span>
        </div>
        {group("Type", (
          <div>
            {check("Ateliers", 2, true)}
            {check("Forums emploi", 1, false)}
            {check("Formations", 1, false)}
            {check("Webinaires", 1, false)}
            {check("Conférences", 1, false)}
          </div>
        ))}
        {group("Format", (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {pill("Tous", true)}{pill("Présentiel", false)}{pill("En ligne", false)}
          </div>
        ))}
        {group("Quand", (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {pill("Cette semaine", false)}{pill("Ce mois", true)}{pill("Plus tard", false)}
          </div>
        ))}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 10 }}>Lieu</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", borderRadius: 9, padding: "0 12px", minHeight: 40 }}>
            <svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-grey)" }}><use href="#i-pin" /></svg>
            <span style={{ fontSize: 13, color: "var(--gj-ink)", fontWeight: 700 }}>Tambacounda</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ---------------------------------------------------------------------
// LIST VIEW
// ---------------------------------------------------------------------
const EvListContent = ({ onOpen, onCalendar, onMine }) => (
  <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
    <EvFilters />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Événements</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>{EVENTS.length} à venir · ateliers, forums, formations et webinaires</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onMine} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-bookmark" /></svg>Mes événements
          </button>
          <button onClick={onCalendar} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-calendar" /></svg>Calendrier
          </button>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
            Trier : Date <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-chevron-right" /></svg>
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {EVENTS.map((ev) => <EvCard key={ev.id} ev={ev} onOpen={() => onOpen && onOpen(ev)} />)}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------
// DETAIL VIEW
// ---------------------------------------------------------------------
const EvCheckinCard = ({ ev }) => (
  <div style={{ background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))", color: "#fff", borderRadius: 14, padding: 16, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: 12 }}>
    <span style={{ position: "absolute", right: -40, top: -50, width: 180, height: 180, background: "radial-gradient(circle, rgba(249,196,0,.18), transparent 60%)", pointerEvents: "none" }} />
    <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", fontSize: 10.5, fontWeight: 800, color: "var(--gj-yellow)", textTransform: "uppercase", letterSpacing: ".5px" }}>
      <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-target" /></svg>Check-in sur place
    </div>
    <div style={{ display: "flex", gap: 13, alignItems: "center", position: "relative" }}>
      <div style={{ background: "#fff", padding: 7, borderRadius: 10, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>
        <QRGlyph size={104} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>Awa Diop</div>
        <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, fontWeight: 700, color: "var(--gj-yellow)", marginTop: 2 }}>GJS · AD · 23045</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.78)", marginTop: 8, lineHeight: 1.45 }}>
          Présente ce QR (ta carte CJS) à l'accueil pour valider ta présence.
        </div>
      </div>
    </div>
  </div>
);

const RegisterCard = ({ ev, registered, onRegister }) => {
  const t = EV_TONES[ev.type];
  const row = (icon, label, val) => (
    <div style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--gj-line)" }}>
      <span style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: t.soft, color: t.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href={"#" + icon} /></svg>
      </span>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)", marginTop: 1 }}>{val}</div>
      </div>
    </div>
  );
  return (
    <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 0 }}>
      {row("i-calendar", "Date", `${ev.weekday} ${ev.d} ${ev.m} ${ev.y}`)}
      {row("i-clock", "Horaire", ev.time)}
      {row(EV_MODE[ev.mode].icon, ev.mode, ev.place)}
      <div style={{ padding: "14px 0 4px" }}>
        <SeatsBar ev={ev} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 14px" }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "var(--gj-green-ink)" }}>{ev.price}</span>
        <span style={{ fontSize: 12, color: "var(--gj-grey)" }}>· annulation libre</span>
      </div>
      {registered ? (
        <React.Fragment>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--gj-green-soft)", color: "var(--gj-green-ink)", borderRadius: 10, padding: "13px", fontWeight: 800, fontSize: 14.5 }}>
            <svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-check-circle" /></svg>Tu es inscrit·e
          </div>
          <button style={{ marginTop: 8, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 46, borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-calendar" /></svg>Ajouter à mon calendrier
          </button>
          <button style={{ marginTop: 8, background: "transparent", color: "var(--gj-red)", border: 0, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 6 }}>Annuler mon inscription</button>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <button onClick={onRegister} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 50, borderRadius: 10, fontWeight: 800, fontSize: 15.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            S'inscrire — c'est gratuit
          </button>
          <div style={{ fontSize: 11.5, color: "var(--gj-grey)", textAlign: "center", marginTop: 8, lineHeight: 1.45 }}>Inscription en 1 clic avec ton compte. Confirmation immédiate.</div>
          <button style={{ marginTop: 6, background: "transparent", color: "var(--gj-teal-deep)", border: 0, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-share" /></svg>Partager l'événement
          </button>
        </React.Fragment>
      )}
    </div>
  );
};

const EvDetailContent = ({ ev, registered, onBack, onRegister }) => {
  const t = EV_TONES[ev.type];
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 14, padding: 0 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Retour aux événements
      </button>

      {registered && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--gj-green-soft)", border: "1.5px solid var(--gj-green)", borderRadius: 12, padding: "13px 16px", marginBottom: 16 }}>
          <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gj-green)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-check" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--gj-green-ink)" }}>Inscription confirmée — à très vite !</div>
            <div style={{ fontSize: 12.5, color: "var(--gj-green-ink)", opacity: .85, marginTop: 1 }}>Un rappel te sera envoyé 24 h avant. Retrouve ton billet dans « Mes événements ».</div>
          </div>
        </div>
      )}

      <EvCover ev={ev} height={170} big />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 22, marginTop: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h1 style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.2, color: "var(--gj-ink)" }}>{ev.title}</h1>
            <div style={{ fontSize: 14, color: "var(--gj-grey)", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg className="gj-icon" style={{ width: 15, height: 15, color: t.ink }}><use href="#i-users" /></svg>Organisé par <b style={{ color: "var(--gj-ink)" }}>{ev.org}</b>
            </div>
            <p style={{ fontSize: 14.5, color: "var(--gj-ink)", lineHeight: 1.6, marginTop: 12 }}>{ev.blurb}</p>
          </div>

          {/* Programme */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Programme</h2>
            <div>
              {EV_PROGRAMME.map((p, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 54, flexShrink: 0, textAlign: "right", fontSize: 12.5, fontWeight: 800, color: t.ink, paddingTop: 1 }}>{p.t}</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ width: 11, height: 11, borderRadius: "50%", background: t.ink, marginTop: 4 }} />
                    {i < arr.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--gj-line)", margin: "3px 0" }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{p.label}</div>
                    {p.sub && <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>{p.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Intervenants */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Intervenants</h2>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              {EV_SPEAKERS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{s.initials}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1, maxWidth: 200 }}>{s.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lieu */}
          <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>{ev.mode === "En ligne" ? "Accès" : "Lieu"}</h2>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 120, height: 88, borderRadius: 10, flexShrink: 0, background: "repeating-linear-gradient(45deg, var(--gj-bg), var(--gj-bg) 8px, #eef3f1 8px, #eef3f1 16px)", border: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gj-grey-2)" }}>
                <svg className="gj-icon" style={{ width: 26, height: 26 }}><use href={"#" + EV_MODE[ev.mode].icon} /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{ev.place}</div>
                <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 4, lineHeight: 1.5 }}>{ev.mode === "En ligne" ? "Le lien de connexion est envoyé par SMS et e-mail après l'inscription." : "Accès libre · centre accessible PMR · proche arrêt de bus."}</div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 800, color: "var(--gj-teal-deep)", marginTop: 8, cursor: "pointer" }}>
                  {ev.mode === "En ligne" ? "Tester ma connexion" : "Voir l'itinéraire"} <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-external" /></svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <RegisterCard ev={ev} registered={registered} onRegister={onRegister} />
          {registered && ev.mode !== "En ligne" && <EvCheckinCard ev={ev} />}
        </aside>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// MY EVENTS VIEW
// ---------------------------------------------------------------------
const Stars = ({ n }) => (
  <span style={{ display: "inline-flex", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} viewBox="0 0 24 24" width="15" height="15" style={{ display: "block" }}>
        <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.9 6.7 19.5l1.2-6L3.4 9.3l6-.7z" fill={i <= n ? "var(--gj-yellow)" : "none"} stroke={i <= n ? "var(--gj-yellow-deep)" : "var(--gj-line-strong)"} strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ))}
  </span>
);

const MyEventRow = ({ ev, past, onOpen }) => {
  const t = EV_TONES[ev.type];
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 14 }}>
      <div style={{ width: 56, textAlign: "center", flexShrink: 0, background: t.soft, color: t.ink, borderRadius: 10, padding: "8px 4px" }}>
        <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{ev.d}</div>
        <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", marginTop: 3 }}>{ev.m}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: t.ink, background: t.soft, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>{t.label}</span>
          {!past && ev.mode && <span style={{ fontSize: 11, color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href={"#" + EV_MODE[ev.mode].icon} /></svg>{ev.mode}</span>}
          {past && ev.attended && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "2px 8px", borderRadius: 999 }}>PRÉSENT·E</span>}
          {past && !ev.attended && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--gj-grey)", background: "var(--gj-bg)", padding: "2px 8px", borderRadius: 999 }}>ABSENT·E</span>}
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)", marginTop: 5 }}>{ev.title}</div>
        <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>{ev.org}{!past && ` · ${ev.time}`}</div>
        {past && ev.attended && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            {ev.rated > 0
              ? <React.Fragment><span style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 700 }}>Ton avis</span><Stars n={ev.rated} /></React.Fragment>
              : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: "var(--gj-yellow-ink)" }}><Stars n={0} /> Donne ton avis</span>}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {past ? (
          ev.attestation
            ? <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "9px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-download" /></svg>Attestation</button>
            : <button style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "9px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Revoir</button>
        ) : (
          <React.Fragment>
            <button onClick={onOpen} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "9px 16px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Mon billet</button>
            <button style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Détails</button>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

const MyEventsContent = ({ tab: tabProp = "inscrits", onOpen, onBack }) => {
  const [tab, setTab] = React.useState(tabProp);
  const tabs = [
    { id: "inscrits", label: "Inscrits", count: 3 },
    { id: "venir", label: "À venir", count: 2 },
    { id: "passes", label: "Passés", count: 3 },
  ];
  const upcoming = EVENTS.filter((e) => e.registered || ["forum", "webfin"].includes(e.id)).slice(0, 3);
  // ensure at least 3 registered-ish
  const inscrits = [EVENTS[0], EVENTS[1], EVENTS[3]];
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 12, padding: 0 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Tous les événements
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Mes événements</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Tes inscriptions, tes rappels et tes attestations.</div>

      <div style={{ display: "flex", gap: 6, margin: "18px 0", background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: 5, width: "fit-content" }}>
        {tabs.map((t) => {
          const on = t.id === tab;
          return (
            <span key={t.id} onClick={() => setTab(t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 800, cursor: "pointer", background: on ? "var(--gj-teal-deep)" : "transparent", color: on ? "#fff" : "var(--gj-grey)" }}>
              {t.label}
              <span style={{ fontSize: 11, fontWeight: 800, background: on ? "rgba(255,255,255,.22)" : "var(--gj-bg)", color: on ? "#fff" : "var(--gj-grey)", padding: "1px 8px", borderRadius: 999 }}>{t.count}</span>
            </span>
          );
        })}
      </div>

      {tab === "passes" ? (
        <React.Fragment>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gj-teal-soft)", borderRadius: 12, padding: "13px 16px", marginBottom: 14 }}>
            <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-teal-deep)" }}><use href="#i-check-circle" /></svg>
            <div style={{ fontSize: 13, color: "var(--gj-teal-deep)", fontWeight: 700 }}>Tu as participé à <b>2 événements</b>. Télécharge tes attestations et laisse un avis pour aider les autres jeunes.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PAST_EVENTS.map((ev) => <MyEventRow key={ev.id} ev={ev} past />)}
          </div>
        </React.Fragment>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {inscrits.map((ev) => <MyEventRow key={ev.id} ev={ev} onOpen={() => onOpen && onOpen(ev)} />)}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// CALENDAR VIEW (juin 2026 — commence un lundi)
// ---------------------------------------------------------------------
const CalendarContent = ({ onOpen, onBack }) => {
  const evByDay = {};
  EVENTS.forEach((e) => { if (e.m === "Juin") (evByDay[e.d] = evByDay[e.d] || []).push(e); });
  const days = [];
  for (let i = 0; i < 30; i++) days.push(i + 1);
  const dow = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const juneList = EVENTS.filter((e) => e.m === "Juin");
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", width: "100%" }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 12, padding: 0 }}>
        <svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Tous les événements
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Calendrier</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Visualise tous les événements du mois.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button style={{ width: 38, height: 38, borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-chevron-left" /></svg></button>
          <span style={{ fontSize: 15, fontWeight: 900, minWidth: 130, textAlign: "center" }}>Juin 2026</span>
          <button style={{ width: 38, height: 38, borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-chevron-right" /></svg></button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
        <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8 }}>
            {dow.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {days.map((day) => {
              const evs = evByDay[day] || [];
              const has = evs.length > 0;
              return (
                <div key={day} style={{ aspectRatio: "1 / 1", borderRadius: 9, border: "1.5px solid var(--gj-line)", padding: 7, display: "flex", flexDirection: "column", background: has ? "var(--gj-teal-soft)" : "#fff", borderColor: has ? "var(--gj-teal)" : "var(--gj-line)", cursor: has ? "pointer" : "default" }} onClick={has ? onOpen : undefined}>
                  <div style={{ fontSize: 13, fontWeight: has ? 900 : 600, color: has ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{day}</div>
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
                    {evs.slice(0, 2).map((e) => (
                      <div key={e.id} style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: EV_TONES[e.type].grad, borderRadius: 4, padding: "2px 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <aside style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12 }}>Ce mois-ci</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {juneList.map((e) => {
              const t = EV_TONES[e.type];
              return (
                <div key={e.id} onClick={onOpen} style={{ display: "flex", gap: 11, cursor: "pointer" }}>
                  <div style={{ width: 44, textAlign: "center", flexShrink: 0, background: t.soft, color: t.ink, borderRadius: 9, padding: "6px 4px" }}>
                    <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{e.d}</div>
                    <div style={{ fontSize: 8.5, fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>{e.m}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-ink)", lineHeight: 1.3 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + EV_MODE[e.mode].icon} /></svg>{e.mode} · {e.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------
// SHELL
// ---------------------------------------------------------------------
const WebEvents = ({ view = "list" }) => {
  const [v, setV] = React.useState(view);
  const [ev, setEv] = React.useState(EVENTS[0]);
  const openDetail = (e) => { setEv(e || EVENTS[0]); setV(e && e.registered ? "registered" : "detail"); };
  const root = { display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden" };
  const main = { display: "flex", flexDirection: "column", overflow: "hidden" };
  const page = { padding: "22px 28px 40px", overflowY: "auto", flex: 1 };
  let content;
  if (v === "list") content = <EvListContent onOpen={openDetail} onCalendar={() => setV("calendar")} onMine={() => setV("mine")} />;
  else if (v === "detail") content = <EvDetailContent ev={ev} registered={false} onBack={() => setV("list")} onRegister={() => setV("registered")} />;
  else if (v === "registered") content = <EvDetailContent ev={ev} registered={true} onBack={() => setV("list")} />;
  else if (v === "mine") content = <MyEventsContent tab="inscrits" onOpen={openDetail} onBack={() => setV("list")} />;
  else if (v === "minePast") content = <MyEventsContent tab="passes" onOpen={openDetail} onBack={() => setV("list")} />;
  else if (v === "calendar") content = <CalendarContent onOpen={() => openDetail(EVENTS[0])} onBack={() => setV("list")} />;
  return (
    <div style={root}>
      <BenefSidebar active="events" onNavChange={(id) => { if (id === "events") setV("list"); }} />
      <div style={main}>
        <BenefTopBar />
        <div style={page}>{content}</div>
      </div>
    </div>
  );
};

Object.assign(window, { WebEvents });
