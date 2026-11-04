/**
 * Tailwind 4 necesita color-mix(), :is() y @property (Safari 16.4+, Chrome 111+, Firefox 128+). En un navegador más
 * antiguo la página se vería rota; este script mínimo, escrito en ES5 y con estilos en línea, avisa en vez de dejarla así.
 */
export const oldBrowserNotice = "Tu navegador es antiguo y Matchwork puede verse mal. Actualízalo (Safari 16.4+, Chrome 111+, Firefox 128+ o Edge 111+) para usarlo sin problemas.";

export const browserSupportScript = `(function(){try{var ok=window.CSS&&CSS.supports&&CSS.supports("color","color-mix(in srgb, red, blue)")&&CSS.supports("selector(:is(a))");if(ok)return;document.addEventListener("DOMContentLoaded",function(){var d=document.createElement("div");d.setAttribute("role","alert");d.setAttribute("data-old-browser","");d.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px 16px;background:#fff3cd;color:#3b2f00;font:16px/1.4 system-ui,sans-serif;text-align:center";d.textContent=${JSON.stringify(oldBrowserNotice)};document.documentElement.appendChild(d)})}catch(e){}})();`;
