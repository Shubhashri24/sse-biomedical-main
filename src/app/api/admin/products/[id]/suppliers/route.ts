import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getSupplierProductsCollection, getProductsCollection } from "@/lib/mongodb";

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
    const productsCol = await getProductsCollection();
    const product = await productsCol.findOne(buildProductIdFilter(id));

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const mappingCol = await getSupplierProductsCollection();
    const suppliers = await mappingCol
      .find({
        $or: [
          { productCode: product.productCode },
          ...(product._id ? [{ productId: product._id }] : []),
        ],
      })
      .toArray();

    return NextResponse.json({
      success: true,
      productCode: product.productCode,
      productName: product.name,
      suppliers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
