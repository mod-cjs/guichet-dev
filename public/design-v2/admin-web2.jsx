/* eslint-disable */
// Lot 11 — Administration · WEB (partie 2) : stats, contenu, audit, rôles & droits + shell.

// =====================================================================
// STATISTIQUES & RAPPORTS
// =====================================================================
const AdminStats = () => {
  const bubbles = ADM_CENTRES.map((c) => ({ x: c.x, y: c.y, r: 4 + Math.sqrt(c.insertions) }));
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Statistiques & rapports</h1>
            <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Indicateurs clés du réseau · année 2026.</div>
          </div>
          <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-download" /></svg>Exporter le rapport</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={adCard}>
            <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>Inscriptions cumulées</h2>
            <LineChart data={ADM_GROWTH} labels={["Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai"]} color="var(--gj-blue-ink)" />
          </div>
          <div style={adCard}>
            <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>Insertions par mois</h2>
            <BarChart data={ADM_MONTHLY} />
          </div>
          <div style={adCard}>
            <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>Comptes par rôle</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Donut data={ADM_USERS_SPLIT} size={150} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
                {ADM_USERS_SPLIT.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12.5, color: "var(--gj-grey)", fontWeight: 600 }}>{d.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{d.value.toLocaleString("fr-FR")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={adCard}>
            <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>Insertions par centre</h2>
            <div style={{ fontSize: 12, color: "var(--gj-grey)", marginBottom: 12 }}>Taille = insertions du mois.</div>
            <SenegalBubbleMap points={bubbles} height={250} />
          </div>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// CONTENU (médiathèque)
// =====================================================================
const AdminContent = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Contenu · médiathèque</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Guides, modèles et ressources accessibles aux jeunes.</div>
        </div>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Ajouter une ressource</button>
      </div>
      <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1.2fr 1fr 1fr 0.5fr", gap: 14, padding: "12px 18px", borderBottom: "1.5px solid var(--gj-line)", background: "var(--gj-bg)", fontSize: 10.5, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px" }}>
          <span>Ressource</span><span>Catégorie</span><span>Téléchargements</span><span>Statut</span><span></span>
        </div>
        {ADM_CONTENT.map((ct) => (
          <div key={ct.id} style={{ display: "grid", gridTemplateColumns: "2.4fr 1.2fr 1fr 1fr 0.5fr", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--gj-line)", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 32, height: 38, borderRadius: 5, background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 8.5, flexShrink: 0 }}>PDF</span>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{ct.title}</span>
            </div>
            <span style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>{ct.cat}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gj-ink)" }}>{ct.dl}</span>
            <span><span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: ct.statut === "Publié" ? "var(--gj-green-soft)" : "var(--gj-bg)", color: ct.statut === "Publié" ? "var(--gj-green-ink)" : "var(--gj-grey)" }}>{ct.statut}</span></span>
            <button style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", justifySelf: "end" }} aria-label="Modifier"><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-settings" /></svg></button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =====================================================================
// JOURNAL D'AUDIT
// =====================================================================
const AdminAudit = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Journal d'audit</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3, marginBottom: 18 }}>Traçabilité des actions sensibles sur la plateforme.</div>
      <div style={{ ...adCard, padding: "6px 18px" }}>
        {ADM_AUDIT.map((a, i, arr) => (
          <div key={i} style={{ display: "flex", gap: 13, padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0, alignItems: "flex-start" }}>
            {adAvatar(a.init, 36, a.tone)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: "var(--gj-ink)", lineHeight: 1.45 }}><b>{a.who}</b> {a.action}</div>
              <div style={{ fontSize: 11.5, color: "var(--gj-grey-2)", marginTop: 3 }}>{a.time}</div>
            </div>
          </div>
        ))}
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <button style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Charger plus d'événements</button>
        </div>
      </div>
    </div>
  </div>
);

