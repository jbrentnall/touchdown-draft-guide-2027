import "server-only";
import { cookies } from "next/headers";
import { isPlayerAccessible as isPlayerAccessibleShared } from "./entitlement-shared";

/**
 * THE PAYWALL SEAM.
 *
 * Everything in this file is a stand-in for real purchase + login
 * entitlement (Phase C: store webhook + magic-link session). Every place
 * in the app that decides "can this visitor see full profile content"
 * goes through isEntitled()/isPlayerAccessible() here and nowhere else --
 * when Phase C lands, only this file's internals change; callers don't.
 *
 * Until then: entering PLACEHOLDER_ACCESS_CODE at /unlock sets a cookie
 * that this file treats as "entitled to everything". Free players (top
 * FREE_PLAYER_LIMIT by overallRank) are accessible with no cookie at all,
 * matching the real product's intended free/gated split.
 */

const COOKIE_NAME = "td_placeholder_entitlement";
const GRANTED_VALUE = "granted";

export function getFreePlayerLimit(): number {
  const raw = process.env.FREE_PLAYER_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 30;
}

export function checkPlaceholderCode(code: string): boolean {
  const expected = process.env.PLACEHOLDER_ACCESS_CODE;
  if (!expected) return false;
  return code === expected;
}

export const entitlementCookie = {
  name: COOKIE_NAME,
  grantedValue: GRANTED_VALUE,
};

/** Server Components: read-only cookie check. */
export async function isEntitled(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === GRANTED_VALUE;
}

/** Route Handlers: check entitlement from a request's cookie header directly. */
export function isEntitledFromCookieHeader(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${COOKIE_NAME}=${GRANTED_VALUE}`);
}

export function isPlayerAccessible(overallRank: number, entitled: boolean): boolean {
  return isPlayerAccessibleShared(overallRank, entitled, getFreePlayerLimit());
}
