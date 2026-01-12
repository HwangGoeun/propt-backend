/*
  Warnings:

  - You are about to drop the `McpLoginCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "McpLoginCode" DROP CONSTRAINT "McpLoginCode_userId_fkey";

-- DropTable
DROP TABLE "McpLoginCode";

-- CreateTable
CREATE TABLE "McpDeviceCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpDeviceCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpDeviceCode_code_key" ON "McpDeviceCode"("code");

-- AddForeignKey
ALTER TABLE "McpDeviceCode" ADD CONSTRAINT "McpDeviceCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
