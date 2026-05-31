import{j as r}from"./jsx-runtime-DmkHMFbR.js";import{a as S}from"./index-DM1jvaOu.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function k({primary:l,secondary:a,disabled:T=!1,loading:o=!1,showArrow:j=!0,sticky:d=!0,className:A=""}){const e=T||o;return r.jsxs("div",{className:A,style:{padding:14,paddingBottom:"calc(14px + env(safe-area-inset-bottom, 0px))",background:"#fff",borderTop:"1px solid var(--gj-line)",display:"flex",gap:8,flexShrink:0,position:d?"sticky":void 0,bottom:d?0:void 0,zIndex:d?10:void 0},children:[a?r.jsx("button",{type:a.type??"button",onClick:a.onClick,disabled:e,style:{flex:"0 0 auto",background:"#fff",color:"var(--gj-teal-deep)",border:"1.5px solid var(--gj-line)",padding:"0 18px",minHeight:48,borderRadius:10,fontWeight:700,fontSize:14,cursor:e?"not-allowed":"pointer",fontFamily:"inherit",opacity:e?.6:1},children:a.label}):null,r.jsxs("button",{type:l.type??"button",onClick:l.onClick,disabled:e,"aria-busy":o||void 0,style:{flex:1,background:"var(--gj-teal-deep)",color:"#fff",border:0,padding:"0 18px",minHeight:48,borderRadius:10,fontWeight:800,fontSize:15,cursor:e?"not-allowed":"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,opacity:e?.7:1},children:[o?r.jsx("span",{"aria-hidden":!0,style:{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"gj-spin .8s linear infinite",display:"inline-block"}}):null,r.jsx("span",{children:l.label}),j&&!o?r.jsx(S,{name:"arrow-right",size:16}):null]})]})}k.__docgenInfo={description:`FooterCTA — barre de boutons sticky bottom (form flows / onboarding).

Conforme \`design-guichet-v2/phone.jsx\` FooterCTA :
- 1 ou 2 boutons, min-height 48px
- secondary : outlined teal-deep / fond blanc
- primary : solide teal-deep / blanc, flèche \`arrow-right\` du sprite
- sticky bottom, bg-white, border-top, padding 14px
- safe-area-inset-bottom respectée`,methods:[],displayName:"FooterCTA",props:{primary:{required:!0,tsType:{name:"FooterCTAButton"},description:"CTA principal (solide, teal-deep)."},secondary:{required:!1,tsType:{name:"FooterCTAButton"},description:"CTA secondaire optionnel (outlined ghost)."},disabled:{required:!1,tsType:{name:"boolean"},description:"Désactive les boutons.",defaultValue:{value:"false",computed:!1}},loading:{required:!1,tsType:{name:"boolean"},description:"Indique un chargement en cours (désactive + spinner sur le primary).",defaultValue:{value:"false",computed:!1}},showArrow:{required:!1,tsType:{name:"boolean"},description:"Affiche la flèche → sur le primary (défaut true).",defaultValue:{value:"true",computed:!1}},sticky:{required:!1,tsType:{name:"boolean"},description:"Sticky bottom avec safe-area (défaut true).",defaultValue:{value:"true",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const V={title:"UI/FooterCTA",component:k,parameters:{layout:"fullscreen"}},n={args:{primary:{label:"Continuer",onClick:()=>alert("Primary")}}},t={args:{primary:{label:"Valider",onClick:()=>alert("Primary")},secondary:{label:"Retour",onClick:()=>alert("Secondary")}}},i={args:{primary:{label:"Continuer"},disabled:!0}},s={args:{primary:{label:"Envoi…"},loading:!0}};var p,c,u;n.parameters={...n.parameters,docs:{...(p=n.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    primary: {
      label: 'Continuer',
      onClick: () => alert('Primary')
    }
  }
}`,...(u=(c=n.parameters)==null?void 0:c.docs)==null?void 0:u.source}}};var m,f,b;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    primary: {
      label: 'Valider',
      onClick: () => alert('Primary')
    },
    secondary: {
      label: 'Retour',
      onClick: () => alert('Secondary')
    }
  }
}`,...(b=(f=t.parameters)==null?void 0:f.docs)==null?void 0:b.source}}};var y,g,h;i.parameters={...i.parameters,docs:{...(y=i.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    primary: {
      label: 'Continuer'
    },
    disabled: true
  }
}`,...(h=(g=i.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};var x,C,v;s.parameters={...s.parameters,docs:{...(x=s.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    primary: {
      label: 'Envoi…'
    },
    loading: true
  }
}`,...(v=(C=s.parameters)==null?void 0:C.docs)==null?void 0:v.source}}};const I=["PrimaryOnly","PrimaryAndSecondary","Disabled","Loading"];export{i as Disabled,s as Loading,t as PrimaryAndSecondary,n as PrimaryOnly,I as __namedExportsOrder,V as default};
