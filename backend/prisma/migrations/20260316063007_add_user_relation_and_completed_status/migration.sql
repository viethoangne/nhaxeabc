/*
  Warnings:

  - Made the column `distanceKm` on table `Trip` required. This step will fail if there are existing NULL values in that column.
  - Made the column `durationMinutes` on table `Trip` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Trip" ALTER COLUMN "distanceKm" SET NOT NULL,
ALTER COLUMN "durationMinutes" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
