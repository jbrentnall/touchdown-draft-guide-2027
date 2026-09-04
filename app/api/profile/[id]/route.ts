import { NextRequest, NextResponse } from "next/server";
import { getPlayerById } from "@/lib/players";
import { isEntitledFromCookieHeader, isPlayerAccessible } from "@/lib/entitlement";

/**
 * The only place full profile content leaves the server. Board pages only
 * ever receive BoardTeaser data (see lib/types.ts) -- this route is what
 * the client fetches when a row is opened, and it's the one spot the real
 * entitlement check (Phase C) plugs into.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = getPlayerById(id);
  if (!player) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entitled = isEntitledFromCookieHeader(request.headers.get("cookie"));
  const accessible = isPlayerAccessible(player.overallRank ?? Infinity, entitled);

  if (!accessible) {
    return NextResponse.json({ locked: true }, { status: 403 });
  }

  return NextResponse.json({ locked: false, player });
}
