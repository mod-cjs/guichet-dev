/* eslint-disable */
// Lot 12 — Compléments bénéficiaire · WEB. Réutilise BenefSidebar/BenefTopBar + benef-extra-data.jsx.
// Vues : messages · saved · notifs · privacy.

const bxCard = { background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 };
const bxAvatar = (init, tone, size = 44) => {
  const g = TONE_MAP[tone] || TONE_MAP.teal;
  return <span style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: g[0], color: g[1], display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.38 }}>{init}</span>;
};

// =====================================================================
// MESSAGERIE
// =====================================================================
const BenefMessages = () => {
  const [active, setActive] = React.useState(B_THREADS[0].id);
  const t = B_THREADS.find((x) => x.id === active);
  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "330px 1fr", overflow: "hidden" }}>
      <div style={{ borderRight: "1px solid var(--gj-line)", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--gj-line)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 900 }}>Messagerie</h2>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>Conseillers, recruteurs & Yaye · 1 non lu</div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {B_THREADS.map((th) => {
            const on = th.id === active;
            return (
              <div key={th.id} onClick={() => setActive(th.id)} style={{ display: "flex", gap: 11, padding: "13px 18px", borderBottom: "1px solid var(--gj-line)", cursor: "pointer", background: on ? "var(--gj-teal-soft)" : "transparent" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {bxAvatar(th.init, th.tone, 44)}
                  {th.online && <span style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>{th.who}{th.ai && <span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "1px 5px", borderRadius: 999 }}>IA</span>}</span>
                    <span style={{ fontSize: 11, color: "var(--gj-grey-2)", flexShrink: 0 }}>{th.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gj-grey)", marginTop: 1 }}>{th.role}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: th.unread ? "var(--gj-ink)" : "var(--gj-grey)", fontWeight: th.unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.last}</span>
                    {th.unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999, background: "var(--gj-teal-deep)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{th.unread}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--gj-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 20px", borderBottom: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          {bxAvatar(t.init, t.tone, 40)}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{t.who}</div>
            <div style={{ fontSize: 11.5, color: t.online ? "var(--gj-green-ink)" : "var(--gj-grey)" }}>{t.online ? "● en ligne" : t.role}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>Aujourd'hui</div>
          {t.msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "66%", background: m.me ? "var(--gj-teal-deep)" : "#fff", color: m.me ? "#fff" : "var(--gj-ink)", border: m.me ? 0 : "1px solid var(--gj-line)", borderRadius: m.me ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.45 }}>{m.t}<div style={{ fontSize: 11, opacity: .6, marginTop: 4, textAlign: "right" }}>{m.time}</div></div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderTop: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          <input placeholder="Écris un message…" style={{ flex: 1, minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" }} />
          <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Envoyer"><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// MES SAUVEGARDES
// =====================================================================
const BenefSaved = () => {
  const chips = ["Tout (12)", "Emplois", "Bourses", "Événements", "Ressources"];
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Mes sauvegardes</h1>
        <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3, marginBottom: 16 }}>Retrouve les opportunités et ressources que tu as mises de côté.</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
          {chips.map((c, i) => <button key={c} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 0 ? "var(--gj-teal-deep)" : "#fff", color: i === 0 ? "#fff" : "var(--gj-grey)", border: i === 0 ? 0 : "1.5px solid var(--gj-line)" }}>{c}</button>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {B_SAVED.map((s) => {
            const g = TONE_MAP[s.tone];
            return (
              <div key={s.id} style={{ ...bxCard, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: g[0], color: g[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + s.icon} /></svg></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: g[1], background: g[0], padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px" }}>{s.type}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{s.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 3 }}>{s.org} · {s.meta} · <b style={{ color: "var(--gj-ink)" }}>{s.deadline}</b></div>
                </div>
                <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Voir</button>
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-yellow-ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-label="Retirer des sauvegardes"><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-bookmark" /></svg></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// NOTIFICATIONS + PRÉFÉRENCES
// =====================================================================
const BxToggle = ({ on }) => (
  <span style={{ width: 42, height: 24, borderRadius: 999, flexShrink: 0, position: "relative", background: on ? "var(--gj-teal)" : "var(--gj-line-strong)", cursor: "pointer" }}>
    <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
  </span>
);

const BenefNotifs = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Notifications</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>2 non lues</div>
        </div>
        <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "9px 14px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Tout marquer comme lu</button>
      </div>
      <div style={{ ...bxCard, padding: "4px 18px", marginBottom: 20 }}>
        {B_NOTIFS.map((n, i, arr) => {
          const g = TONE_MAP[n.tone];
          return (
            <div key={n.id} style={{ display: "flex", gap: 13, padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0, alignItems: "flex-start", position: "relative" }}>
              <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: g[0], color: g[1], display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 20, height: 20 }}><use href={"#" + n.icon} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gj-ink)" }}>{n.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.45 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "var(--gj-grey-2)", marginTop: 4 }}>{n.time}</div>
              </div>
              {n.unread && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gj-teal)", flexShrink: 0, marginTop: 6 }} />}
            </div>
          );
        })}
      </div>
      <div style={bxCard}>
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>Préférences de notification</h2>
        <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginBottom: 8 }}>Choisis ce dont tu veux être informé·e.</div>
        {B_NOTIF_PREFS.map((p, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? 0 : "1px solid var(--gj-line)" }}>
            <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: "var(--gj-bg)", color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + p.icon} /></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{p.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{p.sub}</div>
            </div>
            <BxToggle on={p.on} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =====================================================================
// CONFIDENTIALITÉ & CONSENTEMENT (RGPD)
// =====================================================================
const BenefPrivacy = () => {
  const consents = [
    { label: "Partage de mon profil aux recruteurs", sub: "Les recruteurs vérifiés peuvent voir mon CV quand je postule", on: true, required: false },
    { label: "Recommandations personnalisées (Yaye)", sub: "Utiliser mes données pour me suggérer des opportunités", on: true, required: false },
    { label: "Statistiques anonymes du programme", sub: "Aider le CJS à mesurer l'insertion (données anonymisées)", on: true, required: false },
    { label: "Communications partenaires", sub: "Recevoir des offres de nos partenaires emploi", on: false, required: false },
  ];
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--gj-ink)" }}>Confidentialité & données</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Tu contrôles l'usage de tes données. Tu peux modifier ces choix à tout moment.</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--gj-teal-soft)", borderRadius: 12, padding: "14px 16px" }}>
          <svg className="gj-icon" style={{ width: 22, height: 22, color: "var(--gj-teal-deep)", flexShrink: 0 }}><use href="#i-shield" /></svg>
          <div style={{ fontSize: 12.5, color: "var(--gj-teal-deep)", fontWeight: 600, lineHeight: 1.45 }}>Tes données sont hébergées au Sénégal et protégées conformément à la loi n°2008-12 sur la protection des données personnelles.</div>
        </div>

        <div style={bxCard}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Mes consentements</h2>
          <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginBottom: 6 }}>Ces autorisations sont facultatives.</div>
          {consents.map((c, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 0", borderTop: i === 0 ? 0 : "1px solid var(--gj-line)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{c.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>{c.sub}</div>
              </div>
              <BxToggle on={c.on} />
            </div>
          ))}
        </div>

        <div style={bxCard}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>Mes droits</h2>
          {[
            { icon: "i-download", t: "Télécharger mes données", s: "Obtenir une copie de toutes mes informations" },
            { icon: "i-document", t: "Politique de confidentialité", s: "Lire comment nous traitons tes données" },
            { icon: "i-block", t: "Supprimer mon compte", s: "Effacer définitivement mon compte et mes données", danger: true },
          ].map((r, i, arr) => (
            <div key={i} onClick={() => {}} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 0", borderTop: i === 0 ? 0 : "1px solid var(--gj-line)", cursor: "pointer" }}>
              <span style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: r.danger ? "var(--gj-red-soft)" : "var(--gj-bg)", color: r.danger ? "var(--gj-red)" : "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href={"#" + r.icon} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: r.danger ? "var(--gj-red)" : "var(--gj-ink)" }}>{r.t}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{r.s}</div>
              </div>
              <svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-grey-2)", flexShrink: 0 }}><use href="#i-chevron-right" /></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// SHELL
// =====================================================================
const WebBenefExtra = ({ view = "messages" }) => {
  const [v, setV] = React.useState(view);
  const navMap = { messages: "messages", saved: "saved", notifs: "settings", privacy: "settings" };
  const titles = { messages: ["Messagerie", ""], saved: ["Mes sauvegardes", ""], notifs: ["Notifications & préférences", ""], privacy: ["Confidentialité", ""] };
  let content;
  if (v === "messages") content = <BenefMessages />;
  else if (v === "saved") content = <BenefSaved />;
  else if (v === "notifs") content = <BenefNotifs />;
  else if (v === "privacy") content = <BenefPrivacy />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden" }}>
      <BenefSidebar active={navMap[v]} onNavChange={(id) => { if (id === "messages") setV("messages"); else if (id === "saved") setV("saved"); }} />
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <BenefTopBar />
        {content}
      </div>
    </div>
  );
};

Object.assign(window, { BenefMessages, BenefSaved, BenefNotifs, BenefPrivacy, WebBenefExtra, bxCard, bxAvatar, BxToggle });
