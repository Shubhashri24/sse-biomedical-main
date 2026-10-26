"use client";

import React, { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import type { CategoryDoc } from "@/lib/mongodb";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  // Edit / Add Modal state
  const [editingCategory, setEditingCategory] = useState<CategoryDoc | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAccent, setFormAccent] = useState("#0F9F95");
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCategories(data.categories || []);
        }
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleStartAdd() {
    setIsAdding(true);
    setEditingCategory(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormAccent("#0F9F95");
    setFormOrder(categories.length + 1);
    setFormError("");
  }

  function handleStartEdit(cat: CategoryDoc) {
    setIsAdding(false);
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code);
    setFormDescription(cat.description || "");
    setFormAccent(cat.accent || "#0F9F95");
    setFormOrder(cat.displayOrder || 1);
    setFormError("");
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      setFormError("Category name and department code are required.");
      return;
    }

    setFormSaving(true);
    setFormError("");

    try {
      if (isAdding) {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            code: formCode.trim().toUpperCase(),
            description: formDescription.trim(),
            accent: formAccent.trim(),
            displayOrder: formOrder,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.message || "Failed to create category.");
          setFormSaving(false);
          return;
        }

        setNotice(`Category "${formName}" created successfully.`);
      } else if (editingCategory) {
        const res = await fetch(`/api/admin/categories/${editingCategory.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            code: formCode.trim().toUpperCase(),
            description: formDescription.trim(),
            accent: formAccent.trim(),
            displayOrder: formOrder,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setFormError(data.message || "Failed to update category.");
          setFormSaving(false);
          return;
        }

        setNotice(`Category "${formName}" updated successfully.`);
      }

      setIsAdding(false);
      setEditingCategory(null);
      await loadCategories();
      setTimeout(() => setNotice(""), 4000);
    } catch {
      setFormError("Network error saving category.");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleToggleActive(cat: CategoryDoc) {
    const newStatus = !cat.isActive;
    const msg = newStatus
      ? `Re-activate category "${cat.name}"?`
      : `Deactivate category "${cat.name}"?`;

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/admin/categories/${cat.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Category "${cat.name}" is now ${newStatus ? "Active" : "Inactive"}.`);
        setCategories((prev) =>
          prev.map((c) => (c.slug === cat.slug ? { ...c, isActive: newStatus } : c))
        );
        setTimeout(() => setNotice(""), 4000);
      } else {
        alert(data.message || "Failed to update status.");
      }
    } catch {
      alert("Network error updating status.");
    }
  }

  async function handleDeleteCategory(cat: CategoryDoc) {
    if (!confirm(`Are you sure you want to deactivate or remove category "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${cat.slug}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(data.message);
        await loadCategories();
        setTimeout(() => setNotice(""), 4000);
      } else {
        alert(data.message || "Cannot delete category.");
      }
    } catch {
      alert("Network error deleting category.");
    }
  }

  return (
    <AdminShell
      title="Clinical Categories & Medical Departments"
      subtitle="Organize biomedical equipment by medical department, taxonomy code, and display order"
      breadcrumbs={[{ label: "Categories" }]}
      actions={
        <button
          type="button"
          onClick={handleStartAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      }
    >
      <div className="space-y-6">
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 shadow-xs flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {notice}
          </div>
        )}

        {/* Modal / Inline Editor for Add or Edit */}
        {(isAdding || editingCategory) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-[#0F9F95] uppercase tracking-wider">
                  {isAdding ? "Register Clinical Category" : `Edit Category: ${editingCategory?.name}`}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {isAdding ? "New Medical Department Classification" : editingCategory?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingCategory(null);
                }}
                className="rounded-lg p-1.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="cat-code" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Department Code <span className="text-[#0F9F95] font-semibold">*</span>
                  </label>
                  <input
                    id="cat-code"
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. CARD or ONCO"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cat-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Category Name <span className="text-[#0F9F95] font-semibold">*</span>
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Cardiology & Diagnostics"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="cat-order" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Display Order
                  </label>
                  <input
                    id="cat-order"
                    type="number"
                    min="1"
                    value={formOrder}
                    onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <label htmlFor="cat-desc" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Scope / Tagline Description
                  </label>
                  <input
                    id="cat-desc"
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. ICU, wards, emergency, OT, recovery, and diagnostics."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cat-accent" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cat-accent"
                      type="color"
                      value={formAccent}
                      onChange={(e) => setFormAccent(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                    />
                    <span className="font-mono text-xs text-slate-600">{formAccent}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingCategory(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="rounded-lg bg-[#0F9F95] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors disabled:opacity-50 shadow-xs"
                >
                  {formSaving ? "Saving..." : isAdding ? "Create Category" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  <span>Loading categories...</span>
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">No Categories Found</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    No medical department categories registered in the database.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors"
                  >
                    + Add Category
                  </button>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Order</th>
                    <th className="py-3 px-3.5">Code</th>
                    <th className="py-3 px-3.5">Department / Name</th>
                    <th className="py-3 px-3.5">Clinical Scope</th>
                    <th className="py-3 px-3.5">Accent</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((c) => (
                    <tr key={c.slug} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-xs text-slate-500 font-semibold">
                        #{c.displayOrder}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-xs font-bold text-[#0B827B]">
                        {c.code}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.slug}</div>
                      </td>
                      <td className="py-3 px-3.5 max-w-sm truncate text-slate-600">
                        {c.description}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                          <span
                            className="h-3.5 w-3.5 rounded-xs border border-black/10 shadow-2xs"
                            style={{ background: c.accent || "#0F9F95" }}
                          />
                          <span>{c.accent || "#0F9F95"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        {c.isActive ? (
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
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs ${
                              c.isActive
                                ? "border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {c.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-400 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-2xs"
                            title="Safe delete verification"
                          >
                            Delete
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
