import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getQuotationsCollection,
  getProductsCollection,
  getCompanySettings,
  type QuotationCommercialItem,
  type CommercialQuotation,
  type CustomerBillingDetails,
} from "@/lib/mongodb";
import {
  calculateLineItem,
  calculateQuotationTotals,
  validateCommercialQuotation,
} from "@/lib/quotation-calculations";

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

    const companySettings = await getCompanySettings();

    // If commercial quote already exists, return it
    if (quotation.commercialQuote) {
      return NextResponse.json({
        success: true,
        commercialQuote: quotation.commercialQuote,
        companySettings,
        quotationRequest: {
          requestId: quotation.requestId,
          customerName: quotation.customerName,
          customerEmail: quotation.customerEmail,
          phone: quotation.phone,
          facility: quotation.facility,
          status: quotation.status,
        },
      });
    }

    // Initialize initial draft quotation from RFQ details
    const now = new Date();
    const validUntil = new Date(
      now.getTime() + (companySettings.defaultValidityDays || 30) * 24 * 60 * 60 * 1000
    );

    const initialBilling: CustomerBillingDetails = {
      customerName: quotation.customerName || "",
      organizationName: quotation.facility || "",
      address: "",
      city: "",
      state: "",
      country: "India",
      postalCode: "",
      email: quotation.customerEmail || "",
      phone: quotation.phone || "",
    };

    // Synthesize items from RFQ
    const rawRfqItems = Array.isArray(quotation.items) && quotation.items.length > 0
      ? quotation.items
      : [
          {
            productCode: quotation.equipmentCode || "",
            equipmentName: quotation.equipment || "Equipment Item",
            quantity: quotation.quantity || 1,
            category: quotation.category,
          },
        ];

    // Check products catalog for matching product names or codes
    const productsCol = await getProductsCollection();
    const catalogProducts = await productsCol.find({ isActive: true }).toArray();

    const initialItems: QuotationCommercialItem[] = rawRfqItems.map((rfqItem) => {
      const match = catalogProducts.find(
        (p) =>
          (rfqItem.productCode && p.productCode === rfqItem.productCode) ||
          (rfqItem.equipmentName && p.name.toLowerCase() === rfqItem.equipmentName.toLowerCase())
      );

      const qty = Math.max(1, Number(rfqItem.quantity) || 1);
      const unitPrice = 0; // Requires admin to enter or confirm commercial pricing
      const lineCalc = calculateLineItem({
        quantity: qty,
        unitPrice,
        discountType: "PERCENT",
        discountValue: 0,
        gstRate: 0,
      });

      return {
        productId: match?._id?.toString(),
        productCode: rfqItem.productCode || match?.productCode || "",
        productName: rfqItem.equipmentName || match?.name || "Equipment",
        quantity: qty,
        unitPrice,
        discountType: "PERCENT",
        discountValue: 0,
        discountAmount: lineCalc.discountAmount,
        taxableAmount: lineCalc.taxableAmount,
        gstRate: 0,
        gstAmount: lineCalc.gstAmount,
        totalAmount: lineCalc.totalAmount,
      };
    });

    const totals = calculateQuotationTotals(initialItems);

    const initialDraft: CommercialQuotation = {
      quotationNumber: quotation.requestId,
      version: 1,
      status: "DRAFT",
      date: now,
      validUntil,
      billingDetails: initialBilling,
      items: initialItems,
      currency: "INR",
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      terms: companySettings.defaultTerms || [],
      notes: "",
      emailHistory: [],
      lastEmailStatus: "NOT_SENT",
    };

    return NextResponse.json({
      success: true,
      commercialQuote: initialDraft,
      companySettings,
      quotationRequest: {
        requestId: quotation.requestId,
        customerName: quotation.customerName,
        customerEmail: quotation.customerEmail,
        phone: quotation.phone,
        facility: quotation.facility,
        status: quotation.status,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/quotations/[id]/commercial] Error:", msg);
    return NextResponse.json(
      { success: false, message: "Server error querying commercial quotation." },
      { status: 500 }
    );
  }
}

