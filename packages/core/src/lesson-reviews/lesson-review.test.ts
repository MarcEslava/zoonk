import { prisma } from "@zoonk/db";
import { chapterFixture } from "@zoonk/testing/fixtures/chapters";
import { courseFixture } from "@zoonk/testing/fixtures/courses";
import { lessonFixture } from "@zoonk/testing/fixtures/lessons";
import { organizationFixture, organizationMemberFixture } from "@zoonk/testing/fixtures/orgs";
import { stepFixture } from "@zoonk/testing/fixtures/steps";
import { userFixture } from "@zoonk/testing/fixtures/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockSession } from "../_test-utils/mock-session";
import { approveLesson } from "./approve-lesson";
import { discardStepDraft } from "./discard-step-draft";
import { getLessonReview } from "./get-lesson-review";
import { saveStepDraft } from "./save-step-draft";

vi.mock("../users/get-session", () => ({ getSession: vi.fn() }));

const IMAGE = { prompt: "Penile curvature diagram", url: "https://example.com/diagram.webp" };

const GENERATED_QUESTION = {
  image: IMAGE,
  options: [
    {
      feedback: "Right.",
      id: "a",
      isCorrect: true,
      text: "Fibrous plaque in the tunica albuginea",
    },
    { feedback: "No.", id: "b", isCorrect: false, text: "Infection" },
  ],
  question: "What causes Peyronie's disease curvature?",
};

function correctedQuestion(text: string) {
  return {
    content: {
      options: [
        { feedback: "Right.", id: "a", isCorrect: true, text },
        { feedback: "No.", id: "b", isCorrect: false, text: "Infection" },
      ],
      question: GENERATED_QUESTION.question,
    },
    kind: "multipleChoice",
  };
}

function blankEdit(template: string) {
  return {
    content: { answers: ["collagen"], distractors: ["keratin"], feedback: "Right.", template },
    kind: "fillBlank",
  };
}

/** One organization lesson already visible to the team, and people to review it. */
async function reviewFixture({ isPublished = true }: { isPublished?: boolean } = {}) {
  const organization = await organizationFixture({ kind: "school" });

  const [editor, reviewer, learner, course] = await Promise.all([
    userFixture(),
    userFixture(),
    userFixture(),
    courseFixture({ isPublished: true, organizationId: organization.id }),
  ]);

  const chapter = await chapterFixture({
    courseId: course.id,
    isPublished: true,
    organizationId: organization.id,
  });

  const lesson = await lessonFixture({
    chapterId: chapter.id,
    isPublished,
    organizationId: organization.id,
  });

  const [step] = await Promise.all([
    stepFixture({
      content: GENERATED_QUESTION,
      isPublished: true,
      kind: "multipleChoice",
      lessonId: lesson.id,
    }),
    organizationMemberFixture({
      organizationId: organization.id,
      role: "admin",
      userId: editor.id,
    }),
    organizationMemberFixture({
      organizationId: organization.id,
      role: "owner",
      userId: reviewer.id,
    }),
    organizationMemberFixture({ organizationId: organization.id, userId: learner.id }),
  ]);

  return { editor, learner, lesson, reviewer, step };
}

