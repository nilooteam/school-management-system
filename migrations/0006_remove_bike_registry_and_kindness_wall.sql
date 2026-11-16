-- Remove the bicycle/scooter registry and kindness wall data.
DROP INDEX IF EXISTS "BikeRegistry_schoolId_studentId_idx";
DROP INDEX IF EXISTS "KindnessNote_schoolId_approved_idx";
DROP TABLE IF EXISTS "BikeRegistry";
DROP TABLE IF EXISTS "KindnessNote";
