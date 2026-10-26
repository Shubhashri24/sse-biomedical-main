import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getSuppliersCollection,
  getSupplierProductsCollection,
  getProductsCollection,
  type SupplierProductMappingDoc,
} from "@/lib/mongodb";

function buildSupplierFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { supplierCode: id }],
    };
  }
  return { supplierCode: id };
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
    const suppliersCol = await getSuppliersCollection();
    const supplier = await suppliersCol.findOne(buildSupplierFilter(id));

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    const mappingCol = await getSupplierProductsCollection();
    const products = await mappingCol
      .find({
        $or: [
          { supplierCode: supplier.supplierCode },
          ...(supplier._id ? [{ supplierId: supplier._id }] : []),
        ],
      })
      .toArray();

    return NextResponse.json({ success: true, supplier, products });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function POST(
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

    const productCode = typeof body.productCode === "string" ? body.productCode.trim().toUpperCase() : "";
    const supplierProductCode = typeof body.supplierProductCode === "string" ? body.supplierProductCode.trim() : "";
    const leadTimeDays = typeof body.leadTimeDays === "number" ? Math.max(0, body.leadTimeDays) : 7;
    const lastPurchasePrice = typeof body.lastPurchasePrice === "number" ? Math.max(0, body.lastPurchasePrice) : 0;
    const minimumOrderQuantity = typeof body.minimumOrderQuantity === "number" ? Math.max(1, body.minimumOrderQuantity) : 1;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!productCode) {
      return NextResponse.json({ success: false, message: "Product code is required." }, { status: 400 });
    }

    const suppliersCol = await getSuppliersCollection();
    const supplier = await suppliersCol.findOne(buildSupplierFilter(id));

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    const productsCol = await getProductsCollection();
    const product = await productsCol.findOne({ productCode });

    if (!product) {
      return NextResponse.json({ success: false, message: `Product ${productCode} not found in catalog.` }, { status: 404 });
    }

    const mappingCol = await getSupplierProductsCollection();
    const now = new Date();

    const mappingDoc: SupplierProductMappingDoc = {
      supplierId: supplier._id!,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.companyName,
      productId: product._id!,
      productCode: product.productCode,
      productName: product.name,
      supplierProductCode: supplierProductCode || product.productCode,
      leadTimeDays,
      lastPurchasePrice,
      minimumOrderQuantity,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    await mappingCol.updateOne(
      {
        supplierCode: supplier.supplierCode,
        productCode: product.productCode,
      },
      {
        $set: mappingDoc,
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: `Product ${product.productCode} linked to supplier ${supplier.companyName}.`,
      mapping: mappingDoc,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
