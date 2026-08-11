-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "clinical_goal" ADD VALUE 'HABIT_PHONE_OVERUSE';
ALTER TYPE "clinical_goal" ADD VALUE 'HABIT_PROCRASTINATION';
ALTER TYPE "clinical_goal" ADD VALUE 'HABIT_NAIL_BITING';
ALTER TYPE "clinical_goal" ADD VALUE 'HABIT_MINDLESS_SNACKING';
ALTER TYPE "clinical_goal" ADD VALUE 'HABIT_NOTIFICATION_CHECKING';
ALTER TYPE "clinical_goal" ADD VALUE 'HABIT_SEDENTARY_AVOIDANCE';
ALTER TYPE "clinical_goal" ADD VALUE 'HABIT_BEDTIME_PROCRASTINATION';
