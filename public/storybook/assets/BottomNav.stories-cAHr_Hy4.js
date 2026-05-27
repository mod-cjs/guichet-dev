import{j as e}from"./jsx-runtime-DmkHMFbR.js";import{l as v}from"./index-2y7pnOH-.js";import{u as w}from"./iframe-C5hSx71m.js";import{a as N}from"./index-DM1jvaOu.js";import"./preload-helper-Dp1pzeXC.js";const y=[{href:"/",icon:"home",label:"Accueil"},{href:"/opportunites",icon:"search",label:"Opp"},{href:"/agenda",icon:"calendar",label:"Agenda"},{href:"/ressources",icon:"document",label:"Resso"},{href:"/jeune/mon-profil",icon:"profile",label:"Profil"}];function t({badges:l={}}){const c=w();return e.jsx("nav",{className:"fixed inset-x-0 bottom-0 bg-white border-t border-gj-line shadow-gj-nav grid grid-cols-5",style:{paddingBottom:"calc(6px + var(--safe-bottom))",zIndex:"var(--gj-z-bottom-nav)"},"aria-label":"Navigation principale",children:y.map(r=>{const a=c===r.href||r.href!=="/"&&c.startsWith(r.href),o=l[r.href];return e.jsxs(v,{href:r.href,className:`flex flex-col items-center gap-[2px] text-fs-100 font-bold
              pt-[6px] pb-[4px] relative cursor-pointer no-underline
              min-h-[var(--tap-min)] transition-colors
              ${a?"text-gj-teal-deep":"text-color-text-secondary"}`,style:{color:a?"var(--gj-teal-deep)":"var(--color-text-secondary)"},"aria-current":a?"page":void 0,children:[a&&e.jsx("span",{className:"absolute top-0 left-1/2 -translate-x-1/2 w-8 rounded-b-[3px]",style:{height:3,background:"var(--gj-teal-deep)"},"aria-hidden":!0}),o&&o>0?e.jsx("span",{className:"absolute top-[2px] right-[14px] min-w-[16px] h-4 bg-gj-red text-white rounded-[8px] text-[10px] font-bold px-[4px] flex items-center justify-center border-2 border-white",children:o>9?"9+":o}):null,e.jsx(N,{name:r.icon,size:22}),e.jsx("span",{style:{fontSize:"var(--fs-100)",fontWeight:a?800:600,lineHeight:1},children:r.label})]},r.href)})})}t.__docgenInfo={description:"",methods:[],displayName:"BottomNav",props:{badges:{required:!1,tsType:{name:"Partial",elements:[{name:"Record",elements:[{name:"string"},{name:"number"}],raw:"Record<string, number>"}],raw:"Partial<Record<string, number>>"},description:"",defaultValue:{value:"{}",computed:!1}}}};const _={title:"UI/BottomNav",component:t,parameters:{layout:"fullscreen"}},d=({children:l})=>e.jsx("div",{style:{position:"relative",minHeight:200,background:"var(--gj-bg)"},children:l}),n={render:()=>e.jsx(d,{children:e.jsx(t,{})})},s={render:()=>e.jsx(d,{children:e.jsx(t,{badges:{"/opportunites":3,"/agenda":12}})})},i={parameters:{viewport:{defaultViewport:"mobile1"}},render:()=>e.jsx(d,{children:e.jsx(t,{badges:{"/jeune/mon-profil":1}})})};var p,m,u;n.parameters={...n.parameters,docs:{...(p=n.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <Frame>
      <BottomNav />
    </Frame>
}`,...(u=(m=n.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var f,g,x;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <Frame>
      <BottomNav badges={{
      '/opportunites': 3,
      '/agenda': 12
    }} />
    </Frame>
}`,...(x=(g=s.parameters)==null?void 0:g.docs)==null?void 0:x.source}}};var h,b,j;i.parameters={...i.parameters,docs:{...(h=i.parameters)==null?void 0:h.docs,source:{originalSource:`{
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  },
  render: () => <Frame>
      <BottomNav badges={{
      '/jeune/mon-profil': 1
    }} />
    </Frame>
}`,...(j=(b=i.parameters)==null?void 0:b.docs)==null?void 0:j.source}}};const z=["Default","WithBadges","Mobile"];export{n as Default,i as Mobile,s as WithBadges,z as __namedExportsOrder,_ as default};
