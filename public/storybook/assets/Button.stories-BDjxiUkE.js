import{j as r}from"./jsx-runtime-DmkHMFbR.js";import{B as p}from"./index-YJrtzRXp.js";import{a as R}from"./index-DM1jvaOu.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";const J={title:"UI/Button",component:p,argTypes:{variant:{control:"select",options:["primary","secondary","ghost","text","danger"]},size:{control:"select",options:["sm","md","lg"]}},args:{children:"Action"}},e={args:{variant:"primary"}},s={args:{variant:"secondary"}},n={args:{variant:"ghost"}},t={args:{variant:"text",children:"En savoir plus"}},o={args:{variant:"danger",children:"Supprimer"}},i={args:{loading:!0}},c={args:{disabled:!0}},d={args:{children:r.jsxs(r.Fragment,{children:[r.jsx(R,{name:"plus",size:18}),"Ajouter"]})}},m={render:()=>r.jsx("div",{style:{display:"grid",gap:12},children:["primary","secondary","ghost","text","danger"].map(a=>r.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center"},children:[r.jsxs(p,{variant:a,size:"sm",children:[a," sm"]}),r.jsxs(p,{variant:a,size:"md",children:[a," md"]}),r.jsxs(p,{variant:a,size:"lg",children:[a," lg"]})]},a))})};var l,g,u;e.parameters={...e.parameters,docs:{...(l=e.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    variant: 'primary'
  }
}`,...(u=(g=e.parameters)==null?void 0:g.docs)==null?void 0:u.source}}};var v,y,h;s.parameters={...s.parameters,docs:{...(v=s.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    variant: 'secondary'
  }
}`,...(h=(y=s.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};var x,S,j;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    variant: 'ghost'
  }
}`,...(j=(S=n.parameters)==null?void 0:S.docs)==null?void 0:j.source}}};var z,B,I;t.parameters={...t.parameters,docs:{...(z=t.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    variant: 'text',
    children: 'En savoir plus'
  }
}`,...(I=(B=t.parameters)==null?void 0:B.docs)==null?void 0:I.source}}};var f,A,b;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    variant: 'danger',
    children: 'Supprimer'
  }
}`,...(b=(A=o.parameters)==null?void 0:A.docs)==null?void 0:b.source}}};var D,E,T;i.parameters={...i.parameters,docs:{...(D=i.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    loading: true
  }
}`,...(T=(E=i.parameters)==null?void 0:E.docs)==null?void 0:T.source}}};var G,L,P;c.parameters={...c.parameters,docs:{...(G=c.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...(P=(L=c.parameters)==null?void 0:L.docs)==null?void 0:P.source}}};var V,W,_;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    children: <>
        <Icon name="plus" size={18} />
        Ajouter
      </>
  }
}`,...(_=(W=d.parameters)==null?void 0:W.docs)==null?void 0:_.source}}};var k,F,O;m.parameters={...m.parameters,docs:{...(k=m.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'grid',
    gap: 12
  }}>
      {(['primary', 'secondary', 'ghost', 'text', 'danger'] as const).map(v => <div key={v} style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }}>
          <Button variant={v} size="sm">{v} sm</Button>
          <Button variant={v} size="md">{v} md</Button>
          <Button variant={v} size="lg">{v} lg</Button>
        </div>)}
    </div>
}`,...(O=(F=m.parameters)==null?void 0:F.docs)==null?void 0:O.source}}};const K=["Primary","Secondary","Ghost","Text","Danger","Loading","Disabled","WithIcon","AllVariants"];export{m as AllVariants,o as Danger,c as Disabled,n as Ghost,i as Loading,e as Primary,s as Secondary,t as Text,d as WithIcon,K as __namedExportsOrder,J as default};
