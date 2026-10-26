"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import type { ProductDoc } from "@/lib/mongodb";
import { categories as staticCategories } from "@/lib/data";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/products?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setProducts(data.products || []);
            if (data.counts) setCounts(data.counts);
          }
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [search, categoryFilter, statusFilter]);

  async function handleToggleActive(product: ProductDoc) {
    const newStatus = !product.isActive;
    const confirmMsg = newStatus
      ? `Re-activate product ${product.productCode} (${product.name})?`
      : `Deactivate product ${product.productCode} (${product.name})? It will be hidden from the public catalog.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/products/${product.productCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionNotice(`Product ${product.productCode} is now ${newStatus ? "Active" : "Inactive"}.`);
        setProducts((prev) =>
          prev.map((p) =>
            p.productCode === product.productCode ? { ...p, isActive: newStatus } : p
          )
        );
        setTimeout(() => setActionNotice(""), 4000);
      } else {
        alert(data.message || "Failed to update product status.");
      }
    } catch {
      alert("Network error updating product status.");
    }
  }

  return (
    <AdminShell
      title="Biomedical Equipment Inventory & Master Catalog"
      subtitle="Manage product specifications, active statuses, and catalog listings"
      breadcrumbs={[{ label: "Products" }]}
      actions={
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Link>
      }
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">
              Total Database Profiles
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900">
              {counts.total}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Master biomedical catalog</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
            <div className="text-xs font-semibold text-emerald-800">
              Active in Catalog
            </div>
            <div className="mt-1.5 text-2xl font-bold text-emerald-700">
              {counts.active}
            </div>
            <div className="mt-1 text-[11px] text-emerald-700/80">Visible to customer quote requests</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="text-xs font-medium text-slate-500">
              Deactivated
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-400">
              {counts.inactive}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Archived or hidden equipment</div>
          </div>
        </div>

        {actionNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 shadow-xs flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {actionNotice}
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-slate-50/60">
            <div className="text-xs text-slate-600">
              Showing <strong className="text-slate-900 font-bold">{products.length}</strong> items
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code, name, model..."
                  className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value="all">All Departments</option>
                {staticCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              {(search || categoryFilter !== "all" || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline px-1 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  <span>Loading equipment catalog...</span>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">No Equipment Profiles Found</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No items match the selected filters. Clear the search or add a new equipment profile.
                  </p>
                  <Link
                    href="/admin/products/new"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors"
                  >
                    + Add Product
                  </Link>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Product</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5">Manufacturer</th>
                    <th className="py-3 px-3.5">Availability</th>
                    <th className="py-3 px-3.5">Catalog Status</th>
                    <th className="py-3 px-3.5">Updated</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.productCode} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 max-w-sm">
                        <div className="font-semibold text-slate-900 text-xs">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-semibold text-[#0B827B]">{p.productCode}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-xs">{p.shortDescription}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-700 font-medium">
                        {p.categoryName}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-500">
                        {p.manufacturer || "SSE Biomedical"}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                            p.availability === "In Stock"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-teal-50 text-teal-800 border-teal-200"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${p.availability === "In Stock" ? "bg-emerald-500" : "bg-[#0F9F95]"}`} />
                          {p.availability}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {p.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(p.updatedAt || p.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/products/${p.productCode}/edit`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs ${
                              p.isActive
                                ? "border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {p.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
