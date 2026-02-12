/*
  Warnings:

  - You are about to drop the `BulletGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BulletRoleType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BulletTheme` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `groupId` on the `Bullet` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "BulletRoleType_bulletId_roleType_key";

-- DropIndex
DROP INDEX "BulletTheme_bulletId_theme_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BulletGroup";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BulletRoleType";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BulletTheme";
PRAGMA foreign_keys=on;

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
    "roleLevel" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT '',
    "resumeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bullet_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Bullet" ("category", "company", "content", "createdAt", "id", "resumeId", "roleTitle", "section", "updatedAt") SELECT "category", "company", "content", "createdAt", "id", "resumeId", "roleTitle", "section", "updatedAt" FROM "Bullet";
DROP TABLE "Bullet";
ALTER TABLE "new_Bullet" RENAME TO "Bullet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
