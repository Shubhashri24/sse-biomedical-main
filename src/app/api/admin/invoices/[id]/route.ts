import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getInvoicesCollection,
  getCompanySettings,
  generateNextInvoiceNumber,
  type InvoiceDoc,
  type CustomerInvoiceSnapshot,
  type CompanyInvoiceSnapshot,
} from "@/lib/mongodb";
import {
  calculateInvoiceTotals,
  calculateInvoiceLineItem,
  validateInvoiceInput,
} from "@/lib/invoice-calculations";

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

    return NextResponse.json({ success: true, invoice });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/invoices/[id]] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function PUT(
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
    const invoicesCol = await getInvoicesCollection();
    const filter = buildInvoiceIdFilter(id);
    const existing = await invoicesCol.findOne(filter);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: `Invoice '${id}' not found.` },
        { status: 404 }
      );
    }

    // 1. Cancellation Workflow
    if (body.action === "CANCEL") {
      if (existing.status === "CANCELLED") {
        return NextResponse.json(
          { success: false, message: "Invoice is already cancelled." },
          { status: 400 }
        );
      }

      const reason = body.cancellationReason?.trim() || "Administrative cancellation";

      await invoicesCol.updateOne(filter, {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: auth.username || "admin",
          cancellationReason: reason,
          updatedAt: new Date(),
          updatedBy: auth.username || "admin",
        },
      });

      const updated = await invoicesCol.findOne(filter);
      return NextResponse.json({
        success: true,
        message: "Invoice cancelled successfully. Financial history preserved.",
        invoice: updated,
      });
    }

    // 2. Strict Immutability: Prevent arbitrary edits or re-finalization to Finalized or Cancelled Invoices
    if (existing.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "Cancelled invoices cannot be modified." },
        { status: 400 }
      );
    }

    if (existing.isFinalized) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Finalized invoices are strictly immutable and cannot be modified or re-finalized. If corrections are required, please cancel this invoice and issue a new invoice.",
        },
        { status: 400 }
      );
    }

    // 3. Draft Edit or Finalize Workflow
    const validation = validateInvoiceInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error || "Invalid invoice input." },
        { status: 400 }
      );
    }

    const effectiveTaxType = body.taxType || existing.taxType || "NONE";
    const isTaxExempt = effectiveTaxType === "NONE";

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

    const effectiveAdditionalCharges =
      body.additionalCharges !== undefined
        ? (Number(body.additionalCharges) || 0)
        : (existing.additionalCharges || 0);
    const effectiveApplyRoundOff =
      body.applyRoundOff !== undefined
        ? Boolean(body.applyRoundOff)
        : Boolean(existing.roundOff);
    const effectiveChargesNote =
      body.additionalChargesNote !== undefined
        ? (body.additionalChargesNote?.trim() || undefined)
        : existing.additionalChargesNote;

    const totals = calculateInvoiceTotals({
      items: sanitizedItems,
      taxTreatment: effectiveTaxType,
      additionalCharges: effectiveAdditionalCharges,
      applyRoundOff: effectiveApplyRoundOff,
    });

    const isFinalizing = body.action === "FINALIZE" || (!existing.isFinalized && body.status === "UNPAID");

    let finalInvoiceNumber = existing.invoiceNumber;
    let claimToken: string | undefined = undefined;

    if (isFinalizing && !existing.isFinalized) {
      if (!finalInvoiceNumber) {
        claimToken = new ObjectId().toHexString();
        const now = new Date();
        const leaseExpiry = new Date(now.getTime() + 60000);

        // Atomic conditional lease acquisition (prevents concurrent double-allocation)
        const claimResult = await invoicesCol.updateOne(
          {
            ...filter,
            isFinalized: { $ne: true },
            $or: [
              { finalizeClaimToken: { $exists: false } },
              { finalizeClaimExpiresAt: { $lt: now } },
            ],
          },
          {
            $set: {
              finalizeClaimToken: claimToken,
              finalizeClaimExpiresAt: leaseExpiry,
            },
          }
        );

        if (claimResult.matchedCount === 0) {
          const fresh = await invoicesCol.findOne(filter);
          if (fresh?.isFinalized) {
            return NextResponse.json({
              success: true,
              message: "Invoice is already finalized.",
              invoice: fresh,
            });
          }
          return NextResponse.json(
            {
              success: false,
              message: "Invoice finalization is currently in progress by another session. Please retry shortly.",
            },
            { status: 409 }
          );
        }

        // Reuse provisional number if allocated in an interrupted attempt, or allocate fresh
        let allocatedNumber = existing.provisionalInvoiceNumber;
        if (!allocatedNumber) {
          allocatedNumber = await generateNextInvoiceNumber();
          await invoicesCol.updateOne(
            { ...filter, finalizeClaimToken: claimToken },
            { $set: { provisionalInvoiceNumber: allocatedNumber } }
          );
        }
        finalInvoiceNumber = allocatedNumber;
      }
    }

    // Snapshot company settings if finalizing
    let companySnapshot: CompanyInvoiceSnapshot = existing.company;
    if (isFinalizing) {
      const currentSettings = await getCompanySettings();
      companySnapshot = {
        companyName: currentSettings.companyName,
        address: currentSettings.address,
        state: currentSettings.state || "Maharashtra",
        stateCode: currentSettings.stateCode || "27",
        phone: currentSettings.phone,
        email: currentSettings.email,
        gstin: currentSettings.gstNumber || undefined,
        bankName: currentSettings.bankName || undefined,
        accountNumber: currentSettings.accountNumber || undefined,
        branchAndIfsc: currentSettings.branchAndIfsc || undefined,
        accountHolderName: currentSettings.accountHolderName || undefined,
        accountType: currentSettings.accountType || undefined,
        ifscCode: currentSettings.ifscCode || undefined,
        branchName: currentSettings.branchName || undefined,
        branchAddress: currentSettings.branchAddress || undefined,
        isBankVerified: currentSettings.isBankVerified,
        declaration: currentSettings.defaultDeclaration || undefined,
        signatoryTitle: currentSettings.signatoryTitle || "Authorised Signatory",
      };
    }

    const customerSnapshot: CustomerInvoiceSnapshot = body.customer
      ? {
          customerName: body.customer.customerName?.trim() || existing.customer.customerName,
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
        }
      : existing.customer;

    const currentPaid = Number(existing.amountPaid || 0);
    const balanceDue = Math.max(0, Math.round((totals.grandTotal - currentPaid) * 100) / 100);

    let nextStatus: InvoiceDoc["status"] = existing.status;
    if (isFinalizing) {
      if (currentPaid >= totals.grandTotal) {
        nextStatus = "PAID";
      } else if (currentPaid > 0) {
        nextStatus = "PARTIALLY_PAID";
      } else {
        nextStatus = "UNPAID";
      }
    }

    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : existing.invoiceDate;
    const dueDate = body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : existing.dueDate;

    const updateDoc: Partial<InvoiceDoc> = {
      status: nextStatus,
      invoiceDate,
      dueDate,
      poNumber: body.poNumber !== undefined ? (body.poNumber?.trim() || undefined) : existing.poNumber,
      quotationReference: body.quotationReference !== undefined ? (body.quotationReference?.trim() || undefined) : existing.quotationReference,
      customer: customerSnapshot,
      company: companySnapshot,
      items: sanitizedItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      taxType: effectiveTaxType,
      additionalCharges: totals.additionalCharges,
      additionalChargesNote: effectiveChargesNote,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      totalQuantity: totals.totalQuantity,
      amountInWords: totals.amountInWords,
      balanceDue,
      notes: body.notes !== undefined ? (body.notes?.trim() || undefined) : existing.notes,
      updatedAt: new Date(),
      updatedBy: auth.username || "admin",
    };

    if (finalInvoiceNumber) {
      updateDoc.invoiceNumber = finalInvoiceNumber;
    }

    if (isFinalizing && !existing.isFinalized) {
      updateDoc.isFinalized = true;
      updateDoc.finalizedAt = new Date();
      updateDoc.finalizedBy = auth.username || "admin";
    }

    const commitFilter = claimToken
      ? { ...filter, finalizeClaimToken: claimToken }
      : filter;

    const unsets: Record<string, string> = {};
    if (claimToken) {
      unsets.finalizeClaimToken = "";
      unsets.finalizeClaimExpiresAt = "";
      unsets.provisionalInvoiceNumber = "";
    }

    const updateOperation: Record<string, unknown> = { $set: updateDoc };
    if (Object.keys(unsets).length > 0) {
      updateOperation.$unset = unsets;
    }

    const commitResult = await invoicesCol.updateOne(commitFilter, updateOperation);
    if (claimToken && commitResult.matchedCount === 0) {
      const fresh = await invoicesCol.findOne(filter);
      if (fresh?.isFinalized) {
        return NextResponse.json({
          success: true,
          message: "Invoice was finalized successfully.",
          invoice: fresh,
        });
      }
      return NextResponse.json(
        { success: false, message: "Finalization lease expired before commit. Please retry." },
        { status: 409 }
      );
    }

    const updated = await invoicesCol.findOne(filter);

    return NextResponse.json({
      success: true,
      message: isFinalizing ? "Invoice finalized successfully." : "Invoice draft updated successfully.",
      invoice: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[PUT /api/admin/invoices/[id]] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
