/*
  Warnings:

  - You are about to drop the column `description` on the `Template` table. All the data in the column will be lost.
  - You are about to drop the column `variable` on the `Template` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_name_key";

-- AlterTable
ALTER TABLE "Template" DROP COLUMN "description",
DROP COLUMN "variable",
ADD COLUMN     "variables" JSONB[] DEFAULT ARRAY[]::JSONB[];
