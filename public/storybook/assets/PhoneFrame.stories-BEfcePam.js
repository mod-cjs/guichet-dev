import{j as e}from"./jsx-runtime-DmkHMFbR.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function a({children:u,width:p=390,height:c=844,withStatusBar:m=!0,bg:f="var(--gj-bg)",className:g=""}){return null}a.__docgenInfo={description:`PhoneFrame — simulateur iPhone 14 (390×844) pour les pages de preview.

STRICTEMENT DEV — rend \`null\` en \`NODE_ENV === 'production'\`.
Stocké dans \`src/components/dev/\` pour signaler son usage hors UI prod.

Conforme \`design-guichet-v2/phone.jsx\` PhoneFrame :
- cadre 390×844, fond blanc, fontFamily inherit
- bord noir épais arrondi (Dynamic Island/notch simulés via padding-top)
- status bar 9:41 + signal/wifi/batterie
- safe-area bottom 18px
- contenu scrollable interne`,methods:[],displayName:"PhoneFrame",props:{children:{required:!0,tsType:{name:"ReactNode"},description:""},width:{required:!1,tsType:{name:"number"},description:"Largeur interne (défaut 390 = iPhone 14 logical).",defaultValue:{value:"390",computed:!1}},height:{required:!1,tsType:{name:"number"},description:"Hauteur interne (défaut 844).",defaultValue:{value:"844",computed:!1}},withStatusBar:{required:!1,tsType:{name:"boolean"},description:"Affiche la status bar simulée.",defaultValue:{value:"true",computed:!1}},bg:{required:!1,tsType:{name:"string"},description:"Couleur fond du contenu.",defaultValue:{value:"'var(--gj-bg)'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const y={title:"Dev/PhoneFrame",component:a,parameters:{layout:"centered"}},n={render:()=>e.jsx(a,{children:e.jsx("div",{style:{padding:16,color:"var(--gj-grey)"},children:"Contenu démo"})})},r={render:()=>e.jsxs(a,{children:[e.jsx("header",{style:{background:"#fff",padding:"12px 16px",borderBottom:"1px solid var(--gj-line)",fontWeight:800},children:"Tableau de bord"}),e.jsxs("div",{style:{padding:16,display:"grid",gap:12},children:[e.jsx("div",{style:{padding:16,background:"#fff",borderRadius:12},children:"KPI 1"}),e.jsx("div",{style:{padding:16,background:"#fff",borderRadius:12},children:"KPI 2"}),e.jsx("div",{style:{padding:16,background:"#fff",borderRadius:12},children:"Cards…"})]})]})};var d,o,s;n.parameters={...n.parameters,docs:{...(d=n.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => <PhoneFrame>
      <div style={{
      padding: 16,
      color: 'var(--gj-grey)'
    }}>Contenu démo</div>
    </PhoneFrame>
}`,...(s=(o=n.parameters)==null?void 0:o.docs)==null?void 0:s.source}}};var i,t,l;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => <PhoneFrame>
      <header style={{
      background: '#fff',
      padding: '12px 16px',
      borderBottom: '1px solid var(--gj-line)',
      fontWeight: 800
    }}>
        Tableau de bord
      </header>
      <div style={{
      padding: 16,
      display: 'grid',
      gap: 12
    }}>
        <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12
      }}>KPI 1</div>
        <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12
      }}>KPI 2</div>
        <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12
      }}>Cards…</div>
      </div>
    </PhoneFrame>
}`,...(l=(t=r.parameters)==null?void 0:t.docs)==null?void 0:l.source}}};const x=["Empty","MockDashboard"];export{n as Empty,r as MockDashboard,x as __namedExportsOrder,y as default};
