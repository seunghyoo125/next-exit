-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchlistId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "postedAt" DATETIME,
    "matchedKeywords" TEXT NOT NULL DEFAULT '[]',
    "channel" TEXT NOT NULL DEFAULT 'slack',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notifiedAt" DATETIME,
    "userDecision" TEXT NOT NULL DEFAULT '',
    "decisionNote" TEXT NOT NULL DEFAULT '',
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobAlert_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "JobWatchlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobAlert" ("channel", "company", "createdAt", "externalId", "id", "location", "matchedKeywords", "notifiedAt", "postedAt", "status", "title", "url", "watchlistId") SELECT "channel", "company", "createdAt", "externalId", "id", "location", "matchedKeywords", "notifiedAt", "postedAt", "status", "title", "url", "watchlistId" FROM "JobAlert";
DROP TABLE "JobAlert";
ALTER TABLE "new_JobAlert" RENAME TO "JobAlert";
CREATE UNIQUE INDEX "JobAlert_watchlistId_externalId_key" ON "JobAlert"("watchlistId", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
