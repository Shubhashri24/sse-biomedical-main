import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getContactMessagesCollection, type ContactMessageStatus } from "@/lib/mongodb";

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
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const collection = await getContactMessagesCollection();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.status === "string") {
      const s = body.status.toUpperCase();
      if (["NEW", "READ", "RESPONDED", "CLOSED"].includes(s)) {
        updateFields.status = s as ContactMessageStatus;
      }
    }

    if (typeof body.adminNotes === "string") {
      updateFields.adminNotes = body.adminNotes.trim();
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ success: false, message: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Message updated successfully",
      messageDoc: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/admin/messages/[id]] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
