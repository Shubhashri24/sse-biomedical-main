import { NextResponse } from "next/server";
import { getProductsCollection, type ProductDoc } from "@/lib/mongodb";
import { getAllItems, categories } from "@/lib/data";
import type { Filter, Sort } from "mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "all";
    const availability = searchParams.get("availability")?.trim() || "all";
    const sort = searchParams.get("sort")?.trim() || "relevance";
    const featured = searchParams.get("featured");

    try {
      const collection = await getProductsCollection();

      const filter: Filter<ProductDoc> = {
        isActive: { $ne: false },
      };

      if (category && category !== "all") {
        filter.$or = [
          { categoryId: category },
          { categoryName: new RegExp(`^${category}$`, "i") },
        ];
      }

      if (availability && availability !== "all") {
        filter.availability = availability as ProductDoc["availability"];
      }

      if (featured === "true") {
        filter.featured = true;
      }

      if (search) {
        const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [
          { name: searchRegex },
          { productCode: searchRegex },
          { categoryName: searchRegex },
          { manufacturer: searchRegex },
          { model: searchRegex },
          { shortDescription: searchRegex },
          { description: searchRegex },
          { specifications: searchRegex },
        ];
      }

      let sortOption: Sort = { productCode: 1 };
      if (sort === "name-asc") {
        sortOption = { name: 1 };
      } else if (sort === "name-desc") {
        sortOption = { name: -1 };
      } else if (sort === "newest") {
        sortOption = { createdAt: -1 };
      } else if (sort === "relevance" && !search) {
        sortOption = { productCode: 1 };
      }

      const products = await collection.find(filter).sort(sortOption).toArray();

      return NextResponse.json({
        success: true,
        source: "database",
        count: products.length,
        products,
      });
    } catch (dbErr) {
      console.warn("[GET /api/products] DB access fallback to static data:", dbErr);

      // Graceful fallback to static data
      let items = getAllItems().map((item, idx) => {
        const cat = categories.find((c) => c.slug === item.categorySlug);
        return {
          _id: item.code,
          productCode: item.code,
          name: item.name,
          slug: item.name.toLowerCase().replace(/[\s_-]+/g, "-"),
          categoryId: item.categorySlug,
          categoryName: item.categoryName,
          shortDescription: item.function,
          description: item.function,
          specifications: item.options,
          manufacturer: "SSE Biomedical",
          model: item.code,
          availability: idx % 2 === 0 ? ("In Stock" as const) : ("Available on Order" as const),
          image: `/images/products/${item.code.toLowerCase()}.svg`,
          featured: idx % 4 === 0,
          isActive: true,
          application: item.application,
          selectionNote: item.note,
          accent: cat?.accent || "#35E7C6",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      if (category && category !== "all") {
        items = items.filter(
          (i) =>
            i.categoryId.toLowerCase() === category.toLowerCase() ||
            i.categoryName.toLowerCase() === category.toLowerCase()
        );
      }

      if (availability && availability !== "all") {
        items = items.filter((i) => i.availability === availability);
      }

      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.productCode.toLowerCase().includes(q) ||
            i.categoryName.toLowerCase().includes(q) ||
            i.shortDescription.toLowerCase().includes(q) ||
            i.specifications.toLowerCase().includes(q)
        );
      }

      if (sort === "name-asc") {
        items.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === "name-desc") {
        items.sort((a, b) => b.name.localeCompare(a.name));
      }

      return NextResponse.json({
        success: true,
        source: "fallback",
        count: items.length,
        products: items,
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
