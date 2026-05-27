import{j as e}from"./jsx-runtime-DmkHMFbR.js";import"./iframe-C5hSx71m.js";import"./preload-helper-Dp1pzeXC.js";function r({from:v,children:j,timestamp:n,className:B=""}){const a=v==="bot";return e.jsxs("div",{className:`flex flex-col gap-1 ${a?"items-start":"items-end"} ${B}`,children:[e.jsx("div",{className:`text-fs-300 leading-snug px-space-3 py-space-2 max-w-[75%] md:max-w-[60%]
          ${a?"bg-white border border-gj-line text-color-text-primary":"bg-gj-teal-deep text-white"}
        `,style:{borderRadius:a?"12px 12px 12px 4px":"12px 12px 4px 12px",boxShadow:a?"none":"0 2px 6px rgba(0,122,92,.18)"},children:j}),n&&e.jsx("span",{className:"text-fs-100 text-gj-grey px-1","aria-label":`Envoyé à ${n}`,children:n})]})}r.__docgenInfo={description:"YayeBubble — bulle de chat asymétrique dans la conversation Yaye.\n\n- `bot` : surface white, border `--gj-line`, ink, coin bottom-left réduit\n- `user` : background `--gj-teal-deep`, texte blanc, coin bottom-right réduit\n- Max-width responsive (75% mobile, 60% desktop)\n- Aligné à gauche (bot) ou à droite (user)\n\nConforme `screens.jsx` #10 (YayeFullScreen).",methods:[],displayName:"YayeBubble",props:{from:{required:!0,tsType:{name:"union",raw:"'bot' | 'user'",elements:[{name:"literal",value:"'bot'"},{name:"literal",value:"'user'"}]},description:""},children:{required:!0,tsType:{name:"ReactNode"},description:""},timestamp:{required:!1,tsType:{name:"string"},description:"Horaire affiché sous la bulle (optionnel, format libre)."},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const S={title:"UI/Yaye/YayeBubble",component:r,argTypes:{from:{control:{type:"inline-radio"},options:["bot","user"]}},args:{from:"bot",children:"Salama Awa. Comment puis-je t'aider aujourd'hui ?"}},o={},s={args:{from:"user",children:"Trouve-moi un stage en agro près de chez moi."}},t={args:{timestamp:"9:41"}},i={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12,background:"#F5FAF8",padding:16,borderRadius:14},children:[e.jsx(r,{from:"bot",timestamp:"9:41",children:"Salama Awa. J'ai 3 opportunités à 90%+ match pour toi à Tambacounda."}),e.jsx(r,{from:"user",timestamp:"9:42",children:"Trouve-moi un stage en agro, près de chez moi, payé."}),e.jsx(r,{from:"bot",children:"Reçu. J'ai filtré 247 offres → 2 collent vraiment. Je te montre ?"}),e.jsx(r,{from:"user",children:"Oui"})]})};var m,l,u;o.parameters={...o.parameters,docs:{...(m=o.parameters)==null?void 0:m.docs,source:{originalSource:"{}",...(u=(l=o.parameters)==null?void 0:l.docs)==null?void 0:u.source}}};var p,c,d;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    from: 'user',
    children: 'Trouve-moi un stage en agro près de chez moi.'
  }
}`,...(d=(c=s.parameters)==null?void 0:c.docs)==null?void 0:d.source}}};var b,g,x;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    timestamp: '9:41'
  }
}`,...(x=(g=t.parameters)==null?void 0:g.docs)==null?void 0:x.source}}};var f,y,h;i.parameters={...i.parameters,docs:{...(f=i.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: '#F5FAF8',
    padding: 16,
    borderRadius: 14
  }}>
      <YayeBubble from="bot" timestamp="9:41">
        Salama Awa. J&apos;ai 3 opportunités à 90%+ match pour toi à Tambacounda.
      </YayeBubble>
      <YayeBubble from="user" timestamp="9:42">
        Trouve-moi un stage en agro, près de chez moi, payé.
      </YayeBubble>
      <YayeBubble from="bot">
        Reçu. J&apos;ai filtré 247 offres → 2 collent vraiment. Je te montre ?
      </YayeBubble>
      <YayeBubble from="user">Oui</YayeBubble>
    </div>
}`,...(h=(y=i.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};const F=["Bot","User","WithTimestamp","Conversation"];export{o as Bot,i as Conversation,s as User,t as WithTimestamp,F as __namedExportsOrder,S as default};
