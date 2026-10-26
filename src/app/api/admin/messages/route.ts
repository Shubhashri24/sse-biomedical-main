import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getContactMessagesCollection, type ContactMessageStatus, type ContactMessageDoc } from "@/lib/mongodb";
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

    const collection = await getContactMessagesCollection();
    const filter: Filter<ContactMessageDoc> = {};

    if (status !== "ALL" && ["NEW", "READ", "RESPONDED", "CLOSED"].includes(status)) {
      filter.status = status as ContactMessageStatus;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { subject: searchRegex },
        { message: searchRegex },
      ];
    }

    const messages = await collection.find(filter).sort({ createdAt: -1 }).toArray();

    const [total, newCount, readCount, respondedCount, closedCount] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: "NEW" }),
      collection.countDocuments({ status: "READ" }),
      collection.countDocuments({ status: "RESPONDED" }),
      collection.countDocuments({ status: "CLOSED" }),
    ]);

    return NextResponse.json({
      success: true,
      messages,
      counts: {
        total,
        new: newCount,
        read: readCount,
        responded: respondedCount,
        closed: closedCount,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/messages] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
