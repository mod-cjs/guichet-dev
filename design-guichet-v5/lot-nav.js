/* Guichet Jeunesse — Navigateur inter-lots partagé.
   Bouton discret en haut à gauche → panneau listant tous les lots, groupés par rôle.
   Injecter : <script src="lot-nav.js"></script> */
(function () {
  if (window.__gjLotNav) return; window.__gjLotNav = true;

  var GROUPS = [
    ["Bénéficiaire", [
      ["Lot 1 - Onboarding + Ecrans cles.html", "1 · Onboarding mobile + écrans clés"],
      ["Lot 2 - Onboarding Web + Dashboard Beneficiaire.html", "2 · Onboarding web + dashboard"],
      ["Lot 3 - Opportunites.html", "3 · Opportunités + candidature"],
      ["Lot 4 - Profil Beneficiaire.html", "4 · Profil"],
      ["Lot 5 - Evenements.html", "5 · Événements"],
      ["Lot 6 - Ressources.html", "6 · Médiathèque"],
      ["Lot 7 - Centres CJS.html", "7 · Centres + carte CJS"],
      ["Lot 9 - Mes Candidatures.html", "9 · Mes candidatures"],
      ["Lot 12 - Complements Beneficiaire.html", "12 · Messagerie · Connexion · Inclusion"],
      ["Lot 15 - Yaye Opportunites Depot.html", "15 · Yaye + dépôt de dossier"],
    ]],
    ["Back-office", [
      ["Lot 8 - Espace Conseiller.html", "8 · Espace conseiller"],
      ["Lot 10 - Espace Recruteur.html", "10 · Espace recruteur"],
      ["Lot 11 - Administration.html", "11 · Administration"],
    ]],
    ["Système", [
      ["Lot 13 - Etats Systeme.html", "13 · États système"],
      ["Lot 14 - Bibliotheque Composants.html", "14 · Bibliothèque de composants"],
      ["Audit UX - Guichet Jeunesse.html", "Audit UX & design"],
    ]],
  ];

  var here = decodeURIComponent((location.pathname.split("/").pop() || ""));

  var css = document.createElement("style");
  css.textContent =
    "#gj-lotnav-btn{position:fixed;bottom:18px;right:18px;z-index:2147483644;display:inline-flex;align-items:center;gap:7px;background:#162c5e;color:#fff;border:0;border-radius:10px;padding:8px 13px;font-family:Lexend,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.28);opacity:.85}" +
    "#gj-lotnav-btn:hover{opacity:1}" +
    "#gj-lotnav-btn:focus-visible{outline:3px solid #f8a309;outline-offset:2px}" +
    "#gj-lotnav{position:fixed;bottom:62px;right:18px;width:330px;max-height:80vh;overflow-y:auto;background:#fff;border:1.5px solid #E0E4E6;border-radius:16px;z-index:2147483644;box-shadow:0 24px 60px rgba(0,0,0,.3);font-family:Lexend,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:none;padding:8px}" +
    "#gj-lotnav.open{display:block}" +
    "#gj-lotnav .g{font-size:11px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;color:#4A4A4A;padding:10px 10px 5px}" +
    "#gj-lotnav a{display:block;padding:8px 10px;border-radius:9px;font-size:12.5px;font-weight:700;color:#162c5e;text-decoration:none;line-height:1.35}" +
    "#gj-lotnav a:hover{background:#E2F1F1;color:#027f7e}" +
    "#gj-lotnav a.cur{background:#027f7e;color:#fff}";
  (document.head || document.documentElement).appendChild(css);

  function init() {
    var btn = document.createElement("button");
    btn.id = "gj-lotnav-btn";
    btn.setAttribute("aria-label", "Naviguer entre les lots");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = "<svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M4 7h16M4 12h16M4 17h10'/></svg>Lots";
    var panel = document.createElement("nav");
    panel.id = "gj-lotnav";
    panel.setAttribute("aria-label", "Navigation entre les lots");
    var html = "";
    GROUPS.forEach(function (g) {
      html += "<div class='g'>" + g[0] + "</div>";
      g[1].forEach(function (l) {
        var cur = l[0] === here ? " class='cur'" : "";
        html += "<a href='" + encodeURI(l[0]) + "'" + cur + ">" + l[1] + "</a>";
      });
    });
    panel.innerHTML = html;
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    btn.addEventListener("click", function () {
      var open = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", function (e) {
      if (!panel.classList.contains("open")) return;
      if (e.target.closest("#gj-lotnav,#gj-lotnav-btn")) return;
      panel.classList.remove("open"); btn.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("open")) { panel.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
})();
