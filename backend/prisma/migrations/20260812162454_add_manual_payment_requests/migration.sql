-- CreateEnum
CREATE TYPE "manual_payment_method" AS ENUM ('PAYPAL', 'MPESA', 'EMOLA');

-- CreateEnum
CREATE TYPE "manual_payment_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "manual_payment_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "method" "manual_payment_method" NOT NULL,
    "cadence" TEXT NOT NULL,
    "amountLabel" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "manual_payment_status" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_payment_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "manual_payment_requests" ADD CONSTRAINT "manual_payment_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

