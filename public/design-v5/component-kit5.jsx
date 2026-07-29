/* eslint-disable */
// Lot 14 — Règles issues du retour design V3 (couleur d'action unique, code
// couleur par catégorie, urgence, imagerie). Sert de référence normative.

const V3Card = ({ title, sub, children }) => (
  <section style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 14, padding: 20 }}>
    <h2 style={{ fontSize: 17, fontWeight: 900, color: "var(--gj-ink)", margin: 0 }}>{title}</h2>
    {sub && <p style={{ fontSize: 13, color: "var(--gj-grey)", lineHeight: 1.55, margin: "6px 0 16px" }}>{sub}</p>}
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
  </section>
);
const V3Rule = ({ ok, children }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: ok ? "var(--gj-green-soft)" : "var(--gj-red-soft)", borderRadius: 10, padding: "11px 13px" }}>
    <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: ok ? "var(--gj-green)" : "var(--gj-red)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg className="gj-icon" style={{ width: 11, height: 11 }}><use href={"#" + (ok ? "i-check" : "i-close")} /></svg>
    </span>
    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: ok ? "var(--gj-green-ink)" : "var(--gj-red-ink)" }}>{children}</span>
  </div>
);
const V3Swatch = ({ name, token, ink }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 118 }}>
    <span style={{ height: 52, borderRadius: 10, background: "var(--" + token + ")", border: "1px solid rgba(0,0,0,.06)" }} />
    <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-ink)" }}>{name}</span>
    <code style={{ fontSize: 11, color: "var(--gj-grey)", fontFamily: "ui-monospace,monospace" }}>--{token}</code>
    {ink && <span style={{ fontSize: 11, fontWeight: 800, background: "var(--" + token + "-soft)", color: "var(--" + token + "-ink)", padding: "3px 8px", borderRadius: 999, alignSelf: "flex-start", textTransform: "uppercase", letterSpacing: ".4px" }}>{name}</span>}
  </div>
);

const DesignV3Rules = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <V3Card title="1 · Une seule couleur d'action" sub="Le magenta --gj-action est réservé aux CTA de conversion : Postuler, Envoyer ma candidature, S'inscrire, Soumettre, Déposer. Le teal reste la couleur de marque, de navigation et de structure — jamais un bouton de conversion.">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="gj-cta">Postuler maintenant</button>
        <button style={{ background: "#fff", color: "var(--gj-teal-deep)", border: "1.5px solid var(--gj-line-strong)", minHeight: 48, padding: "0 18px", borderRadius: 10, fontWeight: 800, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>Voir l'offre</button>
        <button style={{ background: "transparent", border: 0, color: "var(--gj-teal-deep)", fontWeight: 800, fontSize: 14, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Tout effacer</button>
      </div>
      <V3Rule ok>Une seule action magenta visible par écran.</V3Rule>
      <V3Rule>Deux boutons pleins qui se disputent l'attention, ou du magenta sur un lien de navigation.</V3Rule>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", lineHeight: 1.55 }}>
        Sur fond sombre (hero d'accueil, carte CJS), l'action garde le jaune <code style={{ fontFamily: "ui-monospace,monospace" }}>--color-action-on-dark</code> : le magenta n'y passe pas le contraste.
      </div>
    </V3Card>

    <V3Card title="2 · Code couleur par catégorie" sub="Une catégorie d'offre = une couleur, identique sur toutes les surfaces (liste, fiche, tableau de bord, Yaye, espace conseiller). Le rouge est retiré du typage : il ne signale plus que l'urgence de date limite.">
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <V3Swatch name="Emploi" token="cat-emploi" ink />
        <V3Swatch name="Stage" token="cat-stage" ink />
        <V3Swatch name="Formation" token="cat-formation" ink />
        <V3Swatch name="Financement" token="cat-financement" ink />
        <V3Swatch name="Événement" token="cat-evenement" ink />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 4 }}>
        <span className="gj-cat gj-cat--stage">Stage</span>
        <span className="gj-urgent"><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />J-3</span>
        <span style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>← type + urgence sont deux pastilles distinctes, jamais fusionnées.</span>
      </div>
      <V3Rule ok>Le rouge uniquement pour J-7 et moins, en pastille de date limite.</V3Rule>
      <V3Rule>Un badge « STAGE » rouge parce que l'offre est urgente.</V3Rule>
    </V3Card>

    <V3Card title="3 · Lisibilité des cartes" sub="Toute fiche d'opportunité porte, sans clic : la catégorie (couleur), la date limite, le lieu, et l'organisme.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
        {[["i-target", "Catégorie", "pastille couleur"], ["i-clock", "Date limite", "J-x + date en clair"], ["i-pin", "Localisation", "Dakar / En ligne / région"], ["i-employment", "Organisme", "logo ou monogramme"]].map(([ic, t, s]) => (
          <div key={t} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--gj-teal-soft)", color: "var(--gj-teal-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg className="gj-icon" style={{ width: 16, height: 16 }}><use href={"#" + ic} /></svg></span>
            <span><b style={{ fontSize: 13, color: "var(--gj-ink)" }}>{t}</b><br /><span style={{ fontSize: 11.5, color: "var(--gj-grey)" }}>{s}</span></span>
          </div>
        ))}
      </div>
    </V3Card>

    <V3Card title="4 · Imagerie : photos réelles, illustrations en secours" sub="Les emplacements photo attendent des images de jeunes sénégalais en situation réelle — formation, atelier, entreprise, terrain — et doivent couvrir la diversité du pays (femmes et hommes, Dakar et régions, métiers ruraux et urbains, situations de handicap).">
      <V3Rule ok>Photo réelle légendée (prénom, âge, ville) sur les écrans d'accueil, d'événement et de centre.</V3Rule>
      <V3Rule>Banque d'images générique non contextualisée.</V3Rule>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", lineHeight: 1.55 }}>
        À défaut de visuel propre (bourse, appel à projets), la carte affiche une <b>bannière thématique par secteur</b> — pictogramme et dégradé du programme — jamais un cadre vide. Les <b>logos des partenaires</b> (entreprise, incubateur, ministère) apparaissent sur la fiche détail.
      </div>
    </V3Card>

    <V3Card title="5 · Confort visuel & mobile" sub="Fonds clairs partout côté bénéficiaire, contrastes AA, lecture en plein soleil.">
      <V3Rule ok>Surfaces blanches ou gris très léger (--gj-bg), texte --gj-ink, images compressées et chargées à la demande.</V3Rule>
      <V3Rule>Longues zones sombres côté bénéficiaire : à réserver au hero d'accueil et à la carte CJS.</V3Rule>
    </V3Card>
  </div>
);

Object.assign(window, { DesignV3Rules, V3Card, V3Rule, V3Swatch });
