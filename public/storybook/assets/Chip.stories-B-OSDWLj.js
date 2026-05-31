import{j as n}from"./jsx-runtime-DmkHMFbR.js";import{r as _}from"./iframe-C5hSx71m.js";import{a as b}from"./index-DM1jvaOu.js";import"./preload-helper-Dp1pzeXC.js";function f({children:a,selected:o=!1,removable:m=!1,onRemove:r,icon:l,className:e="",type:s="button",...g}){const V="inline-flex items-center gap-2 rounded-gj-pill border-[1.5px] px-3 text-fs-300 font-semibold leading-none transition-colors duration-200 min-h-[42px] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]",T=o?"bg-gj-teal-soft border-gj-teal-deep text-gj-teal-deep font-bold":"bg-gj-surface border-gj-line text-color-text-primary hover:border-gj-line-strong";return n.jsxs("button",{type:s,"aria-pressed":o,className:`${V} ${T} ${e}`,...g,children:[l?n.jsx(b,{name:l,size:16}):null,n.jsx("span",{children:a}),m?n.jsx("span",{role:"button","aria-label":`Retirer ${typeof a=="string"?a:"le filtre"}`,tabIndex:0,onClick:t=>{t.stopPropagation(),r==null||r()},onKeyDown:t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),t.stopPropagation(),r==null||r())},className:"inline-flex items-center justify-center rounded-full w-5 h-5 hover:bg-black/5 cursor-pointer",children:n.jsx(b,{name:"close",size:12})}):null]})}f.__docgenInfo={description:`<Chip /> — pill sélectable (filtres, intérêts, tags interactifs).

Conforme au design v2 :
- radius pill (999px), min-h 42px (hit-target proche du minimum tactile)
- default : surface + border line, label gris foncé
- selected : teal-soft + border teal-deep, label teal-deep en gras
- removable : croix à droite (cliquable séparément, aria-label dédié)`,methods:[],displayName:"Chip",props:{children:{required:!0,tsType:{name:"ReactNode"},description:"Label affiché dans le chip."},selected:{required:!1,tsType:{name:"boolean"},description:"État sélectionné (visuel teal-soft).",defaultValue:{value:"false",computed:!1}},removable:{required:!1,tsType:{name:"boolean"},description:"Affiche une croix à droite déclenchant `onRemove`.",defaultValue:{value:"false",computed:!1}},onRemove:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Callback appelé quand on clique sur la croix (uniquement si removable)."},icon:{required:!1,tsType:{name:"unknown[number]",raw:"(typeof ICON_NAMES)[number]"},description:"Icône optionnelle à gauche du label (depuis le sprite)."},className:{defaultValue:{value:"''",computed:!1},required:!1},type:{defaultValue:{value:"'button'",computed:!1},required:!1}},composes:["Omit"]};const B={title:"UI/Chip",component:f,args:{children:"Agriculture"}},i={},c={args:{selected:!0}},u={args:{icon:"agriculture",children:"Agriculture"}},d={args:{removable:!0,selected:!0,children:"Dakar"}},p={render:()=>{const a=()=>{const[o,m]=_.useState(["emploi"]),r=e=>m(s=>s.includes(e)?s.filter(g=>g!==e):[...s,e]),l=[{key:"emploi",label:"Emploi",icon:"employment"},{key:"formation",label:"Formation",icon:"learning"},{key:"bourse",label:"Bourse",icon:"funding"},{key:"volontariat",label:"Volontariat",icon:"engagement"}];return n.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap"},children:l.map(e=>n.jsx(f,{icon:e.icon,selected:o.includes(e.key),onClick:()=>r(e.key),children:e.label},e.key))})};return n.jsx(a,{})}};var y,x,h;i.parameters={...i.parameters,docs:{...(y=i.parameters)==null?void 0:y.docs,source:{originalSource:"{}",...(h=(x=i.parameters)==null?void 0:x.docs)==null?void 0:h.source}}};var k,v,j;c.parameters={...c.parameters,docs:{...(k=c.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    selected: true
  }
}`,...(j=(v=c.parameters)==null?void 0:v.docs)==null?void 0:j.source}}};var S,C,q;u.parameters={...u.parameters,docs:{...(S=u.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    icon: 'agriculture',
    children: 'Agriculture'
  }
}`,...(q=(C=u.parameters)==null?void 0:C.docs)==null?void 0:q.source}}};var D,I,w;d.parameters={...d.parameters,docs:{...(D=d.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    removable: true,
    selected: true,
    children: 'Dakar'
  }
}`,...(w=(I=d.parameters)==null?void 0:I.docs)==null?void 0:w.source}}};var E,N,A;p.parameters={...p.parameters,docs:{...(E=p.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => {
    const Demo = () => {
      const [selected, setSelected] = useState<string[]>(['emploi']);
      const toggle = (k: string) => setSelected(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
      const items: Array<{
        key: string;
        label: string;
        icon: 'employment' | 'learning' | 'funding' | 'engagement';
      }> = [{
        key: 'emploi',
        label: 'Emploi',
        icon: 'employment'
      }, {
        key: 'formation',
        label: 'Formation',
        icon: 'learning'
      }, {
        key: 'bourse',
        label: 'Bourse',
        icon: 'funding'
      }, {
        key: 'volontariat',
        label: 'Volontariat',
        icon: 'engagement'
      }];
      return <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }}>
          {items.map(it => <Chip key={it.key} icon={it.icon} selected={selected.includes(it.key)} onClick={() => toggle(it.key)}>
              {it.label}
            </Chip>)}
        </div>;
    };
    return <Demo />;
  }
}`,...(A=(N=p.parameters)==null?void 0:N.docs)==null?void 0:A.source}}};const F=["Default","Selected","WithIcon","Removable","Group"];export{i as Default,p as Group,d as Removable,c as Selected,u as WithIcon,F as __namedExportsOrder,B as default};
