/**
 * Organization courses are private to the organization, so membership is a
 * third visibility source next to the public brand catalog and a learner's own
 * courses. Every viewer-dependent read shares this clause so adding a source
 * later happens once rather than in each query.
 *
 * Callers must already run per viewer: adding this to a shared `"use cache"`
 * read would store one member's access decision and serve it to everyone.
 */
export function getOrganizationMemberCourseWhere(userId: string) {
  return { organization: { members: { some: { userId } } } };
}
