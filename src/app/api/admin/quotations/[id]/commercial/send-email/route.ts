import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getQuotationsCollection,
  getCompanySettings,
  type QuotationEmailRecord,
} from "@/lib/mongodb";
import { generateQuotationPDF } from "@/lib/pdf-generator";
import { sendQuotationPdfEmail } from "@/lib/email";
import { validateCommercialQuotation } from "@/lib/quotation-calculations";

export const runtime = "nodejs";

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
    const body = await request.json().catch(() => ({}));
    const quotationsCol = await getQuotationsCollection();
    const existing = await quotationsCol.findOne(buildIdFilter(id));

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Quotation request not found." },
        { status: 404 }
      );
    }

    if (!existing.commercialQuote) {
      return NextResponse.json(
        {
          success: false,
          message: "Commercial quotation has not been prepared. Please prepare and save quotation before emailing.",
        },
        { status: 400 }
      );
    }

    // Require quotation to be finalized or auto-finalize if valid
    const validation = validateCommercialQuotation(existing.commercialQuote);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot send invalid quotation: " + validation.errors.join("; "),
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const recipientEmail =
      existing.commercialQuote.billingDetails.email ||
      existing.customerEmail;

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json(
        { success: false, message: "A valid customer email address is required to dispatch the quotation." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Idempotency / Duplicate send prevention safeguard
    // Check if an email was sent in the last 60 seconds unless explicit confirmation given
    const recentSend = (existing.commercialQuote.emailHistory || []).find(
      (h) =>
        h.status === "SENT" &&
        now.getTime() - new Date(h.sentAt).getTime() < 60 * 1000
    );

    if (recentSend && !body.confirmResend) {
      return NextResponse.json(
        {
          success: false,
          duplicateDetected: true,
          message: `Quotation was already dispatched to ${recentSend.recipientEmail} ${Math.round(
            (now.getTime() - new Date(recentSend.sentAt).getTime()) / 1000
          )}s ago. Please confirm if you wish to resend.`,
        },
        { status: 409 }
      );
    }

    // Check SMTP configuration before proceeding
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Record failed attempt
      const failRecord: QuotationEmailRecord = {
        sentAt: now,
        sentBy: auth.username || "admin",
        recipientEmail,
        pdfFilename: existing.commercialQuote.pdfFilename || `Quotation-${existing.requestId}.pdf`,
        status: "FAILED",
        error: "SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) not configured in server environment.",
      };

      await quotationsCol.updateOne(
        buildIdFilter(id),
        {
          $set: {
            "commercialQuote.lastEmailStatus": "FAILED",
            updatedAt: now,
          },
          $push: {
            "commercialQuote.emailHistory": failRecord,
          },
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not configured on the server. Email could not be sent. You can still download the PDF directly.",
        },
        { status: 503 }
      );
    }

    // Generate the PDF attachment
    const companySettings = await getCompanySettings();
    const pdfFilename = existing.commercialQuote.pdfFilename || `Quotation-${existing.requestId}.pdf`;
    const pdfBuffer = await generateQuotationPDF(existing.commercialQuote, companySettings);

    // Send the email with the generated PDF attached
    const emailResult = await sendQuotationPdfEmail({
      customerName: existing.commercialQuote.billingDetails.customerName || existing.customerName,
      customerEmail: recipientEmail,
      quotationNumber: existing.commercialQuote.quotationNumber,
      grandTotal: existing.commercialQuote.grandTotal,
      currency: existing.commercialQuote.currency || "INR",
      pdfBuffer,
      pdfFilename,
    });

    if (!emailResult.success) {
      // Record failure without updating RFQ status to QUOTATION_SENT
      const failRecord: QuotationEmailRecord = {
        sentAt: now,
        sentBy: auth.username || "admin",
        recipientEmail,
        pdfFilename,
        status: "FAILED",
        error: emailResult.error || "Email delivery failed",
      };

      await quotationsCol.updateOne(
        buildIdFilter(id),
        {
          $set: {
            "commercialQuote.lastEmailStatus": "FAILED",
            updatedAt: now,
          },
          $push: {
            "commercialQuote.emailHistory": failRecord,
            timeline: {
              action: "Quotation Email Dispatch Failed",
              status: existing.status,
              note: `Failed to dispatch quotation PDF to ${recipientEmail}: ${emailResult.error || "Unknown SMTP error"}`,
              timestamp: now,
              performedBy: auth.username || "admin",
            },
          },
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: `Failed to send email: ${emailResult.error || "Unknown SMTP error"}. Quotation status has not been changed.`,
        },
        { status: 502 }
      );
    }

    // Success! Update status to QUOTATION_SENT, record history, and append timeline
    const successRecord: QuotationEmailRecord = {
      sentAt: now,
      sentBy: auth.username || "admin",
      recipientEmail,
      pdfFilename,
      messageId: emailResult.messageId,
      status: "SENT",
    };

    const timelineEntry = {
      action: "Quotation Sent via Email",
      status: "QUOTATION_SENT" as const,
      note: `Official commercial quotation ${existing.commercialQuote.quotationNumber} with PDF attachment (${pdfFilename}) sent to ${recipientEmail}. Message ID: ${emailResult.messageId || "N/A"}`,
      timestamp: now,
      performedBy: auth.username || "admin",
    };

    const updated = await quotationsCol.findOneAndUpdate(
      buildIdFilter(id),
      {
        $set: {
          status: "QUOTATION_SENT",
          repliedAt: now,
          updatedAt: now,
          "commercialQuote.status": "FINALIZED",
          "commercialQuote.lastEmailStatus": "SENT",
          "commercialQuote.pdfGeneratedAt": now,
        },
        $push: {
          "commercialQuote.emailHistory": successRecord,
          timeline: timelineEntry,
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: `Commercial quotation PDF successfully emailed to ${recipientEmail}.`,
      messageId: emailResult.messageId,
      quotation: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/quotations/[id]/commercial/send-email] Error:", msg);
    return NextResponse.json(
      { success: false, message: "Server error sending quotation email." },
      { status: 500 }
    );
  }
}
