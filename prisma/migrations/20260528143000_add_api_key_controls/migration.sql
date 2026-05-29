ALTER TABLE "ApiKey" ADD COLUMN "secretPlain" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN "quotaCents" INTEGER;
ALTER TABLE "ApiKey" ADD COLUMN "requestLimit" INTEGER;
ALTER TABLE "ApiKey" ADD COLUMN "usedCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ApiKey" ADD COLUMN "usedRequests" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ApiKey" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ApiKey" AS key
SET "usedCents" = usage.total
FROM (
  SELECT "apiKeyId", ABS(COALESCE(SUM("amountCents"), 0))::INTEGER AS total
  FROM "UsageLedger"
  WHERE "apiKeyId" IS NOT NULL AND "type" = 'DEBIT'
  GROUP BY "apiKeyId"
) AS usage
WHERE key."id" = usage."apiKeyId";

UPDATE "ApiKey" AS key
SET "usedRequests" = jobs.total
FROM (
  SELECT "apiKeyId", COUNT(*)::INTEGER AS total
  FROM "GenerationJob"
  WHERE "apiKeyId" IS NOT NULL
  GROUP BY "apiKeyId"
) AS jobs
WHERE key."id" = jobs."apiKeyId";
