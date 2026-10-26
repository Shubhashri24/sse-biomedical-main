import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getProductsCollection,
  getInventoryTransactionsCollection,
  generateNextTransactionId,
  type InventoryTransactionType,
  type InventoryTransactionDoc,
  type StockStatus,
} from "@/lib/mongodb";

function buildProductIdFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { productCode: id }],
    };
  }
  return { productCode: id };
}

export async function POST(
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

    const type = body.type as InventoryTransactionType;
    const rawQty = typeof body.quantity === "number" ? body.quantity : parseInt(String(body.quantity), 10);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    const validTypes: InventoryTransactionType[] = [
      "STOCK_IN",
      "STOCK_OUT",
      "ADJUSTMENT",
      "RESERVED",
      "RELEASED",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: `Invalid transaction type. Allowed: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (isNaN(rawQty) || (type !== "ADJUSTMENT" && rawQty <= 0) || (type === "ADJUSTMENT" && rawQty < 0)) {
      return NextResponse.json(
        { success: false, message: "A valid positive quantity is required." },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, message: "A reason or audit justification is required for all stock movements." },
        { status: 400 }
      );
    }

    const productsCol = await getProductsCollection();
    const product = await productsCol.findOne(buildProductIdFilter(productId));

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    const currentStock = product.stockQuantity ?? 0;
    const currentReserved = product.reservedQuantity ?? 0;
    const reorderLevel = product.reorderLevel ?? 5;
    const currentAvailable = Math.max(0, currentStock - currentReserved);

    let newStock = currentStock;
    let newReserved = currentReserved;

    switch (type) {
      case "STOCK_IN":
        newStock = currentStock + rawQty;
        break;

      case "STOCK_OUT":
        if (currentAvailable < rawQty) {
          return NextResponse.json(
            {
              success: false,
              message: `Cannot dispatch ${rawQty} unit(s). Only ${currentAvailable} unit(s) available (Stock: ${currentStock}, Reserved: ${currentReserved}). Stock cannot become negative.`,
            },
            { status: 400 }
          );
        }
        newStock = currentStock - rawQty;
        break;

      case "ADJUSTMENT":
        if (rawQty < currentReserved) {
          return NextResponse.json(
            {
              success: false,
              message: `Target stock (${rawQty}) cannot be lower than currently reserved units (${currentReserved}). Release reserved allocations first.`,
            },
            { status: 400 }
          );
        }
        newStock = rawQty;
        break;

      case "RESERVED":
        if (currentAvailable < rawQty) {
          return NextResponse.json(
            {
              success: false,
              message: `Cannot reserve ${rawQty} unit(s). Only ${currentAvailable} unit(s) available for allocation.`,
            },
            { status: 400 }
          );
        }
        newReserved = currentReserved + rawQty;
        break;

      case "RELEASED":
        if (currentReserved < rawQty) {
          return NextResponse.json(
            {
              success: false,
              message: `Cannot release ${rawQty} unit(s). Only ${currentReserved} unit(s) currently marked as reserved.`,
            },
            { status: 400 }
          );
        }
        newReserved = currentReserved - rawQty;
        break;
    }

    const newAvailable = Math.max(0, newStock - newReserved);
    const newStockStatus: StockStatus =
      newAvailable === 0
        ? "OUT_OF_STOCK"
        : newAvailable <= reorderLevel
        ? "LOW_STOCK"
        : "IN_STOCK";

    const now = new Date();
    const transactionId = await generateNextTransactionId();

    const transactionDoc: InventoryTransactionDoc = {
      transactionId,
      productId: product._id,
      productCode: product.productCode,
      equipmentName: product.name,
      type,
      quantity: rawQty,
      previousStock: currentStock,
      newStock,
      previousReserved: currentReserved,
      newReserved,
      reason,
      createdBy: auth.username || "admin",
      createdAt: now,
    };

    const txCol = await getInventoryTransactionsCollection();
    await txCol.insertOne(transactionDoc);

    const updatedProduct = await productsCol.findOneAndUpdate(
      buildProductIdFilter(productId),
      {
        $set: {
          stockQuantity: newStock,
          reservedQuantity: newReserved,
          availableQuantity: newAvailable,
          stockStatus: newStockStatus,
          lastStockUpdate: now,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: `Stock movement logged (${transactionId}): ${type} ${rawQty} units.`,
      transaction: transactionDoc,
      product: updatedProduct,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/inventory/[productId]/transactions] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
