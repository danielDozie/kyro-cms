import {generateHTML}from'@tiptap/html';import y from'@tiptap/starter-kit';import b from'@tiptap/extension-link';import F from'@tiptap/extension-image';import h from'@tiptap/extension-text-align';import k from'@tiptap/extension-underline';import T from'@tiptap/extension-highlight';import w from'@tiptap/extension-task-list';import R from'@tiptap/extension-task-item';import {TextStyle}from'@tiptap/extension-text-style';import C from'@tiptap/extension-color';var p=["text","number","checkbox","date","email","password","textarea","select","radio","color","icon"],g=["richtext","json","code","upload","image","markdown"],m=["relationship","array","group","blocks"],x=["row","collapsible","tabs"],u=[...p,...g,...m,...x];var B=`
.kyro-richtext {
  color: inherit;
  line-height: 1.7;
}

.kyro-richtext > *:first-child {
  margin-top: 0;
}

.kyro-richtext > *:last-child {
  margin-bottom: 0;
}

.kyro-richtext p,
.kyro-richtext ul,
.kyro-richtext ol,
.kyro-richtext blockquote,
.kyro-richtext pre {
  margin: 0 0 1rem;
}

.kyro-richtext h1,
.kyro-richtext h2,
.kyro-richtext h3,
.kyro-richtext h4,
.kyro-richtext h5,
.kyro-richtext h6 {
  margin: 0 0 0.75rem;
  line-height: 1.2;
}

.kyro-richtext ul,
.kyro-richtext ol {
  padding-left: 1.5rem;
}

.kyro-richtext blockquote {
  border-left: 4px solid rgba(148, 163, 184, 0.5);
  margin-left: 0;
  padding-left: 1rem;
  font-style: italic;
}

.kyro-richtext pre {
  overflow-x: auto;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  padding: 1rem;
}

.kyro-richtext code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.kyro-richtext img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
}

.kyro-richtext ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}

.kyro-richtext li[data-type="taskItem"] {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.kyro-richtext li[data-type="taskItem"] > label {
  user-select: none;
  pointer-events: none;
  margin-top: 0.2rem;
}

.kyro-richtext li[data-type="taskItem"] > div {
  flex: 1;
}

.kyro-richtext mark {
  background-color: #fef08a;
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
}
`.trim(),A=[y,b.configure({openOnClick:false}),F,h.configure({types:["heading","paragraph"]}),k,T.configure({multicolor:true}),w,R.configure({nested:true}),TextStyle,C];function v(e){if(typeof e!="object"||e===null)return "";try{return `<div class="kyro-richtext">${generateHTML(e,A)}</div>`}catch(t){return console.error("Failed to render rich text:",t),""}}var s=class{constructor(t){this.config=t;}config;css=[];addRule(t,r){let i=Object.entries(r).map(([o,a])=>`  ${o}: ${a};`).join(`
`);return this.css.push(`${t} {
${i}
}`),this}addMediaQuery(t,r){return this.css.push(`@media (min-width: ${t}) {
  ${r.join(`
  `)}
}`),this}generate(){return this.css.join(`

`)}};function D(e){return {theme:{extend:{colors:e.colors||{},fontFamily:e.fonts||{},spacing:e.spacing||{},borderRadius:e.borderRadius||{},boxShadow:e.shadows||{},screens:e.breakpoints||{}}}}}var n={colors:{primary:"#3b82f6",secondary:"#6366f1",accent:"#ec4899",background:"#ffffff",surface:"#f9fafb",text:"#111827",textMuted:"#6b7280",border:"#e5e7eb",error:"#ef4444",warning:"#f59e0b",success:"#10b981",info:"#3b82f6"},fonts:{sans:"system-ui, -apple-system, sans-serif",serif:"Georgia, serif",mono:"Menlo, monospace"},spacing:{xs:"0.25rem",sm:"0.5rem",md:"1rem",lg:"1.5rem",xl:"2rem","2xl":"3rem","3xl":"4rem"},borderRadius:{sm:"0.125rem",md:"0.375rem",lg:"0.5rem",xl:"0.75rem",full:"9999px"},shadows:{sm:"0 1px 2px 0 rgb(0 0 0 / 0.05)",md:"0 4px 6px -1px rgb(0 0 0 / 0.1)",lg:"0 10px 15px -3px rgb(0 0 0 / 0.1)",xl:"0 20px 25px -5px rgb(0 0 0 / 0.1)"}},I={colors:{primary:"#60a5fa",secondary:"#818cf8",accent:"#f472b6",background:"#111827",surface:"#1f2937",text:"#f9fafb",textMuted:"#9ca3af",border:"#374151",error:"#f87171",warning:"#fbbf24",success:"#34d399",info:"#60a5fa"},fonts:n.fonts,spacing:n.spacing,borderRadius:n.borderRadius,shadows:{sm:"0 1px 2px 0 rgb(0 0 0 / 0.3)",md:"0 4px 6px -1px rgb(0 0 0 / 0.4)",lg:"0 10px 15px -3px rgb(0 0 0 / 0.5)",xl:"0 20px 25px -5px rgb(0 0 0 / 0.6)"}},L={colors:{primary:"#FF6B35",secondary:"#1A1A2E",accent:"#16C79A",background:"#FFFFFF",surface:"#F8F9FA",text:"#1A1A2E",textMuted:"#6B7280",border:"#E5E7EB",error:"#EF4444",warning:"#F59E0B",success:"#16C79A",info:"#3B82F6"},fonts:{sans:'"Inter", "Satoshi", system-ui, sans-serif',serif:'"Playfair Display", Georgia, serif',mono:'"JetBrains Mono", monospace'},spacing:{xs:"0.125rem",sm:"0.25rem",md:"0.5rem",lg:"1rem",xl:"1.5rem","2xl":"2rem","3xl":"3rem","4xl":"4rem"},borderRadius:{sm:"0",md:"0",lg:"0",xl:"0",full:"9999px"},shadows:{sm:"0 1px 2px rgba(0,0,0,0.05)",md:"0 4px 6px rgba(0,0,0,0.07)",lg:"0 10px 15px rgba(0,0,0,0.1)",xl:"0 20px 25px rgba(0,0,0,0.15)"}};function l(e){let t=[];if(e.colors)for(let[r,i]of Object.entries(e.colors))t.push(`  --color-${r}: ${i};`);if(e.fonts)for(let[r,i]of Object.entries(e.fonts))t.push(`  --font-${r}: ${i};`);if(e.spacing)for(let[r,i]of Object.entries(e.spacing))t.push(`  --spacing-${r}: ${i};`);if(e.borderRadius)for(let[r,i]of Object.entries(e.borderRadius))t.push(`  --radius-${r}: ${i};`);if(e.shadows)for(let[r,i]of Object.entries(e.shadows))t.push(`  --shadow-${r}: ${i};`);return `:root {
${t.join(`
`)}
}`}function O(e){let t=l(e.theme||n),r=[];if(e.componentOverrides)for(let[i,o]of Object.entries(e.componentOverrides)){let a=Object.entries(o).map(([d,c])=>`  ${d}: ${c};`).join(`
`);r.push(`${i} {
${a}
}`);}return `
    ${t}
    ${e.customStyles||""}
    ${r.join(`
`)}
  `}var E={text:{wrapper:{marginBottom:"var(--spacing-md)"},label:{display:"block",marginBottom:"var(--spacing-xs)",fontWeight:"500",color:"var(--color-text)"},input:{width:"100%",padding:"var(--spacing-sm) var(--spacing-md)",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)",fontSize:"0.875rem"},error:{color:"var(--color-error)",fontSize:"0.75rem",marginTop:"var(--spacing-xs)"}},number:{wrapper:{marginBottom:"var(--spacing-md)"},label:{display:"block",marginBottom:"var(--spacing-xs)",fontWeight:"500"},input:{width:"100%",padding:"var(--spacing-sm) var(--spacing-md)",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)"}},checkbox:{wrapper:{display:"flex",alignItems:"center",gap:"var(--spacing-sm)"},input:{width:"1rem",height:"1rem"},label:{cursor:"pointer"}},select:{wrapper:{marginBottom:"var(--spacing-md)"},input:{width:"100%",padding:"var(--spacing-sm) var(--spacing-md)",border:"1px solid var(--color-border)",borderRadius:"var(--radius-md)",backgroundColor:"white"}}};function M(e){return {ipAddress:e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||e.headers.get("x-real-ip")||"unknown",userAgent:e.headers.get("user-agent")||"unknown"}}export{u as ALL_FIELD_TYPES,s as CSSGenerator,O as createAdminStyling,M as createAuditContext,I as defaultDarkTheme,E as defaultFieldStyling,n as defaultLightTheme,L as ecommerce2026Theme,l as generateCSSVariables,D as generateTailwindConfig,v as renderRichText,B as richTextStyles};