import{j as e}from"./jsx-runtime-DmkHMFbR.js";import{n as w}from"./image-CgV_4jVZ.js";import{l as d}from"./index-2y7pnOH-.js";import{a as g}from"./index-DM1jvaOu.js";import{Y as I}from"./index-Dd3rRPC0.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";const D=[{items:[{id:"home",href:"/jeune/tableau-de-bord",icon:"home",label:"Accueil"}]},{title:"Opportunités",items:[{id:"opportunites",href:"/opportunites",icon:"target",label:"Toutes les opportunités"},{id:"favoris",href:"/jeune/favoris",icon:"bookmark",label:"Mes favoris"}]},{title:"Mon parcours",items:[{id:"candidatures",href:"/jeune/candidatures",icon:"document",label:"Mes candidatures"},{id:"agenda",href:"/agenda",icon:"calendar",label:"Agenda"},{id:"centres",href:"/centres",icon:"pin",label:"Centres CJS"},{id:"ressources",href:"/ressources",icon:"document",label:"Ressources"}]},{title:"Mon compte",items:[{id:"profil",href:"/jeune/mon-profil",icon:"profile",label:"Mon profil"},{id:"parametres",href:"/jeune/parametres",icon:"settings",label:"Paramètres"}]}];function r({active:l,sections:k=D,userName:p,userMeta:u,userInitials:f,yayeHref:T="/jeune/yaye"}){return e.jsxs("aside",{role:"navigation","aria-label":"Navigation principale",className:"hidden lg:flex",style:{width:260,background:"#fff",borderRight:"1px solid var(--gj-line)",padding:"16px 12px",height:"100%",flexDirection:"column",gap:4,overflowY:"auto",flexShrink:0},children:[e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:6,padding:"4px 6px 16px"},children:[e.jsx(w,{src:"/logo-guichet.png",alt:"Guichet Jeunesse.sn",width:120,height:30,style:{height:30,width:"auto"}}),e.jsx("div",{style:{fontSize:9.5,color:"var(--gj-teal-deep)",letterSpacing:".5px",textTransform:"uppercase",fontWeight:800},children:"Mon espace"})]}),p||f?e.jsxs(d,{href:"/jeune/mon-profil",className:"no-underline",style:{background:"var(--gj-bg)",border:"1.5px solid var(--gj-line)",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,marginBottom:14,color:"var(--gj-ink)"},children:[e.jsx("span",{style:{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg, var(--gj-teal), var(--gj-teal-deep))",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0},children:f??""}),e.jsxs("span",{style:{flex:1,minWidth:0},children:[e.jsx("span",{style:{display:"block",fontSize:12.5,fontWeight:800,color:"var(--gj-ink)",lineHeight:1.2},children:p}),u?e.jsx("span",{style:{display:"block",fontSize:10.5,color:"var(--gj-grey)",marginTop:2},children:u}):null]}),e.jsx(g,{name:"chevron-right",size:13})]}):null,k.map((n,M)=>e.jsxs("div",{children:[n.title?e.jsx("div",{style:{fontSize:9.5,color:"var(--gj-grey)",fontWeight:800,letterSpacing:".4px",textTransform:"uppercase",padding:"12px 10px 4px"},children:n.title}):null,n.items.map(a=>{const i=a.id===l;return e.jsxs(d,{href:a.href,"aria-current":i?"page":void 0,className:"no-underline",style:{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,fontSize:13,color:i?"var(--gj-teal-deep)":"var(--gj-grey)",fontWeight:i?800:600,minHeight:38,background:i?"var(--gj-teal-soft)":"transparent",width:"100%"},children:[e.jsx(g,{name:a.icon,size:18}),e.jsx("span",{style:{flex:1},children:a.label}),a.badge?e.jsx("span",{style:{marginLeft:"auto",background:a.badgeMuted?"var(--gj-line)":"var(--gj-red)",color:a.badgeMuted?"var(--gj-grey)":"#fff",fontSize:9.5,fontWeight:800,padding:"2px 7px",borderRadius:10},children:a.badge}):null]},a.id)})]},n.title??`section-${M}`)),e.jsxs(d,{href:T,className:"no-underline",style:{marginTop:"auto",padding:"12px 10px",background:"linear-gradient(135deg, var(--gj-teal-deep), var(--gj-ink-teal, var(--gj-ink)))",borderRadius:12,color:"#fff",display:"flex",flexDirection:"column",gap:8,position:"relative",overflow:"hidden"},children:[e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx(I,{size:32}),e.jsxs("span",{style:{flex:1,minWidth:0,lineHeight:1.15},children:[e.jsx("span",{style:{fontFamily:"Georgia, serif",fontWeight:900,fontSize:14,color:"#fff"},children:"Yaye"}),e.jsx("span",{style:{background:"var(--gj-yellow)",color:"var(--gj-teal-deep)",fontSize:8.5,fontWeight:900,padding:"1px 5px",borderRadius:999,marginLeft:5,letterSpacing:".3px"},children:"IA"}),e.jsx("span",{style:{display:"block",fontSize:10,opacity:.85,marginTop:2},children:"Assistant Guichet"})]})]}),e.jsx("span",{style:{background:"var(--gj-yellow)",color:"var(--gj-teal-deep)",padding:"8px 12px",borderRadius:8,fontWeight:800,fontSize:11.5,textAlign:"center"},children:"Parler à Yaye"})]})]})}r.__docgenInfo={description:`BenefSidebar — sidebar gauche web bénéficiaire (≥1024px).

Conforme \`design-guichet-v2/web-dashboard.jsx\` BenefSidebar :
- Logo Guichet + sous-titre "Mon espace"
- User chip (avatar initiales + nom + meta + chevron)
- Sections nav (Accueil / Opportunités / Parcours / Compte)
- Footer Yaye CTA permanent (lien vers /jeune/yaye)
- 260px largeur, bg-white, border-right

Sur mobile (<1024px) : caché (BottomNav prend le relais).`,methods:[],displayName:"BenefSidebar",props:{active:{required:!1,tsType:{name:"string"},description:"ID de l'item actif."},sections:{required:!1,tsType:{name:"Array",elements:[{name:"BenefSidebarSection"}],raw:"BenefSidebarSection[]"},description:"Sections personnalisées (défaut fourni).",defaultValue:{value:`[
  {
    items: [
      { id: 'home', href: '/jeune/tableau-de-bord', icon: 'home', label: 'Accueil' },
    ],
  },
  {
    title: 'Opportunités',
    items: [
      { id: 'opportunites', href: '/opportunites', icon: 'target', label: 'Toutes les opportunités' },
      { id: 'favoris', href: '/jeune/favoris', icon: 'bookmark', label: 'Mes favoris' },
    ],
  },
  {
    title: 'Mon parcours',
    items: [
      { id: 'candidatures', href: '/jeune/candidatures', icon: 'document', label: 'Mes candidatures' },
      { id: 'agenda', href: '/agenda', icon: 'calendar', label: 'Agenda' },
      { id: 'centres', href: '/centres', icon: 'pin', label: 'Centres CJS' },
      { id: 'ressources', href: '/ressources', icon: 'document', label: 'Ressources' },
    ],
  },
  {
    title: 'Mon compte',
    items: [
      { id: 'profil', href: '/jeune/mon-profil', icon: 'profile', label: 'Mon profil' },
      { id: 'parametres', href: '/jeune/parametres', icon: 'settings', label: 'Paramètres' },
    ],
  },
]`,computed:!1}},userName:{required:!1,tsType:{name:"string"},description:""},userMeta:{required:!1,tsType:{name:"string"},description:""},userInitials:{required:!1,tsType:{name:"string"},description:""},yayeHref:{required:!1,tsType:{name:"string"},description:"Lien CTA Yaye (défaut /jeune/yaye).",defaultValue:{value:"'/jeune/yaye'",computed:!1}}}};const _={title:"Layout/BenefSidebar",component:r,parameters:{layout:"fullscreen"}},c=({children:l})=>e.jsx("div",{style:{minHeight:"100vh",display:"flex",background:"var(--gj-bg)"},children:e.jsx("div",{style:{display:"flex",height:"100vh"},className:"lg:block",children:e.jsx("div",{style:{display:"flex",height:"100%"},children:l})})}),s={render:()=>e.jsx(c,{children:e.jsx(r,{active:"home",userName:"Awa Diop",userMeta:"Tambacounda · 22 ans",userInitials:"AD"})})},t={render:()=>e.jsx(c,{children:e.jsx(r,{active:"candidatures",userName:"Awa Diop",userMeta:"Tambacounda · 22 ans",userInitials:"AD"})})},o={render:()=>e.jsx(c,{children:e.jsx(r,{active:"home"})})};var m,h,x;s.parameters={...s.parameters,docs:{...(m=s.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => <Frame>
      <BenefSidebar active="home" userName="Awa Diop" userMeta="Tambacounda · 22 ans" userInitials="AD" />
    </Frame>
}`,...(x=(h=s.parameters)==null?void 0:h.docs)==null?void 0:x.source}}};var b,j,y;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: () => <Frame>
      <BenefSidebar active="candidatures" userName="Awa Diop" userMeta="Tambacounda · 22 ans" userInitials="AD" />
    </Frame>
}`,...(y=(j=t.parameters)==null?void 0:j.docs)==null?void 0:y.source}}};var v,S,A;o.parameters={...o.parameters,docs:{...(v=o.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => <Frame>
      <BenefSidebar active="home" />
    </Frame>
}`,...(A=(S=o.parameters)==null?void 0:S.docs)==null?void 0:A.source}}};const Y=["Default","ItemActive","Anonymous"];export{o as Anonymous,s as Default,t as ItemActive,Y as __namedExportsOrder,_ as default};
