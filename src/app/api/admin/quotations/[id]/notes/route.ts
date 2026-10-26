import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getQuotationsCollection, type QuotationInternalNote } from "@/lib/mongodb";

function buildIdFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ requestId: id }, { _id: new ObjectId(id) }],
    };
  }
  return { requestId: id };
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
    const noteText = typeof body.note === "string" ? body.note.trim() : "";

    if (!noteText) {
      return NextResponse.json(
        { success: false, message: "Note text cannot be empty." },
        { status: 400 }
      );
    }

    const collection = await getQuotationsCollection();
    const now = new Date();

    const newNote: QuotationInternalNote = {
      id: new ObjectId().toString(),
      note: noteText,
      createdAt: now,
      createdBy: auth.username || "admin",
    };

    const timelineEntry = {
      action: "Admin Note Added",
      note: noteText.length > 60 ? `${noteText.substring(0, 57)}...` : noteText,
      timestamp: now,
      performedBy: auth.username || "admin",
    };

    const result = await collection.findOneAndUpdate(
      buildIdFilter(id),
      {
        $set: { updatedAt: now },
        $push: {
          notes: newNote,
          timeline: timelineEntry,
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Quotation request not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Internal note attached successfully.",
      note: newNote,
      quotation: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/quotations/[id]/notes] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to record internal note." },
      { status: 500 }
    );
  }
}
