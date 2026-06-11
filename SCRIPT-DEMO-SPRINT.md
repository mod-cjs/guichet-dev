# 🎬 Script démo sprint review — 4 chantiers livrés

**URL preview** : `guichet-dev-testt2.vercel.app` (mouhammadouod)
**Durée totale estimée** : 20-25 min
**Pré-requis** : compte démo connecté (`beneficiaire@cjs.sn` / `Test1234!`)

---

## ⚙️ Préparation 5 min avant la démo

### Checklist technique
- [ ] Ouvrir Vercel preview en plein écran
- [ ] Préparer 2 onglets : **public** (incognito) + **connecté** (compte démo)
- [ ] Outils dev ouverts (DevTools Network onglet pour montrer les `/api/v1/track`)
- [ ] Affiche viewport responsive prête (toggle 390 / 768 / 1440)
- [ ] **BLOB_READ_WRITE_TOKEN** confirmé OK sur Vercel (pour uploads)
- [ ] DB seedée (9 centres, opportunités, événements, ressources)

### Données démo nécessaires
- [ ] 1 utilisateur démo avec profil **partiellement rempli** (mais sans photo)
- [ ] 1 utilisateur démo avec profil **complet** (photo + CV + compétences) pour montrer auto-fill
- [ ] 2-3 événements créés avec dates futures
- [ ] 1 ressource PDF + 1 ressource Vidéo créées
- [ ] 1 opportunité publiée (slug stable)

---

## 🎯 1. Profil utilisateur (5 min)

**Storyline** : "Le jeune complète son profil avec photo, diplômes scannés, certifications, CV pour gagner en crédibilité auprès des recruteurs."

### Scénario A — Photo de profil (90 sec)
1. **Connexion** → redirect `/jeune/tableau-de-bord`
2. **Aller sur `/jeune/mon-profil`**
3. **Pointer** la zone photo cercle 96px (initiales par défaut)
4. **Cliquer** "Ajouter une photo" → file picker
5. **Choisir** JPG/PNG/WebP <5MB
6. **Mettre en évidence** :
   - ✅ Upload instantané
   - ✅ Photo apparaît dans le cercle ET dans le ProfilHeader (avatar haut)
   - ✅ Persistance après refresh

### Scénario B — Validation magic-bytes (45 sec)
1. **Tenter** d'uploader un `.txt` renommé `.jpg`
2. **Mettre en évidence** : message "Format invalide" → sécurité **pattern GUIC-241**

### Scénario C — Upload diplôme scan (90 sec)
1. **Section Diplômes** → "+ Ajouter un diplôme"
2. **Remplir** : intitulé, établissement, année
3. **Cliquer** "Joindre le scan" → PDF
4. **Mettre en évidence** :
   - ✅ Lien "Voir le fichier" apparaît
   - ✅ Stockage Vercel Blob privé
   - ✅ Rate-limit 5/min (mentionner)

### Scénario D — Upload certification (45 sec)
1. Si certificat Moodle existant → bouton "Joindre le certificat"
2. Sinon : skip et passer au suivant

**Argument clé** : "Toutes les pièces sont validées magic-bytes pour empêcher l'upload de fichiers malveillants."

---

## 📝 2. Workflow candidature (5 min)

**Storyline** : "Le jeune candidate à une opportunité — son profil est pré-rempli automatiquement, son CV inclus s'il existe."

### Scénario A — Auto-fill complet (3 min)
1. **Aller sur `/opportunites`**
2. **Sélectionner** une opportunité
3. **Cliquer** "Postuler" → ouvre `CandidatureModal`
4. **Mettre en évidence** :
   - ✅ Email pré-rempli (auto-fill)
   - ✅ Téléphone pré-rempli
   - ✅ Niveau d'études pré-rempli (si dans profil)
   - ✅ Situation emploi pré-remplie
   - ✅ **Chips compétences** affichées sous le formulaire
5. **Pointer** le bandeau jaune si pas de CV : "Votre CV n'est pas encore dans votre profil → [lien `/jeune/mon-profil`]"

### Scénario B — CV depuis profil (90 sec)
1. **Avec un user qui a un CV** au profil
2. **Toggle** "Mon CV : prenom-nom-cv.pdf"
3. **Cliquer** Submit
4. **Mettre en évidence** :
   - ✅ Status 201 dans Network
   - ✅ Champ `formulaireData` JSON persisté (snapshot CDP-compliant)

**Argument clé** : "Le jeune n'a plus à ressaisir ses informations à chaque candidature — le snapshot est conservé pour audit recruteur."

---

## 📅 3. Agenda — nouveau workflow inscription (5 min)

**Storyline** : "Refonte design v2 complète. Le jeune découvre les événements, s'inscrit, gère ses inscriptions et exporte vers son calendrier."

### Scénario A — Liste agenda design v2 (90 sec)
1. **Aller sur `/agenda`**
2. **Mettre en évidence** :
   - ✅ Sidebar filtres desktop (Type avec compteurs + Quand chips)
   - ✅ Grille `EvenementCard` avec :
     - Pavé date jaune
     - Cover gradient signature
     - Badges Type + statut
3. **Filtrer** par type "Formation" → liste filtrée

