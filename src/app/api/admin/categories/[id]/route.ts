import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getCategoriesCollection, getProductsCollection } from "@/lib/mongodb";
import { slugify } from "@/lib/db-seed";

function buildCategoryIdFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { slug: id }, { code: id }],
    };
  }
  return {
    $or: [{ slug: id }, { code: id }],
  };
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
    const collection = await getCategoriesCollection();
    const category = await collection.findOne(buildCategoryIdFilter(id));

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: errorMsg },
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
    const collection = await getCategoriesCollection();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.name === "string" && body.name.trim()) {
      updateFields.name = body.name.trim();
      updateFields.slug = slugify(body.name.trim());
    }
    if (typeof body.code === "string" && body.code.trim()) {
      updateFields.code = body.code.trim().toUpperCase();
    }
    if (typeof body.description === "string") updateFields.description = body.description.trim();
    if (typeof body.accent === "string") updateFields.accent = body.accent.trim();
    if (typeof body.displayOrder === "number") updateFields.displayOrder = body.displayOrder;
    if (body.isActive !== undefined) updateFields.isActive = Boolean(body.isActive);

    const result = await collection.findOneAndUpdate(
      buildCategoryIdFilter(id),
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully.",
      category: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/admin/categories/[id]] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to update category" },
      { status: 500 }
    );
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
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const categoriesCol = await getCategoriesCollection();
    const category = await categoriesCol.findOne(buildCategoryIdFilter(id));

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // Check if products exist under this category
    const productsCol = await getProductsCollection();
    const assignedProductsCount = await productsCol.countDocuments({
      $or: [{ categoryId: category.slug }, { categoryName: category.name }],
      isActive: { $ne: false },
    });

    if (assignedProductsCount > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete category "${category.name}" because ${assignedProductsCount} active product(s) are assigned to it. Deactivate or reassign them first, or soft-deactivate this category.`,
          assignedProductsCount,
        },
        { status: 400 }
      );
    }

    // Perform soft deactivation
    const result = await categoriesCol.findOneAndUpdate(
      buildCategoryIdFilter(id),
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: `Category "${category.name}" deactivated successfully.`,
      category: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/admin/categories/[id]] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to delete category" },
      { status: 500 }
    );
  }
}
