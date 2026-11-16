-- Remove the retired custodian role and its school/asset-specific fields.
ALTER TABLE "School" DROP COLUMN "custodianEnabled";
ALTER TABLE "Asset" DROP COLUMN "custodianId";
