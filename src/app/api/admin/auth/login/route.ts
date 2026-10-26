import { NextResponse } from "next/server";
import {
  verifyAdminCredentials,
  createSessionToken,
  ADMIN_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required." },
        { status: 400 }
      );
    }

    const isValid = verifyAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        { status: 401 }
      );
    }

    const token = createSessionToken(username);

    const response = NextResponse.json({
      success: true,
      username,
      message: "Authentication successful.",
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error("[POST /api/admin/auth/login] Error:", err);
    return NextResponse.json(
      { success: false, message: "An error occurred during authentication." },
      { status: 500 }
    );
  }
}
