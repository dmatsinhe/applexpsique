-- AlterEnum
ALTER TYPE "manual_payment_method" ADD VALUE 'BANK_TRANSFER';

-- DropIndex
DROP INDEX "users_stripeCustomerId_key";

-- DropIndex
DROP INDEX "users_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";

-- DropTable
DROP TABLE "processed_stripe_events";

