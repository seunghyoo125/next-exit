-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BuiltResume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "interpretation" TEXT NOT NULL DEFAULT '',
    "strategyAssessment" TEXT NOT NULL DEFAULT '',
    "userNotes" TEXT NOT NULL DEFAULT '',
    "formatPreset" TEXT NOT NULL DEFAULT '',
    "sanityCheck" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BuiltResume" ("createdAt", "id", "jobDescription", "title", "updatedAt") SELECT "createdAt", "id", "jobDescription", "title", "updatedAt" FROM "BuiltResume";
DROP TABLE "BuiltResume";
ALTER TABLE "new_BuiltResume" RENAME TO "BuiltResume";
CREATE TABLE "new_BuiltResumeBullet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "sectionId" TEXT NOT NULL,
    "bulletId" TEXT NOT NULL,
    "reviewVerdict" TEXT NOT NULL DEFAULT '',
    "reviewFeedback" TEXT NOT NULL DEFAULT '',
    "suggestedText" TEXT NOT NULL DEFAULT '',
    "finalText" TEXT NOT NULL DEFAULT '',
    "userDecision" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "BuiltResumeBullet_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "BuiltResumeSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuiltResumeBullet_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "Bullet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BuiltResumeBullet" ("bulletId", "id", "sectionId", "sortOrder") SELECT "bulletId", "id", "sectionId", "sortOrder" FROM "BuiltResumeBullet";
DROP TABLE "BuiltResumeBullet";
ALTER TABLE "new_BuiltResumeBullet" RENAME TO "BuiltResumeBullet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
