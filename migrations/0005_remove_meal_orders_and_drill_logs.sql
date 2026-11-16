-- Remove the meal pre-order and safety-drill modules completely.
DROP INDEX IF EXISTS "MealOrder_schoolId_date_idx";
DROP INDEX IF EXISTS "MealOrder_studentId_idx";
DROP INDEX IF EXISTS "DrillLog_schoolId_date_idx";
DROP TABLE IF EXISTS "MealOrder";
DROP TABLE IF EXISTS "DrillLog";
