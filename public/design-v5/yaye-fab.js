/* Guichet Jeunesse — Bouton flottant Yaye (assistant IA), côté bénéficiaire.
   S'injecte automatiquement dans chaque écran bénéficiaire d'un lot :
   - écran web : repéré par la colonne « Mon espace », FAB en bas à droite du cadre
   - écran mobile : cadre 390×844 doté de la barre d'onglets, FAB au-dessus de la barre
   Aucune modification écran par écran : un seul point de vérité pour les 9 lots. */
(function () {
  if (window.__gjYayeFab) return;
  window.__gjYayeFab = true;

  var css = document.createElement("style");
  css.textContent = [
    "@keyframes gj-yaye-halo{0%{transform:scale(1);opacity:.55}70%{transform:scale(1.5);opacity:0}100%{transform:scale(1.5);opacity:0}}",
    ".gj-yaye-fab{position:absolute;border:0;border-radius:50%;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#027f7e,#014B4A);color:#fff;box-shadow:0 10px 26px rgba(1,75,74,.42);z-index:30;font-family:var(--gj-font-sans),system-ui,sans-serif}",
    ".gj-yaye-fab:focus-visible{outline:4px solid #f8a309;outline-offset:3px}",
    ".gj-yaye-fab .gj-halo{position:absolute;inset:-3px;border-radius:50%;border:2px solid #f8a309;animation:gj-yaye-halo 2.6s ease-out infinite;pointer-events:none}",
    ".gj-yaye-fab .gj-ia{position:absolute;top:-3px;right:-5px;background:#f8a309;color:#202020;font-size:11px;font-weight:900;letter-spacing:.3px;padding:1px 5px;border-radius:999px;line-height:1.35}",
    ".gj-yaye-fab .gj-lbl{position:absolute;right:calc(100% + 9px);top:50%;transform:translateY(-50%);background:#202020;color:#fff;font-size:12px;font-weight:800;padding:5px 9px;border-radius:8px;white-space:nowrap;opacity:0;transition:opacity .14s;pointer-events:none}",
    ".gj-yaye-fab:hover .gj-lbl,.gj-yaye-fab:focus-visible .gj-lbl{opacity:1}",
    "html.gjm .gj-yaye-fab .gj-halo{animation:none;opacity:.5}"
  ].join("");
  (document.head || document.documentElement).appendChild(css);

  var SPARK = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M12 3.4l1.7 5.1 5.1 1.7-5.1 1.7L12 17l-1.7-5.1L5.2 10.2l5.1-1.7z'/><path d='M18.5 15.6l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z'/></svg>";

  function make(size) {
    var b = document.createElement("button");
    b.className = "gj-yaye-fab";
    b.type = "button";
    b.setAttribute("aria-label", "Demander à Yaye, l'assistante IA");
    b.style.width = b.style.height = size + "px";
    b.innerHTML = "<span class='gj-halo'></span><span class='gj-ia'>IA</span>" +
      "<span class='gj-lbl'>Demander à Yaye</span>" +
      "<span style='width:" + Math.round(size * 0.48) + "px;height:" + Math.round(size * 0.48) + "px;display:inline-flex'>" + SPARK + "</span>";
    b.addEventListener("click", function () {
      if (window.gjToast) window.gjToast("Yaye ouvre la conversation…", "info");
    });
    return b;
  }

  function host(el) {
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    return el;
  }

  // Remonte le bouton au-dessus d'une barre d'action réellement ÉPINGLÉE au bas
  // du cadre (position sticky/fixed/absolute, bord bas à moins de 24 px).
  // Un bouton en flux normal n'est jamais considéré : un bouton flottant survole
  // légitimement le contenu qui défile. Remontée bornée à 120 px pour que le
  // bouton reste toujours dans la zone basse du cadre.
  var LIFT_MAX = 120;

  function pinned(el, frame) {
    for (var n = el; n && n !== frame; n = n.parentElement) {
      var p = getComputedStyle(n).position;
      if (p === "sticky" || p === "fixed" || p === "absolute") return true;
    }
    return false;
  }

  function avoid(f, frame, base) {
    var fr = frame.getBoundingClientRect();
    var scale = fr.width / (frame.offsetWidth || fr.width) || 1;
    f.style.bottom = base + "px";
    var r = f.getBoundingClientRect();
    var lift = 0;
    Array.prototype.forEach.call(frame.querySelectorAll("button"), function (b) {
      if (b === f || f.contains(b)) return;
      var q = b.getBoundingClientRect();
      if (q.width < fr.width * 0.35) return;
      if (fr.bottom - q.bottom > 24 * scale) return;
      if (!pinned(b, frame)) return;
      if (q.right < r.left || q.left > r.right || q.bottom < r.top || q.top > r.bottom) return;
      var need = (r.bottom - q.top) / scale + 14;
      if (need > lift) lift = need;
    });
    f.style.bottom = (base + Math.min(lift, LIFT_MAX)) + "px";
  }

  // La barre d'onglets à 5 colonnes est la signature du chrome applicatif
  // CONNECTÉ : elle sépare les écrans de session des écrans pré-authentification
  // (connexion, consentement), où aucun point d'entrée IA ne doit apparaître.
  function hasAppChrome(frame) {
    return !!Array.prototype.filter.call(frame.querySelectorAll("div"), function (x) {
      var h = x.offsetHeight;
      if (h < 40 || h > 90) return false;
      var s = getComputedStyle(x);
      return s.display === "grid" && s.gridTemplateColumns.split(" ").length === 5;
    }).length;
  }

  // Réserve la place du bouton dans le flux : les conteneurs défilants du cadre
  // gagnent une marge basse égale à son emprise, de sorte qu'aucun contrôle ne
  // vienne se glisser sous sa zone de clic. Corrige d'un coup tous les boutons
  // de bas de page, sans jamais déplacer le bouton lui-même.
  function reserve(frame, px) {
    Array.prototype.forEach.call(frame.querySelectorAll("div"), function (d) {
      if (d.hasAttribute("data-gj-fab-pad")) return;
      if (d.offsetHeight < 200) return;
      var ov = getComputedStyle(d).overflowY;
      if (ov !== "auto" && ov !== "scroll") return;
      var pb = parseFloat(getComputedStyle(d).paddingBottom) || 0;
      d.setAttribute("data-gj-fab-pad", "1");
      d.style.paddingBottom = (pb + px) + "px";
    });
  }

  function scan() {
    var n = 0;
    // écrans web bénéficiaire : la colonne porte le libellé « Mon espace »
    Array.prototype.forEach.call(document.querySelectorAll("aside"), function (a) {
      if (a.textContent.indexOf("Mon espace") === -1) return;
      var frame = a.parentElement;
      if (!frame || frame.closest("[data-gj-fab-host]")) return;
      var f = make(56);
      f.style.right = "26px";
      frame.setAttribute("data-gj-fab-host", "web");
      host(frame).appendChild(f);
      reserve(frame, 76);
      avoid(f, frame, 26); n++;
    });
    // écrans mobiles : cadre 390×844. Les cadres sont imbriqués (jusqu'à trois
    // wrappers de même taille) : on ne retient que le plus externe, repéré par
    // l'attribut posé sur le cadre déjà servi — un test sur les descendants
    // laisserait passer chaque wrapper interne.
    Array.prototype.forEach.call(document.querySelectorAll("div"), function (d) {
      if (d.offsetWidth !== 390 || d.offsetHeight !== 844) return;
      if (d.closest("[data-gj-fab-host]")) return;
      if (!hasAppChrome(d)) return;
      var f = make(52);
      f.style.right = "16px";
      d.setAttribute("data-gj-fab-host", "mobile");
      host(d).appendChild(f);
      reserve(d, 72);
      avoid(f, d, 84); n++;
    });
    return n;
  }

  // Les écrans sont montés par React après transpilation Babel : la fenêtre de
  // scan doit rester ouverte, sinon l'injection passe avant le premier rendu.
  function boot() {
    var t = null;
    function debounced() {
      if (t) return;
      t = setTimeout(function () { t = null; scan(); }, 150);
    }
    scan();
    var root = document.getElementById("root") || document.body;
    new MutationObserver(debounced).observe(root, { childList: true, subtree: true });
    var tries = 0;
    var iv = setInterval(function () {
      scan();
      // les barres d'action peuvent apparaître après le premier rendu
      Array.prototype.forEach.call(document.querySelectorAll(".gj-yaye-fab"), function (f) {
        avoid(f, f.parentElement, f.offsetWidth === 52 ? 84 : 26);
      });
      if (++tries > 30) clearInterval(iv);
    }, 500);
  }
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
})();
