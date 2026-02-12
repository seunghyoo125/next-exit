-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "background" TEXT NOT NULL DEFAULT '',
    "proofPoints" TEXT NOT NULL DEFAULT '[]',
    "topStrengths" TEXT NOT NULL DEFAULT '[]',
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "preferredTone" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
