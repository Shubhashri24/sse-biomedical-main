import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getInvoicesCollection, type InvoicePaymentRecord } from "@/lib/mongodb";

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

  try {
    const { id } = await params;
    const body = await request.json();
    const invoicesCol = await getInvoicesCollection();
    const filter = buildInvoiceIdFilter(id);
    const invoice = await invoicesCol.findOne(filter);

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: `Invoice '${id}' not found.` },
        { status: 404 }
      );
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "Cannot record payments against a cancelled invoice." },
        { status: 400 }
      );
    }

    if (invoice.status === "DRAFT" || !invoice.isFinalized) {
      return NextResponse.json(
        { success: false, message: "Please finalize the invoice before recording payment records." },
        { status: 400 }
      );
    }

    const rawAmount = Number(body.amount);
    if (body.amount === undefined || body.amount === null || body.amount === "" || !Number.isFinite(rawAmount) || rawAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Payment amount must be a positive finite number greater than zero." },
        { status: 400 }
      );
    }

    // Decimal precision validation (max 2 decimal places)
    const amountStr = String(body.amount);
    const parts = amountStr.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
      return NextResponse.json(
        { success: false, message: "Payment amount cannot have more than 2 decimal places." },
        { status: 400 }
      );
    }

    const amount = Math.round((rawAmount + Number.EPSILON) * 100) / 100;

    // Overpayment check
    const currentBalance = Number(invoice.balanceDue || 0);
    if (amount > currentBalance + 0.0001) {
      return NextResponse.json(
        {
          success: false,
          message: `Payment amount (₹${amount.toFixed(2)}) exceeds outstanding balance (₹${currentBalance.toFixed(2)}). Overpayments are not permitted.`,
        },
        { status: 400 }
      );
    }

    // Duplicate reference number check
    if (body.referenceNumber && typeof body.referenceNumber === "string" && body.referenceNumber.trim()) {
      const refTrimmed = body.referenceNumber.trim();
      const existingRefs = (invoice.paymentRecords || [])
        .map((p) => p.referenceNumber?.trim().toLowerCase())
        .filter(Boolean);

      if (existingRefs.includes(refTrimmed.toLowerCase())) {
        return NextResponse.json(
          {
            success: false,
            message: `Payment reference number "${refTrimmed}" has already been recorded for this invoice. Duplicate payments are rejected.`,
          },
          { status: 400 }
        );
      }
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const paymentMethod = body.paymentMethod || "Bank Transfer";
    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newPayment: InvoicePaymentRecord = {
      id: paymentId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber: body.referenceNumber?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      recordedAt: new Date(),
      recordedBy: auth.username || "admin",
    };

    const currentRecords = Array.isArray(invoice.paymentRecords) ? invoice.paymentRecords : [];
    const updatedRecords = [...currentRecords, newPayment];

    let totalPaid = 0;
    for (const rec of updatedRecords) {
      totalPaid += Number(rec.amount || 0);
    }
    totalPaid = Math.round((totalPaid + Number.EPSILON) * 100) / 100;

    const grandTotal = Number(invoice.grandTotal || 0);
    const balanceDue = Math.max(0, Math.round((grandTotal - totalPaid + Number.EPSILON) * 100) / 100);

    let nextStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID" = "UNPAID";
    if (totalPaid >= grandTotal) {
      nextStatus = "PAID";
    } else if (totalPaid > 0) {
      nextStatus = "PARTIALLY_PAID";
    }

    // Atomic update checking balanceDue matches what was read to prevent concurrent overspending
    const updatedInvoice = await invoicesCol.findOneAndUpdate(
      {
        ...filter,
        status: { $nin: ["CANCELLED", "DRAFT"] },
        isFinalized: true,
        balanceDue: invoice.balanceDue,
      },
      {
        $set: {
          paymentRecords: updatedRecords,
          amountPaid: totalPaid,
          balanceDue,
          status: nextStatus,
          updatedAt: new Date(),
          updatedBy: auth.username || "admin",
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedInvoice) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment transaction conflict. The invoice balance was modified concurrently. Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} recorded successfully.`,
      invoice: updatedInvoice,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/invoices/[id]/payments] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
