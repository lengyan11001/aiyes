CREATE TYPE "CompanyVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CompanyVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CompanyVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "imageUrl" TEXT NOT NULL,
    "reviewerId" TEXT,
    "rejectReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyVerification_userId_key" ON "CompanyVerification"("userId");
CREATE INDEX "CompanyVerification_status_idx" ON "CompanyVerification"("status");
CREATE INDEX "CompanyVerification_createdAt_idx" ON "CompanyVerification"("createdAt");

ALTER TABLE "CompanyVerification" ADD CONSTRAINT "CompanyVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
