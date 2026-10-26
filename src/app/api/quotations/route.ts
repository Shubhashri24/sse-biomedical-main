import { NextResponse } from "next/server";
import {
  getQuotationsCollection,
  generateNextRequestId,
  type QuotationRequestDoc,
  type QuotationItem,
} from "@/lib/mongodb";
import { sendAdminNotification } from "@/lib/email";

// Simple email regex for server validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON request payload." },
      { status: 400 }
    );
  }

  const customerName = typeof body.name === "string" ? body.name.trim() : "";
  const customerEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const facility = typeof body.facility === "string" ? body.facility.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  // Multi-item RFQ array support
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const parsedItems: QuotationItem[] = [];

  for (const it of rawItems) {
    if (it && typeof it === "object") {
      const pCode = typeof it.productCode === "string" ? it.productCode.trim() : "";
      const pName = typeof it.equipmentName === "string" ? it.equipmentName.trim() : "";
      const pQty = typeof it.quantity === "number" ? Math.max(1, it.quantity) : parseInt(String(it.quantity || 1), 10);
      const pCat = typeof it.category === "string" ? it.category.trim() : undefined;
      const pId = typeof it.productId === "string" ? it.productId.trim() : undefined;

      if (pCode || pName) {
        parsedItems.push({
          productId: pId,
          productCode: pCode,
          equipmentName: pName || pCode,
          quantity: isNaN(pQty) || pQty < 1 ? 1 : pQty,
          category: pCat,
        });
      }
    }
  }

  // Fallback single equipment fields for backwards compatibility
  let equipment = typeof body.equipment === "string" ? body.equipment.trim() : "";
  let equipmentCode = typeof body.equipmentCode === "string" ? body.equipmentCode.trim() : "";
  let category = typeof body.category === "string" ? body.category.trim() : "";
  const rawQty = typeof body.quantity === "number" ? body.quantity : parseInt(String(body.quantity || "1"), 10);
  let quantity = isNaN(rawQty) || rawQty < 1 ? 1 : rawQty;

  // If multi-item array provided, harmonize legacy fields
  if (parsedItems.length > 0) {
    if (!equipment) {
      if (parsedItems.length === 1) {
        equipment = parsedItems[0].equipmentName;
        equipmentCode = parsedItems[0].productCode;
        quantity = parsedItems[0].quantity;
        category = parsedItems[0].category || category || "General";
      } else {
        equipment = `${parsedItems[0].equipmentName} (+${parsedItems.length - 1} more items)`;
        equipmentCode = parsedItems[0].productCode;
        quantity = parsedItems.reduce((acc, curr) => acc + curr.quantity, 0);
        category = parsedItems[0].category || "Multi-Department";
      }
    }
  } else if (equipment) {
    // If only legacy single item was submitted, synthesize items array
    parsedItems.push({
      productCode: equipmentCode || "GEN-01",
      equipmentName: equipment,
      quantity,
      category: category || "General",
    });
  }

  // Field validations
  if (!customerName) {
    return NextResponse.json(
      { success: false, message: "Full name is required." },
      { status: 400 }
    );
  }

  if (!customerEmail || !EMAIL_REGEX.test(customerEmail)) {
    return NextResponse.json(
      { success: false, message: "A valid email address is required." },
      { status: 400 }
    );
  }

  if (!phone) {
    return NextResponse.json(
      { success: false, message: "Phone number is required." },
      { status: 400 }
    );
  }

  if (!equipment && parsedItems.length === 0) {
    return NextResponse.json(
      { success: false, message: "At least one equipment profile is required." },
      { status: 400 }
    );
  }

  try {
    const collection = await getQuotationsCollection();
    const requestId = await generateNextRequestId();
    const now = new Date();

    const quotationDoc: QuotationRequestDoc = {
      requestId,
      customerName,
      customerEmail,
      phone,
      facility: facility || undefined,
      category: category || "General",
      equipment,
      equipmentCode: equipmentCode || undefined,
      quantity,
      items: parsedItems,
      message: message || undefined,
      status: "NEW",
      timeline: [
        {
          action: "Request Submitted",
          status: "NEW",
          note: `Customer submitted request for ${parsedItems.length} equipment type(s) (${quantity} units total).`,
          timestamp: now,
          performedBy: "Customer",
        },
      ],
      createdAt: now,
      updatedAt: now,
      repliedAt: null,
    };

    await collection.insertOne(quotationDoc);

    // Asynchronously dispatch admin notification email without blocking response
    sendAdminNotification(quotationDoc).catch((emailErr) => {
      console.warn("[POST /api/quotations] Admin notification email dispatch skipped or errored:", emailErr);
    });

    return NextResponse.json({
      success: true,
      requestId,
      message: `Quotation request ${requestId} submitted successfully.`,
      itemsCount: parsedItems.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/quotations] Server Error:", errorMsg);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to submit quotation request. Please check your connection or contact us directly.",
      },
      { status: 500 }
    );
  }
}
