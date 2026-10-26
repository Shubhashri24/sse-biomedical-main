import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getProductsCollection, type ProductDoc } from "@/lib/mongodb";
import type { Filter } from "mongodb";

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "all";
    const status = searchParams.get("status")?.trim().toUpperCase() || "ALL";

    const collection = await getProductsCollection();

    // Query all active products
    const allProducts = await collection
      .find({ isActive: { $ne: false } })
      .sort({ productCode: 1 })
      .toArray();

    // Compute KPI counters
    let totalStockUnits = 0;
    let reservedUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inStockCount = 0;

    for (const p of allProducts) {
      const stock = typeof p.stockQuantity === "number" ? p.stockQuantity : 0;
      const reserved = typeof p.reservedQuantity === "number" ? p.reservedQuantity : 0;
      const reorder = typeof p.reorderLevel === "number" ? p.reorderLevel : 5;
      const available = Math.max(0, stock - reserved);

      totalStockUnits += stock;
      reservedUnits += reserved;

      if (available === 0) {
        outOfStockCount++;
      } else if (available <= reorder) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    // Filter products for table view
    const filter: Filter<ProductDoc> = {
      isActive: { $ne: false },
    };

    if (category && category !== "all") {
      filter.$or = [
        { categoryId: category },
        { categoryName: new RegExp(`^${category}$`, "i") },
      ];
    }

    if (status !== "ALL") {
      if (status === "OUT_OF_STOCK") {
        filter.availableQuantity = 0;
      } else if (status === "LOW_STOCK") {
        filter.$expr = {
          $and: [
            { $gt: ["$availableQuantity", 0] },
            { $lte: ["$availableQuantity", "$reorderLevel"] },
          ],
        };
      } else if (status === "IN_STOCK") {
        filter.$expr = {
          $gt: ["$availableQuantity", "$reorderLevel"],
        };
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: searchRegex },
        { productCode: searchRegex },
        { categoryName: searchRegex },
        { manufacturer: searchRegex },
        { model: searchRegex },
      ];
    }

    const filteredProducts = await collection
      .find(filter)
      .sort({ productCode: 1 })
      .toArray();

    const summary = {
      totalProducts: allProducts.length,
      totalStockUnits,
      reservedStockUnits: reservedUnits,
      availableUnits: Math.max(0, totalStockUnits - reservedUnits),
      lowStockCount,
      outOfStockCount,
      inStockCount,
    };

    return NextResponse.json({
      success: true,
      products: filteredProducts,
      kpis: summary,
      summary,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/inventory] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to fetch inventory records" },
      { status: 500 }
    );
  }
}