describe("lesson review", () => {
  beforeEach(() => mockSession(null));

  it("asks guests to sign in and hides lessons from people outside the organization", async () => {
    const { step } = await reviewFixture();
    const outsider = await userFixture();

    await expect(
      saveStepDraft({ edit: correctedQuestion("Plaque"), stepId: step.id }),
    ).resolves.toStrictEqual({ status: "unauthorized" });

    mockSession(outsider.id);

    await expect(
      saveStepDraft({ edit: correctedQuestion("Plaque"), stepId: step.id }),
    ).resolves.toStrictEqual({ status: "notFound" });
  });

  it("does not let a plain member edit", async () => {
    const { learner, step } = await reviewFixture();

    mockSession(learner.id);

    await expect(
      saveStepDraft({ edit: correctedQuestion("Plaque"), stepId: step.id }),
    ).resolves.toStrictEqual({ status: "forbidden" });
  });

  it("keeps a correction as a draft the team does not see yet", async () => {
    const { editor, step } = await reviewFixture();

    mockSession(editor.id);

    await expect(
      saveStepDraft({ edit: correctedQuestion("Fibrotic plaque"), stepId: step.id }),
    ).resolves.toStrictEqual({ status: "saved" });

    const [stored, draft, events] = await Promise.all([
      prisma.step.findUniqueOrThrow({ where: { id: step.id } }),
      prisma.stepDraft.findUniqueOrThrow({ where: { stepId: step.id } }),
      prisma.lessonReviewEvent.findMany({ where: { stepId: step.id } }),
    ]);

    expect(stored.content).toStrictEqual(GENERATED_QUESTION);
    expect(draft).toMatchObject({ editedById: editor.id });
    expect(draft.content).toMatchObject({ options: [{ text: "Fibrotic plaque" }, {}] });
    expect(events).toMatchObject([{ action: "stepEdited", actorId: editor.id }]);
  });

  it("keeps the generated image whatever the edit sends", async () => {
    const { editor, step } = await reviewFixture();
    const edit = correctedQuestion("Plaque");

    mockSession(editor.id);

    await saveStepDraft({
      edit: {
        ...edit,
        content: { ...edit.content, image: { prompt: "x", url: "https://evil.test" } },
      },
      stepId: step.id,
    });

    const draft = await prisma.stepDraft.findUniqueOrThrow({ where: { stepId: step.id } });

    expect(draft.content).toMatchObject({ image: IMAGE });
  });

  it("refuses content the player could not use", async () => {
    const { editor, step } = await reviewFixture();

    mockSession(editor.id);

    const noCorrectOption = {
      content: { options: [{ feedback: "", id: "a", isCorrect: false, text: "Plaque" }] },
      kind: "multipleChoice",
    };

    const otherKind = {
      content: { feedback: "", items: ["a", "b"], question: "Q" },
      kind: "sortOrder",
    };

    await expect(saveStepDraft({ edit: noCorrectOption, stepId: step.id })).resolves.toStrictEqual({
      status: "invalidContent",
    });

    await expect(saveStepDraft({ edit: otherKind, stepId: step.id })).resolves.toStrictEqual({
      status: "invalidContent",
    });

    await expect(prisma.stepDraft.count({ where: { stepId: step.id } })).resolves.toBe(0);
  });

  it("requires one answer for every blank", async () => {
    const { editor, lesson } = await reviewFixture();

    const blank = await stepFixture({
      content: {
        answers: ["collagen"],
        distractors: ["keratin"],
        feedback: "Plaques are mostly collagen.",
        template: "Plaques are made of [BLANK].",
      },
      isPublished: true,
      kind: "fillBlank",
      lessonId: lesson.id,
      position: 1,
    });

    mockSession(editor.id);

    await expect(
      saveStepDraft({ edit: blankEdit("[BLANK] plaques contain [BLANK]."), stepId: blank.id }),
    ).resolves.toStrictEqual({ status: "invalidContent" });

    await expect(
      saveStepDraft({ edit: blankEdit("Plaques contain [BLANK]."), stepId: blank.id }),
    ).resolves.toStrictEqual({ status: "saved" });
  });

  it("does not let the person who edited a lesson approve it", async () => {
    const { editor, lesson, step } = await reviewFixture();

    mockSession(editor.id);
    await saveStepDraft({ edit: correctedQuestion("Fibrotic plaque"), stepId: step.id });

    await expect(approveLesson({ lessonId: lesson.id })).resolves.toStrictEqual({
      status: "ownChanges",
    });

    await expect(getLessonReview({ lessonId: lesson.id })).resolves.toMatchObject({
      canApprove: false,
      isOwnChange: true,
    });
  });

  it("counts an editor whose wording a colleague later reworked", async () => {
    const { editor, lesson, reviewer, step } = await reviewFixture();

    mockSession(editor.id);
    await saveStepDraft({ edit: correctedQuestion("Fibrotic plaque"), stepId: step.id });

    mockSession(reviewer.id);
    await saveStepDraft({ edit: correctedQuestion("Fibrotic plaque (collagen)"), stepId: step.id });

    mockSession(editor.id);

    await expect(approveLesson({ lessonId: lesson.id })).resolves.toStrictEqual({
      status: "ownChanges",
    });
  });

  it("publishes the approved version with a record of what became visible", async () => {
    const { editor, lesson, reviewer, step } = await reviewFixture();

    mockSession(editor.id);
    await saveStepDraft({ edit: correctedQuestion("Fibrotic plaque"), stepId: step.id });

    mockSession(reviewer.id);

    await expect(getLessonReview({ lessonId: lesson.id })).resolves.toMatchObject({
      canApprove: true,
      steps: [{ draft: { editedByName: editor.name }, id: step.id }],
    });

    await expect(approveLesson({ lessonId: lesson.id })).resolves.toStrictEqual({
      approvedDrafts: 1,
      status: "approved",
    });

    const [stored, drafts, approval] = await Promise.all([
      prisma.step.findUniqueOrThrow({ where: { id: step.id } }),
      prisma.stepDraft.count({ where: { stepId: step.id } }),
      prisma.lessonReviewEvent.findFirstOrThrow({
        where: { action: "approved", lessonId: lesson.id },
      }),
    ]);

    expect(stored.content).toMatchObject({
      image: IMAGE,
      options: [{ text: "Fibrotic plaque" }, {}],
    });

    expect(drafts).toBe(0);
    expect(approval).toMatchObject({ actorId: reviewer.id });
    expect(approval.content).toMatchObject([{ content: stored.content, id: step.id }]);

    await expect(approveLesson({ lessonId: lesson.id })).resolves.toStrictEqual({
      status: "nothingToApprove",
    });
  });

  it("lets a first approval publish a lesson nobody has edited", async () => {
    const { lesson, reviewer } = await reviewFixture({ isPublished: false });

    mockSession(reviewer.id);

    await expect(approveLesson({ lessonId: lesson.id })).resolves.toStrictEqual({
      approvedDrafts: 0,
      status: "approved",
    });

    await expect(
      prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } }),
    ).resolves.toMatchObject({ isPublished: true });
  });

  it("drops a correction and records who discarded it", async () => {
    const { editor, step } = await reviewFixture();

    mockSession(editor.id);
    await saveStepDraft({ edit: correctedQuestion("Fibrotic plaque"), stepId: step.id });

    await expect(discardStepDraft({ stepId: step.id })).resolves.toStrictEqual({
      status: "discarded",
    });

    const [draft, events] = await Promise.all([
      prisma.stepDraft.findUnique({ where: { stepId: step.id } }),
      prisma.lessonReviewEvent.findMany({
        orderBy: { createdAt: "asc" },
        where: { stepId: step.id },
      }),
    ]);

    expect(draft).toBeNull();
    expect(events.map((event) => event.action)).toStrictEqual(["stepEdited", "draftDiscarded"]);
  });
});
