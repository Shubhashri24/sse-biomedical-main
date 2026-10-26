import { getProductsCollection, getCategoriesCollection, type ProductDoc, type CategoryDoc } from "./mongodb";
import { categories as staticCategories } from "./data";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Idempotently seeds categories and products from the real 36 items and 9 categories in data.ts.
 * Checks for existing records by `slug` or `productCode` so no duplicates are ever created.
 */
export async function seedDatabaseIfEmpty(): Promise<{
  categoriesUpserted: number;
  productsUpserted: number;
}> {
  const categoriesCol = await getCategoriesCollection();
  const productsCol = await getProductsCollection();

  let categoriesUpserted = 0;
  let productsUpserted = 0;
  const now = new Date();

  // 1. Seed 9 Categories
  for (let i = 0; i < staticCategories.length; i++) {
    const cat = staticCategories[i];
    const categoryDoc: Partial<CategoryDoc> = {
      name: cat.name,
      slug: cat.slug,
      description: cat.tagline,
      code: cat.code,
      number: cat.number,
      accent: cat.accent,
      totalCount: cat.items.length,
      isActive: true,
      displayOrder: i + 1,
      image: `/images/categories/${cat.slug}.svg`,
      updatedAt: now,
    };

    const result = await categoriesCol.updateOne(
      { slug: cat.slug },
      {
        $set: categoryDoc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0 || result.modifiedCount > 0) {
      categoriesUpserted++;
    }
  }

  // 2. Seed 36 Products
  for (const cat of staticCategories) {
    for (let j = 0; j < cat.items.length; j++) {
      const item = cat.items[j];
      const productSlug = slugify(item.name);

      const productDoc: Partial<ProductDoc> = {
        productCode: item.code,
        name: item.name,
        slug: productSlug,
        categoryId: cat.slug,
        categoryName: cat.name,
        shortDescription: item.function,
        description: `${item.function} Designed for reliable clinical deployment in ${item.application.toLowerCase()}`,
        specifications: item.options,
        manufacturer: "SSE Biomedical",
        model: item.code,
        availability: j === 0 || j === 2 ? "In Stock" : "Available on Order",
        image: `/images/products/${item.code.toLowerCase()}.svg`,
        featured: j === 0, // Mark first item in each category as featured
        isActive: true,
        application: item.application,
        selectionNote: item.note,
        updatedAt: now,
      };

      const result = await productsCol.updateOne(
        { productCode: item.code },
        {
          $set: productDoc,
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0 || result.modifiedCount > 0) {
        productsUpserted++;
      }
    }
  }

  return { categoriesUpserted, productsUpserted };
}