### Scénario B — Détail événement (90 sec)
1. **Cliquer** sur une carte → `/agenda/[id]`
2. **Mettre en évidence** :
   - ✅ Hero gradient avec meta
   - ✅ Carte Google Maps du lieu
   - ✅ Description longue
   - ✅ Panel inscription sticky desktop avec "places restantes"

### Scénario C — Inscription (45 sec)
1. **Cliquer** "S'inscrire"
2. **Si non connecté** → redirect `/auth/connexion?return=/agenda/[id]`
3. **Une fois connecté** → POST `/api/evenements/[id]/inscription` → toast "Inscription confirmée"

### Scénario D — Mes inscriptions (90 sec)
1. **Aller sur `/jeune/mes-inscriptions`**
2. **Mettre en évidence** :
   - ✅ Onglets "À venir" / "Passés"
   - ✅ Actions par carte : "Voir billet" / "Calendrier" / "Annuler"
3. **Cliquer** "Calendrier" → téléchargement `.ics`
4. **Ouvrir** le `.ics` dans macOS Calendar pour montrer l'intégration

**Argument clé** : "Export `.ics` standard → compatible Outlook, Google Calendar, iOS Calendar."

---

## 📚 4. Ressources — page détail + partage (5 min)

**Storyline** : "Catalogue complet avec page détail, favoris, et partage social pour propager l'usage."

### Scénario A — Liste + filtres avancés (90 sec)
1. **Aller sur `/ressources`**
2. **Mettre en évidence** :
   - ✅ Recherche debounced
   - ✅ Filtres principaux (Type, Niveau)
   - ✅ Bouton "Filtres avancés" → bottom-sheet mobile / panel desktop (Niveau, Langue, Date)

### Scénario B — Page détail (90 sec)
1. **Cliquer** une carte ressource → `/ressources/[id]`
2. **Mettre en évidence** :
   - ✅ Hero avec titre + badges type/niveau/langue
   - ✅ Description longue
   - ✅ Bouton "Consulter" adapté au type :
     - PDF → "Télécharger le PDF" (icon document)
     - Vidéo → "Regarder la vidéo" (icon play)
     - Lien → "Ouvrir le lien" (icon external)
   - ✅ **3 ressources liées** sous la description

### Scénario C — Partage social (90 sec)
1. **Cliquer** "Partager"
2. **Mobile Safari** : Native Web Share menu (WhatsApp, SMS, etc.)
3. **Desktop sans Web Share** : message "Lien copié" (fallback clipboard)
4. **Argument** : "Le partage propage la ressource auprès des pairs sans friction technique."

### Scénario D — Favoris (45 sec)
1. **Heart icon** sur une ressource → POST `/api/favoris/ressources`
2. **Aller sur `/jeune/mes-favoris/ressources`** → liste user

**Argument clé** : "Le compteur de vues est incrémenté → permet de remonter les ressources les plus consultées."

---

## 🏁 Clôture (2-3 min)

### Points à mettre en avant
1. **Sécurité** : magic-bytes sur tous les uploads (GUIC-241 pattern systémique)
2. **CDP-compliance** : snapshot `formulaireData` au moment du POST candidature (audit trail)
3. **Anti-régression** : 1419 tests dans la suite globale, 4 chantiers livrés avec 0 régression
4. **Architecture** : `prisma.$transaction(Serializable)` côté centres (Lot 7 W4) pour anti-conflit créneaux — extensible aux événements/ressources futurs

### Roadmap post-démo (transparence)
- **Sprint+1** :
  - Embed YouTube/Vimeo pour ressources Vidéo
  - Crop photo 400×400 avec `react-easy-crop`
  - Migration `slug` Ressource (route actuelle UUID)
  - Cleanup blobs orphelins (job batch)
  - Tracking événements agenda (`evenement_inscription_*`)
  - Notifications in-app + SMS Orange (réservations centres + inscriptions agenda)
- **Sprint+2** :
  - Lot 7 Wave 5 (mes réservations centres)
  - Lot 7 Wave 6 (carte CJS QR + check-in + backoffice staff + dashboard KPI)
  - Workflow validation centre (option (c) PO 2026-06-09)

---

## 📋 Plan B — fallback si problème technique

### Si une page ne charge pas
- **Profil** → screenshot des composants livrés (préparé)
- **Candidature** → vidéo démo locale enregistrée
- **Agenda** → naviguer sur le code source IDE pour montrer la structure
- **Ressources** → screenshot des cards

### Si l'auth SSO casse
- Plan B : utiliser **mode anonyme** + montrer les écrans publics uniquement
- Démontrer les pages détails sans connexion

### Si Vercel preview down
- Démonstration locale via `npm run dev` (backup setup à préparer)

---

## ✅ Checklist finale 5 min avant démo

- [ ] Connexion testée
- [ ] 1 photo de démo prête (250kb max)
- [ ] 1 PDF diplôme scan prêt (1MB max)
- [ ] 1 PDF CV prêt si pas dans profil démo
- [ ] Compteur de vues ressources non saturé
- [ ] DevTools fermés au démarrage (ouvrir au besoin)
- [ ] Plan B mental prêt si fail

---

*Préparé pour sprint review 2026-06-12.*
