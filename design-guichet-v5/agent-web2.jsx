/* eslint-disable */
// Lot 8 — Espace Conseiller · WEB (suite) : check-in, publications, messagerie, agenda
// + le shell WebAgent qui orchestre la navigation.

// =====================================================================
// CHECK-IN (scan QR + liste de présence)
// =====================================================================
const AgentCheckin = () => {
  const present = A_ATTENDEES.filter((a) => a.in).length;
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Check-in · Atelier CV & lettre de motivation</h1>
        <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Jeudi 8 juin · 14h00 – 17h00 · Salle A · scanne la carte CJS de chaque participant.</div>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, marginTop: 18, alignItems: "start" }}>
          {/* scanner */}
          <div style={{ ...aCard, position: "sticky", top: 0 }}>
            <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 14, overflow: "hidden", background: "#162c5e" }}>
              {/* simulated camera */}
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 40%, #0E1C3C, #162c5e)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "#fff", padding: 12, borderRadius: 14, transform: "rotate(-3deg)", boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
                  <QRGlyph size={150} plain />
                </div>
              </div>
              {/* reticle */}
              <div style={{ position: "absolute", inset: "16%", border: "3px solid rgba(255,255,255,.85)", borderRadius: 18, boxShadow: "0 0 0 9999px rgba(0,0,0,.28)" }} />
              {["tl","tr","bl","br"].map((c) => (
                <span key={c} style={{ position: "absolute", width: 30, height: 30, border: "4px solid var(--gj-yellow)",
                  borderRadius: c==="tl"?"10px 0 0 0":c==="tr"?"0 10px 0 0":c==="bl"?"0 0 0 10px":"0 0 10px 0",
                  borderTop: c[0]==="t"?undefined:"none", borderBottom: c[0]==="b"?undefined:"none", borderLeft: c[1]==="l"?undefined:"none", borderRight: c[1]==="r"?undefined:"none",
                  top: c[0]==="t"?"15%":undefined, bottom: c[0]==="b"?"15%":undefined, left: c[1]==="l"?"15%":undefined, right: c[1]==="r"?"15%":undefined }} />
              ))}
              <div style={{ position: "absolute", left: "16%", right: "16%", top: "50%", height: 2.5, background: "var(--gj-yellow)", boxShadow: "0 0 12px var(--gj-yellow)" }} />
              <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 12.5, fontWeight: 700 }}>Place le QR dans le cadre</div>
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--gj-green-soft)", borderRadius: 10, padding: "11px 13px" }}>
                <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-green-ink)" }}><use href="#i-check-circle" /></svg>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gj-green-ink)" }}><b>Ndèye Gueye</b> pointée à 14:05</div>
              </div>
              <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", minHeight: 44, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-search" /></svg>Rechercher manuellement</button>
            </div>
          </div>

          {/* liste de présence */}
          <div style={aCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 900 }}>Liste de présence</h2>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)" }}>{present} / {A_ATTENDEES.length} présents</span>
            </div>
            <div style={{ height: 7, background: "var(--gj-bg)", borderRadius: 4, overflow: "hidden", margin: "10px 0 6px" }}>
              <div style={{ height: "100%", width: `${(present / A_ATTENDEES.length) * 100}%`, background: "var(--gj-green)", borderRadius: 4 }} />
            </div>
            <div>
              {A_ATTENDEES.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--gj-line)" }}>
                  {aAvatar(a.init, 38, false)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{a.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>{a.commune}{a.in ? ` · pointé à ${a.at}` : ""}</div>
                  </div>
                  {a.in
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800, color: "var(--gj-green-ink)", background: "var(--gj-green-soft)", padding: "5px 12px", borderRadius: 999 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg>Présent</span>
                    : <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "6px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Pointer</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// PUBLICATIONS (liste + bouton nouveau → form)
// =====================================================================
const AgentPublish = ({ onNew }) => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Publications</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Opportunités, événements et ateliers de ton centre.</div>
        </div>
        <button onClick={onNew} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Nouvelle publication</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {A_PUBLICATIONS.map((p) => {
          const st = PUB_STATUS[p.status];
          const tone = { teal: "var(--gj-teal-deep)", blue: "var(--gj-blue-ink)", yellow: "var(--gj-yellow-ink)", green: "var(--gj-green-ink)", emploi: "var(--cat-emploi-ink)", stage: "var(--cat-stage-ink)", formation: "var(--cat-formation-ink)", financement: "var(--cat-financement-ink)", volontariat: "var(--cat-volontariat-ink)", evenement: "var(--cat-evenement-ink)" }[p.tone];
          const toneSoft = { teal: "var(--gj-teal-soft)", blue: "var(--gj-blue-soft)", yellow: "var(--gj-yellow-soft)", green: "var(--gj-green-soft)", emploi: "var(--cat-emploi-soft)", stage: "var(--cat-stage-soft)", formation: "var(--cat-formation-soft)", financement: "var(--cat-financement-soft)", volontariat: "var(--cat-volontariat-soft)", evenement: "var(--cat-evenement-soft)" }[p.tone];
          return (
            <div key={p.id} style={{ ...aCard, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tone, background: toneSoft, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", letterSpacing: ".3px", flexShrink: 0 }}>{p.kind}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>{p.date}{p.cap ? ` · ${p.appli}/${p.cap} places` : p.appli ? ` · ${p.appli} candidatures` : ""}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 11px", borderRadius: 999, background: st.soft, color: st.ink }}>{p.status}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Modifier"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-settings" /></svg></button>
                <button style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Voir"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-eye" /></svg></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const AgentPublishForm = ({ onBack }) => {
  const lbl = (t, req) => <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 7 }}>{t}{req && <span style={{ color: "var(--gj-red)" }}> *</span>}</div>;
  const inp = { width: "100%", minHeight: 46, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 14px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" };
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", marginBottom: 14, padding: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Publications</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)", marginBottom: 16 }}>Nouvelle publication</h1>
        <div style={{ ...aCard, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            {lbl("Type de publication", true)}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Opportunité (emploi/stage)", "Événement", "Atelier", "Formation"].map((t, i) => (
                <button key={t} style={{ padding: "10px 16px", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 0 ? "var(--gj-teal-soft)" : "#fff", border: i === 0 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: i === 0 ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{t}</button>
              ))}
            </div>
          </div>
          <div>{lbl("Titre", true)}<input defaultValue="Animateur communautaire · CDD 6 mois" style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{lbl("Domaine", true)}<input defaultValue="Animation / Social" style={inp} /></div>
            <div>{lbl("Lieu", true)}<input defaultValue="Tambacounda" style={inp} /></div>
            <div>{lbl("Rémunération")}<input defaultValue="120 000 FCFA / mois" style={inp} /></div>
            <div>{lbl("Date de clôture", true)}<input defaultValue="07/06/2026" style={inp} /></div>
          </div>
          <div>{lbl("Description", true)}<textarea defaultValue="Le CJS Tambacounda recrute un animateur communautaire pour accompagner les jeunes dans leurs démarches d'insertion…" rows={4} style={{ ...inp, minHeight: "auto", padding: "12px 14px", resize: "none", lineHeight: 1.5 }} /></div>
          <div>
            {lbl("Visibilité")}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, minHeight: 44, borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: "var(--gj-teal-soft)", border: "1.5px solid var(--gj-teal-deep)", color: "var(--gj-teal-deep)" }}>Tous les jeunes du Sénégal</button>
              <button style={{ flex: 1, minHeight: 44, borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: "#fff", border: "1.5px solid var(--gj-line)", color: "var(--gj-grey)" }}>Mon centre uniquement</button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onBack} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "12px 20px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Enregistrer en brouillon</button>
          <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "12px 24px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>Publier</button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// MESSAGERIE (inbox + thread)
// =====================================================================
const AgentMessages = () => {
  const [active, setActive] = React.useState(A_THREADS[0].id);
  const t = A_THREADS.find((x) => x.id === active);
  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr", overflow: "hidden" }}>
      {/* inbox */}
      <div style={{ borderRight: "1px solid var(--gj-line)", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--gj-line)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 900 }}>Messagerie</h2>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 2 }}>2 non lus</div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {A_THREADS.map((th) => {
            const on = th.id === active;
            return (
              <div key={th.id} onClick={() => setActive(th.id)} style={{ display: "flex", gap: 11, padding: "13px 18px", borderBottom: "1px solid var(--gj-line)", cursor: "pointer", background: on ? "var(--gj-teal-soft)" : "transparent" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {aAvatar(th.init, 42)}
                  {th.online && <span style={{ position: "absolute", right: 0, bottom: 0, width: 11, height: 11, borderRadius: "50%", background: "var(--gj-green)", border: "2px solid #fff" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{th.who}</span>
                    <span style={{ fontSize: 11, color: "var(--gj-grey-2)", flexShrink: 0 }}>{th.time}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: th.unread ? "var(--gj-ink)" : "var(--gj-grey)", fontWeight: th.unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.last}</span>
                    {th.unread > 0 && <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999, background: "var(--gj-teal-deep)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{th.unread}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* thread */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--gj-bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 20px", borderBottom: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          {aAvatar(t.init, 40)}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{t.who}</div>
            <div style={{ fontSize: 11.5, color: t.online ? "var(--gj-green-ink)" : "var(--gj-grey)" }}>{t.online ? "● en ligne" : "hors ligne"}</div>
          </div>
          <button style={{ width: 38, height: 38, borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-teal-deep)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Profil"><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-user" /></svg></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "var(--gj-grey-2)", fontWeight: 700 }}>Aujourd'hui</div>
          {t.msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "68%", background: m.me ? "var(--gj-teal-deep)" : "#fff", color: m.me ? "#fff" : "var(--gj-ink)", border: m.me ? 0 : "1px solid var(--gj-line)", borderRadius: m.me ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.45 }}>
                {m.t}
                <div style={{ fontSize: 11, opacity: .6, marginTop: 4, textAlign: "right" }}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderTop: "1px solid var(--gj-line)", background: "#fff", flexShrink: 0 }}>
          <button style={{ width: 40, height: 40, borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Joindre"><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-plus" /></svg></button>
          <input placeholder="Écris un message…" style={{ flex: 1, minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 999, padding: "0 16px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" }} />
          <button style={{ width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Envoyer"><svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-arrow-right" /></svg></button>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// AGENDA / RDV
// =====================================================================
const AgentAgenda = () => {
  const statusTone = { "confirmé": ["var(--gj-green-soft)", "var(--gj-green-ink)"], "à confirmer": ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"], "atelier": ["var(--gj-yellow-soft)", "var(--gj-yellow-ink)"] };
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Agenda · Jeudi 8 juin</h1>
            <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>5 rendez-vous · 4 conseils 1-à-1, 1 atelier collectif.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button style={{ width: 38, height: 38, borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-chevron-left" /></svg></button>
            <span style={{ fontSize: 14, fontWeight: 800, minWidth: 120, textAlign: "center" }}>Aujourd'hui</span>
            <button style={{ width: 38, height: 38, borderRadius: 9, border: "1.5px solid var(--gj-line)", background: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--gj-ink)" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href="#i-chevron-right" /></svg></button>
          </div>
        </div>
        <div style={{ ...aCard, padding: 0, overflow: "hidden" }}>
          {A_RDV.map((r, i) => {
            const tone = statusTone[r.status] || statusTone["confirmé"];
            const atelier = r.status === "atelier";
            return (
              <div key={r.id} style={{ display: "flex", gap: 16, padding: "16px 18px", borderBottom: i < A_RDV.length - 1 ? "1px solid var(--gj-line)" : 0, alignItems: "center", background: atelier ? "var(--gj-yellow-soft)" : "#fff" }}>
                <div style={{ width: 58, flexShrink: 0, textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "var(--gj-ink)" }}>{r.time}</div>
                  <div style={{ fontSize: 11, color: "var(--gj-grey-2)" }}>{r.dur}</div>
                </div>
                <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: atelier ? "var(--gj-yellow-deep)" : "var(--gj-teal)", flexShrink: 0 }} />
                {aAvatar(r.init, 40, atelier)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gj-ink)" }}>{r.who}</div>
                  <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 1 }}>{r.type} · {r.topic}</div>
                </div>
                {aMeta(r.mode === "Téléphone" ? "i-phone" : "i-pin", r.mode)}
                <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 11px", borderRadius: 999, background: tone[0], color: tone[1], whiteSpace: "nowrap" }}>{atelier ? "Atelier" : r.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// SHELL
// =====================================================================
const WebAgent = ({ view = "home" }) => {
  const [v, setV] = React.useState(view);
  const [modal, setModal] = React.useState(false);
  const [checkout, setCheckout] = React.useState(false);
  const nav = (x) => setV(x);
  const titles = {
    home: ["Tableau de bord", "CJS Tambacounda"], resa: ["Réservations", "À valider"],
    benef: ["Bénéficiaires", "Annuaire du centre"], fiche: ["Bénéficiaires", "Fiche détaillée"],
    checkin: ["Check-in présence", "Atelier en cours"], library: ["Bibliothèque", "Livres du centre · prêts & retours"], publish: ["Publications", "Gérer"],
    publishForm: ["Publications", "Nouvelle"], messages: ["Messagerie", ""], rdv: ["Agenda & RDV", ""],
    settings: ["Paramètres", ""],
  };
  let content;
  if (v === "home") content = <AgentDashboard nav={nav} />;
  else if (v === "resa") content = <AgentResa onDecision={() => setModal(true)} />;
  else if (v === "benef") content = <AgentBenefList onOpen={() => setV("fiche")} />;
  else if (v === "fiche") content = <AgentBenefDetail onBack={() => setV("benef")} nav={nav} />;
  else if (v === "checkin") content = <AgentCheckin />;
  else if (v === "library") content = <AgentLibrary onCheckout={() => setCheckout(true)} />;
  else if (v === "publish") content = <AgentPublish onNew={() => setV("publishForm")} />;
  else if (v === "publishForm") content = <AgentPublishForm onBack={() => setV("publish")} />;
  else if (v === "messages") content = <AgentMessages />;
  else if (v === "rdv") content = <AgentAgenda />;
  else if (v === "settings") content = <SettingsScreen who="Cheikh Ndiaye" role="Conseiller emploi" org="CJS Tambacounda" initials="CN" accent="var(--gj-teal-deep)" />;
  else content = <AgentDashboard nav={nav} />;
  const navKey = (v === "fiche") ? "benef" : (v === "publishForm" ? "publish" : v);
  const noPad = v === "messages";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden", position: "relative" }}>
      <AgentSidebar active={navKey} onNavChange={nav} />
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AgentTopBar title={titles[v] ? titles[v][0] : ""} sub={titles[v] ? titles[v][1] : ""} />
        {content}
      </div>
      {modal && <ResaDecisionModal onClose={() => setModal(false)} />}
      {checkout && <LibCheckoutModal onClose={() => setCheckout(false)} />}
    </div>
  );
};

Object.assign(window, { AgentCheckin, AgentPublish, AgentPublishForm, AgentMessages, AgentAgenda, WebAgent });
