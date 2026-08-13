ALTER TABLE "assessment_results" ALTER COLUMN "scoring_algorithm_version" SET DEFAULT 'dimension-mean-v1';
UPDATE "assessment_results"
SET "scoring_algorithm_version" = 'dimension-mean-v1'
WHERE "scoring_algorithm_version" = 'weighted-average-v1';
