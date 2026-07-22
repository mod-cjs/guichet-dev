-- GUIC-554 — Migration douce des préférences GUIC-513 (booléens catégoriels)
-- vers le modèle par canal : les opt-out historiques deviennent des categories_off
-- sur la ligne in_app. Les booléens restent en place (lus par les chemins legacy)
-- jusqu'à la bascule complète des call-sites sur emitEvent.
INSERT INTO `notification_preferences`
  (`id`, `cjs_uid`, `canal`, `consent_given`, `consent_at`, `consent_source`, `enabled`, `categories_off`, `updated_at`)
SELECT
  UUID(),
  u.`cjs_uid`,
  'in_app',
  0,
  NULL,
  'migration_guic513',
  1,
  CASE
    WHEN u.`notif_candidatures` = 0 AND u.`notif_messages` = 0
      THEN JSON_ARRAY('candidature.created.recruteur', 'message.received')
    WHEN u.`notif_candidatures` = 0
      THEN JSON_ARRAY('candidature.created.recruteur')
    ELSE JSON_ARRAY('message.received')
  END,
  NOW(3)
FROM `utilisateurs` u
WHERE u.`notif_candidatures` = 0 OR u.`notif_messages` = 0
ON DUPLICATE KEY UPDATE `categories_off` = VALUES(`categories_off`);
