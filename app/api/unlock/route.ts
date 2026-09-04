import { NextRequest, NextResponse } from "next/server";
import { checkPlaceholderCode, entitlementCookie } from "@/lib/entitlement";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const code = String(form.get("code") ?? "");

  if (!checkPlaceholderCode(code)) {
    const url = new URL("/unlock?error=1", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  const url = new URL("/", request.url);
  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.set(entitlementCookie.name, entitlementCookie.grantedValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
