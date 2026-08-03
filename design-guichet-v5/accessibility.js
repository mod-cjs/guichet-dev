/* Guichet Jeunesse — Barre d'accessibilité partagée (vanilla, aucune dépendance).
   À inclure dans chaque lot : <script src="accessibility.js"></script> avant </body>.
   Applique des préférences persistantes (localStorage "gj-a11y") sur <html>. */
(function () {
  if (window.__gjA11yLoaded) return;
  window.__gjA11yLoaded = true;

  var KEY = "gj-a11y";
  var DEFAULTS = { contrast: false, zoom: 0, spacing: false, motion: false, gray: false, keyboard: true, cursor: false, guide: false, voice: false };
  var state = load();

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  // ---- CSS injecté ----
  var css = document.createElement("style");
  css.id = "gj-a11y-style";
  css.textContent = [
    /* focus visible toujours utile pour le clavier */
    "html.gjk :focus-visible{outline:4px solid #1e35ba !important;outline-offset:2px !important;border-radius:3px;}",
    "html.gjk a:focus-visible,html.gjk button:focus-visible,html.gjk [role=button]:focus-visible{box-shadow:0 0 0 4px rgba(30,53,186,.25)!important;}",
    /* contraste élevé : on surcharge les tokens couleur (cascade partout) */
    "html.gjc{--gj-ink:#000;--gj-grey:#202020;--gj-grey-2:#4A4A4A;--gj-line:#767676;--gj-line-strong:#202020;}",
    "html.gjc a,html.gjc button{text-underline-offset:2px;}",
    /* espacement du texte (WCAG 1.4.12) */
    "html.gjs p,html.gjs span,html.gjs div,html.gjs li,html.gjs a,html.gjs button,html.gjs h1,html.gjs h2,html.gjs h3{line-height:1.7 !important;letter-spacing:.04em !important;word-spacing:.1em !important;}",
    /* animations réduites */
    "html.gjm *,html.gjm *::before,html.gjm *::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important;}",
    /* niveaux de gris */
    "html.gjg #root{filter:grayscale(1);}",
    /* zoom texte/contenu */
    "html.gjz1 #root{zoom:1.15;}",
    "html.gjz2 #root{zoom:1.32;}",
    /* gros curseur */
    "html.gjcur,html.gjcur *{cursor:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><path d='M6 4 L6 32 L13 25 L18 36 L23 34 L18 23 L28 23 Z' fill='white' stroke='black' stroke-width='2.2' stroke-linejoin='round'/></svg>\") 4 4, auto !important;}",
    /* guide de lecture */
    "#gj-guide{position:fixed;left:0;right:0;height:38px;background:rgba(248,163,9,.16);border-top:2px solid rgba(2,127,126,.55);border-bottom:2px solid rgba(2,127,126,.55);pointer-events:none;z-index:2147483640;display:none;}",
    "html.gjguide #gj-guide{display:block;}",
    /* lecture vocale : indique les zones cliquables-à-lire */
    "html.gjv [data-gj-readable]:hover{outline:2px dashed rgba(2,127,126,.6)!important;outline-offset:1px;}",
    /* panneau */
    "#gj-fab{position:fixed;left:18px;bottom:18px;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#027f7e,#014B4A);color:#fff;border:0;cursor:pointer;z-index:2147483646;box-shadow:0 8px 24px rgba(0,0,0,.32);display:inline-flex;align-items:center;justify-content:center;}",
    "#gj-fab:focus-visible{outline:4px solid #f8a309;outline-offset:3px;}",
    "#gj-panel{position:fixed;left:18px;bottom:82px;width:312px;max-height:78vh;overflow-y:auto;background:#fff;border:1.5px solid #E0E4E6;border-radius:18px;z-index:2147483646;box-shadow:0 24px 60px rgba(0,0,0,.3);font-family:Lexend,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#162c5e;display:none;}",
    "#gj-panel.open{display:block;}",
    "#gj-panel header{display:flex;align-items:center;gap:9px;padding:15px 16px;border-bottom:1.5px solid #F0F2F5;position:sticky;top:0;background:#fff;border-radius:18px 18px 0 0;}",
    "#gj-panel h2{font-size:15px;font-weight:800;margin:0;flex:1;}",
    "#gj-panel .gj-x{width:32px;height:32px;border:0;background:#F0F2F5;border-radius:8px;cursor:pointer;font-size:16px;color:#026463;}",
    "#gj-panel .gj-body{padding:8px 14px 14px;}",
    "#gj-panel .gj-row{display:flex;align-items:center;gap:11px;padding:10px 4px;border-bottom:1px solid #F0F2F5;}",
    "#gj-panel .gj-row:last-child{border-bottom:0;}",
    "#gj-panel .gj-ic{width:34px;height:34px;border-radius:9px;background:#E2F1F1;color:#027f7e;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}",
    "#gj-panel .gj-tx{flex:1;min-width:0;}",
    "#gj-panel .gj-tt{font-size:13px;font-weight:700;line-height:1.2;}",
    "#gj-panel .gj-sub{font-size:11px;color:#4A4A4A;margin-top:1px;}",
    "#gj-panel .gj-sw{width:46px;height:27px;border-radius:999px;border:0;background:#B9C1C4;position:relative;cursor:pointer;flex-shrink:0;}",
    "#gj-panel .gj-sw[aria-checked=true]{background:#027f7e;}",
    "#gj-panel .gj-sw span{position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.25);}",
    "#gj-panel .gj-sw[aria-checked=true] span{left:22px;}",
    "#gj-panel .gj-seg{display:flex;gap:5px;flex-shrink:0;}",
    "#gj-panel .gj-seg button{min-width:34px;height:30px;border-radius:8px;border:1.5px solid #E0E4E6;background:#fff;font-weight:800;font-size:12px;cursor:pointer;color:#4A4A4A;}",
    "#gj-panel .gj-seg button[aria-pressed=true]{background:#027f7e;border-color:#027f7e;color:#fff;}",
    "#gj-panel .gj-reset{width:100%;margin-top:10px;padding:11px;border:1.5px solid #E0E4E6;background:#fff;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer;color:#027f7e;}",
    "#gj-panel .gj-note{font-size:11px;color:#4A4A4A;padding:8px 4px 2px;line-height:1.4;}"
  ].join("");
  (document.head || document.documentElement).appendChild(css);

  function apply() {
    var h = document.documentElement;
    h.classList.toggle("gjc", !!state.contrast);
    h.classList.toggle("gjs", !!state.spacing);
    h.classList.toggle("gjm", !!state.motion);
    h.classList.toggle("gjg", !!state.gray);
    h.classList.toggle("gjk", !!state.keyboard);
    h.classList.toggle("gjcur", !!state.cursor);
    h.classList.toggle("gjguide", !!state.guide);
    h.classList.toggle("gjv", !!state.voice);
    h.classList.toggle("gjz1", state.zoom === 1);
    h.classList.toggle("gjz2", state.zoom === 2);
    save();
  }

  function icon(p) { return "<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'>" + p + "</svg>"; }
  var ICONS = {
    contrast: "<circle cx='12' cy='12' r='9'/><path d='M12 3v18' fill='currentColor'/><path d='M12 3a9 9 0 0 1 0 18z' fill='currentColor'/>",
    zoom: "<path d='M4 9V5a1 1 0 0 1 1-1h4'/><path d='M20 9V5a1 1 0 0 0-1-1h-4'/><path d='M4 15v4a1 1 0 0 0 1 1h4'/><path d='M20 15v4a1 1 0 0 1-1 1h-4'/>",
    spacing: "<path d='M3 6h18'/><path d='M3 12h18'/><path d='M3 18h12'/>",
    motion: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
    gray: "<circle cx='12' cy='12' r='9'/><path d='M12 3v18'/>",
    keyboard: "<rect x='2' y='6' width='20' height='12' rx='2'/><path d='M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8'/>",
    cursor: "<path d='M5 3l5 16 2.5-6.5L19 10z'/>",
    guide: "<path d='M3 12h18'/><path d='M7 8l-2 4 2 4'/><path d='M17 8l2 4-2 4'/>",
    voice: "<path d='M3 10v4h4l5 5V5L7 10z'/><path d='M16 8a5 5 0 0 1 0 8'/>"
  };

  var panel, fab, guideEl;

  function row(key, ttl, sub, ic) {
    return "<div class='gj-row'><span class='gj-ic'>" + icon(ICONS[ic]) + "</span><span class='gj-tx'><span class='gj-tt'>" + ttl + "</span><span class='gj-sub'>" + sub + "</span></span>" +
      "<button class='gj-sw' role='switch' data-k='" + key + "' aria-checked='" + (!!state[key]) + "' aria-label='" + ttl + "'><span></span></button></div>";
  }

  function buildPanel() {
    panel = document.createElement("div");
    panel.id = "gj-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Options d'accessibilité");
    panel.innerHTML =
      "<header><span class='gj-ic'>" + icon(ICONS.keyboard) + "</span><h2>Accessibilité</h2><button class='gj-x' aria-label='Fermer'>✕</button></header>" +
      "<div class='gj-body'>" +
        "<div class='gj-row'><span class='gj-ic'>" + icon(ICONS.zoom) + "</span><span class='gj-tx'><span class='gj-tt'>Taille du texte</span><span class='gj-sub'>Agrandir tout le contenu</span></span>" +
          "<span class='gj-seg' data-seg='zoom'><button data-z='0' aria-pressed='" + (state.zoom === 0) + "'>A</button><button data-z='1' aria-pressed='" + (state.zoom === 1) + "' style='font-size:14px'>A</button><button data-z='2' aria-pressed='" + (state.zoom === 2) + "' style='font-size:16px'>A</button></span></div>" +
        row("contrast", "Contraste élevé", "Renforce la lisibilité", "contrast") +
        row("spacing", "Espacement du texte", "Interlignes & lettres aérés", "spacing") +
        row("keyboard", "Navigation clavier", "Met en évidence le focus", "keyboard") +
        row("motion", "Réduire les animations", "Limite les mouvements", "motion") +
        row("gray", "Niveaux de gris", "Réduit les couleurs", "gray") +
        row("cursor", "Grand curseur", "Pointeur agrandi", "cursor") +
        row("guide", "Guide de lecture", "Règle qui suit la souris", "guide") +
        row("voice", "Lecture vocale", "Touche un texte pour l'écouter", "voice") +
        "<div class='gj-note'>La lecture vocale utilise la voix de l'appareil (français ; wolof si disponible).</div>" +
        "<button class='gj-reset'>Tout réinitialiser</button>" +
      "</div>";
    document.body.appendChild(panel);

    panel.querySelector(".gj-x").addEventListener("click", togglePanel);
    panel.querySelector(".gj-reset").addEventListener("click", function () {
      state = Object.assign({}, DEFAULTS); apply(); refresh();
    });
    panel.querySelectorAll(".gj-sw").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-k"); state[k] = !state[k];
        b.setAttribute("aria-checked", !!state[k]); apply();
        if (k === "voice" && state[k]) speak("Lecture vocale activée. Touchez un texte pour l'écouter.");
      });
    });
    panel.querySelector("[data-seg='zoom']").addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t) return;
      state.zoom = parseInt(t.getAttribute("data-z"), 10); apply();
      panel.querySelectorAll("[data-seg='zoom'] button").forEach(function (x) { x.setAttribute("aria-pressed", parseInt(x.getAttribute("data-z"), 10) === state.zoom); });
    });
  }

  function refresh() {
    panel.querySelectorAll(".gj-sw").forEach(function (b) { b.setAttribute("aria-checked", !!state[b.getAttribute("data-k")]); });
    panel.querySelectorAll("[data-seg='zoom'] button").forEach(function (x) { x.setAttribute("aria-pressed", parseInt(x.getAttribute("data-z"), 10) === state.zoom); });
  }

  window.gjOpenA11y = function () {
    if (!panel) return;
    if (!panel.classList.contains("open")) togglePanel();
    else panel.querySelector(".gj-x").focus();
  };

  function togglePanel() {
    var open = panel.classList.toggle("open");
    fab.setAttribute("aria-expanded", open);
    if (open) panel.querySelector(".gj-x").focus();
  }

  function buildFab() {
    fab = document.createElement("button");
    fab.id = "gj-fab";
    fab.setAttribute("aria-label", "Options d'accessibilité");
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML = "<svg viewBox='0 0 24 24' width='27' height='27' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='4' r='1.6' fill='currentColor'/><path d='M4 8h16'/><path d='M9 8l1 5-1.5 6'/><path d='M15 8l-1 5 1.5 6'/></svg>";
    document.body.appendChild(fab);
    fab.addEventListener("click", togglePanel);
  }

  // ---- guide de lecture ----
  function buildGuide() {
    guideEl = document.createElement("div"); guideEl.id = "gj-guide";
    document.body.appendChild(guideEl);
    document.addEventListener("mousemove", function (e) {
      if (!state.guide) return; guideEl.style.top = (e.clientY - 19) + "px";
    });
  }

  // ---- lecture vocale ----
  function speak(txt) {
    if (!("speechSynthesis" in window) || !txt) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(txt.slice(0, 320));
      u.lang = "fr-FR"; u.rate = 0.98;
      var vs = window.speechSynthesis.getVoices();
      var wo = vs.find(function (v) { return /wo|wol/i.test(v.lang); });
      if (wo) u.voice = wo;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    if (!state.voice) return;
    if (e.target.closest("#gj-panel,#gj-fab")) return;
    var el = e.target.closest("button,a,label,h1,h2,h3,h4,p,li,span,div");
    if (!el) return;
    var t = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (t) speak(t);
  }, true);

  // marque les éléments lisibles (pour le hover)
  function markReadable() {
    document.querySelectorAll("button,a,h1,h2,h3,p,li").forEach(function (el) {
      if (!el.closest("#gj-panel,#gj-fab")) el.setAttribute("data-gj-readable", "");
    });
  }

  // WCAG : associe un nom accessible aux champs qui n'ont qu'un placeholder
  function labelFields() {
    document.querySelectorAll("input,textarea,select").forEach(function (el) {
      if (el.closest("#gj-panel,#gj-fab")) return;
      var has = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")
        || (el.id && document.querySelector('label[for="' + el.id + '"]')) || el.closest("label");
      if (has) return;
      var name = el.getAttribute("placeholder");
      if (!name) {
        var p = el.previousElementSibling;
        if (p && p.textContent && p.textContent.trim()) name = p.textContent.trim();
        else if (el.parentElement && el.parentElement.previousElementSibling) {
          var pr = el.parentElement.previousElementSibling.textContent || "";
          if (pr.trim()) name = pr.trim();
        }
      }
      if (name) el.setAttribute("aria-label", name.replace(/\s+/g, " ").slice(0, 80));
    });
    // boutons-icône sans texte ni label → titre générique
    document.querySelectorAll("button").forEach(function (b) {
      if (b.closest("#gj-panel,#gj-fab")) return;
      if (b.getAttribute("aria-label") || (b.textContent || "").trim()) return;
      b.setAttribute("aria-label", "Bouton");
    });
  }

  // Échap ferme le panneau
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel && panel.classList.contains("open")) togglePanel();
  });

  function init() {
    buildFab(); buildPanel(); buildGuide(); apply(); markReadable(); labelFields();
    // re-marquer après les rendus React
    setTimeout(function () { markReadable(); labelFields(); }, 1500);
    setTimeout(function () { markReadable(); labelFields(); }, 4000);
  }
  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
