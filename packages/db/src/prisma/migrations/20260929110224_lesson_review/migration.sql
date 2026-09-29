-- CreateEnum
CREATE TYPE "LessonReviewAction" AS ENUM ('step_edited', 'draft_discarded', 'approved');

-- CreateTable
CREATE TABLE "step_drafts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "step_id" UUID NOT NULL,
    "content" JSONB NOT NULL,
    "edited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_review_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "lesson_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "LessonReviewAction" NOT NULL,
    "step_id" UUID,
    "content" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_review_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "step_drafts_step_id_key" ON "step_drafts"("step_id");

-- CreateIndex
CREATE INDEX "step_drafts_edited_by_id_idx" ON "step_drafts"("edited_by_id");

-- CreateIndex
CREATE INDEX "lesson_review_events_lesson_id_created_at_idx" ON "lesson_review_events"("lesson_id", "created_at");

-- CreateIndex
CREATE INDEX "lesson_review_events_actor_id_idx" ON "lesson_review_events"("actor_id");

-- AddForeignKey
ALTER TABLE "step_drafts" ADD CONSTRAINT "step_drafts_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_drafts" ADD CONSTRAINT "step_drafts_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_review_events" ADD CONSTRAINT "lesson_review_events_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_review_events" ADD CONSTRAINT "lesson_review_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
