-- CreateTable
CREATE TABLE "SlotBlock" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "slots" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotBlock_shiftId_idx" ON "SlotBlock"("shiftId");

-- AddForeignKey
ALTER TABLE "SlotBlock" ADD CONSTRAINT "SlotBlock_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
