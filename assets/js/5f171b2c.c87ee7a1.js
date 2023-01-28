"use strict";(self.webpackChunkdocs=self.webpackChunkdocs||[]).push([[35],{3905:(e,n,t)=>{t.d(n,{Zo:()=>p,kt:()=>m});var r=t(7294);function a(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function o(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function c(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?o(Object(t),!0).forEach((function(n){a(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function l(e,n){if(null==e)return{};var t,r,a=function(e,n){if(null==e)return{};var t,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)t=o[r],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)t=o[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var s=r.createContext({}),i=function(e){var n=r.useContext(s),t=n;return e&&(t="function"==typeof e?e(n):c(c({},n),e)),t},p=function(e){var n=i(e.components);return r.createElement(s.Provider,{value:n},e.children)},f={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},u=r.forwardRef((function(e,n){var t=e.components,a=e.mdxType,o=e.originalType,s=e.parentName,p=l(e,["components","mdxType","originalType","parentName"]),u=i(t),m=a,d=u["".concat(s,".").concat(m)]||u[m]||f[m]||o;return t?r.createElement(d,c(c({ref:n},p),{},{components:t})):r.createElement(d,c({ref:n},p))}));function m(e,n){var t=arguments,a=n&&n.mdxType;if("string"==typeof e||a){var o=t.length,c=new Array(o);c[0]=u;var l={};for(var s in n)hasOwnProperty.call(n,s)&&(l[s]=n[s]);l.originalType=e,l.mdxType="string"==typeof e?e:a,c[1]=l;for(var i=2;i<o;i++)c[i]=t[i];return r.createElement.apply(null,c)}return r.createElement.apply(null,t)}u.displayName="MDXCreateElement"},1953:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>s,contentTitle:()=>c,default:()=>f,frontMatter:()=>o,metadata:()=>l,toc:()=>i});var r=t(3117),a=(t(7294),t(3905));const o={title:"useCallbackRef",description:"API reference for the useCallbackRef hook in Strapi's Content Manager",tags:["content-manager","hooks","refs","callbacks","effects"]},c=void 0,l={unversionedId:"core/content-manager/hooks/use-callback-ref",id:"core/content-manager/hooks/use-callback-ref",title:"useCallbackRef",description:"API reference for the useCallbackRef hook in Strapi's Content Manager",source:"@site/docs/core/content-manager/hooks/use-callback-ref.mdx",sourceDirName:"core/content-manager/hooks",slug:"/core/content-manager/hooks/use-callback-ref",permalink:"/core/content-manager/hooks/use-callback-ref",draft:!1,editUrl:"https://github.com/strapi/strapi/tree/main/docs/docs/core/content-manager/hooks/use-callback-ref.mdx",tags:[{label:"content-manager",permalink:"/tags/content-manager"},{label:"hooks",permalink:"/tags/hooks"},{label:"refs",permalink:"/tags/refs"},{label:"callbacks",permalink:"/tags/callbacks"},{label:"effects",permalink:"/tags/effects"}],version:"current",frontMatter:{title:"useCallbackRef",description:"API reference for the useCallbackRef hook in Strapi's Content Manager",tags:["content-manager","hooks","refs","callbacks","effects"]},sidebar:"docs",previous:{title:"Introduction",permalink:"/content-manager"},next:{title:"useDragAndDrop",permalink:"/content-manager/hooks/use-drag-and-drop"}},s={},i=[{value:"Usage",id:"usage",level:2},{value:"Typescript",id:"typescript",level:2}],p={toc:i};function f(e){let{components:n,...t}=e;return(0,a.kt)("wrapper",(0,r.Z)({},p,t,{components:n,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"A custom hook that converts a callback to a ref to avoid triggering re-renders when passed as a\nprop or avoid re-executing effects when passed as a dependency. Helpful for working with ",(0,a.kt)("inlineCode",{parentName:"p"},"modifiedData"),"\nor ",(0,a.kt)("inlineCode",{parentName:"p"},"initialData")," in the content-manager."),(0,a.kt)("p",null,"Stolen from ",(0,a.kt)("a",{parentName:"p",href:"https://www.npmjs.com/package/@radix-ui/react-use-callback-ref"},(0,a.kt)("inlineCode",{parentName:"a"},"@radix-ui/react-use-callback-ref")),"."),(0,a.kt)("h2",{id:"usage"},"Usage"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-jsx"},"import { useCallbackRef } from 'path/to/hooks';\n\nconst MyComponent = ({ callbackFromSomewhere }) => {\n  const mySafeCallback = useCallbackRef(callbackFromSomewhere);\n\n  useEffect(() => {\n    const handleKeyDown = (event) => {\n      mySafeCallback(event);\n    };\n\n    document.addEventListener('keydown', handleKeyDown);\n\n    return () => document.removeEventListener('keydown', handleKeyDown);\n  }, [mySafeCallback]);\n\n  return <div>{children}</div>;\n};\n")),(0,a.kt)("h2",{id:"typescript"},"Typescript"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-ts"},"function useCallbackRef<T extends (...args: any[]) => any>(callback: T | undefined): T;\n")))}f.isMDXComponent=!0}}]);