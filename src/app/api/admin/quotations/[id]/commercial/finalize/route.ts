import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getQuotationsCollection } from "@/lib/mongodb";
import { validateCommercialQuotation } from "@/lib/quotation-calculations";

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
        { success: false, message: "Commercial quotation has not been prepared yet. Please save a draft first." },
        { status: 400 }
      );
    }

    const validation = validateCommercialQuotation(existing.commercialQuote);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "Cannot finalize invalid quotation: " + validation.errors.join("; ") },
        { status: 400 }
      );
    }

    const now = new Date();
    const isAlreadyFinalized = existing.commercialQuote.status === "FINALIZED";
    const nextVersion = isAlreadyFinalized ? (existing.commercialQuote.version || 1) + 1 : (existing.commercialQuote.version || 1);
    const quotationNumber = nextVersion > 1 ? `${existing.requestId}-REV${nextVersion - 1}` : existing.requestId;

    const finalizedQuote = {
      ...existing.commercialQuote,
      quotationNumber,
      version: nextVersion,
      status: "FINALIZED" as const,
      finalizedAt: now,
      finalizedBy: auth.username || "admin",
      pdfFilename: `Quotation-${quotationNumber}.pdf`,
    };

    const actionText = isAlreadyFinalized
      ? `Commercial Quotation Revised (v${nextVersion})`
      : "Commercial Quotation Finalized";

    const timelineEntry = {
      action: actionText,
      status: existing.status,
      note: `Quotation ${quotationNumber} (v${nextVersion}) finalized. Grand Total: ₹${finalizedQuote.grandTotal.toLocaleString("en-IN")}. Document ready for PDF download and email dispatch.`,
      timestamp: now,
      performedBy: auth.username || "admin",
    };

    const updated = await quotationsCol.findOneAndUpdate(
      buildIdFilter(id),
      {
        $set: {
          commercialQuote: finalizedQuote,
          updatedAt: now,
        },
        $push: {
          timeline: timelineEntry,
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: `Quotation ${quotationNumber} successfully finalized.`,
      commercialQuote: updated?.commercialQuote,
      quotation: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/quotations/[id]/commercial/finalize] Error:", msg);
    return NextResponse.json(
      { success: false, message: "Server error finalizing quotation." },
      { status: 500 }
    );
  }
}