// =====================================================================
// RÔLES & DROITS
// =====================================================================
const AdminRoles = () => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Rôles & droits</h1>
      <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3, marginBottom: 18 }}>Définis ce que chaque type de compte peut faire.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ADM_ROLES.map((r, i) => (
          <div key={i} style={{ ...adCard, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: i === 4 ? "linear-gradient(135deg, var(--gj-yellow), #E0A93B)" : "var(--gj-teal-soft)", color: i === 4 ? "#11201C" : "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href={"#" + (i === 4 ? "i-shield" : "i-users")} /></svg></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--gj-ink)" }}>{r.role}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gj-grey)", background: "var(--gj-bg)", padding: "2px 9px", borderRadius: 999 }}>{r.n} comptes</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {r.perms.map((p) => <span key={p} style={{ fontSize: 11, fontWeight: 700, color: "var(--gj-grey)", background: "var(--gj-bg)", border: "1px solid var(--gj-line)", padding: "3px 9px", borderRadius: 999 }}>{p}</span>)}
              </div>
            </div>
            <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", padding: "9px 15px", borderRadius: 9, fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>Modifier</button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// =====================================================================
// TYPES D'OPPORTUNITÉ — CRUD
// =====================================================================
const TypeFormModal = ({ onClose, edit }) => {
  const lbl = (t) => <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 7 }}>{t}</div>;
  const inp = { width: "100%", minHeight: 44, border: "1.5px solid var(--gj-line)", borderRadius: 10, padding: "0 13px", fontSize: 14, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" };
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--gj-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 28 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(520px, 100%)", maxHeight: "90%", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.4)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1.5px solid var(--gj-line)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 42, height: 42, borderRadius: 10, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 21, height: 21 }}><use href="#i-target" /></svg></span>
          <h2 style={{ flex: 1, fontSize: 16.5, fontWeight: 900 }}>{edit ? "Modifier le type" : "Nouveau type d'opportunité"}</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, border: 0, background: "transparent", cursor: "pointer", color: "var(--gj-grey)" }}><svg className="gj-icon" style={{ width: 18, height: 18 }}><use href="#i-close" /></svg></button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <div>{lbl("Nom du type")}<input defaultValue={edit ? edit.label : ""} placeholder="Ex. Mentorat" style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{lbl("Icône")}<input defaultValue={edit ? edit.icon : "i-target"} style={inp} /></div>
            <div>{lbl("Couleur")}<div style={{ display: "flex", gap: 7, paddingTop: 4 }}>{["teal", "blue", "yellow", "green"].map((c, i) => <span key={c} style={{ width: 32, height: 32, borderRadius: 8, cursor: "pointer", background: TYPE_TONE[c].ink, boxShadow: i === 0 ? "0 0 0 2px #fff, 0 0 0 4px var(--gj-ink)" : "none" }} />)}</div></div>
          </div>
          <div>{lbl("Modération")}<div style={{ display: "flex", gap: 8 }}>{["IA", "Humaine", "IA + humaine"].map((m, i) => <button key={m} style={{ flex: 1, minHeight: 42, borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", background: i === 2 ? "var(--gj-teal-soft)" : "#fff", border: i === 2 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", color: i === 2 ? "var(--gj-teal-deep)" : "var(--gj-grey)" }}>{m}</button>)}</div></div>
          <div>{lbl("Champs du formulaire")}<div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{(edit ? edit.fields : ["Lieu", "Clôture"]).map((f) => <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gj-bg)", border: "1.5px solid var(--gj-line)", color: "var(--gj-ink)", padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{f}<svg className="gj-icon" style={{ width: 11, height: 11, opacity: .5 }}><use href="#i-close" /></svg></span>)}<button style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: "1.5px dashed var(--gj-line-strong)", color: "var(--gj-teal-deep)", padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 12, height: 12 }}><use href="#i-plus" /></svg>Champ</button></div></div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1.5px solid var(--gj-line)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#fff", color: "var(--gj-grey)", border: "1.5px solid var(--gj-line)", padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={onClose} style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "11px 20px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-check" /></svg>{edit ? "Enregistrer" : "Créer le type"}</button>
        </div>
      </div>
    </div>
  );
};

const AdminTypes = ({ onAdd, onEdit }) => (
  <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--gj-ink)" }}>Types d'opportunité</h1>
          <div style={{ fontSize: 13, color: "var(--gj-grey)", marginTop: 3 }}>Gère les catégories publiables et leur mode de modération.</div>
        </div>
        <button onClick={onAdd} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gj-teal-deep)", color: "#fff", border: 0, padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-plus" /></svg>Nouveau type</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--gj-grey)", marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 14, height: 14, color: "var(--gj-teal-deep)" }}><use href="#i-info" /></svg>Ces types alimentent les formulaires de publication des recruteurs et des conseillers.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {OPP_TYPES.map((t) => {
          const tt = TYPE_TONE[t.tone];
          return (
            <div key={t.id} style={{ ...adCard, padding: 15, display: "flex", alignItems: "center", gap: 14, opacity: t.active ? 1 : 0.62 }}>
              <span style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0, background: tt.soft, color: tt.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 22, height: 22 }}><use href={"#" + t.icon} /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--gj-ink)" }}>{t.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "var(--gj-bg)", color: "var(--gj-grey)" }}>{t.count} actives</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)" }}><svg className="gj-icon" style={{ width: 11, height: 11 }}><use href="#i-shield" /></svg>{t.moderation}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 5 }}>Champs : {t.fields.join(" · ")}</div>
              </div>
              {/* toggle actif */}
              <span style={{ width: 42, height: 24, borderRadius: 999, flexShrink: 0, position: "relative", background: t.active ? "var(--gj-teal)" : "var(--gj-line-strong)", cursor: "pointer" }}>
                <span style={{ position: "absolute", top: 2, left: t.active ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: ".15s" }} />
              </span>
              <button onClick={onEdit} style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-grey)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-label="Modifier"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-settings" /></svg></button>
              <button style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gj-line)", background: "#fff", color: "var(--gj-red)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-label="Supprimer"><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-block" /></svg></button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// =====================================================================
