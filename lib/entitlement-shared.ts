/**
 * Pure entitlement logic safe to import from client components (no
 * cookies()/server-only here -- see lib/entitlement.ts for the
 * server-side cookie plumbing that computes the `entitled` boolean this
 * takes as input).
 */
export function isPlayerAccessible(overallRank: number, entitled: boolean, freeLimit: number): boolean {
  return entitled || overallRank <= freeLimit;
}
