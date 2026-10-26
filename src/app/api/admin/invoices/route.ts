import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getInvoicesCollection,
  generateNextInvoiceNumber,
  generateNextInternalInvoiceId,
  getCompanySettings,
  type InvoiceDoc,
  type InvoiceStatus,
  type CustomerInvoiceSnapshot,
  type CompanyInvoiceSnapshot,
} from "@/lib/mongodb";
import {
  calculateInvoiceTotals,
  calculateInvoiceLineItem,
  validateInvoiceInput,
} from "@/lib/invoice-calculations";

export const runtime = "nodejs";

export function getCanonicalInvoiceStatus(inv: InvoiceDoc): InvoiceStatus {
  if (inv.status === "CANCELLED") return "CANCELLED";
  if (!inv.isFinalized || inv.status === "DRAFT") return "DRAFT";

  const total = Number(inv.grandTotal || 0);
  const paid = Number(inv.amountPaid || 0);
  const balance =
    inv.balanceDue !== undefined
      ? Number(inv.balanceDue)
      : Math.max(0, Math.round((total - paid) * 100) / 100);

  if (balance <= 0 || (total > 0 && paid >= total)) {
    return "PAID";
  }
  if (paid > 0 && balance > 0) {
    return "PARTIALLY_PAID";
  }
  return "UNPAID";
}

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const invoicesCol = await getInvoicesCollection();

    // 1. Build base search and date query (without status filter so tab counts can be computed across all matching invoices)
    const baseQuery: Record<string, unknown> = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      baseQuery.$or = [
        { invoiceNumber: { $regex: escapedSearch, $options: "i" } },
        { invoiceId: { $regex: escapedSearch, $options: "i" } },
        { "customer.customerName": { $regex: escapedSearch, $options: "i" } },
        { "customer.facilityName": { $regex: escapedSearch, $options: "i" } },
        { "customer.email": { $regex: escapedSearch, $options: "i" } },
        { "customer.phone": { $regex: escapedSearch, $options: "i" } },
        { poNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      baseQuery.invoiceDate = {};
      if (startDate) {
        (baseQuery.invoiceDate as Record<string, unknown>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (baseQuery.invoiceDate as Record<string, unknown>).$lte = end;
      }
    }

    // Fetch all matching records across search/date filters
    const allMatching = await invoicesCol.find(baseQuery).toArray();

    // 2. Compute canonical status counts and financial metrics
    const statusCounts: Record<string, number> = {
      ALL: allMatching.length,
      DRAFT: 0,
      UNPAID: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
      CANCELLED: 0,
    };

    let totalInvoicedAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;

    for (const inv of allMatching) {
      const canonical = getCanonicalInvoiceStatus(inv);
      if (statusCounts[canonical] !== undefined) {
        statusCounts[canonical] += 1;
      }

      // DRAFT and CANCELLED invoices are not recognized active receivables
      if (canonical !== "CANCELLED" && canonical !== "DRAFT") {
        const total = Number(inv.grandTotal || 0);
        const paid = Number(inv.amountPaid || 0);
        const balance =
          inv.balanceDue !== undefined
            ? Number(inv.balanceDue)
            : Math.max(0, Math.round((total - paid) * 100) / 100);

        totalInvoicedAmount += total;
        totalPaidAmount += paid;
        totalOutstandingAmount += balance;
      }
    }

    totalInvoicedAmount = Math.round(totalInvoicedAmount * 100) / 100;
    totalPaidAmount = Math.round(totalPaidAmount * 100) / 100;
    totalOutstandingAmount = Math.round(totalOutstandingAmount * 100) / 100;

    // 3. Filter invoices matching the requested tab status
    let filteredInvoices = allMatching;
    if (status && status !== "ALL") {
      filteredInvoices = allMatching.filter((inv) => getCanonicalInvoiceStatus(inv) === status);
    }

    // 4. Sort the filtered invoices
    filteredInvoices.sort((a, b) => {
      if (sortBy === "amount" || sortBy === "grandTotal") {
        return (Number(a.grandTotal || 0) - Number(b.grandTotal || 0)) * sortOrder;
      }
      if (sortBy === "invoiceDate") {
        const tA = new Date(a.invoiceDate).getTime() || 0;
        const tB = new Date(b.invoiceDate).getTime() || 0;
        return (tA - tB) * sortOrder;
      }
      if (sortBy === "invoiceNumber") {
        const numA = a.invoiceNumber || a.invoiceId || "";
        const numB = b.invoiceNumber || b.invoiceId || "";
        return numA.localeCompare(numB) * sortOrder;
      }
      const cA = new Date(a.createdAt).getTime() || 0;
      const cB = new Date(b.createdAt).getTime() || 0;
      return (cA - cB) * sortOrder;
    });

    return NextResponse.json({
      success: true,
      invoices: filteredInvoices,
      statusCounts,
      metrics: {
        totalInvoices: allMatching.length,
        totalInvoicedAmount,
        totalPaidAmount,
        totalOutstandingAmount,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/invoices] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate request body and line items strictly
    const validation = validateInvoiceInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error || "Invalid invoice input." },
        { status: 400 }
      );
    }

    const effectiveTaxType = body.taxType || "NONE";
    const isTaxExempt = effectiveTaxType === "NONE";

    // Perform authoritative server-side calculations
    const sanitizedItems = body.items.map((it: {
      productId?: string;
      productCode?: string;
      description?: string;
      detailedDescription?: string;
      quantity?: number;
      unit?: string;
      rate?: number;
      discount?: number;
      taxRate?: number;
    }) => {
      const line = calculateInvoiceLineItem({
        description: it.description || "",
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate) || 0,
        unit: it.unit || "Qty",
        discount: Number(it.discount) || 0,
        taxRate: isTaxExempt ? 0 : Number(it.taxRate) || 0,
        taxTreatment: effectiveTaxType,
      });

      return {
        productId: it.productId || undefined,
        productCode: it.productCode || undefined,
        description: (it.description || "Medical Equipment").trim(),
        detailedDescription: (it.detailedDescription || "").trim() || undefined,
        quantity: Number(it.quantity) || 1,
        unit: (it.unit || "Qty").trim(),
        rate: Number(it.rate) || 0,
        discount: line.discountAmount,
        taxRate: isTaxExempt ? 0 : line.taxRate,
        taxableAmount: line.taxableAmount,
        taxAmount: line.taxAmount,
        amount: line.totalAmount,
      };
    });

    const totals = calculateInvoiceTotals({
      items: sanitizedItems,
      taxTreatment: effectiveTaxType,
      additionalCharges: Number(body.additionalCharges) || 0,
      applyRoundOff: Boolean(body.applyRoundOff),
    });

    const isFinalizeRequested = body.action === "FINALIZE" || body.status === "UNPAID" || body.status === "PAID";
    const initialStatus: InvoiceStatus = isFinalizeRequested ? "UNPAID" : "DRAFT";

    // Generate safe IDs strictly on server (client invoiceNumber cannot bypass server counter)
    const invoiceId = await generateNextInternalInvoiceId();
    let invoiceNumber: string | undefined = undefined;
    if (isFinalizeRequested) {
      invoiceNumber = await generateNextInvoiceNumber();
    }

    // Fetch active company settings for snapshot
    const companySettings = await getCompanySettings();

    const customerSnapshot: CustomerInvoiceSnapshot = {
      customerName: body.customer.customerName.trim(),
      facilityName: body.customer.facilityName?.trim() || undefined,
      billingAddress: body.customer.billingAddress?.trim() || undefined,
      city: body.customer.city?.trim() || undefined,
      state: body.customer.state?.trim() || undefined,
      stateCode: body.customer.stateCode?.trim() || undefined,
      pinCode: body.customer.pinCode?.trim() || undefined,
      contactPerson: body.customer.contactPerson?.trim() || undefined,
      phone: body.customer.phone?.trim() || undefined,
      email: body.customer.email?.trim() || undefined,
      gstin: body.customer.gstin?.trim() || undefined,
      customerReference: body.customer.customerReference?.trim() || undefined,
    };

    const companySnapshot: CompanyInvoiceSnapshot = {
      companyName: companySettings.companyName,
      address: companySettings.address,
      state: companySettings.state || "Maharashtra",
      stateCode: companySettings.stateCode || "27",
      phone: companySettings.phone,
      email: companySettings.email,
      gstin: companySettings.gstNumber || undefined,
      bankName: companySettings.bankName || undefined,
      accountNumber: companySettings.accountNumber || undefined,
      branchAndIfsc: companySettings.branchAndIfsc || undefined,
      accountHolderName: companySettings.accountHolderName || undefined,
      accountType: companySettings.accountType || undefined,
      ifscCode: companySettings.ifscCode || undefined,
      branchName: companySettings.branchName || undefined,
      branchAddress: companySettings.branchAddress || undefined,
      isBankVerified: companySettings.isBankVerified,
      declaration: companySettings.defaultDeclaration || undefined,
      signatoryTitle: companySettings.signatoryTitle || "Authorised Signatory",
    };

    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const newInvoice: InvoiceDoc = {
      invoiceId,
      invoiceNumber,
      status: initialStatus,
      invoiceDate,
      dueDate,
      poNumber: body.poNumber?.trim() || undefined,
      quotationReference: body.quotationReference?.trim() || undefined,
      customer: customerSnapshot,
      company: companySnapshot,
      items: sanitizedItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      taxType: body.taxType || "NONE",
      additionalCharges: totals.additionalCharges,
      additionalChargesNote: body.additionalChargesNote?.trim() || undefined,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      totalQuantity: totals.totalQuantity,
      amountInWords: totals.amountInWords,
      paymentRecords: [],
      amountPaid: 0,
      balanceDue: totals.grandTotal,
      notes: body.notes?.trim() || undefined,
      isFinalized: isFinalizeRequested,
      finalizedAt: isFinalizeRequested ? new Date() : null,
      finalizedBy: isFinalizeRequested ? (auth.username || "admin") : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: auth.username || "admin",
      updatedBy: auth.username || "admin",
    };

    const invoicesCol = await getInvoicesCollection();

    // Insert with retry on unique-index collision
    let inserted = false;
    let attempts = 0;
    while (!inserted && attempts < 3) {
      attempts++;
      try {
        const result = await invoicesCol.insertOne(newInvoice);
        newInvoice._id = result.insertedId;
        inserted = true;
      } catch (insertErr: unknown) {
        const errAny = insertErr as { code?: number; codeName?: string };
        if (errAny && (errAny.code === 11000 || errAny.codeName === "DuplicateKey")) {
          if (attempts >= 3) {
            return NextResponse.json(
              { success: false, message: "Duplicate invoice number generated. Please retry." },
              { status: 409 }
            );
          }
          newInvoice.invoiceNumber = await generateNextInvoiceNumber();
        } else {
          throw insertErr;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isFinalizeRequested ? "Invoice created and finalized successfully." : "Invoice draft created successfully.",
      invoice: newInvoice,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/invoices] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
