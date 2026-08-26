/**
 * Positions live in their own module because both `state.ts` and
 * `content.ts` need them, and having either import the other creates a cycle:
 * state needs content to build the starting squad, content needs the position
 * enum for its schema. A shared leaf module breaks it.
 */
export const POSITIONS = ['TW', 'ABW', 'MIT', 'ST'] as const;
export type Position = (typeof POSITIONS)[number];
