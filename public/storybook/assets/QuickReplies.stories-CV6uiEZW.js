import{j as e}from"./jsx-runtime-DmkHMFbR.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function c({replies:l,onSelect:d,className:m="","aria-label":g="Réponses suggérées"}){return e.jsx("div",{role:"group","aria-label":g,className:`flex flex-col gap-space-1 max-w-[84%] ${m}`,children:l.map(r=>e.jsxs("button",{type:"button",onClick:()=>d(r.value),className:"inline-flex items-center gap-space-1 bg-white text-gj-teal-deep border-[1.5px] border-gj-teal-deep rounded-gj-pill px-space-3 py-space-2 text-fs-300 font-bold text-left min-h-[40px] cursor-pointer hover:bg-gj-teal-soft transition-colors",children:[e.jsx("span",{className:"flex-1 min-w-0",children:r.label}),e.jsx("span",{"aria-hidden":"true",className:"opacity-55 ml-auto",children:"→"})]},r.value))})}c.__docgenInfo={description:`QuickReplies — boutons de réponses rapides proposés par Yaye.

- Liste de boutons outlined teal-deep, radius pill
- Min-height 40px, alignement left, flèche \`→\` à droite
- Wrap responsive
- Callback \`onSelect(value)\` au clic ou Entrée`,methods:[],displayName:"QuickReplies",props:{replies:{required:!0,tsType:{name:"Array",elements:[{name:"QuickReply"}],raw:"QuickReply[]"},description:""},onSelect:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},"aria-label":{required:!1,tsType:{name:"string"},description:'Label ARIA du groupe. Défaut "Réponses suggérées".',defaultValue:{value:"'Réponses suggérées'",computed:!1}}}};const x={title:"UI/Yaye/QuickReplies",component:c},a={args:{onSelect:l=>alert(l),replies:[{label:"Voir les 2 offres en détail",value:"see-offers"},{label:"Élargis à Kédougou aussi",value:"expand-kedougou"},{label:"Tu peux postuler pour moi ?",value:"apply-for-me"}]}},s={args:{onSelect:()=>{},replies:[{label:"Oui",value:"yes"},{label:"Non",value:"no"}]}};var n,o,t;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    onSelect: v => alert(v),
    replies: [{
      label: 'Voir les 2 offres en détail',
      value: 'see-offers'
    }, {
      label: 'Élargis à Kédougou aussi',
      value: 'expand-kedougou'
    }, {
      label: 'Tu peux postuler pour moi ?',
      value: 'apply-for-me'
    }]
  }
}`,...(t=(o=a.parameters)==null?void 0:o.docs)==null?void 0:t.source}}};var i,u,p;s.parameters={...s.parameters,docs:{...(i=s.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    onSelect: () => {},
    replies: [{
      label: 'Oui',
      value: 'yes'
    }, {
      label: 'Non',
      value: 'no'
    }]
  }
}`,...(p=(u=s.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};const y=["Default","Few"];export{a as Default,s as Few,y as __namedExportsOrder,x as default};
