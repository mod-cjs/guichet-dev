/* eslint-disable */
// Lot 14 — Assistant IA : bouton flottant Yaye + carte Accessibilité de pied de colonne.
// Le comportement réel est porté par yaye-fab.js, qui injecte le bouton dans chaque
// écran bénéficiaire (web et mobile) des lots 1 à 13.

const YayeDot = ({ size = 56, label = false }) => (
  <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
    <span style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))",
      color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 10px 26px rgba(1,75,74,.42)",
    }}>
      <svg className="gj-icon" style={{ width: Math.round(size * 0.48), height: Math.round(size * 0.48) }}><use href="#i-sparkle" /></svg>
    </span>
    <span style={{ position: "absolute", inset: -3, borderRadius: "50%", border: "2px solid var(--gj-yellow)", opacity: .5, pointerEvents: "none" }} />
    <span style={{ position: "absolute", top: -3, right: -5, background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "1px 5px", borderRadius: 999, lineHeight: 1.35 }}>IA</span>
    {label && <span style={{ position: "absolute", right: "calc(100% + 9px)", top: "50%", transform: "translateY(-50%)", background: "var(--gj-ink)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "5px 9px", borderRadius: 8, whiteSpace: "nowrap" }}>Demander à Yaye</span>}
  </span>
);

const AssistantIA = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <V3Card title="Bouton flottant Yaye" sub="Point d'entrée unique vers l'assistante IA, présent sur tous les écrans bénéficiaire connectés. Il remplace l'ancien encart Yaye du pied de colonne, dont la place revient aux réglages d'accessibilité.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
        {[["Web · repos", 56, false], ["Web · survol et focus", 56, true], ["Mobile · repos", 52, false]].map(([n, s, l]) => (
          <div key={n} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
            <div style={{ background: "var(--gj-bg)", padding: "26px 20px", display: "flex", justifyContent: l ? "flex-end" : "center", alignItems: "center", minHeight: 108 }}>
              <YayeDot size={s} label={l} />
            </div>
            <div style={{ borderTop: "1.5px solid var(--gj-line)", padding: "9px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--gj-grey)" }}>{n} · {s} px</div>
          </div>
        ))}
      </div>
      <V3Rule ok>Web : 56 px, ancré à 26 px du bord bas droit du cadre. Mobile : 52 px, ancré à 16 px du bord droit et 84 px du bas, donc au-dessus de la barre d'onglets. Face à une barre d'action épinglée au bas du cadre — pied de panneau latéral, barre de candidature — le bouton remonte juste au-dessus d'elle, de 120 px au maximum, et reste donc toujours en zone basse. Halo ambre en respiration continue, pastille « IA » toujours visible.</V3Rule>
      <V3Rule>Un second point d'entrée IA permanent sur le même écran — l'ancienne pastille « Y IA » de l'en-tête mobile et l'encart Yaye du pied de colonne ont été retirés pour cette raison. Seule exception : l'invitation contextuelle d'un écran vide, où aucun contenu ne concurrence le message. Un bouton posé en bas à gauche : ce coin est réservé aux réglages d'accessibilité.</V3Rule>
      <V3Rule ok>Les zones défilantes réservent 72 à 76 px de marge basse dès qu'un bouton est posé : aucun contrôle de fin de page ne se retrouve sous sa zone de clic. Au milieu d'une liste plus longue que l'écran, le bouton survole les cartes qui défilent — comportement attendu d'un bouton flottant, l'utilisateur fait défiler pour atteindre ce qu'il masque.</V3Rule>
    </V3Card>

    <V3Card title="Pied de colonne — Accessibilité" sub="Le pied de la colonne bénéficiaire porte désormais l'accès aux réglages d'accessibilité : contraste renforcé, espacement, zoom, guide de lecture, lecture vocale.">
      <div style={{ maxWidth: 232, background: "linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))", borderRadius: 12, color: "#fff", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--gj-yellow)", color: "var(--gj-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg className="gj-icon" style={{ width: 19, height: 19 }}><use href="#i-inclusion" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>Accessibilité</div>
            <div style={{ fontSize: 11, opacity: .85 }}>Confort de lecture</div>
          </div>
        </div>
        <button style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", border: 0, padding: "8px 12px", borderRadius: 8, minHeight: 34, fontWeight: 800, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>Réglages d'accessibilité →</button>
      </div>
      <V3Rule ok>Un seul emplacement par écran, en pied de colonne, avec le bouton flottant d'accessibilité ancré en bas à gauche du cadre.</V3Rule>
    </V3Card>
  </div>
);

const MobAssistantIA = () => (
  <PhoneFrame>
    <AppHeader title="Assistant IA" onBack={() => {}} />
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--gj-bg)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {["Opportunités près de chez moi", "Bourses ouvertes ce mois", "Préparer mon entretien"].map((l) => (
        <div key={l} style={{ background: "#fff", border: "1.5px solid var(--gj-line)", borderRadius: 12, padding: "13px 14px", fontSize: 13.5, fontWeight: 700, color: "var(--gj-ink)" }}>{l}</div>
      ))}
      <div style={{ marginTop: "auto", fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.5, paddingRight: 74 }}>
        Le bouton reste au-dessus de la barre d'onglets, à 16 px du bord droit. Il survole le contenu qui défile — c'est son rôle — mais jamais un contrôle épinglé.
      </div>
      <span style={{ position: "absolute", right: 16, bottom: 20 }}><YayeDot size={52} /></span>
    </div>
    <BottomNav active="home" />
  </PhoneFrame>
);

Object.assign(window, { AssistantIA, MobAssistantIA, YayeDot });
