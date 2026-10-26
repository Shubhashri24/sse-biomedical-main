import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getCategoriesCollection, type CategoryDoc } from "@/lib/mongodb";
import { slugify } from "@/lib/db-seed";

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const collection = await getCategoriesCollection();
    const categories = await collection.find({}).sort({ displayOrder: 1 }).toArray();

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
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
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const accent = typeof body.accent === "string" ? body.accent.trim() : "#35E7C6";
    const displayOrder = typeof body.displayOrder === "number" ? body.displayOrder : 1;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: "Category name and code are required." },
        { status: 400 }
      );
    }

    const collection = await getCategoriesCollection();
    const slug = slugify(name);

    const existing = await collection.findOne({
      $or: [{ slug }, { code }],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Category with code ${code} or name ${name} already exists.` },
        { status: 409 }
      );
    }

    const count = await collection.countDocuments();
    const now = new Date();

    const newCategory: CategoryDoc = {
      name,
      slug,
      code,
      number: String(count + 1).padStart(2, "0"),
      description,
      accent,
      totalCount: 0,
      isActive,
      displayOrder,
      image: `/images/categories/${slug}.svg`,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newCategory);

    return NextResponse.json({
      success: true,
      message: `Category ${name} created successfully.`,
      categoryId: result.insertedId,
      category: newCategory,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/categories] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to create category" },
      { status: 500 }
    );
  }
}
