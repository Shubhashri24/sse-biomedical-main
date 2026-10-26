import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getQuotationsCollection } from "@/lib/mongodb";
import { sendCustomerReply } from "@/lib/email";

function buildIdFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ requestId: id }, { _id: new ObjectId(id) }],
    };
  }
  return { requestId: id };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const replyMessage = typeof body.message === "string" ? body.message.trim() : "";

    if (!replyMessage) {
      return NextResponse.json(
        { success: false, message: "Reply message cannot be empty." },
        { status: 400 }
      );
    }

    const collection = await getQuotationsCollection();
    const quotation = await collection.findOne(buildIdFilter(id));

    if (!quotation) {
      return NextResponse.json(
        { success: false, message: "Quotation request not found." },
        { status: 404 }
      );
    }

    if (!quotation.customerEmail) {
      return NextResponse.json(
        { success: false, message: "Customer email is missing for this quotation." },
        { status: 400 }
      );
    }

    // Attempt to send email to the customer if SMTP is available
    const emailResult = await sendCustomerReply({
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      equipment: quotation.equipment,
      requestId: quotation.requestId,
      replyMessage,
    });

    const now = new Date();
    const deliveryNote = emailResult.success
      ? `Email sent to ${quotation.customerEmail}`
      : `Reply logged (SMTP not configured: ${emailResult.error || "delivery skipped"})`;

    await collection.updateOne(buildIdFilter(id), {
      $set: {
        status: "QUOTATION_SENT",
        adminReply: replyMessage,
        repliedAt: now,
        updatedAt: now,
      },
      $push: {
        replyHistory: {
          message: replyMessage,
          sentAt: now,
          sentBy: auth.username || "admin",
        },
        timeline: {
          action: "Quotation Reply Logged",
          status: "QUOTATION_SENT",
          note: deliveryNote,
          timestamp: now,
          performedBy: auth.username || "admin",
        },
      },
    });

    return NextResponse.json({
      success: true,
      deliveredByEmail: emailResult.success,
      message: emailResult.success
        ? `Quotation reply successfully sent to ${quotation.customerEmail}.`
        : `Quotation reply recorded in system (Email delivery pending SMTP configuration).`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/quotations/[id]/reply] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Server error processing admin reply." },
      { status: 500 }
    );
  }
}
