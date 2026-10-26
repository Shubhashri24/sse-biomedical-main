import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getProductsCollection, type ProductDoc } from "@/lib/mongodb";
import { slugify } from "@/lib/db-seed";
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
    const status = searchParams.get("status")?.trim() || "all"; // active, inactive, all

    const collection = await getProductsCollection();
    const filter: Filter<ProductDoc> = {};

    if (category && category !== "all") {
      filter.categoryId = category;
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
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

    const products = await collection.find(filter).sort({ productCode: 1 }).toArray();

    // Summary counts
    const [total, activeCount, inactiveCount] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ isActive: true }),
      collection.countDocuments({ isActive: false }),
    ]);

    return NextResponse.json({
      success: true,
      products,
      counts: {
        total,
        active: activeCount,
        inactive: inactiveCount,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/products] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
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
    const productCode = typeof body.productCode === "string" ? body.productCode.trim().toUpperCase() : "";
    const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const categoryName = typeof body.categoryName === "string" ? body.categoryName.trim() : "";
    const manufacturer = typeof body.manufacturer === "string" ? body.manufacturer.trim() : "SSE Biomedical";
    const model = typeof body.model === "string" ? body.model.trim() : productCode;
    const shortDescription = typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : shortDescription;
    const specifications = typeof body.specifications === "string" ? body.specifications.trim() : "";
    const availability = ["In Stock", "Available on Order", "Procurement on Request"].includes(body.availability)
      ? body.availability
      : "In Stock";
    const image = typeof body.image === "string" ? body.image.trim() : `/images/products/${productCode.toLowerCase()}.svg`;
    const featured = Boolean(body.featured);
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const application = typeof body.application === "string" ? body.application.trim() : "";
    const selectionNote = typeof body.selectionNote === "string" ? body.selectionNote.trim() : "";

    if (!name || !productCode || !categoryId) {
      return NextResponse.json(
        { success: false, message: "Product name, code, and category are required." },
        { status: 400 }
      );
    }

    const collection = await getProductsCollection();

    // Check code duplication
    const existing = await collection.findOne({ productCode });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Product code ${productCode} is already in use.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const productSlug = slugify(name);

    const newProduct: ProductDoc = {
      productCode,
      name,
      slug: productSlug,
      categoryId,
      categoryName: categoryName || categoryId,
      shortDescription,
      description,
      specifications,
      manufacturer,
      model,
      availability,
      image,
      featured,
      isActive,
      application,
      selectionNote,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newProduct);

    return NextResponse.json({
      success: true,
      message: `Product ${productCode} created successfully.`,
      productId: result.insertedId,
      product: newProduct,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/products] Error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to create product" },
      { status: 500 }
    );
  }
}
