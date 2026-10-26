import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getServiceTicketsCollection,
  type ServiceTicketPriority,
  type ServiceTicketStatus,
  type InstallationStatus,
} from "@/lib/mongodb";

function buildServiceFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { ticketId: id }],
    };
  }
  return { ticketId: id };
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
    const ticketsCol = await getServiceTicketsCollection();
    const ticket = await ticketsCol.findOne(buildServiceFilter(id));

    if (!ticket) {
      return NextResponse.json({ success: false, message: "Service ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket });
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
    const ticketsCol = await getServiceTicketsCollection();

    const existingTicket = await ticketsCol.findOne(buildServiceFilter(id));
    if (!existingTicket) {
      return NextResponse.json({ success: false, message: "Service ticket not found" }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (
      typeof body.status === "string" &&
      ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_PARTS", "RESOLVED", "CLOSED"].includes(body.status.toUpperCase())
    ) {
      const newStatus = body.status.toUpperCase() as ServiceTicketStatus;
      updateFields.status = newStatus;
      if ((newStatus === "RESOLVED" || newStatus === "CLOSED") && !existingTicket.completedDate) {
        updateFields.completedDate = new Date();
      }
    }

    if (
      typeof body.priority === "string" &&
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(body.priority.toUpperCase())
    ) {
      updateFields.priority = body.priority.toUpperCase() as ServiceTicketPriority;
    }

    if (typeof body.assignedTechnicianId === "string") {
      updateFields.assignedTechnicianId = body.assignedTechnicianId.trim();
    }
    if (typeof body.assignedTechnicianName === "string") {
      updateFields.assignedTechnicianName = body.assignedTechnicianName.trim();
      if (existingTicket.status === "OPEN" && !updateFields.status) {
        updateFields.status = "ASSIGNED";
      }
    }

    if (body.scheduledDate !== undefined) {
      updateFields.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    }

    if (body.completedDate !== undefined) {
      updateFields.completedDate = body.completedDate ? new Date(body.completedDate) : null;
    }

    if (typeof body.serialNumber === "string") updateFields.serialNumber = body.serialNumber.trim();
    if (typeof body.issueTitle === "string") updateFields.issueTitle = body.issueTitle.trim();
    if (typeof body.issueDescription === "string") updateFields.issueDescription = body.issueDescription.trim();
    if (typeof body.diagnosis === "string") updateFields.diagnosis = body.diagnosis.trim();
    if (typeof body.resolution === "string") updateFields.resolution = body.resolution.trim();
    if (typeof body.partsUsed === "string") updateFields.partsUsed = body.partsUsed.trim();

    // Installation details
    if (body.installationRequired !== undefined) {
      updateFields.installationRequired = Boolean(body.installationRequired);
    }
    if (body.installationDate !== undefined) {
      updateFields.installationDate = body.installationDate ? new Date(body.installationDate) : null;
    }
    if (typeof body.installationTechnician === "string") {
      updateFields.installationTechnician = body.installationTechnician.trim();
    }
    if (typeof body.installationNotes === "string") {
      updateFields.installationNotes = body.installationNotes.trim();
    }
    if (
      typeof body.installationStatus === "string" &&
      ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(body.installationStatus.toUpperCase())
    ) {
      updateFields.installationStatus = body.installationStatus.toUpperCase() as InstallationStatus;
    }

    const updated = await ticketsCol.findOneAndUpdate(
      buildServiceFilter(id),
      { $set: updateFields },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: `Service Ticket ${existingTicket.ticketId} updated successfully.`,
      ticket: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/admin/service/[id]] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
