import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getInventoryTransactionsCollection, getProductsCollection } from "@/lib/mongodb";

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
    const productsCol = await getProductsCollection();
    const product = await productsCol.findOne(buildProductIdFilter(productId));

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const txCol = await getInventoryTransactionsCollection();
    const transactions = await txCol
      .find({
        $or: [
          { productCode: product.productCode },
          ...(product._id ? [{ productId: product._id }] : []),
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      productCode: product.productCode,
      equipmentName: product.name,
      transactions,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
