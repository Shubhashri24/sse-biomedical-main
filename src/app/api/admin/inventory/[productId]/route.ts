import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getProductsCollection } from "@/lib/mongodb";

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
  { params }: { params: Promise<{ productId: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId } = await params;
    const collection = await getProductsCollection();
    const product = await collection.findOne(buildProductIdFilter(productId));

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId } = await params;
    const body = await request.json();
    const collection = await getProductsCollection();

    const product = await collection.findOne(buildProductIdFilter(productId));
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const reorderLevel =
      typeof body.reorderLevel === "number"
        ? Math.max(0, body.reorderLevel)
        : product.reorderLevel ?? 5;

    const stock = product.stockQuantity ?? 0;
    const reserved = product.reservedQuantity ?? 0;
    const available = Math.max(0, stock - reserved);
    const stockStatus =
      available === 0 ? "OUT_OF_STOCK" : available <= reorderLevel ? "LOW_STOCK" : "IN_STOCK";

    const now = new Date();
    const updated = await collection.findOneAndUpdate(
      buildProductIdFilter(productId),
      {
        $set: {
          reorderLevel,
          stockStatus,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: "Inventory reorder level updated successfully",
      product: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
