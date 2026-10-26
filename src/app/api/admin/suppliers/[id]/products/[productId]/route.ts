import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getSupplierProductsCollection, getSuppliersCollection } from "@/lib/mongodb";

function buildSupplierFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { supplierCode: id }],
    };
  }
  return { supplierCode: id };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, productId } = await params;
    const suppliersCol = await getSuppliersCollection();
    const supplier = await suppliersCol.findOne(buildSupplierFilter(id));

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    const mappingCol = await getSupplierProductsCollection();

    let productFilter: Record<string, unknown> = { productCode: productId };
    if (ObjectId.isValid(productId)) {
      productFilter = {
        $or: [{ productCode: productId }, { productId: new ObjectId(productId) }],
      };
    }

    const result = await mappingCol.deleteOne({
      $and: [
        {
          $or: [
            { supplierCode: supplier.supplierCode },
            ...(supplier._id ? [{ supplierId: supplier._id }] : []),
          ],
        },
        productFilter,
      ],
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Mapping not found between supplier and product" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product unlinked from supplier successfully",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
