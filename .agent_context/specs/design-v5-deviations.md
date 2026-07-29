# Registre d'écarts — migration design v5 (épic GUIC-689)

Tout écart assumé entre l'implémentation et le handoff v5 est consigné ici.
Règle : **jamais de correction silencieuse du design** — un problème v5 est signalé, décidé, tracé.
Classement : ÉCART-CODE (le code se conforme) · PROBLÈME-V5 (le design ne passe pas une gate objective) · AMBIGUÏTÉ (arbitrage Lot 14 ou décision documentée).

| ID | Type | Sujet | Constat | Décision | Statut |
|---|---|---|---|---|---|
| É-01 | AMBIGUÏTÉ | `--gj-container-x` : 920px en v5 vs 1280px repo | Cote du canvas de maquette, pas une règle énoncée ; passer à 920 rétrécirait toutes les pages | Garder 1280 ; réévaluer écran par écran pendant les audits par espace | Décidé (session 2026-07-29, réversible) |
| É-02 | AMBIGUÏTÉ | Consigne « zéro gradient (aplats) » vs tokens `--gj-yaye-grad-*` et `--prog-*` conservés en v5 | Le handoff v5 maintient lui-même ces gradients (wordmark/avatar Yaye, palettes programmes, admin gold) | Gradients = exceptions signature (Yaye wordmark+avatar, `--prog-*`, admin gold hors périmètre) ; aplats partout ailleurs | Validé lead 2026-07-29 |
| É-03 | Règle confirmée | Texte blanc sur ambre `#f8a309` | Recalcul : 2.05:1 — la règle v5 « texte noir sur ambre » est confirmée par le calcul | Sentinelle permanente dans les tests tokens | Encodé |
| É-04 | **PROBLÈME-V5** | Focus ring passé à l'ambre `#f8a309` en v5 | **Échoue WCAG 1.4.11** (non-text contrast ≥ 3:1) : 2.05:1 vs blanc, **1.91:1 vs `--gj-bg`**, 2.36:1 vs teal. Seul le navy passe (6.58:1). NB : l'actuel `#00B287` est limite aussi (2.72:1 vs blanc — dette préexistante, meilleur que l'ambre partout sauf navy) | **Ambre non implémenté** — statu quo `#00B287`. Recommandation à remonter au design : anneau double (liseré sombre `#026463` + halo clair) qui passe 3:1 sur toute surface | **⚠ En attente arbitrage lead/design** |
| É-05 | ÉCART assumé | Règle `a{}` globale v5 (liens teal-deep + soustrait) | Un sélecteur global toucherait l'espace admin (hors périmètre, session parallèle) et tous les écrans d'un coup | Non porté en fondation ; appliqué composant par composant dans les vagues par espace | Décidé (session 2026-07-29) |
| É-06 | Équivalence technique | `@import` Google Fonts (Lexend) dans tokens.css v5 | Requête runtime tierce : interdit (réseau intermittent, confidentialité, CSP) | `next/font/google` — self-host au build, même police, zéro requête client | Décidé (session 2026-07-29) |
| É-07 | Impact coordonné | L'admin gold (`--gj-admin-gold`) référence `var(--gj-yellow)` qui passe de `#F9C400` à `#f8a309` | Le rendu doré admin change légèrement alors que l'admin est hors périmètre | Prévu par la coordination (tokens.css = fichier partagé, palette globale portée par cette session) ; signalé à la session admin dans la PR | Signalé |