async function handleSaveCommercialQuotation(
  request: Request,
  id: string
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const quotationsCol = await getQuotationsCollection();
    const existing = await quotationsCol.findOne(buildIdFilter(id));

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Quotation request not found." },
        { status: 404 }
      );
    }

    const isFinalizeRequested = body.action === "FINALIZE" || body.status === "FINALIZED";

    // Strict validation only when finalizing; draft allows in-progress saving
    if (isFinalizeRequested) {
      const validation = validateCommercialQuotation(body);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed: " + validation.errors.join("; "),
            errors: validation.errors,
          },
          { status: 400 }
        );
      }
    }

    // Calculate line items server-side to guarantee financial integrity
    const items: QuotationCommercialItem[] = (body.items || []).map((rawItem: Partial<QuotationCommercialItem>) => {
      const qty = Math.max(1, parseInt(String(rawItem.quantity || 1), 10) || 1);
      const unitPrice = Math.max(0, Number(rawItem.unitPrice || 0));
      const discountType = rawItem.discountType === "FIXED" ? "FIXED" : "PERCENT";
      const discountValue = Math.max(0, Number(rawItem.discountValue || 0));
      const gstRate = Math.max(0, Math.min(100, Number(rawItem.gstRate || 0)));

      const calc = calculateLineItem({
        quantity: qty,
        unitPrice,
        discountType,
        discountValue,
        gstRate,
      });

      return {
        productId: rawItem.productId,
        productCode: String(rawItem.productCode || "").trim(),
        productName: String(rawItem.productName || "").trim() || "Equipment Item",
        quantity: qty,
        unitPrice,
        discountType,
        discountValue,
        discountAmount: calc.discountAmount,
        taxableAmount: calc.taxableAmount,
        gstRate,
        gstAmount: calc.gstAmount,
        totalAmount: calc.totalAmount,
      };
    });

    const totals = calculateQuotationTotals(items);

    const now = new Date();
    const quoteDate = body.date ? new Date(body.date) : (existing.commercialQuote?.date || now);
    const validUntil = body.validUntil
      ? new Date(body.validUntil)
      : new Date(quoteDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const billingDetails: CustomerBillingDetails = {
      customerName: String(body.billingDetails?.customerName || existing.customerName || "").trim(),
      organizationName: String(body.billingDetails?.organizationName || existing.facility || "").trim(),
      address: String(body.billingDetails?.address || "").trim(),
      city: String(body.billingDetails?.city || "").trim(),
      state: String(body.billingDetails?.state || "").trim(),
      country: String(body.billingDetails?.country || "India").trim(),
      postalCode: String(body.billingDetails?.postalCode || "").trim(),
      email: String(body.billingDetails?.email || existing.customerEmail || "").trim().toLowerCase(),
      phone: String(body.billingDetails?.phone || existing.phone || "").trim(),
    };

    const terms: string[] = Array.isArray(body.terms)
      ? body.terms.map((t: unknown) => String(t || "").trim()).filter(Boolean)
      : [];

    const currentVersion = existing.commercialQuote?.version || 1;
    const currentStatus = isFinalizeRequested ? "FINALIZED" : "DRAFT";

    const commercialQuote: CommercialQuotation = {
      quotationNumber: existing.requestId,
      version: currentVersion,
      status: currentStatus,
      date: quoteDate,
      validUntil,
      billingDetails,
      items,
      currency: "INR",
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
      terms,
      notes: typeof body.notes === "string" ? body.notes.trim() : "",
      emailHistory: existing.commercialQuote?.emailHistory || [],
      lastEmailStatus: existing.commercialQuote?.lastEmailStatus || "NOT_SENT",
      pdfGeneratedAt: existing.commercialQuote?.pdfGeneratedAt,
      pdfFilename: `Quotation-${existing.requestId}.pdf`,
    };

    // If status was NEW, transition to QUOTATION_PREPARATION
    const newStatus = existing.status === "NEW" ? "QUOTATION_PREPARATION" : existing.status;

    const timelineEntry = {
      action: currentStatus === "FINALIZED" ? "Quotation Finalized" : "Quotation Draft Saved",
      status: newStatus,
      note: `Commercial quotation ${currentStatus.toLowerCase()} saved with ${items.length} item(s). Grand total: ₹${totals.grandTotal.toLocaleString("en-IN")}`,
      timestamp: now,
      performedBy: auth.username || "admin",
    };

    const updateDoc: Record<string, unknown> = {
      commercialQuote,
      updatedAt: now,
    };

    if (existing.status === "NEW") {
      updateDoc.status = "QUOTATION_PREPARATION";
    }

    const updated = await quotationsCol.findOneAndUpdate(
      buildIdFilter(id),
      {
        $set: updateDoc,
        $push: {
          timeline: timelineEntry,
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: isFinalizeRequested
        ? "Commercial quotation finalized successfully."
        : "Commercial quotation draft saved successfully.",
      commercialQuote: updated?.commercialQuote,
      quotation: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Commercial Quotation Save] Error:", msg);
    return NextResponse.json(
      { success: false, message: `Failed to save commercial quotation: ${msg}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleSaveCommercialQuotation(request, id);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleSaveCommercialQuotation(request, id);
}
