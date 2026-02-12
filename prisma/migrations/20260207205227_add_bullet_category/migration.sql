-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bullet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'experience',
    "resumeId" TEXT NOT NULL,
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bullet_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bullet_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BulletGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bullet" ("company", "content", "createdAt", "groupId", "id", "resumeId", "roleTitle", "section", "updatedAt") SELECT "company", "content", "createdAt", "groupId", "id", "resumeId", "roleTitle", "section", "updatedAt" FROM "Bullet";
DROP TABLE "Bullet";
ALTER TABLE "new_Bullet" RENAME TO "Bullet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
