'use strict';var html=require('@tiptap/html'),d=require('@tiptap/starter-kit'),s=require('@tiptap/extension-link'),c=require('@tiptap/extension-image'),p=require('@tiptap/extension-text-align'),x=require('@tiptap/extension-underline'),u=require('@tiptap/extension-highlight'),g=require('@tiptap/extension-task-list'),m=require('@tiptap/extension-task-item'),extensionTextStyle=require('@tiptap/extension-text-style'),y=require('@tiptap/extension-color');function _interopDefault(e){return e&&e.__esModule?e:{default:e}}var d__default=/*#__PURE__*/_interopDefault(d);var s__default=/*#__PURE__*/_interopDefault(s);var c__default=/*#__PURE__*/_interopDefault(c);var p__default=/*#__PURE__*/_interopDefault(p);var x__default=/*#__PURE__*/_interopDefault(x);var u__default=/*#__PURE__*/_interopDefault(u);var g__default=/*#__PURE__*/_interopDefault(g);var m__default=/*#__PURE__*/_interopDefault(m);var y__default=/*#__PURE__*/_interopDefault(y);function b(e){return e.type==="text"}function h(e){return e.type==="number"}function k(e){return e.type==="relationship"}function B(e){return e.type==="array"}function R(e){return e.type==="group"}function T(e){return e.type==="blocks"}function w(e){return e.type==="upload"}function I(e){return e.type==="image"}function L(e){return e.type==="richtext"}function A(e){return e.type==="select"}function C(e){return e.type==="row"||e.type==="collapsible"||e.type==="tabs"}function D(e){return e.type==="icon"}var r=["text","number","checkbox","date","email","password","textarea","select","radio","color","icon"],n=["richtext","json","code","upload","image","markdown"],o=["relationship","array","group","blocks"],a=["row","collapsible","tabs"],V=[...r,...n,...o,...a];function S(e,t,i){return {name:e,type:"relationship",relationTo:t,...i,required:i?.required??false}}var G=`
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
`.trim(),f=[d__default.default,s__default.default.configure({openOnClick:false}),c__default.default,p__default.default.configure({types:["heading","paragraph"]}),x__default.default,u__default.default.configure({multicolor:true}),g__default.default,m__default.default.configure({nested:true}),extensionTextStyle.TextStyle,y__default.default];function j(e){return typeof e=="object"&&e!==null?e:{}}function J(e){if(typeof e!="object"||e===null)return "";try{return `<div class="kyro-richtext">${html.generateHTML(e,f)}</div>`}catch(t){return console.error("Failed to render rich text:",t),""}}exports.a=b;exports.b=h;exports.c=k;exports.d=B;exports.e=R;exports.f=T;exports.g=w;exports.h=I;exports.i=L;exports.j=A;exports.k=C;exports.l=D;exports.m=r;exports.n=n;exports.o=o;exports.p=a;exports.q=V;exports.r=S;exports.s=G;exports.t=j;exports.u=J;