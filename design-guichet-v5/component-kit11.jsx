/* eslint-disable */
// Lot 14 — Cartes d'opportunité. Les composants montrés ici sont les VRAIS
// composants du produit (OppListCard, MobileOppRowCard), importés du Lot 3 :
// la bibliothèque ne montre pas une copie qui pourrait divergier.

const CAT_CODE = [
  ["Emploi", "emploi"],
  ["Stage · alternance", "stage"],
  ["Formation", "formation"],
  ["Financement · bourse", "financement"],
  ["Événement", "evenement"],
];

const OppCardsKit = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <V3Card title="Carte d'opportunité — web" sub="Une ligne pleine largeur : tuile sectorielle à gauche pour reconnaître le métier avant de lire, puis titre, employeur, lieu, rémunération et échéance.">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
        <OppListCard tag="STAGE · J-3" tagTone="urgent" title="Stage Data Science · 6 mois" org="Sonatel — Direction Innovation" region="Dakar Plateau" type="Stage rémunéré" salary="350 000 F/mois" deadline={{ label: "J-3", urgent: true }} />
        <OppListCard tag="EMPLOI · J-12" title="Technicien maraîchage irrigué" org="GIE Diaobé" region="Tambacounda" type="CDD 12 mois" salary="180 000 F/mois" deadline={{ label: "J-12" }} fav />
        <OppListCard tag="FINANCEMENT · J-30" title="Bourse d'amorçage agro-alimentaire" org="Fonds Yaakaar 2030" region="National" type="Subvention" salary="2 000 000 F" deadline={{ label: "J-30" }} />
      </div>
      <V3Rule ok>Une couleur par type d'offre, la tuile sectorielle en pictogramme, le bouton favori en haut à droite. Les informations montrées sont vérifiables par le jeune : employeur, lieu, contrat, rémunération, date limite.</V3Rule>
      <V3Rule>Le rouge pour coder un type d'offre : il est réservé à l'urgence d'échéance (J-3 et moins). Un score de correspondance en pourcentage : il n'aide pas la décision et laisse croire à un classement automatique opaque. Une carte sans employeur ni lieu — ce sont les deux informations que les jeunes cherchent en premier.</V3Rule>
    </V3Card>

    <V3Card title="Carte d'opportunité — mobile" sub="Même hiérarchie en 358 px de large : le pictogramme rétrécit, l'échéance reste lisible, la zone tactile de la carte entière fait 44 px au minimum.">
      <div style={{ background: "var(--gj-bg)", borderRadius: 14, padding: 14, maxWidth: 390, display: "flex", flexDirection: "column", gap: 10 }}>
        {(window.SAMPLE_M || []).slice(0, 3).map((o, i) => <MobileOppRowCard key={i} {...o} fav={i === 1} />)}
      </div>
      <V3Rule ok>Carte entièrement cliquable, favori en cible tactile distincte de 44 px, jamais deux actions concurrentes dans la même carte.</V3Rule>
    </V3Card>

    <V3Card title="Code couleur des types d'offre" sub="Un type d'offre égale une couleur, valable sur toutes les surfaces : liste, détail, candidatures, tableau de bord conseiller.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(178px,1fr))", gap: 10 }}>
        {CAT_CODE.map(([label, key]) => (
          <div key={key} style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
            <div style={{ height: 34, background: "var(--cat-" + key + ")" }} />
            <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--cat-" + key + "-ink)" }}>{label}</span>
              <span style={{ alignSelf: "flex-start", background: "var(--cat-" + key + "-soft)", color: "var(--cat-" + key + "-ink)", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>Pastille</span>
            </div>
          </div>
        ))}
        <div style={{ border: "1.5px solid var(--gj-line)", borderRadius: 11, overflow: "hidden" }}>
          <div style={{ height: 34, background: "var(--gj-red)" }} />
          <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gj-red-ink)" }}>Urgence d'échéance</span>
            <span style={{ alignSelf: "flex-start", background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>J-3</span>
          </div>
        </div>
      </div>
      <V3Rule ok>L'aplat vif porte du texte noir ou aucun texte ; la variante <code>-ink</code> sert au texte sur blanc et sur la pastille claire.</V3Rule>
    </V3Card>
  </div>
);

const MobOppCardsKit = () => (
  <PhoneFrame>
    <AppHeader title="Cartes d'opportunité" onBack={() => {}} />
    <div style={{ flex: 1, overflowY: "auto", background: "var(--gj-bg)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      {(window.SAMPLE_M || []).slice(0, 2).map((o, i) => <MobileOppRowCard key={i} {...o} fav={i === 1} />)}
      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--gj-ink)", marginTop: 6 }}>Code couleur des types</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {CAT_CODE.map(([label, key]) => (
          <span key={key} style={{ background: "var(--cat-" + key + "-soft)", color: "var(--cat-" + key + "-ink)", fontSize: 11.5, fontWeight: 800, padding: "6px 11px", borderRadius: 999 }}>{label}</span>
        ))}
        <span style={{ background: "var(--gj-red-soft)", color: "var(--gj-red-ink)", fontSize: 11.5, fontWeight: 800, padding: "6px 11px", borderRadius: 999 }}>J-3 · urgence</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--gj-grey)", lineHeight: 1.5, marginTop: 4 }}>
        Le rouge ne code jamais un type d'offre : il signale uniquement une échéance à trois jours ou moins.
      </div>
    </div>
    <BottomNav active="search" />
  </PhoneFrame>
);

Object.assign(window, { OppCardsKit, MobOppCardsKit });
