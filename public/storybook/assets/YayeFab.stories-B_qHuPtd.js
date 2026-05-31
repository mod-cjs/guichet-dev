import{j as e}from"./jsx-runtime-DmkHMFbR.js";import{Y as g}from"./index-Dd3rRPC0.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function r({bottom:u=76,right:p=16,"aria-label":c="Parler à Yaye",className:m="",style:b,...f}){return e.jsxs("button",{type:"button","aria-label":c,className:`fixed flex items-center justify-center rounded-full
        focus-visible:outline-none ${m}`,style:{width:58,height:58,right:p,bottom:`calc(${u}px + var(--safe-bottom))`,background:"var(--gj-teal-deep)",color:"#fff",border:0,cursor:"pointer",boxShadow:"0 8px 24px rgba(7,77,57,.45)",zIndex:"var(--gj-z-chat)",...b},...f,children:[e.jsx("span",{"aria-hidden":"true",className:"absolute pointer-events-none rounded-full",style:{inset:-4,border:"2px solid var(--gj-yellow)",opacity:0,animation:"gj-pulse-yaye 2.5s ease-out infinite"}}),e.jsx(g,{size:32,withBadge:!0})]})}r.__docgenInfo={description:"YayeFab — bouton flottant d'accès à l'assistant IA Yaye.\n\nConforme `phone.jsx`/`mobile-flows.jsx` du design v2 :\n- 58×58, fond `--gj-teal-deep`, halo pulse `gj-pulse-yaye`\n- Contient un YayeAvatar (size 32, withBadge)\n- Positionné `fixed` bas-droite, z-index `--gj-z-chat`\n- Respecte la safe-area bottom iOS",methods:[],displayName:"YayeFab",props:{bottom:{required:!1,tsType:{name:"number"},description:"Position depuis le bas (en px). Défaut 76 pour laisser place à BottomNav.",defaultValue:{value:"76",computed:!1}},right:{required:!1,tsType:{name:"number"},description:"Position depuis la droite (en px). Défaut 16.",defaultValue:{value:"16",computed:!1}},"aria-label":{required:!1,tsType:{name:"string"},description:'Label accessible. Défaut "Parler à Yaye".',defaultValue:{value:"'Parler à Yaye'",computed:!1}},className:{defaultValue:{value:"''",computed:!1},required:!1}},composes:["Omit"]};const j={title:"UI/Yaye/YayeFab",component:r},a={render:()=>e.jsx("div",{style:{position:"relative",minHeight:400,background:"var(--gj-bg)"},children:e.jsx(r,{onClick:()=>alert("Open Yaye")})})},t={render:()=>e.jsxs("div",{style:{position:"relative",minHeight:400,background:"var(--gj-bg)",padding:16},children:[e.jsx("h2",{children:"Dashboard"}),e.jsx("p",{children:"Du contenu sous le FAB pour montrer la superposition."}),e.jsx(r,{})]})};var n,o,s;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  render: () => <div style={{
    position: 'relative',
    minHeight: 400,
    background: 'var(--gj-bg)'
  }}>
      <YayeFab onClick={() => alert('Open Yaye')} />
    </div>
}`,...(s=(o=a.parameters)==null?void 0:o.docs)==null?void 0:s.source}}};var i,l,d;t.parameters={...t.parameters,docs:{...(i=t.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => <div style={{
    position: 'relative',
    minHeight: 400,
    background: 'var(--gj-bg)',
    padding: 16
  }}>
      <h2>Dashboard</h2>
      <p>Du contenu sous le FAB pour montrer la superposition.</p>
      <YayeFab />
    </div>
}`,...(d=(l=t.parameters)==null?void 0:l.docs)==null?void 0:d.source}}};const Y=["Default","OverContent"];export{a as Default,t as OverContent,Y as __namedExportsOrder,j as default};
