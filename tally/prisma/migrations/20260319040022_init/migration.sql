-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('CANDIDATE', 'ISSUE_ADVOCACY', 'PAC');

-- CreateEnum
CREATE TYPE "ElectionType" AS ENUM ('PRIMARY', 'GENERAL');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('BROADCAST_TV', 'SPANISH_TV', 'CABLE', 'RADIO', 'DIGITAL_OTT', 'DISPLAY', 'STREAMING');

-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('CTV_OTT', 'YOUTUBE', 'META', 'AUDIO', 'VOD', 'TIKTOK', 'OTHER');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('VIEW', 'COMMENT', 'APPROVE');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientType" "ClientType" NOT NULL,
    "electionType" "ElectionType" NOT NULL,
    "isElectionWeek" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "windowDate" TIMESTAMP(3) NOT NULL,
    "flightLengthDays" INTEGER NOT NULL,
    "flightLengthWeeks" INTEGER NOT NULL,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtVotePct" DOUBLE PRECISION,
    "hispanicPct" DOUBLE PRECISION,
    "cppQ3OOW_A35" DOUBLE PRECISION,
    "cppQ3IW_A35" DOUBLE PRECISION,
    "cppEarlyQ4_A35" DOUBLE PRECISION,
    "cppLateQ4_A35" DOUBLE PRECISION,
    "cppQ3OOW_H25" DOUBLE PRECISION,
    "cppQ3IW_H25" DOUBLE PRECISION,
    "cppEarlyQ4_H25" DOUBLE PRECISION,
    "cppLateQ4_H25" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaSection" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MediaSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "marketId" TEXT,
    "tacticName" TEXT NOT NULL,
    "audienceDemo" TEXT,
    "adServingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reachEstimate" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FlightWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineItemWeekValue" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "flightWeekId" TEXT NOT NULL,
    "plannedPoints" DOUBLE PRECISION,
    "plannedImpressions" DOUBLE PRECISION,
    "plannedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualPoints" DOUBLE PRECISION,
    "actualImpressions" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,

    CONSTRAINT "LineItemWeekValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalTactic" (
    "id" TEXT NOT NULL,
    "searchKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "platform" TEXT,
    "adLength" TEXT,
    "cpm" DOUBLE PRECISION NOT NULL,
    "servingCpm" DOUBLE PRECISION,
    "platformType" "PlatformType" NOT NULL DEFAULT 'OTHER',

    CONSTRAINT "DigitalTactic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceProfile" (
    "id" TEXT NOT NULL,
    "searchKey" TEXT NOT NULL,
    "geography" TEXT,
    "audienceName" TEXT NOT NULL,
    "language" TEXT,
    "listSize" INTEGER,
    "url" TEXT,
    "coverageTvStreaming" DOUBLE PRECISION,
    "coverageYoutube" DOUBLE PRECISION,
    "coverageYoutubeTV" DOUBLE PRECISION,
    "coverageMeta" DOUBLE PRECISION,
    "coverageAudio" DOUBLE PRECISION,
    "coverageVod" DOUBLE PRECISION,
    "coverageDigital" DOUBLE PRECISION,

    CONSTRAINT "AudienceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareToken" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "permissions" "SharePermission" NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "ShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Market_planId_idx" ON "Market"("planId");

-- CreateIndex
CREATE INDEX "MediaSection_planId_idx" ON "MediaSection"("planId");

-- CreateIndex
CREATE INDEX "LineItem_sectionId_idx" ON "LineItem"("sectionId");

-- CreateIndex
CREATE INDEX "LineItem_marketId_idx" ON "LineItem"("marketId");

-- CreateIndex
CREATE INDEX "FlightWeek_planId_idx" ON "FlightWeek"("planId");

-- CreateIndex
CREATE INDEX "LineItemWeekValue_lineItemId_idx" ON "LineItemWeekValue"("lineItemId");

-- CreateIndex
CREATE INDEX "LineItemWeekValue_flightWeekId_idx" ON "LineItemWeekValue"("flightWeekId");

-- CreateIndex
CREATE UNIQUE INDEX "LineItemWeekValue_lineItemId_flightWeekId_key" ON "LineItemWeekValue"("lineItemId", "flightWeekId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareToken_token_key" ON "ShareToken"("token");

-- CreateIndex
CREATE INDEX "ShareToken_planId_idx" ON "ShareToken"("planId");

-- CreateIndex
CREATE INDEX "ShareToken_token_idx" ON "ShareToken"("token");

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaSection" ADD CONSTRAINT "MediaSection_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "MediaSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightWeek" ADD CONSTRAINT "FlightWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItemWeekValue" ADD CONSTRAINT "LineItemWeekValue_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "LineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItemWeekValue" ADD CONSTRAINT "LineItemWeekValue_flightWeekId_fkey" FOREIGN KEY ("flightWeekId") REFERENCES "FlightWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
