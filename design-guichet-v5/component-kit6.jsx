/* eslint-disable */
// Lot 14 — Charte graphique Yaakaar 2030 (Treevans). Référence normative de
// la palette, de la typographie et des règles de contraste.

const ChSw = ({ hex, name, note }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <span style={{ height: 74, borderRadius: 12, background: hex, border: "1px solid rgba(0,0,0,.07)" }} />
    <code style={{ fontSize: 11.5, fontWeight: 800, color: "var(--gj-ink)", fontFamily: "ui-monospace,monospace" }}>{hex}</code>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gj-ink)" }}>{name}</span>
    {note && <span style={{ fontSize: 11, color: "var(--gj-grey)", lineHeight: 1.45 }}>{note}</span>}
  </div>
);

const CharteYaakaar = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <V3Card title="Palette officielle — 12 couleurs" sub="Charte graphique Yaakaar 2030, Treevans. Toute couleur employée dans le produit vient de cette liste ou en est une variante assombrie pour le texte.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(124px,1fr))", gap: 16 }}>
        <ChSw hex="#f8a309" name="Ambre" note="Événements · accent sur fond sombre" />
        <ChSw hex="#ee6f21" name="Orange" note="Financement · bourses" />
        <ChSw hex="#ae0057" name="Magenta CJS" note="Couleur d'action — CTA de conversion" />
        <ChSw hex="#1e35ba" name="Indigo" note="Emploi" />
        <ChSw hex="#fc3241" name="Rouge" note="Urgence de date limite uniquement" />
        <ChSw hex="#fe1c66" name="Rose" note="Accent graphique — jamais du texte" />
        <ChSw hex="#139ce8" name="Cyan" note="Stage · alternance" />
        <ChSw hex="#19a657" name="Vert" note="Formation · succès" />
        <ChSw hex="#027f7e" name="Teal" note="Marque, navigation, structure" />
        <ChSw hex="#162c5e" name="Navy" note="Fonds sombres, back-office, footers" />
        <ChSw hex="#202020" name="Noir" note="Texte principal" />
        <ChSw hex="#FFFFFF" name="Blanc" note="Surfaces" />
      </div>
    </V3Card>

    <V3Card title="Contraste — ce que la palette impose" sub="Six couleurs vives de la charte sont trop claires pour porter du texte blanc : de 2,0:1 pour l'ambre à 3,7:1 pour le rouge, là où AA demande 4,5:1 sur nos tailles de libellé. Elles gardent leur teinte en aplat sous du texte NOIR ; dès qu'il faut du texte blanc, on emploie la variante assombrie.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(232px,1fr))", gap: 10 }}>
        {[
          ["Ambre", "#f8a309", "2,0", "#7A4E02", "var(--gj-yellow-ink)", true],
          ["Orange", "#ee6f21", "3,0", "#97400F", "var(--cat-financement-ink)", true],
          ["Cyan", "#139ce8", "3,0", "#0B5F8D", "var(--cat-stage-ink)", true],
          ["Vert", "#19a657", "3,2", "#0E6234", "var(--gj-green-ink)", true],
          ["Rouge", "#fc3241", "3,7", "#C1121F", "var(--gj-red-ink)", false],
          ["Rose", "#fe1c66", "3,3", "#ae0057", "var(--gj-action-ink)", false],
        ].map(([n, solid, ratio, deep, ink, noirOk]) => (
          <div key={n} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
            {noirOk ? (
              <div style={{ background: solid, color: "var(--gj-ink)", fontWeight: 800, fontSize: 13, padding: "10px 12px" }}>{n} en aplat · texte noir</div>
            ) : (
              <div style={{ background: solid, minHeight: 39, display: "flex", alignItems: "center", padding: "10px 12px" }}>
                <span style={{ background: "#fff", color: "var(--gj-ink)", fontWeight: 800, fontSize: 13, padding: "3px 9px", borderRadius: 999 }}>{n} vif · aucun texte</span>
              </div>
            )}
            <div style={{ background: deep, color: "#fff", fontWeight: 800, fontSize: 13, padding: "10px 12px" }}>Variante assombrie · texte blanc</div>
            <div style={{ padding: "10px 12px", fontWeight: 800, fontSize: 13, color: ink, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{n} en texte · variante -ink</span>
              <span style={{ color: "var(--gj-grey)", fontWeight: 700 }}>{ratio}:1 en blanc</span>
            </div>
          </div>
        ))}
      </div>
      <V3Rule ok>Ambre, orange, cyan et vert en aplat sous du texte NOIR ; variante assombrie sous du texte blanc ; variante -ink pour du texte sur blanc.</V3Rule>
      <V3Rule>Texte blanc sur un aplat vif — et tout texte, noir comme blanc, sur le rouge vif ou le rose : ces deux teintes ne portent aucun libellé, elles ne servent qu'aux aplats muets, aux filets et aux pictogrammes.</V3Rule>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", lineHeight: 1.55 }}>
        C'est pourquoi <code style={{ fontFamily: "ui-monospace,monospace" }}>--gj-red</code>, <code style={{ fontFamily: "ui-monospace,monospace" }}>--gj-green</code>, <code style={{ fontFamily: "ui-monospace,monospace" }}>--gj-cyan</code> et les <code style={{ fontFamily: "ui-monospace,monospace" }}>--cat-*</code> valent les versions assombries : ce sont les jetons que le produit pose sous du texte blanc. Les teintes exactes de la charte restent disponibles en <code style={{ fontFamily: "ui-monospace,monospace" }}>--brand-*</code> et <code style={{ fontFamily: "ui-monospace,monospace" }}>-vif</code>, pour les aplats sans texte, les filets et les pictogrammes.
      </div>
    </V3Card>

    <V3Card title="Typographie" sub="Delhi est la police du logotype — elle n'est jamais utilisée en interface. Lexend est la police de tous les documents et de tout le produit.">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[["Regular", 400], ["Medium", 500], ["SemiBold", 600], ["Bold", 700], ["Extrabold", 800], ["Black", 900]].map(([n, w]) => (
          <div key={n} style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 26, fontWeight: w, color: "var(--gj-teal-deep)", minWidth: 160 }}>Yaakaar</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gj-grey)" }}>{n} · {w}</span>
          </div>
        ))}
      </div>
      <V3Rule ok>Titres en 800/900, corps en 400/500, libellés d'interface en 700.</V3Rule>
      <V3Rule>Une police serif ou système pour créer un contraste typographique.</V3Rule>
    </V3Card>

    <V3Card title="Taille minimale de texte" sub="11 px est le plancher pour tout texte du produit, sans exception : pastille, badge, libellé de rubrique, compteur, métadonnée. En dessous, le texte devient illisible sur un écran d'entrée de gamme en plein soleil — le contexte réel de nos utilisateurs.">
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="gj-cat gj-cat--stage">Stage</span>
        <span className="gj-urgent">J-3</span>
        <span style={{ background: "var(--gj-yellow)", color: "var(--gj-ink)", fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999, letterSpacing: ".4px" }}>IA</span>
        <span style={{ fontSize: 12.5, color: "var(--gj-grey)" }}>← tous à 11 px minimum</span>
      </div>
      <V3Rule ok>Pastilles, badges et métadonnées à 11 px, corps de texte à 16 px.</V3Rule>
      <V3Rule>Créer un nouveau libellé sous 11 px pour gagner de la place.</V3Rule>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", lineHeight: 1.55 }}>
        Le plancher vaut sur <b>toutes</b> les surfaces : bénéficiaire, conseiller, recruteur, administration — libellés de rubrique et compteurs de sidebar compris. Aucun texte du produit ne descend sous 11 px.
      </div>
    </V3Card>

    <V3Card title="Logotypes" sub="Deux marques coexistent : CJS (Consortium Jeunesse Sénégal) et Yaakaar 2030.">
      <V3Rule ok>Zone de respiration égale à la hauteur du symbole. Deux fichiers seulement : la version couleur pour les fonds clairs, la version à mot-symbole blanc pour les fonds sombres.</V3Rule>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: "#fff", padding: "20px 16px", display: "flex", justifyContent: "center" }}>
            <img src="assets/logo-guichet.png" alt="Guichet Jeunesse.sn" style={{ height: 34, width: "auto" }} />
          </div>
          <div style={{ borderTop: "1.5px solid var(--gj-line)", padding: "9px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--gj-grey)" }}>Fonds clairs · mot-symbole encre #202020</div>
        </div>
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: "var(--gj-ink-teal)", padding: "20px 16px", display: "flex", justifyContent: "center" }}>
            <img src="assets/logo-guichet-blanc.png" alt="Guichet Jeunesse.sn sur fond sombre" style={{ height: 34, width: "auto" }} />
          </div>
          <div style={{ borderTop: "1.5px solid var(--gj-line)", padding: "9px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--gj-grey)" }}>Fonds sombres · mot-symbole blanc</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: "#fff", padding: "14px 16px", display: "flex", justifyContent: "center" }}>
            <img src="assets/logo-symbole.png" alt="Symbole seul" style={{ height: 44, width: 44 }} />
          </div>
          <div style={{ borderTop: "1.5px solid var(--gj-line)", padding: "9px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--gj-grey)" }}>Symbole seul · rails étroits, favicon</div>
        </div>
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: "var(--gj-ink-teal)", padding: "14px 16px", display: "flex", justifyContent: "center" }}>
            <img src="assets/logo-symbole-blanc.png" alt="Symbole seul sur fond sombre" style={{ height: 44, width: 44 }} />
          </div>
          <div style={{ borderTop: "1.5px solid var(--gj-line)", padding: "9px 12px", fontSize: 11.5, fontWeight: 700, color: "var(--gj-grey)" }}>Symbole seul · rail tablette 76 px</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--gj-grey)", lineHeight: 1.55 }}>
        Sous 120 px de large, on utilise le symbole seul — le logotype complet, de ratio 4,7:1, devient illisible. Le symbole reprend l'exacte structure chromatique du logotype CJS officiel — croissant <strong style={{ color: "var(--gj-action-ink)" }}>magenta #ae0057</strong>, disque <strong style={{ color: "var(--gj-yellow-ink)" }}>ambre #f8a309</strong>, virgule <strong style={{ color: "var(--gj-teal-deep)" }}>teal #027f7e</strong> — et ne passe jamais en monochrome : c'est lui qui porte la reconnaissance de la marque. Le logotype Yaakaar 2030 reste à livrer.
      </div>
    </V3Card>
  </div>
);

Object.assign(window, { CharteYaakaar, ChSw });
