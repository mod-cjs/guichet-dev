import{j as e}from"./jsx-runtime-DmkHMFbR.js";import{a as E}from"./index-DM1jvaOu.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function b({htmlFor:I,required:o=!1,icon:t,children:j,className:N="",...y}){return e.jsxs("label",{htmlFor:I,className:`inline-flex items-center gap-1 uppercase
                  text-[12px] font-bold tracking-[0.4px]
                  text-color-text-muted ${N}`,...y,children:[t?e.jsx(E,{name:t,size:14}):null,e.jsx("span",{children:j}),o?e.jsx("span",{className:"text-gj-red","aria-hidden":"true",children:"*"}):null,o?e.jsx("span",{className:"sr-only",children:" (requis)"}):null]})}b.__docgenInfo={description:`<FieldLabel /> — label de champ en majuscules,
conforme au design v2 (uppercase 12px, letter-spacing 0.4px,
color text-muted, * rouge si required).`,methods:[],displayName:"FieldLabel",props:{htmlFor:{required:!0,tsType:{name:"string"},description:"ID du champ associé (htmlFor)."},required:{required:!1,tsType:{name:"boolean"},description:"Marque le champ comme requis (astérisque rouge).",defaultValue:{value:"false",computed:!1}},icon:{required:!1,tsType:{name:"unknown[number]",raw:"(typeof ICON_NAMES)[number]"},description:"Icône optionnelle à gauche du label."},children:{required:!0,tsType:{name:"ReactNode"},description:""},className:{defaultValue:{value:"''",computed:!1},required:!1}},composes:["Omit"]};const _={title:"UI/FieldLabel",component:b,args:{htmlFor:"demo",children:"Téléphone"}},r={},a={args:{required:!0,children:"Adresse email"}},s={args:{icon:"phone",children:"Téléphone (E.164)"}},n={args:{icon:"mail",required:!0,children:"Email"}};var i,c,l;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:"{}",...(l=(c=r.parameters)==null?void 0:c.docs)==null?void 0:l.source}}};var d,u,m;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    required: true,
    children: 'Adresse email'
  }
}`,...(m=(u=a.parameters)==null?void 0:u.docs)==null?void 0:m.source}}};var p,h,g;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    icon: 'phone',
    children: 'Téléphone (E.164)'
  }
}`,...(g=(h=s.parameters)==null?void 0:h.docs)==null?void 0:g.source}}};var f,x,q;n.parameters={...n.parameters,docs:{...(f=n.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    icon: 'mail',
    required: true,
    children: 'Email'
  }
}`,...(q=(x=n.parameters)==null?void 0:x.docs)==null?void 0:q.source}}};const L=["Default","Required","WithIcon","RequiredWithIcon"];export{r as Default,a as Required,n as RequiredWithIcon,s as WithIcon,L as __namedExportsOrder,_ as default};
