-- CreateTable
CREATE TABLE "member_tags" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_tag_links" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "member_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_tag_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "organization_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "due_at" TIMESTAMP(3),
    "min_daily_seconds" INTEGER,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_targets" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "assignment_id" UUID NOT NULL,
    "member_id" UUID,
    "tag_id" UUID,

    CONSTRAINT "assignment_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_recipients" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "assignment_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "matched_tag_id" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMP(3),

    CONSTRAINT "assignment_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_tags_organization_id_idx" ON "member_tags"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_tags_organization_id_name_key" ON "member_tags"("organization_id", "name");

-- CreateIndex
CREATE INDEX "member_tag_links_tag_id_idx" ON "member_tag_links"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_tag_links_member_id_tag_id_key" ON "member_tag_links"("member_id", "tag_id");

-- CreateIndex
CREATE INDEX "assignments_organization_id_idx" ON "assignments"("organization_id");

-- CreateIndex
CREATE INDEX "assignments_course_id_idx" ON "assignments"("course_id");

-- CreateIndex
CREATE INDEX "assignment_targets_assignment_id_idx" ON "assignment_targets"("assignment_id");

-- CreateIndex
CREATE INDEX "assignment_targets_member_id_idx" ON "assignment_targets"("member_id");

-- CreateIndex
CREATE INDEX "assignment_targets_tag_id_idx" ON "assignment_targets"("tag_id");

-- CreateIndex
CREATE INDEX "assignment_recipients_member_id_removed_at_idx" ON "assignment_recipients"("member_id", "removed_at");

-- CreateIndex
CREATE INDEX "assignment_recipients_assignment_id_idx" ON "assignment_recipients"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_recipients_assignment_id_member_id_key" ON "assignment_recipients"("assignment_id", "member_id");

-- AddForeignKey
ALTER TABLE "member_tags" ADD CONSTRAINT "member_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_tag_links" ADD CONSTRAINT "member_tag_links_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_tag_links" ADD CONSTRAINT "member_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "member_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "member_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_recipients" ADD CONSTRAINT "assignment_recipients_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_recipients" ADD CONSTRAINT "assignment_recipients_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_recipients" ADD CONSTRAINT "assignment_recipients_matched_tag_id_fkey" FOREIGN KEY ("matched_tag_id") REFERENCES "member_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
