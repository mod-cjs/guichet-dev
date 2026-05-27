import{j as r}from"./jsx-runtime-DmkHMFbR.js";import{a as i,I as y}from"./index-DM1jvaOu.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";const h={title:"UI/Icon",component:i,parameters:{layout:"centered"},args:{name:"home",size:24}},a={},s={args:{name:"bell",title:"Notifications",size:32}},n={render:()=>r.jsx("div",{style:{display:"flex",gap:16,alignItems:"center",color:"var(--gj-teal-deep)"},children:[16,20,24,32,48].map(e=>r.jsx(i,{name:"sparkle",size:e},e))})},o={render:()=>r.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(96px, 1fr))",gap:16,padding:16,color:"var(--gj-teal-deep)"},children:y.map(e=>r.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:12,background:"var(--gj-surface)",border:"1px solid var(--gj-line)",borderRadius:8,fontSize:11,color:"var(--gj-grey)"},children:[r.jsx(i,{name:e,size:28}),r.jsx("code",{children:e})]},e))})};var t,l,d;a.parameters={...a.parameters,docs:{...(t=a.parameters)==null?void 0:t.docs,source:{originalSource:"{}",...(d=(l=a.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};var c,p,m;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    name: 'bell',
    title: 'Notifications',
    size: 32
  }
}`,...(m=(p=s.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var g,u,x;n.parameters={...n.parameters,docs:{...(g=n.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    color: 'var(--gj-teal-deep)'
  }}>
      {[16, 20, 24, 32, 48].map(s => <Icon key={s} name="sparkle" size={s} />)}
    </div>
}`,...(x=(u=n.parameters)==null?void 0:u.docs)==null?void 0:x.source}}};var f,v,j;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
    gap: 16,
    padding: 16,
    color: 'var(--gj-teal-deep)'
  }}>
      {ICON_NAMES.map(name => <div key={name} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: 12,
      background: 'var(--gj-surface)',
      border: '1px solid var(--gj-line)',
      borderRadius: 8,
      fontSize: 11,
      color: 'var(--gj-grey)'
    }}>
          <Icon name={name} size={28} />
          <code>{name}</code>
        </div>)}
    </div>
}`,...(j=(v=o.parameters)==null?void 0:v.docs)==null?void 0:j.source}}};const k=["Default","WithTitle","Sizes","AllIcons"];export{o as AllIcons,a as Default,n as Sizes,s as WithTitle,k as __namedExportsOrder,h as default};
