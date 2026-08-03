-- Anonymisation de la base enrichie pour la PRÉPROD.
-- À exécuter sur une COPIE de travail (jamais sur une base réelle).
--
-- Principe : pseudonymisation qui GARDE les signaux de matching Yaye
--   (competences, domaines_interet, poste, etablissement, statut/scores des candidatures)
--   et SUPPRIME tout identifiant direct + texte libre + fichier + IP.
--   `cjs_uid` (UUID opaque) conservé → intégrité des FK + lien vers le SSO de TEST.
-- Résultat : volume + signaux réalistes SANS aucune personne identifiable.

SET FOREIGN_KEY_CHECKS = 0;

-- ── utilisateurs : e-mail + téléphone UNIQUE → séquence temporaire (unicité garantie) ──
ALTER TABLE utilisateurs ADD COLUMN _anon_seq INT AUTO_INCREMENT UNIQUE;
UPDATE utilisateurs SET
  prenom    = CONCAT('Prenom', _anon_seq),
  nom       = CONCAT('Nom', _anon_seq),
  email     = IF(email     IS NULL, NULL, CONCAT('user', _anon_seq, '@example.test')),
  telephone = IF(telephone IS NULL, NULL, CONCAT('+2217', LPAD(_anon_seq, 8, '0')));
ALTER TABLE utilisateurs DROP COLUMN _anon_seq;

-- ── organisations ──
ALTER TABLE organisations ADD COLUMN _anon_seq INT AUTO_INCREMENT UNIQUE;
UPDATE organisations SET
  nom       = CONCAT('Organisation ', _anon_seq),
  email     = IF(email IS NULL, NULL, CONCAT('org', _anon_seq, '@example.test')),
  telephone = NULL,
  adresse   = NULL;
ALTER TABLE organisations DROP COLUMN _anon_seq;

-- ── profils_jeunes : NULL le PII ; GARDE competences / domaines_interet / prefs_accessibilite ──
UPDATE profils_jeunes SET biographie = NULL, cv_url = NULL, photo_url = NULL, cv_uploaded_at = NULL;

-- ── candidatures : NULL texte libre / fichier / IP ; GARDE statut, scores, pipeline (signaux) ──
UPDATE candidatures SET
  lettre_motivation = NULL, cv_url = NULL, formulaire_data = NULL,
  score_raison = NULL, consent_ip = NULL;

-- ── diplômes / expériences / certificats : NULL fichiers + free-text ; GARDE intitulé/etab/poste ──
UPDATE diplomes          SET fichier_url = NULL;
UPDATE experiences       SET description = NULL;
UPDATE certificats_moodle SET fichier_url = NULL, url_certificat = NULL;

-- ── logs / messages / brouillons : vidés (contenu PII, inutile au seed de test) ──
DELETE FROM agent_logs;
DELETE FROM audit_logs;
DELETE FROM notification_envois;
DELETE FROM notifications;
DELETE FROM candidature_drafts;
DELETE FROM onboarding_drafts;
DELETE FROM messages_whatsapp;
DELETE FROM conversations_whatsapp;
DELETE FROM interop_logs;

SET FOREIGN_KEY_CHECKS = 1;

-- Conservés tels quels (non identifiants, utiles au test/matching) :
-- centres (données publiques), opportunites*, skills/tags, ressources*, inscriptions_evenements.
