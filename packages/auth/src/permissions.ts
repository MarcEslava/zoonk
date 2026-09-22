import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * Requiring training is separate from authoring it: an organization can have
 * someone who assigns courses to a team without letting them change what those
 * courses teach.
 */
const statement = {
  ...defaultStatements,
  assignment: ["create", "read", "update", "delete"],
  course: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const member = ac.newRole({ course: ["read"], ...memberAc.statements });

export const admin = ac.newRole({
  assignment: ["create", "read", "update"],
  course: ["create", "read", "update"],
  ...adminAc.statements,
});

export const owner = ac.newRole({
  assignment: ["create", "read", "update", "delete"],
  course: ["create", "read", "update", "delete"],
  ...ownerAc.statements,
});
