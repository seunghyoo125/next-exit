-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Bullet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "groupId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bullet_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bullet_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BulletGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulletTheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "theme" TEXT NOT NULL,
    "bulletId" TEXT NOT NULL,
    CONSTRAINT "BulletTheme_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "Bullet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulletRoleType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleType" TEXT NOT NULL,
    "bulletId" TEXT NOT NULL,
    CONSTRAINT "BulletRoleType_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "Bullet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulletGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "BuiltResume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BuiltResumeSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleTitle" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "bulletCount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "builtResumeId" TEXT NOT NULL,
    CONSTRAINT "BuiltResumeSection_builtResumeId_fkey" FOREIGN KEY ("builtResumeId") REFERENCES "BuiltResume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuiltResumeBullet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL,
    "sectionId" TEXT NOT NULL,
    "bulletId" TEXT NOT NULL,
    CONSTRAINT "BuiltResumeBullet_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "BuiltResumeSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuiltResumeBullet_bulletId_fkey" FOREIGN KEY ("bulletId") REFERENCES "Bullet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BulletTheme_bulletId_theme_key" ON "BulletTheme"("bulletId", "theme");

-- CreateIndex
CREATE UNIQUE INDEX "BulletRoleType_bulletId_roleType_key" ON "BulletRoleType"("bulletId", "roleType");
