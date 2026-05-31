import{j as e}from"./jsx-runtime-DmkHMFbR.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function S({step:T,total:w,label:F,sticky:n=!1,className:k=""}){const a=Math.max(1,w),i=Math.min(Math.max(0,T),a),p=i/a*100,l=F??`Étape ${i} / ${a}`;return e.jsxs("div",{className:k,style:{padding:"10px 16px 6px",background:"#fff",flexShrink:0,position:n?"sticky":void 0,top:n?0:void 0,zIndex:n?5:void 0},children:[e.jsx("div",{role:"progressbar","aria-valuenow":i,"aria-valuemin":0,"aria-valuemax":a,"aria-valuetext":l,style:{height:4,background:"var(--gj-bg)",borderRadius:3,overflow:"hidden"},children:e.jsx("div",{style:{height:"100%",width:`${p}%`,background:"var(--gj-teal-deep)",borderRadius:3,transition:"width .35s ease"}})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"var(--gj-grey)",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"},children:[e.jsx("span",{children:l}),e.jsxs("span",{"aria-hidden":!0,children:[Math.round(p)," %"]})]})]})}S.__docgenInfo={description:"",methods:[],displayName:"StepBar",props:{step:{required:!0,tsType:{name:"number"},description:"Étape courante (1-indexed, clampée [0, total])."},total:{required:!0,tsType:{name:"number"},description:"Total d'étapes."},label:{required:!1,tsType:{name:"string"},description:"Label personnalisé (défaut `Étape ${step} / ${total}`)."},sticky:{required:!1,tsType:{name:"boolean"},description:"Sticky top.",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const $={title:"UI/StepBar",component:S,parameters:{layout:"fullscreen"}},t={args:{step:2,total:5}},r={args:{step:4,total:5}},s={args:{step:5,total:5}},o={args:{step:3,total:7,label:"Profil — section 3 sur 7"}};var d,c,u;t.parameters={...t.parameters,docs:{...(d=t.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    step: 2,
    total: 5
  }
}`,...(u=(c=t.parameters)==null?void 0:c.docs)==null?void 0:u.source}}};var m,f,g;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    step: 4,
    total: 5
  }
}`,...(g=(f=r.parameters)==null?void 0:f.docs)==null?void 0:g.source}}};var x,v,h;s.parameters={...s.parameters,docs:{...(x=s.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    step: 5,
    total: 5
  }
}`,...(h=(v=s.parameters)==null?void 0:v.docs)==null?void 0:h.source}}};var b,y,j;o.parameters={...o.parameters,docs:{...(b=o.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    step: 3,
    total: 7,
    label: 'Profil — section 3 sur 7'
  }
}`,...(j=(y=o.parameters)==null?void 0:y.docs)==null?void 0:j.source}}};const M=["TwoOfFive","FourOfFive","Complete","CustomLabel"];export{s as Complete,o as CustomLabel,r as FourOfFive,t as TwoOfFive,M as __namedExportsOrder,$ as default};
