import { extractProduct } from "./product";

// The code behind the "Add to wishlist" bookmark. It reads the shop page you
// have open, in your own browser, and opens the app's new-wish form with what
// it found. This also works on shops that turn away the app's server.
export function bookmarkletHref(origin: string): string {
  const code = `(function(){
try{
var d=document,meta=[];
d.querySelectorAll("meta").forEach(function(e){var k=e.getAttribute("property")||e.getAttribute("name")||e.getAttribute("itemprop"),c=e.getAttribute("content");if(k&&c)meta.push([k,c]);});
d.querySelectorAll("[itemprop=price],[itemprop=priceCurrency]").forEach(function(e){var c=e.getAttribute("content")||(e.textContent||"").trim();if(c&&c.length<20)meta.push([e.getAttribute("itemprop"),c]);});
var ld=[].map.call(d.querySelectorAll('script[type="application/ld+json"]'),function(s){return s.textContent||"";});
var p=(${extractProduct.toString()})({url:location.href,title:d.title,jsonLd:ld,meta:meta});
var q=new URLSearchParams();q.set("url",location.href);
["name","price","shop","detail","imageUrl"].forEach(function(k){if(p[k])q.set(k,String(p[k]).slice(0,600));});
var u=${JSON.stringify(origin)}+"/add?"+q.toString();
if(!window.open(u,"_blank"))location.href=u;
}catch(e){alert("The wishlist couldn't read this page: "+e);}
})();`;
  return `javascript:${encodeURIComponent(code)}`;
}
