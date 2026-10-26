import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getServiceTicketsCollection,
  generateNextServiceTicketId,
  type ServiceTicketDoc,
  type ServiceTicketPriority,
  type ServiceTicketStatus,
  type InstallationStatus,
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
    const priority = searchParams.get("priority")?.trim().toUpperCase() || "ALL";
    const productCode = searchParams.get("productCode")?.trim().toUpperCase() || "";
    const serialNumber = searchParams.get("serialNumber")?.trim() || "";
    const installationOnly = searchParams.get("installation") === "true";

    const collection = await getServiceTicketsCollection();
    const filter: Filter<ServiceTicketDoc> = {};

    if (
      status !== "ALL" &&
      ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_PARTS", "RESOLVED", "CLOSED"].includes(status)
    ) {
      filter.status = status as ServiceTicketStatus;
    }

    if (priority !== "ALL" && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) {
      filter.priority = priority as ServiceTicketPriority;
    }

    if (productCode) {
      filter.productCode = productCode;
    }

    if (serialNumber) {
      filter.serialNumber = new RegExp(`^${serialNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    }

    if (installationOnly) {
      filter.installationRequired = true;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { ticketId: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { facility: searchRegex },
        { equipmentName: searchRegex },
        { productCode: searchRegex },
        { serialNumber: searchRegex },
        { issueTitle: searchRegex },
      ];
    }

    const tickets = await collection.find(filter).sort({ createdAt: -1 }).toArray();

    // Calculate aggregated metrics
    const [
      total,
      openCount,
      assignedCount,
      inProgressCount,
      waitingPartsCount,
      resolvedCount,
      closedCount,
      criticalCount,
      pendingInstallCount,
    ] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ status: "OPEN" }),
      collection.countDocuments({ status: "ASSIGNED" }),
      collection.countDocuments({ status: "IN_PROGRESS" }),
      collection.countDocuments({ status: "WAITING_FOR_PARTS" }),
      collection.countDocuments({ status: "RESOLVED" }),
      collection.countDocuments({ status: "CLOSED" }),
      collection.countDocuments({ priority: "CRITICAL", status: { $nin: ["RESOLVED", "CLOSED"] } }),
      collection.countDocuments({
        installationRequired: true,
        installationStatus: { $in: ["PENDING", "SCHEDULED", "IN_PROGRESS"] },
      }),
    ]);

    return NextResponse.json({
      success: true,
      tickets,
      counts: {
        total,
        open: openCount,
        assigned: assignedCount,
        inProgress: inProgressCount,
        waitingForParts: waitingPartsCount,
        resolved: resolvedCount,
        closed: closedCount,
        critical: criticalCount,
        pendingInstallation: pendingInstallCount,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/service] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const facility = typeof body.facility === "string" ? body.facility.trim() : "";

    const productCode = typeof body.productCode === "string" ? body.productCode.trim().toUpperCase() : "";
    const equipmentName = typeof body.equipmentName === "string" ? body.equipmentName.trim() : "";
    const serialNumber = typeof body.serialNumber === "string" ? body.serialNumber.trim() : "SN-PENDING";

    const issueTitle = typeof body.issueTitle === "string" ? body.issueTitle.trim() : "";
    const issueDescription = typeof body.issueDescription === "string" ? body.issueDescription.trim() : "";

    const priority: ServiceTicketPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(body.priority)
      ? body.priority
      : "MEDIUM";

    let status: ServiceTicketStatus = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_PARTS", "RESOLVED", "CLOSED"].includes(body.status)
      ? body.status
      : "OPEN";

    const assignedTechnicianId = typeof body.assignedTechnicianId === "string" ? body.assignedTechnicianId.trim() : undefined;
    const assignedTechnicianName = typeof body.assignedTechnicianName === "string" ? body.assignedTechnicianName.trim() : undefined;

    if (assignedTechnicianId && status === "OPEN") {
      status = "ASSIGNED";
    }

    const scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    const diagnosis = typeof body.diagnosis === "string" ? body.diagnosis.trim() : undefined;
    const resolution = typeof body.resolution === "string" ? body.resolution.trim() : undefined;
    const partsUsed = typeof body.partsUsed === "string" ? body.partsUsed.trim() : undefined;

    // Installation fields
    const installationRequired = Boolean(body.installationRequired);
    const installationDate = body.installationDate ? new Date(body.installationDate) : null;
    const installationTechnician = typeof body.installationTechnician === "string" ? body.installationTechnician.trim() : undefined;
    const installationNotes = typeof body.installationNotes === "string" ? body.installationNotes.trim() : undefined;
    const installationStatus: InstallationStatus = ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(body.installationStatus)
      ? body.installationStatus
      : installationRequired ? "PENDING" : "PENDING";

    if (!customerName || !customerPhone || !productCode || !equipmentName || !issueTitle) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name, phone number, product code, equipment name, and issue summary are required.",
        },
        { status: 400 }
      );
    }

    const collection = await getServiceTicketsCollection();
    const ticketId = await generateNextServiceTicketId();
    const now = new Date();

    const newTicket: ServiceTicketDoc = {
      ticketId,
      customerId: body.customerId || undefined,
      customerName,
      customerEmail,
      customerPhone,
      facility: facility || undefined,
      productId: body.productId || undefined,
      productCode,
      equipmentName,
      serialNumber,
      issueTitle,
      issueDescription,
      priority,
      status,
      assignedTechnicianId,
      assignedTechnicianName,
      scheduledDate,
      completedDate: null,
      diagnosis,
      resolution,
      partsUsed,
      installationRequired,
      installationDate,
      installationTechnician,
      installationNotes,
      installationStatus: installationRequired ? installationStatus : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newTicket);

    return NextResponse.json({
      success: true,
      message: `Service Ticket ${ticketId} created successfully.`,
      ticketId: result.insertedId,
      ticket: newTicket,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/service] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
