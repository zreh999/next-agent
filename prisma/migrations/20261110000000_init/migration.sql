-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "ownerHash" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "reportJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assessment_ownerHash_idx" ON "Assessment"("ownerHash");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_assessmentId_agentId_round_key" ON "Feedback"("assessmentId", "agentId", "round");

-- CreateIndex
CREATE INDEX "Share_assessmentId_idx" ON "Share"("assessmentId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
