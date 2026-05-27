import{j as e}from"./jsx-runtime-DmkHMFbR.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";const U={none:"",teal:"border-l-[4px] border-l-gj-teal",yellow:"border-l-[4px] border-l-gj-yellow",red:"border-l-[4px] border-l-gj-red"},B={default:"bg-white border-[1.5px] border-gj-line rounded-gj-lg",opportunite:"bg-white border-[1.5px] border-gj-line rounded-gj-lg transition-shadow duration-200 hover:shadow-gj-md",candidature:"bg-white border-[1.5px] border-gj-line rounded-gj-lg",mycard:"rounded-gj-2xl text-white border-0"};function P({variant:i="default",padded:$=!0,elevated:D=!1,as:R,header:c,footer:p,accent:_="none",padding:u,children:I,className:W="",style:k,...H}){const J=R??"div",l=u===void 0?$:u,L=i==="mycard"?{backgroundImage:"linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal))"}:{},O=l?"p-space-4":"";return e.jsxs(J,{className:`${B[i]} ${U[_]} ${O} ${D?"shadow-gj-md":""} ${W}`.trim(),style:{...L,...k},...H,children:[c!==void 0&&e.jsx("div",{className:`${l?"-mx-space-4 -mt-space-4 mb-space-3 px-space-4 py-space-3":""} border-b border-gj-line first:rounded-t-gj-lg`,children:c}),I,p!==void 0&&e.jsx("div",{className:`${l?"-mx-space-4 -mb-space-4 mt-space-3 px-space-4 py-space-3":""} border-t border-gj-line last:rounded-b-gj-lg`,children:p})]})}P.__docgenInfo={description:"Card — conteneur surface du design system v2.\n\nVariants :\n - `default` : surface white standard\n - `opportunite` : carte liste (hover subtle)\n - `candidature` : carte pipeline (structure spécifique côté contenu)\n - `mycard` : carte CJS QR (gradient teal-deep → ink-teal, texte blanc)",methods:[],displayName:"Card",props:{variant:{required:!1,tsType:{name:"union",raw:"'default' | 'opportunite' | 'candidature' | 'mycard'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'opportunite'"},{name:"literal",value:"'candidature'"},{name:"literal",value:"'mycard'"}]},description:"Variant visuelle alignée sur le design v2.",defaultValue:{value:"'default'",computed:!1}},padded:{required:!1,tsType:{name:"boolean"},description:"Padding interne (true par défaut).",defaultValue:{value:"true",computed:!1}},elevated:{required:!1,tsType:{name:"boolean"},description:"Ajoute une élévation `shadow-gj-md` (hover-friendly).",defaultValue:{value:"false",computed:!1}},as:{required:!1,tsType:{name:"ElementType"},description:"Tag rendu (`div` par défaut)."},header:{required:!1,tsType:{name:"ReactNode"},description:"Slot d'en-tête optionnel (rendu au-dessus de `children`)."},footer:{required:!1,tsType:{name:"ReactNode"},description:"Slot de pied optionnel (rendu sous `children`)."},accent:{required:!1,tsType:{name:"union",raw:"'none' | 'teal' | 'yellow' | 'red'",elements:[{name:"literal",value:"'none'"},{name:"literal",value:"'teal'"},{name:"literal",value:"'yellow'"},{name:"literal",value:"'red'"}]},description:"Accent latéral hérité v1 (sera retiré en Phase 4).",defaultValue:{value:"'none'",computed:!1}},padding:{required:!1,tsType:{name:"boolean"},description:"@deprecated Utiliser `padded`."},className:{defaultValue:{value:"''",computed:!1},required:!1}},composes:["HTMLAttributes"]};const X={title:"UI/Card",component:P,argTypes:{variant:{control:"select",options:["default","opportunite","candidature","mycard"]},padded:{control:"boolean"},elevated:{control:"boolean"}},args:{children:"Contenu de la carte",variant:"default",padded:!0,elevated:!1}},r={},a={args:{padded:!1,children:"Contenu sans padding interne"}},n={args:{elevated:!0,children:"Carte avec shadow-gj-md"}},t={args:{variant:"opportunite",children:e.jsxs(e.Fragment,{children:[e.jsx("h3",{style:{fontSize:16,fontWeight:700,margin:0},children:"Stage agronomie"}),e.jsx("p",{style:{fontSize:13,color:"var(--gj-grey)",margin:"4px 0 0"},children:"Tambacounda · 180 000 F · 3 mois"})]})}},o={args:{variant:"candidature",header:e.jsx("strong",{children:"Stage agronomie — En revue"}),footer:e.jsx("span",{style:{fontSize:12,color:"var(--gj-grey)"},children:"Mise à jour il y a 2 jours"}),children:e.jsx("p",{style:{margin:0,fontSize:14},children:"Étape 3 / 5 — Le recruteur consulte ton dossier."})}},s={args:{variant:"mycard",children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[e.jsx("span",{style:{fontSize:12,opacity:.85,letterSpacing:".4px",textTransform:"uppercase"},children:"Ma carte CJS"}),e.jsx("strong",{style:{fontSize:20},children:"Awa Diop"}),e.jsx("span",{style:{fontSize:12,opacity:.85},children:"cjs-uid · ••• 9F4C"})]})}},d={args:{header:e.jsx("strong",{children:"Titre de section"}),footer:e.jsx("span",{style:{fontSize:12,color:"var(--gj-grey)"},children:"Pied de carte"}),children:e.jsx("p",{style:{margin:0},children:"Contenu principal de la carte."})}};var m,g,f;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:"{}",...(f=(g=r.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};var y,h,v;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    padded: false,
    children: 'Contenu sans padding interne'
  }
}`,...(v=(h=a.parameters)==null?void 0:h.docs)==null?void 0:v.source}}};var j,x,S;n.parameters={...n.parameters,docs:{...(j=n.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    elevated: true,
    children: 'Carte avec shadow-gj-md'
  }
}`,...(S=(x=n.parameters)==null?void 0:x.docs)==null?void 0:S.source}}};var b,C,T;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    variant: 'opportunite',
    children: <>
        <h3 style={{
        fontSize: 16,
        fontWeight: 700,
        margin: 0
      }}>Stage agronomie</h3>
        <p style={{
        fontSize: 13,
        color: 'var(--gj-grey)',
        margin: '4px 0 0'
      }}>
          Tambacounda · 180 000 F · 3 mois
        </p>
      </>
  }
}`,...(T=(C=t.parameters)==null?void 0:C.docs)==null?void 0:T.source}}};var w,z,N;o.parameters={...o.parameters,docs:{...(w=o.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    variant: 'candidature',
    header: <strong>Stage agronomie — En revue</strong>,
    footer: <span style={{
      fontSize: 12,
      color: 'var(--gj-grey)'
    }}>Mise à jour il y a 2 jours</span>,
    children: <p style={{
      margin: 0,
      fontSize: 14
    }}>Étape 3 / 5 — Le recruteur consulte ton dossier.</p>
  }
}`,...(N=(z=o.parameters)==null?void 0:z.docs)==null?void 0:N.source}}};var q,A,E;s.parameters={...s.parameters,docs:{...(q=s.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    variant: 'mycard',
    children: <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
        <span style={{
        fontSize: 12,
        opacity: 0.85,
        letterSpacing: '.4px',
        textTransform: 'uppercase'
      }}>
          Ma carte CJS
        </span>
        <strong style={{
        fontSize: 20
      }}>Awa Diop</strong>
        <span style={{
        fontSize: 12,
        opacity: 0.85
      }}>cjs-uid · ••• 9F4C</span>
      </div>
  }
}`,...(E=(A=s.parameters)==null?void 0:A.docs)==null?void 0:E.source}}};var V,F,M;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    header: <strong>Titre de section</strong>,
    footer: <span style={{
      fontSize: 12,
      color: 'var(--gj-grey)'
    }}>Pied de carte</span>,
    children: <p style={{
      margin: 0
    }}>Contenu principal de la carte.</p>
  }
}`,...(M=(F=d.parameters)==null?void 0:F.docs)==null?void 0:M.source}}};const Y=["Default","NotPadded","Elevated","Opportunite","Candidature","MyCard","WithHeaderFooter"];export{o as Candidature,r as Default,n as Elevated,s as MyCard,a as NotPadded,t as Opportunite,d as WithHeaderFooter,Y as __namedExportsOrder,X as default};
