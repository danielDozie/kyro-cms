import {generateHTML}from'@tiptap/html';import d from'@tiptap/starter-kit';import s from'@tiptap/extension-link';import c from'@tiptap/extension-image';import p from'@tiptap/extension-text-align';import x from'@tiptap/extension-underline';import u from'@tiptap/extension-highlight';import g from'@tiptap/extension-task-list';import m from'@tiptap/extension-task-item';import {TextStyle}from'@tiptap/extension-text-style';import y from'@tiptap/extension-color';function b(e){return e.type==="text"}function h(e){return e.type==="number"}function k(e){return e.type==="relationship"}function B(e){return e.type==="array"}function R(e){return e.type==="group"}function T(e){return e.type==="blocks"}function w(e){return e.type==="upload"}function I(e){return e.type==="image"}function L(e){return e.type==="richtext"}function A(e){return e.type==="select"}function C(e){return e.type==="row"||e.type==="collapsible"||e.type==="tabs"}function D(e){return e.type==="icon"}var r=["text","number","checkbox","date","email","password","textarea","select","radio","color","icon"],n=["richtext","json","code","upload","image","markdown"],o=["relationship","array","group","blocks"],a=["row","collapsible","tabs"],V=[...r,...n,...o,...a];function S(e,t,i){return {name:e,type:"relationship",relationTo:t,...i,required:i?.required??false}}var G=`
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
`.trim(),f=[d,s.configure({openOnClick:false}),c,p.configure({types:["heading","paragraph"]}),x,u.configure({multicolor:true}),g,m.configure({nested:true}),TextStyle,y];function j(e){return typeof e=="object"&&e!==null?e:{}}function J(e){if(typeof e!="object"||e===null)return "";try{return `<div class="kyro-richtext">${generateHTML(e,f)}</div>`}catch(t){return console.error("Failed to render rich text:",t),""}}export{b as a,h as b,k as c,B as d,R as e,T as f,w as g,I as h,L as i,A as j,C as k,D as l,r as m,n,o,a as p,V as q,S as r,G as s,j as t,J as u};