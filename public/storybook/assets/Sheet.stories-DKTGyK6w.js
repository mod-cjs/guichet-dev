import{j as e}from"./jsx-runtime-DmkHMFbR.js";import{r as o}from"./iframe-C5hSx71m.js";import{B as f}from"./index-YJrtzRXp.js";import"./preload-helper-Dp1pzeXC.js";const $=90,k='a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';function x({isOpen:a,onClose:s,title:r,variant:d="side",maxHeightPct:q=94,children:B}){const[g,y]=o.useState(!1),[b,h]=o.useState(0),u=o.useRef(null),c=o.useRef(null),j=o.useRef(null),S=o.useId(),v=o.useCallback(t=>{if(t.key==="Escape"){t.preventDefault(),s();return}if(t.key!=="Tab"||!c.current)return;const n=Array.from(c.current.querySelectorAll(k)).filter(D=>!D.hasAttribute("disabled")&&D.tabIndex!==-1);if(n.length===0)return;const i=n[0],l=n[n.length-1];t.shiftKey&&document.activeElement===i?(t.preventDefault(),l.focus()):!t.shiftKey&&document.activeElement===l&&(t.preventDefault(),i.focus())},[s]);if(o.useEffect(()=>{if(!a)return;j.current=document.activeElement??null,document.body.style.overflow="hidden",document.addEventListener("keydown",v);const t=requestAnimationFrame(()=>{var l;y(!0);const i=(l=c.current)==null?void 0:l.querySelector(k);i==null||i.focus()}),n=j.current;return()=>{if(document.body.style.overflow="",document.removeEventListener("keydown",v),cancelAnimationFrame(t),y(!1),h(0),n&&document.body.contains(n))try{n.focus()}catch{}}},[a,v]),!a)return null;const N=d==="side"?"inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[620px] md:max-w-full":"inset-x-0 bottom-0",A="rounded-t-gj-2xl"+(d==="side"?" md:rounded-none":""),F=d==="side"?"translate-y-full md:translate-y-0 md:translate-x-full":"translate-y-full",I=t=>{u.current=t.touches[0].clientY},H=t=>{if(u.current===null)return;const n=t.touches[0].clientY-u.current;n>0&&h(n)},P=()=>{b>$&&s(),h(0),u.current=null};return e.jsxs("div",{className:"fixed inset-0",style:{zIndex:"var(--gj-z-overlay)"},children:[e.jsx("div",{className:`absolute inset-0 transition-opacity duration-[var(--motion-base)] ease-[var(--motion-ease)]
          ${g?"opacity-100":"opacity-0"}`,style:{background:"var(--gj-overlay)"},onClick:s,"aria-hidden":!0}),e.jsxs("div",{ref:c,role:"dialog","aria-modal":"true","aria-labelledby":r?S:void 0,"aria-label":r?void 0:"Panneau",tabIndex:-1,className:`absolute ${N} ${A}
          bg-white shadow-gj-lg flex flex-col md:max-h-full
          transition-transform duration-[var(--motion-base)] ease-[var(--motion-ease)]
          ${g?"translate-x-0 translate-y-0":F}`,style:{paddingBottom:"var(--safe-bottom)",maxHeight:`${q}%`,...b>0?{transform:`translateY(${b}px)`,transition:"none"}:{}},children:[e.jsx("div",{className:`${d==="side"?"md:hidden":""} pt-space-2 pb-space-1
            flex justify-center cursor-grab touch-none`,onTouchStart:I,onTouchMove:H,onTouchEnd:P,children:e.jsx("span",{className:"w-12 h-[5px] rounded-full bg-gj-line-strong"})}),r&&e.jsxs("div",{className:"flex items-center justify-between px-space-4 py-space-3 border-b border-gj-line",children:[e.jsx("h2",{id:S,className:"text-fs-500 font-black text-color-text-primary",children:r}),e.jsx("button",{onClick:s,"aria-label":"Fermer",className:"min-h-[var(--tap-min)] min-w-[var(--tap-min)] flex items-center justify-center text-gj-grey hover:text-gj-ink rounded-gj-pill",children:"✕"})]}),e.jsx("div",{className:"overflow-y-auto px-space-4 py-space-3",children:B})]})]})}x.__docgenInfo={description:"Panneau coulissant (GUIC-20/21, refonte v2 GUIC-173) — bottom-sheet sur\nmobile, slide-over latéral 620px sur desktop quand `variant='side'`.\n\nv2 :\n- radius top `--gj-r-2xl`, overlay `--gj-overlay`, motion `--motion-base`\n- focus trap minimal (Tab/Shift+Tab restent dans le panel)\n- restitution du focus à la fermeture sur l'élément déclencheur\n- ARIA dialog + aria-modal + aria-labelledby si title fourni",methods:[],displayName:"Sheet",props:{isOpen:{required:!0,tsType:{name:"boolean"},description:""},onClose:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},title:{required:!1,tsType:{name:"string"},description:""},variant:{required:!1,tsType:{name:"union",raw:"'bottom' | 'side'",elements:[{name:"literal",value:"'bottom'"},{name:"literal",value:"'side'"}]},description:"'bottom' = bottom-sheet partout · 'side' = bottom mobile / slide-over droit desktop.",defaultValue:{value:"'side'",computed:!1}},maxHeightPct:{required:!1,tsType:{name:"number"},description:"Hauteur max du panel mobile en pourcentage du viewport (défaut 94 — design v2).",defaultValue:{value:"94",computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:""}}};const V={title:"UI/Sheet",component:x},p={render:()=>{const a=()=>{const[s,r]=o.useState(!0);return e.jsxs("div",{style:{minHeight:400},children:[e.jsx(f,{onClick:()=>r(!0),children:"Ouvrir filtres"}),e.jsx(x,{isOpen:s,onClose:()=>r(!1),variant:"bottom",title:"Filtres",children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsx("label",{children:"Région"}),e.jsxs("select",{style:{padding:12,border:"1.5px solid var(--gj-line)",borderRadius:8},children:[e.jsx("option",{children:"Dakar"}),e.jsx("option",{children:"Tambacounda"})]}),e.jsx("label",{children:"Domaine"}),e.jsxs("select",{style:{padding:12,border:"1.5px solid var(--gj-line)",borderRadius:8},children:[e.jsx("option",{children:"Agriculture"}),e.jsx("option",{children:"Numérique"})]}),e.jsx(f,{onClick:()=>r(!1),children:"Appliquer"})]})})]})};return e.jsx(a,{})}},m={render:()=>{const a=()=>{const[s,r]=o.useState(!0);return e.jsxs("div",{style:{minHeight:400},children:[e.jsx(f,{onClick:()=>r(!0),children:"Voir détail"}),e.jsxs(x,{isOpen:s,onClose:()=>r(!1),variant:"side",title:"Stage agronomie",children:[e.jsx("p",{children:"180 000 F · Tambacounda · 3 mois"}),e.jsx("p",{style:{color:"var(--gj-grey)"},children:"Description complète de l'opportunité. Plusieurs paragraphes pour démontrer le scroll."}),e.jsx(f,{children:"Candidater"})]})]})};return e.jsx(a,{})}};var O,w,T;p.parameters={...p.parameters,docs:{...(O=p.parameters)==null?void 0:O.docs,source:{originalSource:`{
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(true);
      return <div style={{
        minHeight: 400
      }}>
          <Button onClick={() => setOpen(true)}>Ouvrir filtres</Button>
          <Sheet isOpen={open} onClose={() => setOpen(false)} variant="bottom" title="Filtres">
            <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
              <label>Région</label>
              <select style={{
              padding: 12,
              border: '1.5px solid var(--gj-line)',
              borderRadius: 8
            }}>
                <option>Dakar</option>
                <option>Tambacounda</option>
              </select>
              <label>Domaine</label>
              <select style={{
              padding: 12,
              border: '1.5px solid var(--gj-line)',
              borderRadius: 8
            }}>
                <option>Agriculture</option>
                <option>Numérique</option>
              </select>
              <Button onClick={() => setOpen(false)}>Appliquer</Button>
            </div>
          </Sheet>
        </div>;
    };
    return <Demo />;
  }
}`,...(T=(w=p.parameters)==null?void 0:w.docs)==null?void 0:T.source}}};var C,R,E;m.parameters={...m.parameters,docs:{...(C=m.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(true);
      return <div style={{
        minHeight: 400
      }}>
          <Button onClick={() => setOpen(true)}>Voir détail</Button>
          <Sheet isOpen={open} onClose={() => setOpen(false)} variant="side" title="Stage agronomie">
            <p>180 000 F · Tambacounda · 3 mois</p>
            <p style={{
            color: 'var(--gj-grey)'
          }}>
              Description complète de l&apos;opportunité. Plusieurs paragraphes pour démontrer le scroll.
            </p>
            <Button>Candidater</Button>
          </Sheet>
        </div>;
    };
    return <Demo />;
  }
}`,...(E=(R=m.parameters)==null?void 0:R.docs)==null?void 0:E.source}}};const K=["BottomFiltres","SideOpportuniteDetail"];export{p as BottomFiltres,m as SideOpportuniteDetail,K as __namedExportsOrder,V as default};
