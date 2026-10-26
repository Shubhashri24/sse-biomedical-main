import { NextResponse } from "next/server";
import { getContactMessagesCollection, type ContactMessageDoc } from "@/lib/mongodb";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "General Clinical Enquiry";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: "Valid email address is required." },
        { status: 400 }
      );
    }

    const collection = await getContactMessagesCollection();
    const now = new Date();

    const newEnquiry: ContactMessageDoc = {
      name,
      email,
      phone,
      subject,
      message,
      status: "NEW",
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newEnquiry);

    return NextResponse.json({
      success: true,
      message: "Your message has been received. Our team will contact you shortly.",
      messageId: result.insertedId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/contact] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to record message. Please contact us by telephone." },
      { status: 500 }
    );
  }
}
