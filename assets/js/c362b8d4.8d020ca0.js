"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[9969],{9697:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>s,default:()=>u,frontMatter:()=>a,metadata:()=>c,toc:()=>i});var o=n(3117),r=(n(7294),n(3905));const a={title:"useContentTypes",description:"API reference for the useContentTypes hook in Strapi's Content Manager",tags:["content-manager","hooks","fetch","content-types","components"]},s=void 0,c={unversionedId:"docs/core/content-manager/hooks/use-content-types",id:"docs/core/content-manager/hooks/use-content-types",title:"useContentTypes",description:"API reference for the useContentTypes hook in Strapi's Content Manager",source:"@site/docs/docs/01-core/content-manager/hooks/use-content-types.mdx",sourceDirName:"docs/01-core/content-manager/hooks",slug:"/docs/core/content-manager/hooks/use-content-types",permalink:"/docs/core/content-manager/hooks/use-content-types",draft:!1,editUrl:"https://github.com/strapi/strapi/tree/main/docs/docs/docs/01-core/content-manager/hooks/use-content-types.mdx",tags:[{label:"content-manager",permalink:"/tags/content-manager"},{label:"hooks",permalink:"/tags/hooks"},{label:"fetch",permalink:"/tags/fetch"},{label:"content-types",permalink:"/tags/content-types"},{label:"components",permalink:"/tags/components"}],version:"current",frontMatter:{title:"useContentTypes",description:"API reference for the useContentTypes hook in Strapi's Content Manager",tags:["content-manager","hooks","fetch","content-types","components"]},sidebar:"docs",previous:{title:"Review Workflows",permalink:"/docs/core/content-manager/review-workflows"},next:{title:"useDragAndDrop",permalink:"/docs/core/content-manager/hooks/use-drag-and-drop"}},p={},i=[{value:"Usage",id:"usage",level:2}],l={toc:i};function u(e){let{components:t,...n}=e;return(0,r.kt)("wrapper",(0,o.Z)({},l,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("p",null,"An abstraction around ",(0,r.kt)("inlineCode",{parentName:"p"},"react-query")," to fetch content-types and components. It returns the raw API response\nfor components. ",(0,r.kt)("inlineCode",{parentName:"p"},"collectionTypes")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"singleTypes")," are filtered by ",(0,r.kt)("inlineCode",{parentName:"p"},"isDisplayed=true"),"."),(0,r.kt)("h2",{id:"usage"},"Usage"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-jsx"},"import { useContentTypes } from 'path/to/hooks';\n\nconst MyComponent = () => {\n  const { isLoading, collectionTypes, singleTypes, components } = useContentTypes();\n\n  return (/* ... */);\n};\n")))}u.isMDXComponent=!0},3905:(e,t,n)=>{n.d(t,{Zo:()=>l,kt:()=>d});var o=n(7294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);t&&(o=o.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,o)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function c(e,t){if(null==e)return{};var n,o,r=function(e,t){if(null==e)return{};var n,o,r={},a=Object.keys(e);for(o=0;o<a.length;o++)n=a[o],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(o=0;o<a.length;o++)n=a[o],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var p=o.createContext({}),i=function(e){var t=o.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},l=function(e){var t=i(e.components);return o.createElement(p.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return o.createElement(o.Fragment,{},t)}},m=o.forwardRef((function(e,t){var n=e.components,r=e.mdxType,a=e.originalType,p=e.parentName,l=c(e,["components","mdxType","originalType","parentName"]),m=i(n),d=r,f=m["".concat(p,".").concat(d)]||m[d]||u[d]||a;return n?o.createElement(f,s(s({ref:t},l),{},{components:n})):o.createElement(f,s({ref:t},l))}));function d(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var a=n.length,s=new Array(a);s[0]=m;var c={};for(var p in t)hasOwnProperty.call(t,p)&&(c[p]=t[p]);c.originalType=e,c.mdxType="string"==typeof e?e:r,s[1]=c;for(var i=2;i<a;i++)s[i]=n[i];return o.createElement.apply(null,s)}return o.createElement.apply(null,n)}m.displayName="MDXCreateElement"}}]);