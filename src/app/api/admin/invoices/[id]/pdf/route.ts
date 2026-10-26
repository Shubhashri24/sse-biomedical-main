import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getInvoicesCollection } from "@/lib/mongodb";
import { generateInvoicePDF } from "@/lib/invoice-pdf-generator";

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
    const invoicesCol = await getInvoicesCollection();
    const invoice = await invoicesCol.findOne(buildInvoiceIdFilter(id));

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: `Invoice '${id}' not found.` },
        { status: 404 }
      );
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    // Update timestamp
    await invoicesCol.updateOne(buildInvoiceIdFilter(id), {
      $set: { pdfGeneratedAt: new Date() },
    });

    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "true" || url.searchParams.get("download") === "1";
    const safeNum = (invoice.invoiceNumber || invoice.invoiceId || "invoice").replace(/[/\\?%*:|"<>]/g, "-");
    const filename = `Invoice-${safeNum}.pdf`;
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
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/invoices/[id]/pdf] Error:", errorMsg);
    return NextResponse.json({ success: false, message: "Error generating invoice PDF." }, { status: 500 });
  }
}
