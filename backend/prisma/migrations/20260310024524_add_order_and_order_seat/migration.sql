-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOMO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HOLD', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('oneway', 'round');

-- CreateEnum
CREATE TYPE "TripDirection" AS ENUM ('outbound', 'return');

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderCode" TEXT NOT NULL,
    "requestId" TEXT,
    "momoOrderId" TEXT,
    "momoTransId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "tripType" "TripType" NOT NULL,
    "outboundTripId" INTEGER NOT NULL,
    "returnTripId" INTEGER,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "tickets" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MOMO',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "bookingStatus" "BookingStatus" NOT NULL DEFAULT 'HOLD',
    "momoResultCode" INTEGER,
    "momoMessage" TEXT,
    "payType" TEXT,
    "responseTime" BIGINT,
    "rawExtraData" TEXT,
    "rawIpnPayload" JSONB,
    "checkoutUrl" TEXT,
    "qrCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSeat" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "tripId" INTEGER NOT NULL,
    "tripDirection" "TripDirection" NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "Order_requestId_key" ON "Order"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_momoOrderId_key" ON "Order"("momoOrderId");

-- CreateIndex
CREATE INDEX "Order_outboundTripId_idx" ON "Order"("outboundTripId");

-- CreateIndex
CREATE INDEX "Order_returnTripId_idx" ON "Order"("returnTripId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_bookingStatus_idx" ON "Order"("bookingStatus");

-- CreateIndex
CREATE INDEX "OrderSeat_orderId_idx" ON "OrderSeat"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSeat_tripId_seatNumber_key" ON "OrderSeat"("tripId", "seatNumber");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_outboundTripId_fkey" FOREIGN KEY ("outboundTripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_returnTripId_fkey" FOREIGN KEY ("returnTripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSeat" ADD CONSTRAINT "OrderSeat_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSeat" ADD CONSTRAINT "OrderSeat_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
