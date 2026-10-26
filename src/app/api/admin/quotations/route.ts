import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getQuotationsCollection,
  type QuotationStatus,
  type QuotationRequestDoc,
} from "@/lib/mongodb";
import type { Filter } from "mongodb";

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "ALL";

    const collection = await getQuotationsCollection();

    // Summary counts (across all requests, unfiltered by search/status)
    const [total, newCount, contacted, quotationSent, closed] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: "NEW" }),
      collection.countDocuments({ status: "CONTACTED" }),
      collection.countDocuments({ status: "QUOTATION_SENT" }),
      collection.countDocuments({ status: "CLOSED" }),
    ]);

    const ALL_STATUSES: QuotationStatus[] = [
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

    // Build query filter
    const filter: Filter<QuotationRequestDoc> = {};

    if (status !== "ALL" && ALL_STATUSES.includes(status as QuotationStatus)) {
      filter.status = status as QuotationStatus;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { requestId: searchRegex },
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { equipment: searchRegex },
        { phone: searchRegex },
        { facility: searchRegex },
      ];
    }

    const quotations = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      quotations,
      counts: {
        total,
        new: newCount,
        contacted,
        quotationSent,
        closed,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/quotations] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Database query failed. Please verify MONGODB_URI." },
      { status: 500 }
    );
  }
}
