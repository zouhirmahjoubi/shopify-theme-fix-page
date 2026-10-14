(()=>{var Y,s,ge,lt,F,de,xe,be,J,j,H,we,ne,ee,te,ct,q={},X=[],st=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,O=Array.isArray;function L(e,t){for(var n in t)e[n]=t[n];return e}function oe(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function I(e,t,n){var o,i,a,u={};for(a in t)a=="key"?o=t[a]:a=="ref"?i=t[a]:u[a]=t[a];if(arguments.length>2&&(u.children=arguments.length>3?Y.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(a in e.defaultProps)u[a]===void 0&&(u[a]=e.defaultProps[a]);return $(e,u,o,i,null)}function $(e,t,n,o,i){var a={type:e,props:t,key:n,ref:o,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:i==null?++ge:i,__i:-1,__u:0};return i==null&&s.vnode!=null&&s.vnode(a),a}function P(e){return e.children}function R(e,t){this.props=e,this.context=t}function M(e,t){if(t==null)return e.__?M(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?M(e):null}function ft(e){if(e.__P&&e.__d){var t=e.__v,n=t.__e,o=[],i=[],a=L({},t);a.__v=t.__v+1,s.vnode&&s.vnode(a),re(e.__P,a,t,e.__n,e.__P.namespaceURI,32&t.__u?[n]:null,o,n==null?M(t):n,!!(32&t.__u),i),a.__v=t.__v,a.__.__k[a.__i]=a,Ae(o,a,i),t.__e=t.__=null,a.__e!=n&&Se(a)}}function Se(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),Se(e)}function ve(e){(!e.__d&&(e.__d=!0)&&F.push(e)&&!G.__r++||de!=s.debounceRendering)&&((de=s.debounceRendering)||xe)(G)}function G(){try{for(var e,t=1;F.length;)F.length>t&&F.sort(be),e=F.shift(),t=F.length,ft(e)}finally{F.length=G.__r=0}}function ke(e,t,n,o,i,a,u,l,c,_,p){var y,r,f,d,v,g,h=o&&o.__k||X,m=t.length;for(c=pt(n,t,h,c,m),y=0;y<m;y++)(f=n.__k[y])!=null&&(r=f.__i!=-1&&h[f.__i]||q,f.__i=y,g=re(e,f,r,i,a,u,l,c,_,p),d=f.__e,f.ref&&r.ref!=f.ref&&(r.ref&&_e(r.ref,null,f),p.push(f.ref,f.__c||d,f)),v==null&&d!=null&&(v=d),4&f.__u?(c=Ee(f,c,e),r.__e&&(r.__e=null)):typeof f.type=="function"&&g!==void 0?c=g:d&&(c=d.nextSibling),f.__u&=-7);return n.__e=v,c}function pt(e,t,n,o,i){var a,u,l,c,_,p=n.length,y=p,r=0;for(e.__k=new Array(i),a=0;a<i;a++)(u=t[a])!=null&&typeof u!="boolean"&&typeof u!="function"?(typeof u=="string"||typeof u=="number"||typeof u=="bigint"||u.constructor==String?u=e.__k[a]=$(null,u,null,null,null):O(u)?u=e.__k[a]=$(P,{children:u},null,null,null):u.constructor===void 0&&u.__b>0?u=e.__k[a]=$(u.type,u.props,u.key,u.ref?u.ref:null,u.__v):e.__k[a]=u,c=a+r,u.__=e,u.__b=e.__b+1,l=null,(_=u.__i=mt(u,n,c,y))!=-1&&(y--,(l=n[_])&&(l.__u|=2)),l==null||l.__v==null?(_==-1&&(i>p?r--:i<p&&r++),typeof u.type!="function"&&(u.__u|=4)):_!=c&&(_==c-1?r--:_==c+1?r++:(_>c?r--:r++,u.__u|=4))):e.__k[a]=null;if(y)for(a=0;a<p;a++)(l=n[a])!=null&&!(2&l.__u)&&(l.__e==o&&(o=M(l)),Pe(l,l));return o}function Ee(e,t,n){var o,i;if(typeof e.type=="function"){for(o=e.__k,i=0;o&&i<o.length;i++)o[i]&&(o[i].__=e,t=Ee(o[i],t,n));return t}e.__e!=t&&(t&&e.type&&!t.parentNode&&(t=M(e)),t=n.insertBefore(e.__e,t||null));do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function V(e,t){return t=t||[],e==null||typeof e=="boolean"||(O(e)?e.some(function(n){V(n,t)}):t.push(e)),t}function mt(e,t,n,o){var i,a,u,l=e.key,c=e.type,_=t[n],p=_!=null&&(2&_.__u)==0;if(_===null&&l==null||p&&l==_.key&&c==_.type)return n;if(o>(p?1:0)){for(i=n-1,a=n+1;i>=0||a<t.length;)if((_=t[u=i>=0?i--:a++])!=null&&!(2&_.__u)&&l==_.key&&c==_.type)return u}return-1}function he(e,t,n){t[0]=="-"?e.setProperty(t,n==null?"":n):e[t]=n==null?"":typeof n!="number"||st.test(t)?n:n+"px"}function B(e,t,n,o,i){var a,u;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof o=="string"&&(e.style.cssText=o=""),o)for(t in o)n&&t in n||he(e.style,t,"");if(n)for(t in n)o&&n[t]==o[t]||he(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")a=t!=(t=t.replace(we,"$1")),u=t.toLowerCase(),t=u in e||t=="onFocusOut"||t=="onFocusIn"?u.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+a]=n,n?o?n[H]=o[H]:(n[H]=ne,e.addEventListener(t,a?te:ee,a)):e.removeEventListener(t,a?te:ee,a);else{if(i=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n==null?"":n;break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function ye(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t[j]==null)t[j]=ne++;else if(t[j]<n[H])return;return n(s.event?s.event(t):t)}}}function re(e,t,n,o,i,a,u,l,c,_){var p,y,r,f,d,v,g,h,m,S,w,C,T,z,N,U,E=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(c=!!(32&n.__u),a=[l=t.__e=n.__e]),(p=s.__b)&&p(t);e:if(typeof E=="function"){y=u.length;try{if(m=t.props,S=E.prototype&&E.prototype.render,w=(p=E.contextType)&&o[p.__c],C=p?w?w.props.value:p.__:o,n.__c?h=(r=t.__c=n.__c).__=r.__E:(S?t.__c=r=new E(m,C):(t.__c=r=new R(m,C),r.constructor=E,r.render=vt),w&&w.sub(r),r.state||(r.state={}),r.__n=o,f=r.__d=!0,r.__h=[],r._sb=[]),S&&r.__s==null&&(r.__s=r.state),S&&E.getDerivedStateFromProps!=null&&(r.__s==r.state&&(r.__s=L({},r.__s)),L(r.__s,E.getDerivedStateFromProps(m,r.__s))),d=r.props,v=r.state,r.__v=t,f)S&&E.getDerivedStateFromProps==null&&r.componentWillMount!=null&&r.componentWillMount(),S&&r.componentDidMount!=null&&r.__h.push(r.componentDidMount);else{if(S&&E.getDerivedStateFromProps==null&&m!==d&&r.componentWillReceiveProps!=null&&r.componentWillReceiveProps(m,C),t.__v==n.__v||!r.__e&&r.shouldComponentUpdate!=null&&r.shouldComponentUpdate(m,r.__s,C)===!1){t.__v!=n.__v&&(r.props=m,r.state=r.__s,r.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(D){D&&(D.__=t)}),X.push.apply(r.__h,r._sb),r._sb=[],r.__h.length&&u.push(r),l=M(n);break e}r.componentWillUpdate!=null&&r.componentWillUpdate(m,r.__s,C),S&&r.componentDidUpdate!=null&&r.__h.push(function(){r.componentDidUpdate(d,v,g)})}if(r.context=C,r.props=m,r.__P=e,r.__e=!1,T=s.__r,z=0,S)r.state=r.__s,r.__d=!1,T&&T(t),p=r.render(r.props,r.state,r.context),X.push.apply(r.__h,r._sb),r._sb=[];else do r.__d=!1,T&&T(t),p=r.render(r.props,r.state,r.context),r.state=r.__s;while(r.__d&&++z<25);r.state=r.__s,r.getChildContext!=null&&(o=L(L({},o),r.getChildContext())),S&&!f&&r.getSnapshotBeforeUpdate!=null&&(g=r.getSnapshotBeforeUpdate(d,v)),N=p!=null&&p.type===P&&p.key==null?Re(p.props.children):p,l=ke(e,O(N)?N:[N],t,n,o,i,a,u,l,c,_),r.base=t.__e,t.__u&=-161,r.__h.length&&u.push(r),h&&(r.__E=r.__=null)}catch(D){if(u.length=y,t.__v=null,c||a!=null){if(D.then){for(t.__u|=c?160:128;l&&l.nodeType==8&&l.nextSibling;)l=l.nextSibling;a!=null&&(a[a.indexOf(l)]=null),t.__e=l}else if(a!=null)for(U=a.length;U--;)oe(a[U])}else t.__e=n.__e;t.__k==null&&(t.__k=n.__k||[]),D.then||Ce(t),s.__e(D,t,n)}}else a==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):l=t.__e=dt(n.__e,t,n,o,i,a,u,c,_);return(p=s.diffed)&&p(t),128&t.__u?void 0:l}function Ce(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(Ce))}function Ae(e,t,n){for(var o=0;o<n.length;o++)_e(n[o],n[++o],n[++o]);s.__c&&s.__c(t,e),e.some(function(i){try{e=i.__h,i.__h=[],e.some(function(a){a.call(i)})}catch(a){s.__e(a,i.__v)}})}function Re(e){return typeof e!="object"||e==null||e.__b>0?e:O(e)?e.map(Re):e.constructor!==void 0?null:L({},e)}function dt(e,t,n,o,i,a,u,l,c){var _,p,y,r,f,d,v,g=n.props||q,h=t.props,m=t.type;if(m=="svg"?i="http://www.w3.org/2000/svg":m=="math"?i="http://www.w3.org/1998/Math/MathML":i||(i="http://www.w3.org/1999/xhtml"),a!=null){for(_=0;_<a.length;_++)if((f=a[_])&&"setAttribute"in f==!!m&&(m?f.localName==m:f.nodeType==3)){e=f,a[_]=null;break}}if(e==null){if(m==null)return document.createTextNode(h);e=document.createElementNS(i,m,h.is&&h),l&&(s.__m&&s.__m(t,a),l=!1),a=null}if(m==null)g===h||l&&e.data==h||(e.data=h);else{if(a=m=="textarea"&&h.defaultValue!=null?null:a&&Y.call(e.childNodes),!l&&a!=null)for(g={},_=0;_<e.attributes.length;_++)g[(f=e.attributes[_]).name]=f.value;for(_ in g)f=g[_],_=="dangerouslySetInnerHTML"?y=f:_=="children"||_ in h||_=="value"&&"defaultValue"in h||_=="checked"&&"defaultChecked"in h||B(e,_,null,f,i);for(_ in h)f=h[_],_=="children"?r=f:_=="dangerouslySetInnerHTML"?p=f:_=="value"?d=f:_=="checked"?v=f:l&&typeof f!="function"||g[_]===f||B(e,_,f,g[_],i);if(p)l||y&&(p.__html==y.__html||p.__html==e.innerHTML)||(e.innerHTML=p.__html),t.__k=[];else if(y&&(e.innerHTML=""),ke(t.type=="template"?e.content:e,O(r)?r:[r],t,n,o,m=="foreignObject"?"http://www.w3.org/1999/xhtml":i,a,u,a?a[0]:n.__k&&M(n,0),l,c),a!=null)for(_=a.length;_--;)oe(a[_]);l&&m!="textarea"||(_="value",m=="progress"&&d==null?e.removeAttribute("value"):d!=null&&(d!==e[_]||m=="progress"&&!d||m=="option"&&d!=g[_])&&B(e,_,d,g[_],i),_="checked",v!=null&&v!=e[_]&&B(e,_,v,g[_],i))}return e}function _e(e,t,n){try{if(typeof e=="function"){var o=typeof e.__u=="function";o&&e.__u(),o&&t==null||(e.__u=e(t))}else e.current=t}catch(i){s.__e(i,n)}}function Pe(e,t,n){var o,i;if(s.unmount&&s.unmount(e),(o=e.ref)&&(o.current&&o.current!=e.__e||_e(o,null,t)),(o=e.__c)!=null){if(o.componentWillUnmount)try{o.componentWillUnmount()}catch(a){s.__e(a,t)}o.base=o.__P=o.__n=null}if(o=e.__k)for(i=0;i<o.length;i++)o[i]&&Pe(o[i],t,n||typeof e.type!="function");n||oe(e.__e),e.__c=e.__=e.__e=void 0}function vt(e,t,n){return this.constructor(e,n)}function ie(e,t,n){var o,i,a,u;t==document&&(t=document.documentElement),s.__&&s.__(e,t),i=(o=typeof n=="function")?null:n&&n.__k||t.__k,a=[],u=[],re(t,e=(!o&&n||t).__k=I(P,null,[e]),i||q,q,t.namespaceURI,!o&&n?[n]:i?null:t.firstChild?Y.call(t.childNodes):null,a,!o&&n?n:i?i.__e:t.firstChild,o,u),Ae(a,e,u),e.props.children=null}Y=X.slice,s={__e:function(e,t,n,o){for(var i,a,u;t=t.__;)if((i=t.__c)&&!i.__)try{if((a=i.constructor)&&a.getDerivedStateFromError!=null&&(i.setState(a.getDerivedStateFromError(e)),u=i.__d),i.componentDidCatch!=null&&(i.componentDidCatch(e,o||{}),u=i.__d),u)return i.__E=i}catch(l){e=l}throw e}},ge=0,lt=function(e){return e!=null&&e.constructor===void 0},R.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=L({},this.state),typeof e=="function"&&(e=e(L({},n),this.props)),e&&L(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),ve(this))},R.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),ve(this))},R.prototype.render=P,F=[],xe=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,be=function(e,t){return e.__v.__b-t.__v.__b},G.__r=0,J=Math.random().toString(8),j="__d"+J,H="__a"+J,we=/(PointerCapture)$|Capture$/i,ne=0,ee=ye(!1),te=ye(!0),ct=0;var K,k,ae,De,ue=0,ze=[],x=s,Le=x.__b,Fe=x.__r,Te=x.diffed,Ne=x.__c,Ue=x.unmount,Me=x.__;function He(e,t){x.__h&&x.__h(k,e,ue||t),ue=0;var n=k.__H||(k.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function ce(e,t){var n=He(K++,3);!x.__s&&Ve(n.__H,t)&&(n.__=e,n.u=t,k.__H.__h.push(n))}function W(e){return ue=5,Oe(function(){return{current:e}},[])}function Oe(e,t){var n=He(K++,7);return Ve(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function ht(){for(var e;e=ze.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(Z),t.__h.some(le),t.__h=[]}catch(n){t.__h=[],x.__e(n,e.__v)}}}x.__b=function(e){k=null,Le&&Le(e)},x.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Me&&Me(e,t)},x.__r=function(e){Fe&&Fe(e),K=0;var t=(k=e.__c).__H;t&&(ae===k?(t.__h=[],k.__h=[],t.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.some(Z),t.__h.some(le),t.__h=[],K=0)),ae=k},x.diffed=function(e){Te&&Te(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(ze.push(t)!==1&&De===x.requestAnimationFrame||((De=x.requestAnimationFrame)||yt)(ht)),t.__H.__.some(function(n){n.u&&(n.__H=n.u,n.u=void 0)})),ae=k=null},x.__c=function(e,t){t.some(function(n){try{n.__h.some(Z),n.__h=n.__h.filter(function(o){return!o.__||le(o)})}catch(o){t.some(function(i){i.__h&&(i.__h=[])}),t=[],x.__e(o,n.__v)}}),Ne&&Ne(e,t)},x.unmount=function(e){Ue&&Ue(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.some(function(o){try{Z(o)}catch(i){t=i}}),n.__H=void 0,t&&x.__e(t,n.__v))};var Ie=typeof requestAnimationFrame=="function";function yt(e){var t,n=function(){clearTimeout(o),Ie&&cancelAnimationFrame(t),setTimeout(e)},o=setTimeout(n,35);Ie&&(t=requestAnimationFrame(n))}function Z(e){var t=k,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),k=t}function le(e){var t=k;e.__c=e.__(),k=t}function Ve(e,t){return!e||e.length!==t.length||t.some(function(n,o){return n!==e[o]})}function bt(e,t){for(var n in t)e[n]=t[n];return e}function We(e,t){for(var n in e)if(n!=="__source"&&!(n in t))return!0;for(var o in t)if(o!=="__source"&&e[o]!==t[o])return!0;return!1}function Be(e,t){this.props=e,this.context=t}(Be.prototype=new R).isPureReactComponent=!0,Be.prototype.shouldComponentUpdate=function(e,t){return We(this.props,e)||We(this.state,t)};var je=s.__b;s.__b=function(e){e.type&&e.type.__f&&e.ref&&(e.props.ref=e.ref,e.ref=null),je&&je(e)};var Gt=typeof Symbol!="undefined"&&Symbol.for&&Symbol.for("react.forward_ref")||3911;var wt=s.__e;s.__e=function(e,t,n,o){if(e.then){for(var i,a=t;a=a.__;)if((i=a.__c)&&i.__c)return t.__e==null&&(t.__e=n.__e,t.__k=n.__k||[]),i.__c(e,t)}wt(e,t,n,o)};var $e=s.unmount;function Ke(e,t,n){return e&&(e.__c&&e.__c.__H&&(e.__c.__H.__.forEach(function(o){typeof o.__c=="function"&&o.__c()}),e.__c.__H=null),(e=bt({},e)).__c!=null&&(e.__c.__P===n&&(e.__c.__P=t),e.__c.__e=!0,e.__c=null),e.__k=e.__k&&e.__k.map(function(o){return Ke(o,t,n)})),e}function Qe(e,t,n){return e&&n&&(e.__v=null,e.__k=e.__k&&e.__k.map(function(o){return Qe(o,t,n)}),e.__c&&e.__c.__P===t&&(e.__e&&n.appendChild(e.__e),e.__c.__e=!0,e.__c.__P=n)),e}function se(){this.__u=0,this.o=null,this.__b=null}function Je(e){var t=e.__&&e.__.__c;return t&&t.__a&&t.__a(e)}function Q(){this.i=null,this.l=null}s.unmount=function(e){var t=e.__c;t&&(t.__z=!0),t&&t.__R&&t.__R(),t&&32&e.__u&&(e.type=null),$e&&$e(e)},(se.prototype=new R).__c=function(e,t){var n=t.__c,o=this;o.o==null&&(o.o=[]),o.o.push(n);var i=Je(o.__v),a=!1,u=function(){a||o.__z||(a=!0,n.__R=null,i?i(c):c())};n.__R=u;var l=n.__P;n.__P=null;var c=function(){if(!--o.__u){if(o.state.__a){var _=o.state.__a;o.__v.__k[0]=Qe(_,_.__c.__P,_.__c.__O)}var p;for(o.setState({__a:o.__b=null});p=o.o.pop();)p.__P=l,p.forceUpdate()}};o.__u++||32&t.__u||o.setState({__a:o.__b=o.__v.__k[0]}),e.then(u,u)},se.prototype.componentWillUnmount=function(){this.o=[]},se.prototype.render=function(e,t){if(this.__b){if(this.__v.__k){var n=document.createElement("div"),o=this.__v.__k[0].__c;this.__v.__k[0]=Ke(this.__b,n,o.__O=o.__P)}this.__b=null}var i=t.__a&&I(P,null,e.fallback);return i&&(i.__u&=-33),[I(P,null,t.__a?null:e.children),i]};var qe=function(e,t,n){if(++n[1]===n[0]&&e.l.delete(t),e.props.revealOrder&&(e.props.revealOrder[0]!=="t"||!e.l.size))for(n=e.i;n;){for(;n.length>3;)n.pop()();if(n[1]<n[0])break;e.i=n=n[2]}};(Q.prototype=new R).__a=function(e){var t=this,n=Je(t.__v),o=t.l.get(e);return o[0]++,function(i){var a=function(){t.props.revealOrder?(o.push(i),qe(t,e,o)):i()};n?n(a):a()}},Q.prototype.render=function(e){this.i=null,this.l=new Map;var t=V(e.children);e.revealOrder&&e.revealOrder[0]==="b"&&t.reverse();for(var n=t.length;n--;)this.l.set(t[n],this.i=[1,0,this.i]);return e.children},Q.prototype.componentDidUpdate=Q.prototype.componentDidMount=function(){var e=this;this.l.forEach(function(t,n){qe(e,n,t)})};var St=typeof Symbol!="undefined"&&Symbol.for&&Symbol.for("react.element")||60103,kt=/^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/,Et=/^on(Ani|Tra|Tou|BeforeInp|Compo)/,Ct=/[A-Z0-9]/g,At=typeof document!="undefined",Rt=function(e){return(typeof Symbol!="undefined"&&typeof Symbol()=="symbol"?/fil|che|rad/:/fil|che|ra/).test(e)};function et(e,t,n){return t.__k==null&&(t.textContent=""),ie(e,t),typeof n=="function"&&n(),e?e.__c:null}R.prototype.isReactComponent=!0,["componentWillMount","componentWillReceiveProps","componentWillUpdate"].forEach(function(e){Object.defineProperty(R.prototype,e,{configurable:!0,get:function(){return this["UNSAFE_"+e]},set:function(t){Object.defineProperty(this,e,{configurable:!0,writable:!0,value:t})}})});var Xe=s.event;s.event=function(e){return Xe&&(e=Xe(e)),e.persist=function(){},e.isPropagationStopped=function(){return this.cancelBubble},e.isDefaultPrevented=function(){return this.defaultPrevented},e.nativeEvent=e};var tt,Pt={configurable:!0,get:function(){return this.class}},Ge=s.vnode;s.vnode=function(e){typeof e.type=="string"&&function(t){var n=t.props,o=t.type,i={},a=o.indexOf("-")==-1;for(var u in n){var l=n[u];if(!(u==="value"&&"defaultValue"in n&&l==null||At&&u==="children"&&o==="noscript"||u==="class"||u==="className")){var c=u.toLowerCase();u==="defaultValue"&&"value"in n&&n.value==null?u="value":u==="download"&&l===!0?l="":c==="translate"&&l==="no"?l=!1:c[0]==="o"&&c[1]==="n"?c==="ondoubleclick"?u="ondblclick":c!=="onchange"||o!=="input"&&o!=="textarea"||Rt(n.type)?c==="onfocus"?u="onfocusin":c==="onblur"?u="onfocusout":Et.test(u)&&(u=c):c=u="oninput":a&&kt.test(u)?u=u.replace(Ct,"-$&").toLowerCase():l===null&&(l=void 0),c==="oninput"&&i[u=c]&&(u="oninputCapture"),i[u]=l}}o=="select"&&(i.multiple&&Array.isArray(i.value)&&(i.value=V(n.children).forEach(function(_){_.props.selected=i.value.indexOf(_.props.value)!=-1})),i.defaultValue!=null&&(i.value=V(n.children).forEach(function(_){_.props.selected=i.multiple?i.defaultValue.indexOf(_.props.value)!=-1:i.defaultValue==_.props.value}))),n.class&&!n.className?(i.class=n.class,Object.defineProperty(i,"className",Pt)):n.className&&(i.class=i.className=n.className),t.props=i}(e),e.$$typeof=St,Ge&&Ge(e)};var Ye=s.__r;s.__r=function(e){Ye&&Ye(e),tt=e.__c};var Ze=s.diffed;s.diffed=function(e){Ze&&Ze(e);var t=e.props,n=e.__e;n!=null&&e.type==="textarea"&&"value"in t&&t.value!==n.value&&(n.value=t.value==null?"":t.value),tt=null};function nt(e){return!!e.__k&&(ie(null,e),!0)}function ot(e){return{render:function(t){et(t,e)},unmount:function(){nt(e)}}}var Dt=0,nn=Array.isArray;function fe(e,t,n,o,i,a){t||(t={});var u,l,c=t;if("ref"in c)for(l in c={},t)l=="ref"?u=t[l]:c[l]=t[l];var _={type:e,props:c,key:n,ref:u,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--Dt,__i:-1,__u:0,__source:i,__self:a};if(typeof e=="function"&&(u=e.defaultProps))for(l in u)c[l]===void 0&&(c[l]=u[l]);return s.vnode&&s.vnode(_),_}var rt=`
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`,_t=`
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_morph;
uniform float u_noise_scale;
uniform float u_mouse_amount;
uniform float u_metal;
uniform float u_camera;

#define MAX_STEPS 70
#define MAX_DIST 20.0
#define SURF_DIST 0.002

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float map(vec3 p, float t) {
  float radius = 1.8;
  float morph = snoise(p * (0.8 * u_noise_scale) + t * 0.1) * 0.2;
  morph += snoise(p * (1.5 * u_noise_scale) - t * 0.05 + 10.0) * 0.08;
  morph += snoise(p * (3.0 * u_noise_scale) + t * 0.02) * 0.02;
  return length(p) - radius + morph * u_morph;
}

vec3 calcNormal(vec3 p, float t) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    map(p+e.xyy, t) - map(p-e.xyy, t),
    map(p+e.yxy, t) - map(p-e.yxy, t),
    map(p+e.yyx, t) - map(p-e.yyx, t)
  ));
}

vec3 envLighting(vec3 rd, vec2 mouse) {
  vec3 col = vec3(0.03, 0.03, 0.03);
  vec3 keyDir = normalize(vec3(0.5 + mouse.x, 1.0 + mouse.y * 0.5, 1.2));
  float key = pow(max(dot(rd, keyDir), 0.0), 12.0);
  col += vec3(0.95, 0.93, 0.9) * key * 1.5;
  vec3 rimDir = normalize(vec3(-0.8, -0.2, -1.0));
  float rim = pow(max(dot(rd, rimDir), 0.0), 6.0);
  col += vec3(0.4, 0.42, 0.45) * rim * 0.8;
  vec3 fillDir = normalize(vec3(-1.0, 0.5, 0.5));
  float fill = pow(max(dot(rd, fillDir), 0.0), 3.0);
  col += vec3(0.2, 0.2, 0.2) * fill * 0.6;
  float panel = exp(-pow((rd.y - 0.2) * 4.0, 2.0)) * smoothstep(-0.5, 0.5, rd.z);
  col += vec3(0.15) * panel;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);
  float t = u_time * 0.8;
  vec2 m = u_mouse * u_mouse_amount;
  vec3 ro = vec3(0.0, 0.0, u_camera);
  vec3 lookAt = vec3(m.x, m.y, 0.0);
  vec3 fwd = normalize(lookAt - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(fwd + uv.x * right + uv.y * up);
  vec3 bgCol = mix(vec3(0.02), vec3(0.05), length(uv) * 0.5);
  vec3 col = bgCol;
  float d = 0.0;
  for(int i=0; i<MAX_STEPS; i++) {
    vec3 p = ro + rd * d;
    float ds = map(p, t);
    d += ds;
    if(d > MAX_DIST || abs(ds) < SURF_DIST) break;
  }
  if(d < MAX_DIST) {
    vec3 p = ro + rd * d;
    vec3 n = calcNormal(p, t);
    vec3 ref = reflect(rd, n);
    float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    fresnel = mix(0.4, 1.0, fresnel);
    vec3 env = envLighting(ref, u_mouse);
    col = env * fresnel * 1.8 * u_metal;
    vec3 lightPos = normalize(vec3(0.5 + u_mouse.x, 1.0, 1.0));
    float spec = pow(max(dot(ref, lightPos), 0.0), 60.0);
    col += vec3(1.0) * spec * 2.0 * u_metal;
    float disp = map(p, t) - (length(p) - 1.8);
    col *= mix(0.7, 1.0, smoothstep(-0.1, 0.1, disp));
  }
  float bloom = exp(-length(uv) * 2.5);
  col += vec3(0.02, 0.02, 0.02) * bloom;
  col = col / (col + 0.5);
  col = pow(col, vec3(1.0/2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;var it={speed:1,morph:1,noiseScale:1,mouseAmount:.15,metal:1,camera:5.5,tintHue:220,tintAmount:0};function at(e,t,n){var i;let o=e.createShader(t);if(!o)throw new Error("Unable to create Velox shader");if(e.shaderSource(o,n),e.compileShader(o),!e.getShaderParameter(o,e.COMPILE_STATUS))throw new Error((i=e.getShaderInfoLog(o))!=null?i:"Velox shader compilation failed");return o}function pe({className:e="",...t}){let n=W(null),o=W(null),i=W({...it,...t});i.current={...it,...t},ce(()=>{var me;let l=n.current,c=o.current;if(!l||!c)return;let _=c.getContext("webgl",{alpha:!1,antialias:!1,powerPreference:"high-performance"});if(!_)return;let p=at(_,_.VERTEX_SHADER,rt),y=at(_,_.FRAGMENT_SHADER,_t),r=_.createProgram();if(!r)return;if(_.attachShader(r,p),_.attachShader(r,y),_.linkProgram(r),!_.getProgramParameter(r,_.LINK_STATUS))throw new Error((me=_.getProgramInfoLog(r))!=null?me:"Velox program link failed");_.useProgram(r);let f=_.createBuffer();_.bindBuffer(_.ARRAY_BUFFER,f),_.bufferData(_.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),_.STATIC_DRAW);let d=_.getAttribLocation(r,"a_pos");_.enableVertexAttribArray(d),_.vertexAttribPointer(d,2,_.FLOAT,!1,0,0);let v={resolution:_.getUniformLocation(r,"u_res"),time:_.getUniformLocation(r,"u_time"),mouse:_.getUniformLocation(r,"u_mouse"),morph:_.getUniformLocation(r,"u_morph"),noiseScale:_.getUniformLocation(r,"u_noise_scale"),mouseAmount:_.getUniformLocation(r,"u_mouse_amount"),metal:_.getUniformLocation(r,"u_metal"),camera:_.getUniformLocation(r,"u_camera")},g=0,h=0,m=0,S=0,w=0,C=!0,T=performance.now(),z=()=>{let A=l.getBoundingClientRect(),b=Math.min(window.devicePixelRatio||1,1.5);c.width=Math.max(1,Math.round(A.width*b)),c.height=Math.max(1,Math.round(A.height*b)),_.viewport(0,0,c.width,c.height)},N=A=>{let b=c.getBoundingClientRect();g=(A.clientX-b.left)/Math.max(1,b.width)*2-1,h=-((A.clientY-b.top)/Math.max(1,b.height)*2-1)},U=A=>{let b=i.current;m+=(g-m)*.05,S+=(h-S)*.05,_.uniform2f(v.resolution,c.width,c.height),_.uniform1f(v.time,(A-T)*.001*b.speed),_.uniform2f(v.mouse,m,S),_.uniform1f(v.morph,b.morph),_.uniform1f(v.noiseScale,b.noiseScale),_.uniform1f(v.mouseAmount,b.mouseAmount),_.uniform1f(v.metal,b.metal),_.uniform1f(v.camera,b.camera),_.drawArrays(_.TRIANGLE_STRIP,0,4),w=C&&!document.hidden?requestAnimationFrame(U):0},E=new ResizeObserver(z),D=new IntersectionObserver(([A])=>{var b;C=(b=A==null?void 0:A.isIntersecting)!=null?b:!0,C&&!w&&(w=requestAnimationFrame(U)),!C&&w&&(cancelAnimationFrame(w),w=0)});return E.observe(l),D.observe(l),c.addEventListener("pointermove",N,{passive:!0}),z(),w=requestAnimationFrame(U),()=>{w&&cancelAnimationFrame(w),E.disconnect(),D.disconnect(),c.removeEventListener("pointermove",N),_.deleteBuffer(f),_.deleteShader(p),_.deleteShader(y),_.deleteProgram(r)}},[]);let a=i.current,u=a.tintAmount>0?` sepia(${a.tintAmount}) saturate(${1+a.tintAmount*5}) hue-rotate(${a.tintHue-35}deg)`:"";return fe("div",{ref:n,className:`threeui-background liquid-form${e?` ${e}`:""}`,children:fe("canvas",{ref:o,style:{filter:u.trim()||void 0}})})}function Lt(){try{let e=document.createElement("canvas");return!!(window.WebGLRenderingContext&&(e.getContext("webgl")||e.getContext("experimental-webgl")))}catch{return!1}}function Ft(e){if(e.dataset.cvGlowMounted)return;e.dataset.cvGlowMounted="1";let t=parseFloat(e.dataset.tintHue||"6"),n=parseFloat(e.dataset.tintAmount||"0.85"),o=parseFloat(e.dataset.speed||"0.55");ot(e).render(I(pe,{speed:o,morph:.85,noiseScale:.9,mouseAmount:.12,metal:1.15,camera:5.5,tintHue:t,tintAmount:n})),requestAnimationFrame(()=>e.classList.add("is-ready"))}function ut(){let e=document.querySelectorAll("[data-cv-hero-glow]");e.length&&(window.matchMedia("(prefers-reduced-motion: reduce)").matches||Lt()&&e.forEach(Ft))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ut):ut();})();
