-- CreateTable
CREATE TABLE "JobWatchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'greenhouse',
    "sourceId" TEXT NOT NULL,
    "titleKeywords" TEXT NOT NULL DEFAULT '[]',
    "locationKeywords" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobAlert" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobAlert_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "JobWatchlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JobAlert_watchlistId_externalId_key" ON "JobAlert"("watchlistId", "externalId");
