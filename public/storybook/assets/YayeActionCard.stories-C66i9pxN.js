import{j as e}from"./jsx-runtime-DmkHMFbR.js";import{a as o}from"./index-DM1jvaOu.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function x({title:g="Yaye a agi pour toi",subtitle:i,actions:f,buttons:s,className:b=""}){return e.jsxs("div",{className:`bg-white border-[1.5px] border-gj-teal rounded-gj-xl overflow-hidden ${b}`,children:[e.jsxs("div",{className:"flex items-center gap-space-2 px-space-3 py-space-2 border-b border-gj-line",style:{backgroundImage:"linear-gradient(135deg, var(--gj-teal-soft), #fff)"},children:[e.jsx("span",{className:"w-7 h-7 rounded-gj-md bg-gj-teal text-white inline-flex items-center justify-center flex-shrink-0","aria-hidden":"true",children:e.jsx(o,{name:"check-circle",size:16})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"text-fs-200 font-black text-gj-teal-deep uppercase tracking-wide",children:g}),i&&e.jsx("div",{className:"text-fs-100 text-gj-grey",children:i})]})]}),e.jsx("ul",{className:"flex flex-col gap-space-2 px-space-3 py-space-3 list-none m-0",children:f.map((a,r)=>e.jsxs("li",{className:"flex items-center gap-space-2 text-fs-300 text-gj-ink",children:[e.jsx("span",{className:"w-[18px] h-[18px] rounded-full bg-gj-green-soft text-gj-green inline-flex items-center justify-center flex-shrink-0","aria-hidden":"true",children:e.jsx(o,{name:a.icon,size:11})}),e.jsx("span",{className:"min-w-0",children:a.label})]},r))}),s&&s.length>0&&e.jsx("div",{className:"flex gap-space-2 px-space-3 pb-space-3",children:s.map((a,r)=>e.jsx("button",{type:"button",onClick:a.onClick,className:`flex-1 rounded-gj-lg px-space-3 py-space-2 text-fs-300 font-bold
                ${a.primary?"bg-gj-teal-deep text-white border-0":"bg-white text-gj-teal-deep border-[1.5px] border-gj-line"}
              `,children:a.label},r))})]})}x.__docgenInfo={description:`YayeActionCard — carte "Yaye a agi pour toi" dans la conversation IA.

Conforme \`screens.jsx\` #10 (Action card) :
- Header avec icône check-circle vert + titre (uppercase, teal-deep)
- Liste de rows actions (icon + label avec dot vert)
- Grid 2 boutons (primary teal-deep + secondary outlined)`,methods:[],displayName:"YayeActionCard",props:{title:{required:!1,tsType:{name:"string"},description:'Titre encadré (rendu au-dessus des actions). Défaut "Yaye a agi pour toi".',defaultValue:{value:"'Yaye a agi pour toi'",computed:!1}},subtitle:{required:!1,tsType:{name:"string"},description:'Sous-titre (ex: "3 actions · à valider").'},actions:{required:!0,tsType:{name:"Array",elements:[{name:"YayeAction"}],raw:"YayeAction[]"},description:"Liste des actions effectuées par Yaye."},buttons:{required:!1,tsType:{name:"Array",elements:[{name:"YayeActionButton"}],raw:"YayeActionButton[]"},description:"Boutons CTA en pied (2 max recommandés)."},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const v={title:"UI/Yaye/YayeActionCard",component:x},t={args:{title:"Yaye a agi pour toi",subtitle:"3 actions · à valider",actions:[{icon:"check",label:e.jsxs(e.Fragment,{children:["Préselection · ",e.jsx("b",{children:"Stage agronomie"})," · 180 000 F"]})},{icon:"check",label:e.jsxs(e.Fragment,{children:["Préselection · ",e.jsx("b",{children:"Assistant maraîcher"})," · 150 000 F"]})},{icon:"document",label:"CV adapté en brouillon — relu en 30 s"}],buttons:[{label:"Voir les 2 offres",primary:!0},{label:"Postule les 2"}]}},n={args:{title:"Yaye a complété ton dossier",actions:[{icon:"check",label:"Profil mis à jour"},{icon:"check",label:"CV exporté en PDF"}]}};var c,l,d;t.parameters={...t.parameters,docs:{...(c=t.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    title: 'Yaye a agi pour toi',
    subtitle: '3 actions · à valider',
    actions: [{
      icon: 'check',
      label: <>Préselection · <b>Stage agronomie</b> · 180 000 F</>
    }, {
      icon: 'check',
      label: <>Préselection · <b>Assistant maraîcher</b> · 150 000 F</>
    }, {
      icon: 'document',
      label: 'CV adapté en brouillon — relu en 30 s'
    }],
    buttons: [{
      label: 'Voir les 2 offres',
      primary: true
    }, {
      label: 'Postule les 2'
    }]
  }
}`,...(d=(l=t.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};var p,m,u;n.parameters={...n.parameters,docs:{...(p=n.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    title: 'Yaye a complété ton dossier',
    actions: [{
      icon: 'check',
      label: 'Profil mis à jour'
    }, {
      icon: 'check',
      label: 'CV exporté en PDF'
    }]
  }
}`,...(u=(m=n.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};const Y=["Default","NoButtons"];export{t as Default,n as NoButtons,Y as __namedExportsOrder,v as default};
