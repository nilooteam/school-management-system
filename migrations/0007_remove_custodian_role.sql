-- Migration 0007: remove the custodian (سرایدار) role — schema part.
--
-- Root cause of the previous deploy failure:
--   ALTER TABLE "Asset" DROP COLUMN "custodianId" fails on SQLite/D1 with
--   'unknown column "custodianId" in foreign key definition', because
--   "custodianId" takes part in a FOREIGN KEY constraint
--   (Asset_custodianId_fkey REFERENCES "User"). SQLite cannot DROP COLUMN
--   a column that is used by a foreign key.
--
-- Why the rebuild below does NOT use PRAGMA foreign_keys = OFF:
--   D1 enforces foreign keys inside a migration batch no matter what the
--   pragma says (verified on a scratch D1 via `wrangler d1 migrations
--   apply`: with the pragma the migration "succeeded" but the Booking row
--   that referenced an asset was silently cascade-deleted). So this
--   migration never drops a table while another table still references it.
--   Instead it re-points the two child tables (Booking, MaintenanceTicket)
--   at the staged new Asset table first, drops the old Asset only once
--   nothing references it, and lets SQLite's ALTER TABLE RENAME update the
--   child foreign keys to the final table name (SQLite >= 3.25 behaviour,
--   legacy_alter_table OFF). No data is deleted at any step: every table is
--   rebuilt by copying all of its rows into a new table with the same
--   columns, constraints and indexes.
--
-- Tables touched: School (drop one plain column), Asset (rebuild without
-- custodianId), Booking + MaintenanceTicket (rebuilt with identical
-- columns/constraints/indexes, only their assetId foreign key is
-- re-pointed). Nothing else is changed; no other table is dropped.

-- 1) School: custodianEnabled is a plain column (no FK) — direct drop is safe.
ALTER TABLE "School" DROP COLUMN "custodianEnabled";

-- 2) Stage the new Asset table: byte-identical to the current one except
--    the custodianId column and its foreign key are gone.
CREATE TABLE "Asset_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "purchaseDate" DATETIME,
    "value" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "Asset_new" ("id", "schoolId", "name", "code", "category", "location", "status", "purchaseDate", "value", "note", "createdAt", "updatedAt")
    SELECT "id", "schoolId", "name", "code", "category", "location", "status", "purchaseDate", "value", "note", "createdAt", "updatedAt" FROM "Asset";

-- 3) Rebuild Booking with its assetId foreign key re-pointed at Asset_new.
--    Dropping the old Booking is safe: Booking is a child table (its own
--    foreign keys point at School/Room/Asset/User), deleting child rows
--    fires no action on any parent, and nothing references Booking.
CREATE TABLE "Booking_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "roomId" TEXT,
    "assetId" TEXT,
    "byId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset_new" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "Booking_new" ("id", "schoolId", "roomId", "assetId", "byId", "purpose", "startAt", "endAt", "status", "note", "createdAt")
    SELECT "id", "schoolId", "roomId", "assetId", "byId", "purpose", "startAt", "endAt", "status", "note", "createdAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "Booking_new" RENAME TO "Booking";
CREATE INDEX "Booking_schoolId_startAt_idx" ON "Booking"("schoolId", "startAt");
CREATE INDEX "Booking_roomId_startAt_idx" ON "Booking"("roomId", "startAt");
CREATE INDEX "Booking_assetId_startAt_idx" ON "Booking"("assetId", "startAt");

-- 4) Rebuild MaintenanceTicket the same way (assetId -> Asset_new).
CREATE TABLE "MaintenanceTicket_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "assetId" TEXT,
    "roomId" TEXT,
    "location" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "slaHours" INTEGER NOT NULL DEFAULT 48,
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTicket_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTicket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset_new" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTicket_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "MaintenanceTicket_new" ("id", "schoolId", "assetId", "roomId", "location", "title", "description", "priority", "status", "slaHours", "reportedById", "assignedToId", "resolvedAt", "resolutionNote", "createdAt", "updatedAt")
    SELECT "id", "schoolId", "assetId", "roomId", "location", "title", "description", "priority", "status", "slaHours", "reportedById", "assignedToId", "resolvedAt", "resolutionNote", "createdAt", "updatedAt" FROM "MaintenanceTicket";
DROP TABLE "MaintenanceTicket";
ALTER TABLE "MaintenanceTicket_new" RENAME TO "MaintenanceTicket";
CREATE INDEX "MaintenanceTicket_schoolId_status_idx" ON "MaintenanceTicket"("schoolId", "status");

-- 5) Nothing references the old Asset any more, so dropping it fires no
--    foreign-key action. Renaming Asset_new to Asset updates the child
--    foreign keys (Booking, MaintenanceTicket) to the final table name.
DROP TABLE "Asset";
ALTER TABLE "Asset_new" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_schoolId_code_key" ON "Asset"("schoolId", "code");

-- 6) Self-check: must return zero rows (no broken foreign keys).
PRAGMA foreign_key_check;
