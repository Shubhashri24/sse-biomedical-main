import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getQuotationsCollection, getCompanySettings } from "@/lib/mongodb";
import { generateQuotationPDF } from "@/lib/pdf-generator";
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

export async function GET(
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
    const quotation = await quotationsCol.findOne(buildIdFilter(id));

    if (!quotation) {
      return NextResponse.json(
        { success: false, message: "Quotation request not found." },
        { status: 404 }
      );
    }

    if (!quotation.commercialQuote) {
      return NextResponse.json(
        { success: false, message: "Commercial quotation has not been prepared yet. Please prepare a draft first." },
        { status: 400 }
      );
    }

    // Validate commercial quote data
    const validation = validateCommercialQuotation(quotation.commercialQuote);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: "Cannot generate PDF from invalid quotation: " + validation.errors.join("; ") },
        { status: 400 }
      );
    }

    const companySettings = await getCompanySettings();
    const pdfBuffer = await generateQuotationPDF(quotation.commercialQuote, companySettings);

    // Update pdfGeneratedAt in the database
    await quotationsCol.updateOne(
      buildIdFilter(id),
      {
        $set: {
          "commercialQuote.pdfGeneratedAt": new Date(),
        },
      }
    );

    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "true" || url.searchParams.get("download") === "1";
    const filename = quotation.commercialQuote.pdfFilename || `Quotation-${quotation.commercialQuote.quotationNumber}.pdf`;

    const disposition = isDownload ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/quotations/[id]/commercial/pdf] Error:", msg);
    return NextResponse.json(
      { success: false, message: "Server error generating quotation PDF." },
      { status: 500 }
    );
  }
}
