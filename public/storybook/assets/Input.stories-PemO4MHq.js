import{j as e}from"./jsx-runtime-DmkHMFbR.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function W({label:i,error:r,hint:d,id:c,className:D="",...u}){return e.jsxs("div",{className:"flex flex-col gap-space-1",children:[i&&e.jsxs("label",{htmlFor:c,className:"text-fs-300 font-bold text-color-text-primary",children:[i,u.required&&e.jsx("span",{className:"text-gj-red ml-1","aria-hidden":!0,children:"*"})]}),e.jsx("input",{id:c,className:`w-full px-space-3 rounded-gj-md border-[1.5px] bg-white font-[inherit]
          text-[16px] min-h-[var(--tap-input)]
          transition-colors duration-200
          ${r?"border-gj-red focus:border-gj-red":"border-gj-line focus:border-gj-teal-deep"}
          focus:outline-none focus:ring-[3px] focus:ring-[var(--focus-ring-soft)]
          disabled:bg-gj-bg disabled:text-gj-grey
          ${D}`,...u}),d&&!r&&e.jsx("p",{className:"text-fs-200 text-color-text-muted",children:d}),r&&e.jsx("p",{className:"text-fs-200 text-gj-red",children:r})]})}W.__docgenInfo={description:"",methods:[],displayName:"Input",props:{label:{required:!1,tsType:{name:"string"},description:""},error:{required:!1,tsType:{name:"string"},description:""},hint:{required:!1,tsType:{name:"string"},description:""},className:{defaultValue:{value:"''",computed:!1},required:!1}},composes:["InputHTMLAttributes"]};const R={title:"UI/Input",component:W,args:{id:"demo",placeholder:"Saisir une valeur"}},a={},s={args:{label:"Nom complet"}},t={args:{label:"Email",required:!0,type:"email",placeholder:"nom@exemple.sn"}},o={args:{label:"Téléphone",hint:"Format E.164 attendu (+221XXXXXXXXX)"}},n={args:{label:"Téléphone",value:"0612345",error:"Numéro invalide — utiliser le format +221XXXXXXXXX"}},l={args:{label:"Identifiant",value:"cjs_uid_abcdef",disabled:!0}};var p,m,g;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:"{}",...(g=(m=a.parameters)==null?void 0:m.docs)==null?void 0:g.source}}};var X,f,b;s.parameters={...s.parameters,docs:{...(X=s.parameters)==null?void 0:X.docs,source:{originalSource:`{
  args: {
    label: 'Nom complet'
  }
}`,...(b=(f=s.parameters)==null?void 0:f.docs)==null?void 0:b.source}}};var x,h,j;t.parameters={...t.parameters,docs:{...(x=t.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    label: 'Email',
    required: true,
    type: 'email',
    placeholder: 'nom@exemple.sn'
  }
}`,...(j=(h=t.parameters)==null?void 0:h.docs)==null?void 0:j.source}}};var N,v,q;o.parameters={...o.parameters,docs:{...(N=o.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    label: 'Téléphone',
    hint: 'Format E.164 attendu (+221XXXXXXXXX)'
  }
}`,...(q=(v=o.parameters)==null?void 0:v.docs)==null?void 0:q.source}}};var y,E,I;n.parameters={...n.parameters,docs:{...(y=n.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    label: 'Téléphone',
    value: '0612345',
    error: 'Numéro invalide — utiliser le format +221XXXXXXXXX'
  }
}`,...(I=(E=n.parameters)==null?void 0:E.docs)==null?void 0:I.source}}};var T,_,S;l.parameters={...l.parameters,docs:{...(T=l.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    label: 'Identifiant',
    value: 'cjs_uid_abcdef',
    disabled: true
  }
}`,...(S=(_=l.parameters)==null?void 0:_.docs)==null?void 0:S.source}}};const w=["Default","WithLabel","Required","WithHint","WithError","Disabled"];export{a as Default,l as Disabled,t as Required,n as WithError,o as WithHint,s as WithLabel,w as __namedExportsOrder,R as default};
