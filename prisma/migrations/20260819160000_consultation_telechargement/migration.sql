-- GUIC-709 (M13) — ajoute `telechargement` aux types d'événement de consultation.
--
-- POURQUOI UNE VALEUR À PART, ET PAS UN `consultation` DÉGUISÉ
-- `incrementerCache` (src/lib/analytics/consultations.ts) n'incrémente `vues`
-- que pour `typeEvent === 'consultation'`. Enregistrer un téléchargement sous
-- ce type gonflerait donc l'audience à chaque récupération de fichier, et
-- l'étagère « Les plus consultées » deviendrait « les plus téléchargées » sans
-- le dire. Une valeur distincte laisse les deux mesures indépendantes.
--
-- ÉLARGISSEMENT SEUL, JAMAIS DE RÉTRÉCISSEMENT
-- MariaDB tronque SILENCIEUSEMENT les lignes dont la valeur disparaît d'un enum
-- lors d'un MODIFY rétrécissant. Ici on n'ajoute qu'une valeur en fin de liste :
-- les positions existantes (1=impression, 2=consultation) sont conservées,
-- aucune ligne n'est réécrite. L'ordre compte — insérer la valeur au milieu
-- décalerait les index internes et réinterpréterait les lignes existantes.
--
-- CONTRAT PUBLIÉ
-- `type_event` sort au Data Hub en tier public et `docs/openapi/datahub-v1.yaml`
-- ÉNUMÈRE ses valeurs. Le contrat est mis à jour dans le même commit : un
-- consommateur qui valide strictement doit pouvoir anticiper la nouvelle valeur.
--
-- Table append-only, clé de réplication `created_at` : aucune ligne existante
-- n'est modifiée, donc rien ne disparaît du flux ETL.

ALTER TABLE `consultations`
  MODIFY COLUMN `type_event` ENUM('impression', 'consultation', 'telechargement') NOT NULL;
