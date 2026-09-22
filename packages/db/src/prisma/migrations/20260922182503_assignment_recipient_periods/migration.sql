/*
  Warnings:

  - Added the required column `user_id` to the `assignment_recipients` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "assignment_recipients" DROP CONSTRAINT "assignment_recipients_member_id_fkey";

-- DropIndex
DROP INDEX "assignment_recipients_assignment_id_idx";

-- DropIndex
DROP INDEX "assignment_recipients_assignment_id_member_id_key";

-- DropIndex
DROP INDEX "assignment_recipients_member_id_removed_at_idx";

-- AlterTable
ALTER TABLE "assignment_recipients" ADD COLUMN     "user_id" UUID NOT NULL,
ALTER COLUMN "member_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "assignment_recipients_assignment_id_removed_at_idx" ON "assignment_recipients"("assignment_id", "removed_at");

-- CreateIndex
CREATE INDEX "assignment_recipients_user_id_removed_at_idx" ON "assignment_recipients"("user_id", "removed_at");

-- CreateIndex
CREATE INDEX "assignment_recipients_member_id_idx" ON "assignment_recipients"("member_id");

-- AddForeignKey
ALTER TABLE "assignment_recipients" ADD CONSTRAINT "assignment_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_recipients" ADD CONSTRAINT "assignment_recipients_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
