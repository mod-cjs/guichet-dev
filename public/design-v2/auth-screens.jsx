/* eslint-disable */
// Lot 12 — Authentification & consentement. Écrans autonomes (web & mobile via largeur).
// AuthLogin · AuthForgot · ConsentGate. Centrés, fond doux.

const authShell = (children, w) => ({
  width: "100%", height: "100%", background: "var(--gj-bg)", overflow: "auto",
  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0",
});

const authCardBase = {
  background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 18,
  boxShadow: "var(--gj-shadow-md)", padding: 28, width: "100%",
};

const authLogo = (h = 30) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 6 }}>
    <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: h, width: "auto" }} />
  </div>
);

const inpStyle = { width: "100%", minHeight: 50, border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: "0 14px", fontSize: 15, fontFamily: "inherit", color: "var(--gj-ink)", background: "var(--gj-bg)", outline: "none" };
const fieldLabel = (t) => <label style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)", marginBottom: 7 }}>{t}</label>;

// =====================================================================
// CONNEXION
// =====================================================================
const AuthLogin = ({ onForgot, compact }) => (
  <div style={authShell()}>
    <div style={{ width: "100%", maxWidth: compact ? "100%" : 420, padding: compact ? "26px 16px" : "48px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      {authLogo(compact ? 30 : 36)}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: compact ? 22 : 26, fontWeight: 900, color: "var(--gj-ink)" }}>Bon retour 👋</h1>
        <div style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 4 }}>Connecte-toi à ton espace Guichet Jeunesse.</div>
      </div>

      <div style={{ ...authCardBase, padding: compact ? 20 : 26, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          {fieldLabel("Téléphone ou e-mail")}
          <div style={{ display: "flex", alignItems: "center", gap: 9, ...inpStyle, padding: "0 14px" }}>
            <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-phone" /></svg>
            <input defaultValue="+221 77 123 45 67" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 15, fontFamily: "inherit", color: "var(--gj-ink)" }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            {fieldLabel("Mot de passe")}
            <button onClick={onForgot} style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, marginBottom: 7 }}>Oublié ?</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, ...inpStyle, padding: "0 14px" }}>
            <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-shield" /></svg>
            <input type="password" defaultValue="motdepasse" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 15, fontFamily: "inherit", color: "var(--gj-ink)", letterSpacing: "2px" }} />
            <svg className="gj-icon" style={{ width: 18, height: 18, color: "var(--gj-grey)", cursor: "pointer" }}><use href="#i-eye" /></svg>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 13, color: "var(--gj-ink)", fontWeight: 600 }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><svg className="gj-icon" style={{ width: 13, height: 13 }}><use href="#i-check" /></svg></span>
          Rester connecté·e
        </label>
        <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 52, borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Se connecter</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: "var(--gj-line)" }} />
        <span style={{ fontSize: 11.5, color: "var(--gj-grey)", fontWeight: 700 }}>ou</span>
        <span style={{ flex: 1, height: 1, background: "var(--gj-line)" }} />
      </div>
      <button style={{ background: "#fff", color: "var(--gj-ink)", border: "1.5px solid var(--gj-line)", minHeight: 50, borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#25D366", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg className="gj-icon" style={{ width: 14, height: 14 }}><use href="#i-chat" /></svg></span>
        Continuer avec WhatsApp
      </button>
      <div style={{ textAlign: "center", fontSize: 13, color: "var(--gj-grey)" }}>
        Pas encore de compte ? <b style={{ color: "var(--gj-teal-deep)", cursor: "pointer" }}>Créer un compte</b>
      </div>
    </div>
  </div>
);

// =====================================================================
// MOT DE PASSE OUBLIÉ (OTP)
// =====================================================================
const AuthForgot = ({ onBack, compact }) => (
  <div style={authShell()}>
    <div style={{ width: "100%", maxWidth: compact ? "100%" : 420, padding: compact ? "26px 16px" : "48px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gj-teal-deep)", padding: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href="#i-chevron-left" /></svg>Retour à la connexion</button>
      {authLogo(compact ? 28 : 34)}
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: compact ? 21 : 25, fontWeight: 900, color: "var(--gj-ink)" }}>Mot de passe oublié ?</h1>
        <div style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 4, lineHeight: 1.5 }}>Pas de panique. On t'envoie un code par SMS pour réinitialiser.</div>
      </div>
      <div style={{ ...authCardBase, padding: compact ? 20 : 26, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          {fieldLabel("Numéro de téléphone")}
          <div style={{ display: "flex", alignItems: "center", gap: 9, ...inpStyle, padding: "0 14px" }}>
            <svg className="gj-icon" style={{ width: 17, height: 17, color: "var(--gj-grey)" }}><use href="#i-phone" /></svg>
            <input defaultValue="+221 77 123 45 67" style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 15, fontFamily: "inherit", color: "var(--gj-ink)" }} />
          </div>
        </div>
        <div>
          {fieldLabel("Code reçu par SMS")}
          <div style={{ display: "flex", gap: 9, justifyContent: "space-between" }}>
            {["5", "8", "2", "—", "—", "—"].map((d, i) => (
              <div key={i} style={{ flex: 1, aspectRatio: "1 / 1.1", maxWidth: 52, border: i < 3 ? "1.5px solid var(--gj-teal-deep)" : "1.5px solid var(--gj-line)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: i < 3 ? "var(--gj-ink)" : "var(--gj-grey-2)", background: i < 3 ? "var(--gj-teal-soft)" : "var(--gj-bg)" }}>{d}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--gj-grey)", marginTop: 9, textAlign: "center" }}>Code renvoyé dans <b style={{ color: "var(--gj-ink)" }}>0:42</b></div>
        </div>
        <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 52, borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Vérifier le code</button>
      </div>
    </div>
  </div>
);

// =====================================================================
// CONSENTEMENT À L'INSCRIPTION (RGPD gate)
// =====================================================================
const ConsentGate = ({ compact }) => {
  const items = [
    { label: "J'accepte les conditions d'utilisation", sub: "Règles d'usage du Guichet Jeunesse", on: true, required: true },
    { label: "J'accepte la politique de confidentialité", sub: "Traitement de mes données (loi n°2008-12)", on: true, required: true },
    { label: "J'autorise des recommandations personnalisées", sub: "Yaye utilise mon profil pour me suggérer des opportunités", on: true, required: false },
    { label: "Je veux recevoir des offres des partenaires", sub: "Facultatif — désactivable à tout moment", on: false, required: false },
  ];
  return (
    <div style={authShell()}>
      <div style={{ width: "100%", maxWidth: compact ? "100%" : 460, padding: compact ? "24px 16px" : "44px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        {authLogo(compact ? 28 : 34)}
        <div style={{ textAlign: "center" }}>
          <span style={{ width: 56, height: 56, borderRadius: 16, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><svg className="gj-icon" style={{ width: 28, height: 28 }}><use href="#i-shield" /></svg></span>
          <h1 style={{ fontSize: compact ? 21 : 24, fontWeight: 900, color: "var(--gj-ink)" }}>Tes données, tes choix</h1>
          <div style={{ fontSize: 13.5, color: "var(--gj-grey)", marginTop: 4, lineHeight: 1.5 }}>Avant de commencer, dis-nous ce que tu acceptes. Tu pourras tout modifier plus tard.</div>
        </div>
        <div style={{ ...authCardBase, padding: compact ? 16 : 20 }}>
          {items.map((c, i, arr) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--gj-line)" : 0, alignItems: "flex-start" }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1, background: c.on ? "var(--gj-teal-deep)" : "#fff", border: c.on ? 0 : "1.5px solid var(--gj-line-strong)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}>{c.on && <svg className="gj-icon" style={{ width: 15, height: 15 }}><use href="#i-check" /></svg>}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gj-ink)" }}>{c.label}{c.required && <span style={{ color: "var(--gj-red)", marginLeft: 4 }}>*</span>}</div>
                <div style={{ fontSize: 11.5, color: "var(--gj-grey)", marginTop: 2, lineHeight: 1.4 }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--gj-grey-2)", textAlign: "center", lineHeight: 1.5 }}>Les éléments marqués <span style={{ color: "var(--gj-red)" }}>*</span> sont obligatoires pour créer ton compte.</div>
        <button style={{ background: "var(--gj-teal-deep)", color: "#fff", border: 0, minHeight: 52, borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>Accepter et continuer</button>
        <button style={{ background: "transparent", color: "var(--gj-grey)", border: 0, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Lire la politique complète</button>
      </div>
    </div>
  );
};

Object.assign(window, { AuthLogin, AuthForgot, ConsentGate });
