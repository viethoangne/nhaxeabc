/*
  Warnings:

  - A unique constraint covering the columns `[from,to,departDate,pickupPoint,dropoffPoint]` on the table `Trip` will be added. If there are existing duplicate values, this will fail.
  - Made the column `dropoffPoint` on table `Trip` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pickupPoint` on table `Trip` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_outboundTripId_fkey";

-- DropForeignKey
ALTER TABLE "OrderSeat" DROP CONSTRAINT "OrderSeat_tripId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_tripId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "outboundTripId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderSeat" ALTER COLUMN "tripId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "arrivalDate" TIMESTAMP(3),
ALTER COLUMN "dropoffPoint" SET NOT NULL,
ALTER COLUMN "pickupPoint" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Trip_from_to_departDate_pickupPoint_dropoffPoint_key" ON "Trip"("from", "to", "departDate", "pickupPoint", "dropoffPoint");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_outboundTripId_fkey" FOREIGN KEY ("outboundTripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSeat" ADD CONSTRAINT "OrderSeat_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
