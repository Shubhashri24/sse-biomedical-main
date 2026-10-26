import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getInvoicesCollection, type InvoiceEmailRecord } from "@/lib/mongodb";
import { generateInvoicePDF } from "@/lib/invoice-pdf-generator";
import { sendInvoicePdfEmail } from "@/lib/email";

export const runtime = "nodejs";

function buildInvoiceIdFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [
        { _id: new ObjectId(id) },
        { invoiceId: id },
        { invoiceNumber: id },
      ],
    };
  }
  return {
    $or: [{ invoiceId: id }, { invoiceNumber: id }],
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let filter: ReturnType<typeof buildInvoiceIdFilter> | null = null;
  let lockAcquired = false;

  try {
    const { id } = await params;
    filter = buildInvoiceIdFilter(id);
    const body = await request.json().catch(() => ({}));
    const invoicesCol = await getInvoicesCollection();
    const existing = await invoicesCol.findOne(filter);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: `Invoice '${id}' not found.` },
        { status: 404 }
      );
    }

    // 1. Strict Eligibility: Only finalized invoices can be dispatched via email
    if (!existing.isFinalized || existing.status === "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          message: "Draft invoices cannot be emailed. Please finalize the invoice before emailing.",
        },
        { status: 400 }
      );
    }

    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          message: "Cancelled invoices cannot be emailed as final tax invoices.",
        },
        { status: 400 }
      );
    }

    if (!existing.invoiceNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice has not been assigned an official invoice number.",
        },
        { status: 400 }
      );
    }

    // 2. Recipient Address Determination & Strict Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const targetEmail = (
      typeof body.recipientEmail === "string" && body.recipientEmail.trim()
        ? body.recipientEmail.trim()
        : existing.customer?.email?.trim() || ""
    );

    if (!targetEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "No customer email address on file. Please enter a valid recipient email address.",
        },
        { status: 400 }
      );
    }

    if (!emailRegex.test(targetEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: "Recipient email address is invalid.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // 3. Duplicate-send / Idempotency Safeguard (60s cooldown unless confirmed)
    const recentSend = (existing.emailHistory || []).find(
      (h) =>
        h.status === "SENT" &&
        now.getTime() - new Date(h.sentAt).getTime() < 60 * 1000
    );

    if (recentSend && !body.confirmResend) {
      const elapsedSec = Math.round((now.getTime() - new Date(recentSend.sentAt).getTime()) / 1000);
      const remainingSec = Math.max(1, 60 - elapsedSec);
      return NextResponse.json(
        {
          success: false,
          duplicateDetected: true,
          message: `Invoice ${existing.invoiceNumber} was already dispatched to ${recentSend.recipientEmail} ${elapsedSec}s ago. Please confirm if you wish to resend (cooldown expires in ${remainingSec}s).`,
          remainingSeconds: remainingSec,
          lastRecipient: recentSend.recipientEmail,
        },
        { status: 409 }
      );
    }

    // 4. Atomic Concurrency Guard (prevents concurrent double-dispatches)
    const lockToken = new ObjectId().toHexString();
    const lockExpiry = new Date(now.getTime() + 15000);

    const lockResult = await invoicesCol.updateOne(
      {
        ...filter,
        $or: [
          { emailDispatchLock: { $exists: false } },
          { emailDispatchLock: "" },
          { emailDispatchLockExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: {
          emailDispatchLock: lockToken,
          emailDispatchLockExpiresAt: lockExpiry,
        },
      }
    );

    if (lockResult.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "An email dispatch for this invoice is currently in progress. Please wait a moment and try again.",
        },
        { status: 409 }
      );
    }
    lockAcquired = true;

    // 5. Pre-flight Check for SMTP credentials
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    const safeNum = (existing.invoiceNumber || existing.invoiceId).replace(/[/\\?%*:|"<>]/g, "-");
    const pdfFilename = `Invoice-${safeNum}.pdf`;

    if (!smtpHost || !smtpUser || !smtpPass) {
      const failRecord: InvoiceEmailRecord = {
        sentAt: now,
        sentBy: auth.username || "admin",
        recipientEmail: targetEmail,
        pdfFilename,
        status: "FAILED",
        error: "SMTP credentials not configured in server environment.",
      };

      await invoicesCol.updateOne(filter, {
        $set: {
          lastEmailStatus: "FAILED",
          updatedAt: now,
        },
        $push: { emailHistory: failRecord },
        $unset: { emailDispatchLock: "", emailDispatchLockExpiresAt: "" },
      });
      lockAcquired = false;

      return NextResponse.json(
        {
          success: false,
          message: "SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not configured on the server. Email could not be sent. You can still download the PDF directly.",
        },
        { status: 503 }
      );
    }

    // 6. Generate official invoice PDF buffer in-memory
    const pdfBuffer = await generateInvoicePDF(existing);

    // 7. Dispatch email via nodemailer
    const emailResult = await sendInvoicePdfEmail({
      customerName: existing.customer?.customerName || "Valued Customer",
      customerEmail: targetEmail,
      invoiceNumber: existing.invoiceNumber,
      grandTotal: existing.grandTotal,
      balanceDue: existing.balanceDue,
      dueDate: existing.dueDate,
      currency: "INR",
      pdfBuffer,
      pdfFilename,
    });

    if (!emailResult.success) {
      const failRecord: InvoiceEmailRecord = {
        sentAt: now,
        sentBy: auth.username || "admin",
        recipientEmail: targetEmail,
        pdfFilename,
        status: "FAILED",
        error: emailResult.error || "Email delivery failed",
      };

      await invoicesCol.updateOne(filter, {
        $set: {
          lastEmailStatus: "FAILED",
          updatedAt: now,
        },
        $push: { emailHistory: failRecord },
        $unset: { emailDispatchLock: "", emailDispatchLockExpiresAt: "" },
      });
      lockAcquired = false;

      return NextResponse.json(
        {
          success: false,
          message: `Failed to dispatch email: ${emailResult.error || "Unknown SMTP error"}. Invoice data has not been modified.`,
        },
        { status: 502 }
      );
    }

    // 8. Success: Record SENT audit entry, update timestamps, and release lock
    const successRecord: InvoiceEmailRecord = {
      sentAt: now,
      sentBy: auth.username || "admin",
      recipientEmail: targetEmail,
      pdfFilename,
      messageId: emailResult.messageId,
      status: "SENT",
    };

    const updated = await invoicesCol.findOneAndUpdate(
      filter,
      {
        $set: {
          lastEmailStatus: "SENT",
          lastEmailedAt: now,
          pdfGeneratedAt: now,
          updatedAt: now,
        },
        $push: { emailHistory: successRecord },
        $unset: { emailDispatchLock: "", emailDispatchLockExpiresAt: "" },
      },
      { returnDocument: "after" }
    );
    lockAcquired = false;

    return NextResponse.json({
      success: true,
      message: `Official invoice ${existing.invoiceNumber} PDF successfully dispatched to ${targetEmail}.`,
      messageId: emailResult.messageId,
      invoice: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/invoices/[id]/send-email] Error:", errorMsg);

    // Ensure lock is released if an unexpected exception occurred
    if (lockAcquired && filter) {
      try {
        const invoicesCol = await getInvoicesCollection();
        await invoicesCol.updateOne(filter, {
          $unset: { emailDispatchLock: "", emailDispatchLockExpiresAt: "" },
        });
      } catch {
        // Ignored
      }
    }

    return NextResponse.json(
      { success: false, message: "Internal server error dispatching invoice email." },
      { status: 500 }
    );
  }
}
