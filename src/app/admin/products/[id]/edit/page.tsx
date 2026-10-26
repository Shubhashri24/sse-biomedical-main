"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { categories as staticCategories } from "@/lib/data";

export default function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    productCode: "",
    categoryId: "patient-monitoring",
    categoryName: "Patient Monitoring",
    manufacturer: "SSE Biomedical",
    model: "",
    shortDescription: "",
    description: "",
    specifications: "",
    application: "",
    selectionNote: "",
    availability: "In Stock",
    featured: false,
    isActive: true,
  });

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        if (!res.ok) {
          setErrorMessage("Failed to load product details.");
          return;
        }

        const data = await res.json();
        if (data.success && data.product) {
          const p = data.product;
          setFormData({
            name: p.name || "",
            productCode: p.productCode || "",
            categoryId: p.categoryId || "patient-monitoring",
            categoryName: p.categoryName || "Patient Monitoring",
            manufacturer: p.manufacturer || "SSE Biomedical",
            model: p.model || "",
            shortDescription: p.shortDescription || "",
            description: p.description || "",
            specifications: p.specifications || "",
            application: p.application || "",
            selectionNote: p.selectionNote || "",
            availability: p.availability || "In Stock",
            featured: Boolean(p.featured),
            isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
          });
        } else {
          setErrorMessage(data.message || "Product not found.");
        }
      } catch {
        setErrorMessage("Network error loading product.");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "categoryId") {
      const cat = staticCategories.find((c) => c.slug === value);
      setFormData((prev) => ({
        ...prev,
        categoryId: value,
        categoryName: cat?.name || value,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim() || !formData.productCode.trim()) {
      setErrorMessage("Product name and code are required.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to update product.");
        setSaving(false);
        return;
      }

      setSuccessMessage("Product details saved successfully.");
      setTimeout(() => {
        router.push("/admin/products");
      }, 800);
    } catch {
      setErrorMessage("Network error saving changes.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title={`Edit ${id}`} breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: id }]}>
        <div className="py-16 text-center text-xs text-slate-500">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <span>Loading product configuration...</span>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={`Edit Profile: ${formData.productCode || id}`}
      subtitle="Modify specifications, clinical descriptions, and active status"
      breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: formData.productCode || id }, { label: "Edit" }]}
      actions={
        <Link
          href="/admin/products"
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          Cancel
        </Link>
      }
    >
      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 shadow-2xs">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 shadow-2xs flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Section 1: Identification & Taxonomy */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Equipment Identification & Classification</h3>
              <p className="text-xs text-slate-500 mt-0.5">Primary clinical category, equipment code, and commercial title.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="productCode" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Equipment Code <span className="text-[#0F9F95] font-semibold">*</span>
                </label>
                <input
                  id="productCode"
                  name="productCode"
                  type="text"
                  required
                  value={formData.productCode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 font-mono text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="categoryId" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Clinical Category <span className="text-[#0F9F95] font-semibold">*</span>
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                >
                  {staticCategories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1.5">
                Equipment Name <span className="text-[#0F9F95] font-semibold">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="manufacturer" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Manufacturer
                </label>
                <input
                  id="manufacturer"
                  name="manufacturer"
                  type="text"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Model Series
                </label>
                <input
                  id="model"
                  name="model"
                  type="text"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="availability" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Stock / Availability
                </label>
                <select
                  id="availability"
                  name="availability"
                  value={formData.availability}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none font-medium"
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Available on Order">Available on Order</option>
                  <option value="Procurement on Request">Procurement on Request</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Details & Specifications */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Clinical Functionality & Specifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">Technical specifications and medical application description.</p>
            </div>

            <div>
              <label htmlFor="shortDescription" className="block text-xs font-medium text-slate-700 mb-1.5">
                Clinical Function Summary
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                rows={2}
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder="e.g. Continuously measures and displays arterial blood pressure and waveform..."
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="specifications" className="block text-xs font-medium text-slate-700 mb-1.5">
                Configuration & Technical Specifications
              </label>
              <textarea
                id="specifications"
                name="specifications"
                rows={3}
                value={formData.specifications}
                onChange={handleChange}
                placeholder="e.g. 12.1-inch color touchscreen, 7-parameter standard module with battery backup..."
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="application" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Clinical Application / Department
                </label>
                <input
                  id="application"
                  name="application"
                  type="text"
                  value={formData.application}
                  onChange={handleChange}
                  placeholder="e.g. ICU, Emergency, Cardiac Care"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="selectionNote" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Procurement / Selection Note
                </label>
                <input
                  id="selectionNote"
                  name="selectionNote"
                  type="text"
                  value={formData.selectionNote}
                  onChange={handleChange}
                  placeholder="e.g. Confirm sensor compatibility and power requirements."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Visibility & Publication Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Publish in public equipment catalog</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Showcase on Homepage Highlights</span>
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href="/admin/products"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#0F9F95] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50 shadow-xs"
                >
                  {saving ? "Saving Changes..." : "Save Product Profile"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
