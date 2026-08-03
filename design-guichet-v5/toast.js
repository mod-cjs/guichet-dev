/* Guichet Jeunesse — Toast de confirmation partagé.
   window.gjToast("Message", "success" | "error" | "info")  */
(function () {
  if (window.gjToast) return;
  var css = document.createElement("style");
  css.textContent =
    "#gj-toasts{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;z-index:2147483645;pointer-events:none;align-items:center}" +
    ".gj-toast{display:inline-flex;align-items:center;gap:9px;background:#162c5e;color:#fff;padding:11px 18px;border-radius:12px;font-family:Lexend,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:13.5px;font-weight:700;box-shadow:0 12px 32px rgba(0,0,0,.3);animation:gjtIn .22s ease;max-width:86vw}" +
    ".gj-toast.out{opacity:0;transform:translateY(8px);transition:all .25s}" +
    ".gj-toast .dot{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px}" +
    ".gj-toast.success .dot{background:#19a657}.gj-toast.error .dot{background:#ee6f21}.gj-toast.info .dot{background:#027f7e}" +
    "@keyframes gjtIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}";
  (document.head || document.documentElement).appendChild(css);
  var wrap;
  function ensure() {
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "gj-toasts"; wrap.setAttribute("role", "status"); wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
    return wrap;
  }
  window.gjToast = function (msg, kind) {
    kind = kind || "success";
    var t = document.createElement("div");
    t.className = "gj-toast " + kind;
    var ic = kind === "success" ? "✓" : kind === "error" ? "✕" : "i";
    t.innerHTML = "<span class='dot'>" + ic + "</span><span></span>";
    t.lastChild.textContent = msg;
    ensure().appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 300); }, 2800);
  };
})();
