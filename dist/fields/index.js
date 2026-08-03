import {generateHTML}from'@tiptap/html';import d from'@tiptap/starter-kit';import s from'@tiptap/extension-link';import c from'@tiptap/extension-image';import p from'@tiptap/extension-text-align';import m from'@tiptap/extension-underline';import u from'@tiptap/extension-highlight';import x from'@tiptap/extension-task-list';import g from'@tiptap/extension-task-item';import {TextStyle}from'@tiptap/extension-text-style';import F from'@tiptap/extension-color';function b(e){return e.type==="text"}function h(e){return e.type==="number"}function k(e){return e.type==="relationship"}function T(e){return e.type==="array"}function w(e){return e.type==="group"}function R(e){return e.type==="blocks"}function B(e){return e.type==="upload"}function D(e){return e.type==="image"}function I(e){return e.type==="richtext"}function L(e){return e.type==="select"}function S(e){return e.type==="row"||e.type==="collapsible"||e.type==="tabs"}function C(e){return e.type==="icon"}var r=["text","number","checkbox","date","email","password","textarea","select","radio","color","icon"],n=["richtext","json","code","upload","image","markdown"],a=["relationship","array","group","blocks"],o=["row","collapsible","tabs"],A=[...r,...n,...a,...o];function V(e,t,i){return {name:e,type:"relationship",relationTo:t,...i,required:i?.required??false}}var Y=`
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
`.trim(),f=[d,s.configure({openOnClick:false}),c,p.configure({types:["heading","paragraph"]}),m,u.configure({multicolor:true}),x,g.configure({nested:true}),TextStyle,F];function j(e){return typeof e=="object"&&e!==null?e:{}}function J(e){if(typeof e!="object"||e===null)return "";try{return `<div class="kyro-richtext">${generateHTML(e,f)}</div>`}catch(t){return console.error("Failed to render rich text:",t),""}}function X(){return {name:"seo",type:"group",label:"SEO Settings",fields:[{name:"metaTitle",type:"text",label:"Meta Title",admin:{description:"The title used for search engines (recommended < 60 chars).",autoGenerate:"title"}},{name:"metaDescription",type:"textarea",label:"Meta Description",admin:{description:"A brief summary for search engines (recommended < 160 chars).",autoGenerate:"content"}},{name:"keywords",type:"text",label:"Keywords",admin:{description:"Comma-separated list of keywords for this page."}},{name:"ogImage",type:"upload",label:"OpenGraph Image",relationTo:"media",admin:{description:"The image shown when the post is shared on social media (Facebook, LinkedIn)."}},{name:"twitter",type:"group",label:"Twitter Card",fields:[{name:"title",type:"text",label:"Twitter Title"},{name:"description",type:"textarea",label:"Twitter Description"},{name:"image",type:"upload",label:"Twitter Image",relationTo:"media"}]},{name:"advanced",type:"group",label:"Advanced Search Settings",fields:[{name:"noindex",type:"checkbox",label:"Hide from search engines (noindex)",defaultValue:false},{name:"nofollow",type:"checkbox",label:"Do not follow links (nofollow)",defaultValue:false},{name:"canonicalUrl",type:"text",label:"Canonical URL Override",admin:{description:"Leave empty to use the default canonical URL."}},{name:"structuredData",type:"code",label:"JSON-LD Structured Data",admin:{description:"Custom JSON-LD schema for this specific page."}}]}]}}export{A as ALL_FIELD_TYPES,n as COMPLEX_FIELD_TYPES,o as LAYOUT_FIELD_TYPES,r as PRIMITIVE_FIELD_TYPES,a as RELATIONAL_FIELD_TYPES,V as createRelationshipFieldConfig,X as generateSEOFields,T as isArrayField,R as isBlocksField,w as isGroupField,C as isIconField,D as isImageField,S as isLayoutField,h as isNumberField,k as isRelationshipField,I as isRichTextField,L as isSelectField,b as isTextField,B as isUploadField,j as normalizeRichTextValue,J as renderRichText,Y as richTextStyles};