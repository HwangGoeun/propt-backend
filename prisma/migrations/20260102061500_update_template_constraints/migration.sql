/*
  Warnings:

  - A unique constraint covering the columns `[creatorId,title]` on the table `Template` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Template" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "variable" SET DEFAULT ARRAY[]::JSONB[];

-- CreateIndex
CREATE UNIQUE INDEX "Template_creatorId_title_key" ON "Template"("creatorId", "title");