// SHELL
// =====================================================================
const WebAdmin = ({ view = "home" }) => {
  const [v, setV] = React.useState(view);
  const [typeModal, setTypeModal] = React.useState(null); // null | "new" | OPP_TYPES[i]
  const nav = (x) => setV(x);
  const titles = {
    home: ["Tableau de bord", "Réseau national"], centres: ["Centres CJS", "Performance"], users: ["Utilisateurs", "Gestion des comptes"],
    stats: ["Statistiques & rapports", ""], moderation: ["Modération", "IA Yaye + validation humaine"], partners: ["Partenaires", "Validation"],
    content: ["Contenu", "Médiathèque"], audit: ["Journal d'audit", ""], roles: ["Rôles & droits", ""], types: ["Types d'opportunité", "Catégories publiables"],
  };
  let content;
  if (v === "home") content = <AdminDashboard nav={nav} />;
  else if (v === "centres") content = <AdminCentres />;
  else if (v === "users") content = <AdminUsers />;
  else if (v === "stats") content = <AdminStats />;
  else if (v === "moderation") content = <AdminModeration />;
  else if (v === "partners") content = <AdminPartners />;
  else if (v === "content") content = <AdminContent />;
  else if (v === "audit") content = <AdminAudit />;
  else if (v === "roles") content = <AdminRoles />;
  else if (v === "types") content = <AdminTypes onAdd={() => setTypeModal("new")} onEdit={() => setTypeModal(OPP_TYPES[0])} />;
  else content = <AdminDashboard nav={nav} />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "256px 1fr", height: "100%", background: "var(--gj-bg)", overflow: "hidden", position: "relative" }}>
      <AdminSidebar active={v} onNavChange={nav} />
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AdminTopBar title={titles[v] ? titles[v][0] : ""} sub={titles[v] ? titles[v][1] : ""} />
        {content}
      </div>
      {typeModal && <TypeFormModal edit={typeModal === "new" ? null : typeModal} onClose={() => setTypeModal(null)} />}
    </div>
  );
};

Object.assign(window, { AdminStats, AdminContent, AdminAudit, AdminRoles, AdminTypes, TypeFormModal, WebAdmin });
