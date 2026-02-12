-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "background" TEXT NOT NULL DEFAULT '',
    "proofPoints" TEXT NOT NULL DEFAULT '[]',
    "topStrengths" TEXT NOT NULL DEFAULT '[]',
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "preferredTone" TEXT NOT NULL DEFAULT '',
    "groundTruth" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Profile" ("background", "constraints", "id", "preferredTone", "proofPoints", "topStrengths", "updatedAt") SELECT "background", "constraints", "id", "preferredTone", "proofPoints", "topStrengths", "updatedAt" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
