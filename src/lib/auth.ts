import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "sse_admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecretKey(): string {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("[Security] SESSION_SECRET must be configured in production environment.");
  }
  return process.env.SESSION_SECRET || "sse-biomedical-default-dev-secret-key-32chars";
}

interface SessionPayload {
  username: string;
  exp: number;
}

/**
 * Creates a cryptographically signed HMAC token for the admin session.
 */
export function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    username,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies the signed session token and checks expiration.
 */
export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false };

    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", getSecretKey())
      .update(payloadB64)
      .digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length) return { valid: false };

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false };
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    if (Date.now() > payload.exp) {
      return { valid: false }; // Expired
    }

    return { valid: true, username: payload.username };
  } catch {
    return { valid: false };
  }
}

/**
 * Validates admin credentials against environment variables.
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const configuredUser = process.env.ADMIN_USERNAME || "admin";
  const configuredPass = process.env.ADMIN_PASSWORD;

  if (!configuredPass) {
    console.error("[Auth] ADMIN_PASSWORD environment variable is not configured.");
    return false;
  }

  // Timing safe comparison on passwords if same length, otherwise false
  const userMatch = username === configuredUser;
  if (!userMatch) return false;

  const passBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(configuredPass);
  if (passBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(passBuffer, expectedBuffer);
}

/**
 * Server-side helper to read and verify admin session from Request or Next cookies.
 */
export async function getAdminSessionFromCookies(): Promise<{ authenticated: boolean; username?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return { authenticated: false };

  const verification = verifySessionToken(token);
  if (!verification.valid) return { authenticated: false };

  return { authenticated: true, username: verification.username };
}

/**
 * Extracts and verifies the admin session from an incoming HTTP Request.
 */
export function verifyAdminAuthFromRequest(req: Request): { authenticated: boolean; username?: string } {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`));

  if (!match) return { authenticated: false };

  const token = match.substring(ADMIN_COOKIE_NAME.length + 1);
  const verification = verifySessionToken(token);
  if (!verification.valid) return { authenticated: false };

  return { authenticated: true, username: verification.username };
}
