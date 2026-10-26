import { POST as sendEmailHandler } from "../send-email/route";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return sendEmailHandler(request, context);
}
