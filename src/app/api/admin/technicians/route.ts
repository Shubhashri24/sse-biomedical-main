import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getTechniciansCollection,
  generateNextTechnicianId,
  type TechnicianDoc,
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
    const status = searchParams.get("status")?.trim() || "all";
    const availability = searchParams.get("availability")?.trim().toUpperCase() || "ALL";

    const collection = await getTechniciansCollection();
    const filter: Filter<TechnicianDoc> = {};

    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;

    if (availability !== "ALL" && ["AVAILABLE", "ON_CALL", "ON_LEAVE", "BUSY"].includes(availability)) {
      filter.availability = availability as TechnicianDoc["availability"];
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { technicianId: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { specialization: searchRegex },
      ];
    }

    const technicians = await collection.find(filter).sort({ technicianId: 1 }).toArray();

    const [total, activeCount, availableCount] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ isActive: true }),
      collection.countDocuments({ isActive: true, availability: "AVAILABLE" }),
    ]);

    return NextResponse.json({
      success: true,
      technicians,
      counts: {
        total,
        active: activeCount,
        available: availableCount,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/technicians] Error:", errorMsg);
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

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const specialization = typeof body.specialization === "string" ? body.specialization.trim() : "";
    const availability = ["AVAILABLE", "ON_CALL", "ON_LEAVE", "BUSY"].includes(body.availability)
      ? body.availability
      : "AVAILABLE";
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name || !email || !phone || !specialization) {
      return NextResponse.json(
        { success: false, message: "Technician name, email, phone, and clinical specialization are required." },
        { status: 400 }
      );
    }

    const collection = await getTechniciansCollection();
    const technicianId = await generateNextTechnicianId();
    const now = new Date();

    const newTechnician: TechnicianDoc = {
      technicianId,
      name,
      email,
      phone,
      specialization,
      availability,
      isActive,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newTechnician);

    return NextResponse.json({
      success: true,
      message: `Technician ${name} registered with ID ${technicianId}.`,
      technicianId: result.insertedId,
      technician: newTechnician,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/technicians] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
