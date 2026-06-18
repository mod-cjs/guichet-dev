/* eslint-disable */
// Lot 8 & 10 — écrans Paramètres / Entretiens / Profil entreprise (partagés agent + recruteur).
// Composants génériques de paramètres réutilisables, teintés par "accent".

const SettToggle = ({ on }) => (
  <span style={{ width: 42, height: 24, borderRadius: 999, flexShrink: 0, position: "relative", background: on ? "var(--gj-teal)" : "var(--gj-line-strong)", cursor: "pointer" }}>
    <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: ".15s" }} />
  </span>
);

const SettCard = ({ title, children }) => (
  <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18 }}>
    <h2 style={{ fontSize: 15, fontWeight: 900, color: "var(--gj-ink)", marginBottom: 14 }}>{title}</h2>
    {children}
  </div>
);

const SettRow = ({ icon, label, sub, on, last, control }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: last ? 0 : "1px solid var(--gj-line)" }}>
    {icon && <span style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "var(--gj-bg)", color: "var(--gj-grey)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 17, height: 17 }}><use href={"#" + icon} /></svg></span>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)" }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 1 }}>{sub}</div>}
    </div>
    {control !== undefined ? control : <SettToggle on={on} />}
  </div>
);

// Settings générique — accent = couleur d'action (var CSS)
const SettingsScreen = ({ who, role, org, initials, accent = "var(--gj-teal-deep)", goldAvatar = false, extra }) => {
  const chip = (txt) => <span style={{ fontSize: 12.5, fontWeight: 800, color: accent, background: "color-mix(in srgb, " + accent + " 12%, #fff)", padding: "6px 13px", borderRadius: 999 }}>{txt}</span>;
  return (
    <div style={{ padding: "22px 28px 40px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* profil */}
        <div style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 18, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0, background: goldAvatar ? "linear-gradient(135deg, var(--gj-yellow), #E0A93B)" : "linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))", color: goldAvatar ? "#11201C" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 24 }}>{initials}</span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: "var(--gj-ink)" }}>{who}</div>
            <div style={{ fontSize: 12.5, color: "var(--gj-grey)", marginTop: 2 }}>{role} · {org}</div>
          </div>
          <button style={{ background: "#fff", color: accent, border: "1.5px solid var(--gj-line)", padding: "10px 16px", borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-settings" /></svg>Modifier le profil</button>
        </div>

        {extra}

        <SettCard title="Notifications">
          <SettRow icon="i-bell" label="Notifications push" sub="Alertes sur ton appareil" on={true} />
          <SettRow icon="i-mail" label="E-mails récapitulatifs" sub="Résumé quotidien de l'activité" on={true} />
          <SettRow icon="i-chat" label="Nouveaux messages" sub="Être notifié·e à chaque message" on={true} />
          <SettRow icon="i-calendar" label="Rappels d'agenda" sub="30 min avant chaque rendez-vous" on={false} last />
        </SettCard>

        <SettCard title="Langue & affichage">
          <SettRow icon="i-globe" label="Langue de l'interface" control={chip("Français")} />
          <SettRow icon="i-eye" label="Contraste élevé" sub="Améliore la lisibilité" on={false} />
          <SettRow icon="i-resources" label="Densité d'affichage" control={chip("Confortable")} last />
        </SettCard>

        <SettCard title="Sécurité & compte">
          <SettRow icon="i-shield" label="Mot de passe" sub="Modifié il y a 3 mois" control={<button style={{ background: "#fff", color: accent, border: "1.5px solid var(--gj-line)", padding: "7px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Changer</button>} />
          <SettRow icon="i-check-circle" label="Double authentification" sub="Sécurise ta connexion par SMS" on={true} />
          <SettRow icon="i-target" label="Appareils connectés" sub="2 sessions actives" control={<button style={{ background: "#fff", color: accent, border: "1.5px solid var(--gj-line)", padding: "7px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Gérer</button>} last />
        </SettCard>

        <button style={{ alignSelf: "flex-start", background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-block" /></svg>Se déconnecter</button>
      </div>
    </div>
  );
};

Object.assign(window, { SettToggle, SettCard, SettRow, SettingsScreen });
