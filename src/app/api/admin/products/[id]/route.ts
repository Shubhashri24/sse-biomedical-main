import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getProductsCollection } from "@/lib/mongodb";
import { slugify } from "@/lib/db-seed";

function buildProductIdFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { productCode: id }],
    };
  }
  return { productCode: id };
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
    const collection = await getProductsCollection();
    const product = await collection.findOne(buildProductIdFilter(id));

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product });
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
    const collection = await getProductsCollection();

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof body.name === "string" && body.name.trim()) {
      updateFields.name = body.name.trim();
      updateFields.slug = slugify(body.name.trim());
    }
    if (typeof body.productCode === "string" && body.productCode.trim()) {
      updateFields.productCode = body.productCode.trim().toUpperCase();
    }
    if (typeof body.categoryId === "string") updateFields.categoryId = body.categoryId.trim();
    if (typeof body.categoryName === "string") updateFields.categoryName = body.categoryName.trim();
    if (typeof body.manufacturer === "string") updateFields.manufacturer = body.manufacturer.trim();
    if (typeof body.model === "string") updateFields.model = body.model.trim();
    if (typeof body.shortDescription === "string") updateFields.shortDescription = body.shortDescription.trim();
    if (typeof body.description === "string") updateFields.description = body.description.trim();
    if (typeof body.specifications === "string") updateFields.specifications = body.specifications.trim();
    if (typeof body.availability === "string") updateFields.availability = body.availability;
    if (typeof body.image === "string") updateFields.image = body.image.trim();
    if (typeof body.application === "string") updateFields.application = body.application.trim();
    if (typeof body.selectionNote === "string") updateFields.selectionNote = body.selectionNote.trim();
    if (body.featured !== undefined) updateFields.featured = Boolean(body.featured);
    if (body.isActive !== undefined) updateFields.isActive = Boolean(body.isActive);

    const result = await collection.findOneAndUpdate(
      buildProductIdFilter(id),
      { $set: updateFields },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product updated successfully.",
      product: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/admin/products/[id]] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to update product" },
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
    const permanent = searchParams.get("permanent") === "true";
    const collection = await getProductsCollection();

    if (permanent) {
      const result = await collection.deleteOne(buildProductIdFilter(id));
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, message: "Product not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Product permanently removed.",
      });
    }

    // Default: Soft delete / deactivate
    const result = await collection.findOneAndUpdate(
      buildProductIdFilter(id),
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product deactivated successfully.",
      product: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/admin/products/[id]] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to delete product" },
      { status: 500 }
    );
  }
}
