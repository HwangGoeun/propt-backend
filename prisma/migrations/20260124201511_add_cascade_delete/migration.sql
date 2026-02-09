-- DropForeignKey
ALTER TABLE "McpDeviceCode" DROP CONSTRAINT "McpDeviceCode_userId_fkey";

-- DropForeignKey (if exists from previous manual application)
ALTER TABLE "Template" DROP CONSTRAINT IF EXISTS "Template_creatorId_fkey";

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpDeviceCode" ADD CONSTRAINT "McpDeviceCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
