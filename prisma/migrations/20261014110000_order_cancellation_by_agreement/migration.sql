-- BL-01: отмена перевозки по соглашению сторон (предложение одной стороны, согласие другой). Аддитивная миграция.

-- CreateEnum
CREATE TYPE "CancellationRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateTable
CREATE TABLE "OrderCancellationRequest" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "proposedBySide" "PartySide" NOT NULL,
    "proposedByUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" UUID,
    "decisionComment" TEXT,
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrderCancellationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderCancellationRequest_orderId_status_idx" ON "OrderCancellationRequest"("orderId", "status");

-- AddForeignKey
ALTER TABLE "OrderCancellationRequest" ADD CONSTRAINT "OrderCancellationRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TransportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCancellationRequest" ADD CONSTRAINT "OrderCancellationRequest_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCancellationRequest" ADD CONSTRAINT "OrderCancellationRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Одно ожидающее предложение отмены на перевозку
CREATE UNIQUE INDEX "OrderCancellationRequest_one_pending" ON "OrderCancellationRequest" ("orderId") WHERE "status" = 'PENDING';
