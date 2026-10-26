import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getProductsCollection } from "@/lib/mongodb";
import { getAllItems } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    try {
      const collection = await getProductsCollection();

      let filter: Record<string, unknown> = {
        $or: [
          { productCode: new RegExp(`^${cleanId}$`, "i") },
          { slug: cleanId },
        ],
      };

      if (ObjectId.isValid(cleanId)) {
        filter = {
          $or: [
            { _id: new ObjectId(cleanId) },
            { productCode: new RegExp(`^${cleanId}$`, "i") },
            { slug: cleanId },
          ],
        };
      }

      const product = await collection.findOne(filter);
      if (!product) {
        return NextResponse.json(
          { success: false, message: "Product not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, product });
    } catch {
      // Fallback
      const all = getAllItems();
      const match = all.find(
        (i) =>
          i.code.toLowerCase() === cleanId.toLowerCase() ||
          i.name.toLowerCase().replace(/[\s_-]+/g, "-") === cleanId.toLowerCase()
      );

      if (!match) {
        return NextResponse.json(
          { success: false, message: "Product not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        product: {
          productCode: match.code,
          name: match.name,
          slug: match.name.toLowerCase().replace(/[\s_-]+/g, "-"),
          categoryId: match.categorySlug,
          categoryName: match.categoryName,
          shortDescription: match.function,
          specifications: match.options,
          availability: "In Stock",
          isActive: true,
        },
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
