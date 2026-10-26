"use client";

import { useState, useMemo, useEffect } from "react";
import ItemCard from "@/components/ItemCard";
import { categories as staticCategories, getAllItems, type CatalogItemWithCategory } from "@/lib/data";

interface ProductItem {
  _id?: string;
  productCode: string;
  code?: string;
  name: string;
  slug?: string;
  categoryId: string;
  categoryName: string;
  shortDescription?: string;
  function?: string;
  specifications?: string;
  options?: string;
  application?: string;
  selectionNote?: string;
  note?: string;
  availability?: "In Stock" | "Available on Order" | "Procurement on Request" | string;
  manufacturer?: string;
  accent?: string;
  createdAt?: string | Date;
}

export default function CatalogSearch({
  initialCategory = "all",
}: {
  initialCategory?: string;
}) {
  const [dbProducts, setDbProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevance");

  // Fetch live products from database API with fallback to static items
  useEffect(() => {
    let isCancelled = false;

    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.success && Array.isArray(data.products) && data.products.length > 0) {
            setDbProducts(data.products);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Falling back to static catalog data:", err);
      }

      if (!isCancelled) {
        // Fallback
        const staticItems = getAllItems().map((item: CatalogItemWithCategory, idx: number) => ({
          productCode: item.code,
          code: item.code,
          name: item.name,
          categoryId: item.categorySlug,
          categoryName: item.categoryName,
          shortDescription: item.function,
          function: item.function,
          specifications: item.options,
          options: item.options,
          application: item.application,
          selectionNote: item.note,
          note: item.note,
          availability: idx % 2 === 0 ? "In Stock" : "Available on Order",
          manufacturer: "SSE Biomedical",
          accent: item.categoryAccent,
        }));
        setDbProducts(staticItems);
        setLoading(false);
      }
    }

    loadProducts();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Category accents map
  const categoryAccents = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of staticCategories) {
      map.set(cat.slug, cat.accent);
      map.set(cat.name.toLowerCase(), cat.accent);
    }
    return map;
  }, []);

  // Filter & Sort
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();

    const result = dbProducts.filter((item) => {
      // Category filter
      const matchesCategory =
        selectedCategory === "all" ||
        item.categoryId.toLowerCase() === selectedCategory.toLowerCase() ||
        item.categoryName.toLowerCase() === selectedCategory.toLowerCase();

      if (!matchesCategory) return false;

      // Availability filter
      if (availabilityFilter !== "all" && item.availability !== availabilityFilter) {
        return false;
      }

      // Query filter
      if (!q) return true;

      const code = item.productCode || item.code || "";
      const fn = item.shortDescription || item.function || "";
      const sp = item.specifications || item.options || "";
      const ap = item.application || "";
      const nt = item.selectionNote || item.note || "";
      const mfg = item.manufacturer || "";

      return (
        item.name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q) ||
        fn.toLowerCase().includes(q) ||
        sp.toLowerCase().includes(q) ||
        ap.toLowerCase().includes(q) ||
        nt.toLowerCase().includes(q) ||
        mfg.toLowerCase().includes(q)
      );
    });

    // Sorting
    if (sortBy === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "newest" && result.some((r) => r.createdAt)) {
      result.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return result;
  }, [dbProducts, query, selectedCategory, availabilityFilter, sortBy]);

  function handleReset() {
    setQuery("");
    setSelectedCategory("all");
    setAvailabilityFilter("all");
    setSortBy("relevance");
  }

  return (
    <div id="search" className="scroll-mt-20">
      {/* Search Filter Panel */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 shadow-xs">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F5F9] pb-5">
          <div>
            <span className="text-xs font-semibold text-[#0F9F95] uppercase tracking-wider">
              Search & Filter Directory
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl">
              Equipment Profiles
            </h2>
          </div>
          <div className="text-xs text-[#64748B] font-medium">
            Showing <strong className="text-[#172033] font-bold">{filteredItems.length}</strong> of {dbProducts.length} verified profiles
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          {/* Text Search Input */}
          <div className="relative">
            <label htmlFor="catalog-search-input" className="sr-only">
              Search equipment by name, code, category, or specifications
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#94A3B8]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="catalog-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by equipment, code (e.g. MON-01, Ventilator, X-Ray)..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 pl-10 pr-9 text-xs font-medium text-[#172033] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:bg-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-[#94A3B8] hover:text-[#172033] cursor-pointer"
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <label htmlFor="category-select" className="sr-only">
              Filter by Category
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3 text-xs font-medium text-[#172033] outline-none cursor-pointer focus:border-[#0F9F95] focus:bg-white transition-colors"
            >
              <option value="all">All Departments ({staticCategories.length})</option>
              {staticCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <label htmlFor="availability-select" className="sr-only">
              Filter by Availability
            </label>
            <select
              id="availability-select"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3 text-xs font-medium text-[#172033] outline-none cursor-pointer focus:border-[#0F9F95] focus:bg-white transition-colors"
            >
              <option value="all">All Availability</option>
              <option value="In Stock">In Stock</option>
              <option value="Available on Order">Available on Order</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <label htmlFor="sort-select" className="sr-only">
              Sort Catalog
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 px-3 text-xs font-medium text-[#172033] outline-none cursor-pointer focus:border-[#0F9F95] focus:bg-white transition-colors"
            >
              <option value="relevance">Default Sequence</option>
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="newest">Recently Updated</option>
            </select>
          </div>
        </div>

        {/* Category Pills Quick Select */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#F1F5F9] pt-3.5">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              selectedCategory === "all"
                ? "bg-[#0F9F95] text-white shadow-xs"
                : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#172033]"
            }`}
          >
            All Departments
          </button>
          {staticCategories.map((c) => {
            const isSelected = selectedCategory === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setSelectedCategory(c.slug)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-[#0F9F95] text-white shadow-xs"
                    : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1] hover:text-[#172033]"
                }`}
              >
                {c.name}
              </button>
            );
          })}

          {(query || selectedCategory !== "all" || availabilityFilter !== "all" || sortBy !== "relevance") && (
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto text-xs font-medium text-[#0F9F95] hover:text-[#0B827B] underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Equipment List Results */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-[#E2E8F0] bg-white p-6"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8FAFC] text-[#64748B]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-bold text-[#172033]">No equipment profiles match your criteria</h3>
            <p className="mt-1.5 text-xs text-[#64748B] max-w-sm mx-auto">
              We couldn&apos;t find any biomedical systems matching {query ? `"${query}"` : "your filter selection"}. Try broadening your search or resetting filters.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {filteredItems.map((item) => {
              const code = item.productCode || item.code || "";
              const accent = item.accent || categoryAccents.get(item.categoryId.toLowerCase()) || "#0F9F95";
              return (
                <ItemCard
                  key={code}
                  item={item}
                  accent={accent}
                  categoryName={item.categoryName}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
