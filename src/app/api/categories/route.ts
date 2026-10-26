import { NextResponse } from "next/server";
import { getCategoriesCollection } from "@/lib/mongodb";
import { categories as staticCategories } from "@/lib/data";

export async function GET() {
  try {
    try {
      const collection = await getCategoriesCollection();
      const categories = await collection
        .find({ isActive: { $ne: false } })
        .sort({ displayOrder: 1 })
        .toArray();

      if (categories && categories.length > 0) {
        return NextResponse.json({
          success: true,
          source: "database",
          categories,
        });
      }
    } catch (dbErr) {
      console.warn("[GET /api/categories] DB fallback:", dbErr);
    }

    // Static fallback
    return NextResponse.json({
      success: true,
      source: "fallback",
      categories: staticCategories.map((c, i) => ({
        _id: c.slug,
        name: c.name,
        slug: c.slug,
        description: c.tagline,
        code: c.code,
        number: c.number,
        accent: c.accent,
        totalCount: c.items.length,
        isActive: true,
        displayOrder: i + 1,
      })),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
