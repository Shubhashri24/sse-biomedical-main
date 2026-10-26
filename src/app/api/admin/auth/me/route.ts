import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    username: auth.username,
  });
}
