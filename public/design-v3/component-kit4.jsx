/* eslint-disable */
// Lot 14 (états) — chaque composant interactif dans toutes ses versions/états.
// Dépend de component-kit.jsx (Block, Demo, btn, swInk) + spinner CSS injecté ici.

(function () {
  if (document.getElementById("gj-kit-states-style")) return;
  const s = document.createElement("style");
  s.id = "gj-kit-states-style";
  s.textContent = "@keyframes gjspin{to{transform:rotate(360deg)}}";
  document.head.appendChild(s);
})();

const StateTag = ({ children }) => (
  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--gj-grey)", textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 7 }}>{children}</span>
);
const StateCell = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
    <StateTag>{label}</StateTag>
    {children}
  </div>
);
const Spinner = ({ c = "#fff" }) => (
  <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid ${c}`, borderTopColor: "transparent", display: "inline-block", animation: "gjspin .7s linear infinite" }} />
);

// ===== ÉTATS DES BOUTONS =====
const ButtonStates = () => {
  const base = { padding: "11px 18px", borderRadius: 9, fontWeight: 800, fontSize: 13.5, fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: 0 };
  const row = { display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" };
  return (
    <Block title="Boutons — tous les états" sub="Primaire & secondaire : repos · survol · actif · focus · désactivé · chargement">
      <StateTag>Bouton primaire</StateTag>
      <div style={row}>
        <StateCell label="Repos"><button style={{ ...base, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer" }}>Action</button></StateCell>
        <StateCell label="Survol"><button style={{ ...base, background: "var(--gj-ink-teal)", color: "#fff", cursor: "pointer", boxShadow: "0 6px 16px rgba(7,77,57,.3)" }}>Action</button></StateCell>
        <StateCell label="Actif/pressé"><button style={{ ...base, background: "var(--gj-ink-teal)", color: "#fff", cursor: "pointer", transform: "translateY(1px)", filter: "brightness(.92)" }}>Action</button></StateCell>
        <StateCell label="Focus clavier"><button style={{ ...base, background: "var(--gj-teal-deep)", color: "#fff", cursor: "pointer", outline: "3px solid var(--gj-blue)", outlineOffset: 2 }}>Action</button></StateCell>
        <StateCell label="Désactivé"><button disabled style={{ ...base, background: "var(--gj-line)", color: "var(--gj-grey-2)", cursor: "not-allowed" }}>Action</button></StateCell>
        <StateCell label="Chargement"><button style={{ ...base, background: "var(--gj-teal-deep)", color: "#fff", cursor: "wait", opacity: .9 }}><Spinner />Envoi…</button></StateCell>
      </div>
      <StateTag>Bouton secondaire (bordé)</StateTag>
      <div style={row}>
        <StateCell label="Repos"><button style={{ ...base, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", cursor: "pointer" }}>Action</button></StateCell>
        <StateCell label="Survol"><button style={{ ...base, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-teal-deep)", cursor: "pointer" }}>Action</button></StateCell>
        <StateCell label="Désactivé"><button disabled style={{ ...base, background: "#fff", color: "var(--gj-grey-2)", border: "1.5px solid var(--gj-line)", cursor: "not-allowed", opacity: .7 }}>Action</button></StateCell>
        <StateCell label="Chargement"><button style={{ ...base, background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line)", cursor: "wait" }}><Spinner c="var(--gj-teal-deep)" />Chargement</button></StateCell>
      </div>
      <StateTag>Bouton danger & jaune</StateTag>
      <div style={row}>
        <StateCell label="Danger repos"><button style={{ ...base, background: "#fff", color: "var(--gj-red)", border: "1.5px solid var(--gj-line)", cursor: "pointer" }}>Supprimer</button></StateCell>
        <StateCell label="Danger survol"><button style={{ ...base, background: "var(--gj-red)", color: "#fff", cursor: "pointer" }}>Supprimer</button></StateCell>
        <StateCell label="Jaune repos"><button style={{ ...base, background: "var(--gj-yellow)", color: "var(--gj-ink)", cursor: "pointer" }}>Mettre en avant</button></StateCell>
        <StateCell label="Jaune survol"><button style={{ ...base, background: "var(--gj-yellow-deep)", color: "var(--gj-ink)", cursor: "pointer" }}>Mettre en avant</button></StateCell>
      </div>
    </Block>
  );
};

// ===== ÉTATS DES CHAMPS =====
const FieldStates = () => {
  const wrap = { display: "flex", flexDirection: "column", gap: 6, minWidth: 200, flex: "1 1 200px" };
  const lab = { fontSize: 11.5, fontWeight: 800, color: swInk };
  const base = { minHeight: 46, borderRadius: 9, padding: "0 13px", fontSize: 14, fontFamily: "inherit", color: swInk, background: "var(--gj-bg)", outline: "none", display: "flex", alignItems: "center" };
  return (
    <Block title="Champs de saisie — tous les états" sub="Repos · focus · rempli · erreur · succès · désactivé">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <label style={wrap}><span style={lab}>Repos</span><div style={{ ...base, border: "1.5px solid var(--gj-line)", color: "var(--gj-grey-2)" }}>Adresse e-mail</div></label>
        <label style={wrap}><span style={lab}>Focus</span><div style={{ ...base, border: "1.5px solid var(--gj-teal-deep)", background: "#fff", boxShadow: "0 0 0 3px var(--gj-teal-soft)" }}>awa<span style={{ width: 1.5, height: 18, background: "var(--gj-teal-deep)", marginLeft: 1, display: "inline-block" }} /></div></label>
        <label style={wrap}><span style={lab}>Rempli</span><div style={{ ...base, border: "1.5px solid var(--gj-line)", background: "#fff" }}>awa.diop@gmail.com</div></label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <label style={wrap}><span style={lab}>Erreur</span><div style={{ ...base, border: "1.5px solid var(--gj-red)", background: "#fff" }}>awa.diop@</div><span style={{ fontSize: 11.5, color: "var(--gj-red-ink)", display: "inline-flex", alignItems: "center", gap: 5 }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-alert" /></svg>Adresse e-mail invalide</span></label>
        <label style={wrap}><span style={lab}>Succès / vérifié</span><div style={{ ...base, border: "1.5px solid var(--gj-green)", background: "#fff", justifyContent: "space-between" }}>+221 77 123 45 67<svg className="gj-icon" style={{ width: 16, height: 16, color: "var(--gj-green-ink)" }}><use href="#i-check-circle" /></svg></div></label>
        <label style={wrap}><span style={lab}>Désactivé</span><div style={{ ...base, border: "1.5px solid var(--gj-line)", background: "var(--gj-line)", color: "var(--gj-grey-2)", opacity: .7, cursor: "not-allowed" }}>Non modifiable</div></label>
      </div>
    </Block>
  );
};

// ===== ÉTATS DES SÉLECTEURS (cases, radios, interrupteur) =====
const ControlStates = () => {
  const chk = (on, dis) => (
    <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: on ? 0 : "1.5px solid var(--gj-line-strong)", background: dis ? "var(--gj-line)" : on ? "var(--gj-teal-deep)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", opacity: dis ? .6 : 1 }}>{on && <svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg>}</span>
  );
  const radio = (on, dis) => (
    <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `1.5px solid ${dis ? "var(--gj-line)" : on ? "var(--gj-teal-deep)" : "var(--gj-line-strong)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: dis ? .6 : 1 }}>{on && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gj-teal-deep)" }} />}</span>
  );
  const sw = (on, dis) => (
    <span style={{ width: 46, height: 27, borderRadius: 999, background: dis ? "var(--gj-line)" : on ? "var(--gj-teal)" : "var(--gj-line-strong)", position: "relative", display: "inline-block", opacity: dis ? .6 : 1 }}><span style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} /></span>
  );
  return (
    <Block title="Cases, radios & interrupteurs — états" sub="Décoché · coché · désactivé">
      <Demo label="Case à cocher">
        <StateCell label="Décochée">{chk(false)}</StateCell>
        <StateCell label="Cochée">{chk(true)}</StateCell>
        <StateCell label="Désactivée">{chk(true, true)}</StateCell>
      </Demo>
      <Demo label="Bouton radio">
        <StateCell label="Non sél.">{radio(false)}</StateCell>
        <StateCell label="Sélectionné">{radio(true)}</StateCell>
        <StateCell label="Désactivé">{radio(true, true)}</StateCell>
      </Demo>
      <Demo label="Interrupteur">
        <StateCell label="Off">{sw(false)}</StateCell>
        <StateCell label="On">{sw(true)}</StateCell>
        <StateCell label="Désactivé">{sw(true, true)}</StateCell>
      </Demo>
    </Block>
  );
};

Object.assign(window, { ButtonStates, FieldStates, ControlStates });
