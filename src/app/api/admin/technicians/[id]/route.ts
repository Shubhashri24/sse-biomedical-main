import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getTechniciansCollection, type TechnicianDoc } from "@/lib/mongodb";

function buildTechnicianFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { technicianId: id }],
    };
  }
  return { technicianId: id };
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
    const techniciansCol = await getTechniciansCollection();
    const technician = await techniciansCol.findOne(buildTechnicianFilter(id));

    if (!technician) {
      return NextResponse.json({ success: false, message: "Technician not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, technician });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
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
    const techniciansCol = await getTechniciansCollection();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.name === "string") updateFields.name = body.name.trim();
    if (typeof body.email === "string") updateFields.email = body.email.trim();
    if (typeof body.phone === "string") updateFields.phone = body.phone.trim();
    if (typeof body.specialization === "string") updateFields.specialization = body.specialization.trim();
    if (
      typeof body.availability === "string" &&
      ["AVAILABLE", "ON_CALL", "ON_LEAVE", "BUSY"].includes(body.availability.toUpperCase())
    ) {
      updateFields.availability = body.availability.toUpperCase() as TechnicianDoc["availability"];
    }
    if (body.isActive !== undefined) updateFields.isActive = Boolean(body.isActive);

    const updated = await techniciansCol.findOneAndUpdate(
      buildTechnicianFilter(id),
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Technician not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Technician details updated successfully",
      technician: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const techniciansCol = await getTechniciansCollection();

    const result = await techniciansCol.findOneAndUpdate(
      buildTechnicianFilter(id),
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ success: false, message: "Technician not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Technician ${result.name} deactivated.`,
      technician: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
