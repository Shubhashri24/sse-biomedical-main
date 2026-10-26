import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getQuotationsCollection, type QuotationStatus } from "@/lib/mongodb";

const VALID_STATUSES: QuotationStatus[] = [
  "NEW",
  "REVIEWING",
  "CONTACTED",
  "QUOTATION_PREPARATION",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "APPROVED",
  "REJECTED",
  "CLOSED",
];

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
    const collection = await getQuotationsCollection();

    const quotation = await collection.findOne(buildIdFilter(id));
    if (!quotation) {
      return NextResponse.json(
        { success: false, message: "Quotation request not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, quotation });
  } catch (err) {
    console.error("[GET /api/admin/quotations/[id]] Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error querying quotation." },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const newStatus = typeof body.status === "string" ? body.status.toUpperCase() : "";

    if (!VALID_STATUSES.includes(newStatus as QuotationStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status. Allowed values are: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const collection = await getQuotationsCollection();
    const existing = await collection.findOne(buildIdFilter(id));
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Quotation request not found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const timelineEntry = {
      action: `Status updated`,
      status: newStatus as QuotationStatus,
      note: `Status changed from ${existing.status} to ${newStatus}`,
      timestamp: now,
      performedBy: auth.username || "admin",
    };

    const result = await collection.findOneAndUpdate(
      buildIdFilter(id),
      {
        $set: {
          status: newStatus as QuotationStatus,
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
      quotation: result,
      message: `Status updated to ${newStatus}.`,
    });
  } catch (err) {
    console.error("[PATCH /api/admin/quotations/[id]] Error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update quotation status." },
      { status: 500 }
    );
  }
}
