"use client";

import React, { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import InvoiceSettingsModal from "@/components/admin/InvoiceSettingsModal";
import SupplierRegistrationModal from "@/components/admin/SupplierRegistrationModal";
import SupplierDetailModal from "@/components/admin/SupplierDetailModal";
import type {
  SupplierDoc,
  SupplierProductMappingDoc,
  ProductDoc,
  CompanyQuotationSettings,
} from "@/lib/mongodb";

const SUPPLIER_TYPES = [
  "Manufacturer",
  "Authorized Distributor",
  "Dealer",
  "Importer",
  "Service Provider",
  "Other",
];

const PRODUCT_CATEGORIES = [
  "Diagnostic Equipment",
  "Imaging Equipment",
  "Patient Monitoring",
  "ICU / Critical Care Equipment",
  "Laboratory Equipment",
  "Surgical Equipment",
  "Hospital Furniture",
  "Medical Consumables",
  "Biomedical Spare Parts",
  "Installation & Commissioning",
  "Repair & Maintenance",
  "Calibration Services",
  "Other",
];

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    pending: 0,
  });
  const [companySettings, setCompanySettings] = useState<CompanyQuotationSettings | null>(null);
  const [isBankSettingsOpen, setIsBankSettingsOpen] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierTypeFilter, setSupplierTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Create / Edit modal state
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDoc | null>(null);

  // Detail View modal state
  const [viewingSupplier, setViewingSupplier] = useState<SupplierDoc | null>(null);

  // Supplier Products Mapping Modal / Drawer
  const [mappingSupplier, setMappingSupplier] = useState<SupplierDoc | null>(null);
  const [suppliedProducts, setSuppliedProducts] = useState<SupplierProductMappingDoc[]>([]);
  const [loadingMapping, setLoadingMapping] = useState(false);

  // Available products dropdown for mapping
  const [allProducts, setAllProducts] = useState<ProductDoc[]>([]);
  const [mapFormData, setMapFormData] = useState({
    productCode: "",
    supplierProductCode: "",
    leadTimeDays: "7",
    lastPurchasePrice: "",
    minimumOrderQuantity: "1",
    notes: "",
  });
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingError, setMappingError] = useState("");

  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Fetch suppliers with backend filtering
  useEffect(() => {
    let cancelled = false;

    async function fetchSuppliers() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (supplierTypeFilter !== "all") params.set("supplierType", supplierTypeFilter);
        if (categoryFilter !== "all") params.set("category", categoryFilter);

        const res = await fetch(`/api/admin/suppliers?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setSuppliers(data.suppliers || []);
            if (data.counts) setCounts(data.counts);
          }
        }
      } catch (err) {
        console.error("Failed to load suppliers:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSuppliers();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter, supplierTypeFilter, categoryFilter, reloadTrigger]);

  // Load all products once for mapping dropdown
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/admin/products");
        if (res.ok) {
          const data = await res.json();
          if (data.success) setAllProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    }
    fetchProducts();
  }, []);

  // Fetch company quotation settings for company bank details button
  useEffect(() => {
    async function fetchCompanySettings() {
      try {
        const res = await fetch("/api/admin/settings/company");
        if (res.ok) {
          const data = await res.json();
          if (data.success) setCompanySettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to load company settings:", err);
      }
    }
    fetchCompanySettings();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(null);
    setIsRegistrationModalOpen(true);
  };

  const openEditModal = (sup: SupplierDoc) => {
    setEditingSupplier(sup);
    setIsRegistrationModalOpen(true);
  };

  const openViewModal = (sup: SupplierDoc) => {
    setViewingSupplier(sup);
  };

  const handleToggleActive = async (sup: SupplierDoc) => {
    try {
      const nextActive = !sup.isActive;
      const res = await fetch(`/api/admin/suppliers/${sup.supplierCode || sup._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: nextActive,
          supplierStatus: nextActive ? "Active" : "Inactive",
        }),
      });
      if (res.ok) {
        showToast(
          `Supplier ${sup.companyName} is now ${nextActive ? "Active" : "Inactive"}.`
        );
        setReloadTrigger((v) => v + 1);
        if (viewingSupplier && (viewingSupplier._id === sup._id || viewingSupplier.supplierCode === sup.supplierCode)) {
          setViewingSupplier({
            ...viewingSupplier,
            isActive: nextActive,
            supplierStatus: nextActive ? "Active" : "Inactive",
          });
        }
      }
    } catch {
      alert("Network error updating supplier status.");
    }
  };

  // Open Mapping Modal
  const openMappingModal = async (sup: SupplierDoc) => {
    setMappingSupplier(sup);
    setLoadingMapping(true);
    setMappingError("");
    setMapFormData({
      productCode: "",
      supplierProductCode: "",
      leadTimeDays: "7",
      lastPurchasePrice: "",
      minimumOrderQuantity: "1",
      notes: "",
    });

    try {
      const res = await fetch(`/api/admin/suppliers/${sup.supplierCode}/products`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSuppliedProducts(data.products || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch supplier products:", err);
    } finally {
      setLoadingMapping(false);
    }
  };

  const handleAddProductMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingSupplier) return;

    if (!mapFormData.productCode) {
      setMappingError("Please select a biomedical equipment model to link.");
      return;
    }

    setSavingMapping(true);
    setMappingError("");

    try {
      const res = await fetch(`/api/admin/suppliers/${mappingSupplier.supplierCode}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: mapFormData.productCode,
          supplierProductCode: mapFormData.supplierProductCode,
          leadTimeDays: parseInt(mapFormData.leadTimeDays, 10) || 7,
          lastPurchasePrice: parseFloat(mapFormData.lastPurchasePrice) || undefined,
          minimumOrderQuantity: parseInt(mapFormData.minimumOrderQuantity, 10) || 1,
          notes: mapFormData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMappingError(data.message || "Failed to link product to supplier.");
        setSavingMapping(false);
        return;
      }

      showToast(`Equipment linked to ${mappingSupplier.companyName}.`);
      setMapFormData({
        productCode: "",
        supplierProductCode: "",
        leadTimeDays: "7",
        lastPurchasePrice: "",
        minimumOrderQuantity: "1",
        notes: "",
      });

      // Reload mapping list
      const refreshRes = await fetch(`/api/admin/suppliers/${mappingSupplier.supplierCode}/products`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success) setSuppliedProducts(refreshData.products || []);
      }
    } catch {
      setMappingError("Network error creating supplier-product link.");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleRemoveProductMapping = async (productCode: string) => {
    if (!mappingSupplier) return;
    if (!confirm(`Unlink equipment ${productCode} from ${mappingSupplier.companyName}?`)) return;

    try {
      const res = await fetch(`/api/admin/suppliers/${mappingSupplier.supplierCode}/products/${productCode}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuppliedProducts((prev) => prev.filter((p) => p.productCode !== productCode));
        showToast(`Unlinked ${productCode} from supplier.`);
      }
    } catch {
      alert("Failed to remove supplier product mapping.");
    }
  };

  const getStatusBadge = (sup: SupplierDoc) => {
    const status = sup.supplierStatus || (sup.isActive ? "Active" : "Inactive");
    if (status === "Active") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          Active
        </span>
      );
    }
    if (status === "Suspended") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          Suspended
        </span>
      );
    }
    if (status === "Pending Approval") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          Pending Approval
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
        Inactive
      </span>
    );
  };

  return (
    <AdminShell
      title="OEM & Vendor Directory"
      subtitle="Authorized biomedical equipment suppliers, contracts, and procurement mappings"
      breadcrumbs={[{ label: "Suppliers" }]}
      actions={
        <div className="flex items-center gap-2">
          {/* Company Invoice Banking Settings (Strictly Segregated from Supplier Banking) */}
          <button
            type="button"
            onClick={() => setIsBankSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Maintain Shree Shyam Electronics' company bank account details shown on customer invoices"
          >
            <span>🏛️</span>
            <span>Company Invoice Bank Details</span>
            {companySettings?.isBankVerified ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 animate-pulse">
                Action Required
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs hover:shadow cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Register Supply Partner</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {toastMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-2xs animate-in fade-in">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Enhanced KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">
              Total Supply Partners
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {counts.total}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Cataloged in roster</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
            <span className="text-xs font-bold text-emerald-800">
              Active Procurement Vendors
            </span>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {counts.active}
            </div>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Ready for purchase orders</span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
            <span className="text-xs font-bold text-amber-800">
              Pending / Suspended
            </span>
            <div className="mt-1 text-2xl font-bold text-amber-700">
              {(counts.pending || 0) + (counts.suspended || 0)}
            </div>
            <span className="text-[10px] text-amber-600 mt-0.5 block">
              {counts.pending || 0} Pending • {counts.suspended || 0} Suspended
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">
              Inactive Vendors
            </span>
            <div className="mt-1 text-2xl font-bold text-slate-600">
              {counts.inactive}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Archived or dormant</span>
          </div>
        </div>

        {/* Filters & Multi-Parameter Search */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by vendor name, code (SUP-001), contact person, email, city, GSTIN, or brand..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2 text-xs">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-800 focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="pending">Pending Approval</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive Only</option>
              </select>

              {/* Supplier Type Filter */}
              <select
                value={supplierTypeFilter}
                onChange={(e) => setSupplierTypeFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-800 focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer"
              >
                <option value="all">All Supplier Types</option>
                {SUPPLIER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Clinical Modality / Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-medium text-slate-800 focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer max-w-xs"
              >
                <option value="all">All Modalities</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {(search || statusFilter !== "all" || supplierTypeFilter !== "all" || categoryFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setSupplierTypeFilter("all");
                    setCategoryFilter("all");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer text-xs"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <span className="text-2xl animate-spin">⏳</span>
                <span>Loading authorized biomedical suppliers...</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 shadow-2xs">
                  🏥
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {search || statusFilter !== "all" || supplierTypeFilter !== "all" || categoryFilter !== "all"
                    ? "No suppliers match your current filter criteria"
                    : "No supply partners registered yet"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {search || statusFilter !== "all" || supplierTypeFilter !== "all" || categoryFilter !== "all"
                    ? "Try adjusting your search terms, status filters, or clinical category selections."
                    : "Register authorized OEMs, distributors, or equipment service providers to manage procurement rosters, purchase lead times, and regulatory compliance certificates."}
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  {(search || statusFilter !== "all" || supplierTypeFilter !== "all" || categoryFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setSupplierTypeFilter("all");
                        setCategoryFilter("all");
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs cursor-pointer"
                  >
                    <span>+ Register Supply Partner</span>
                  </button>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Company & Type</th>
                    <th className="px-4 py-3">Contact Person</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Modalities / Categories</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr
                      key={s.supplierCode || String(s._id)}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Code + Preferred Flag */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openViewModal(s)}
                            className="font-mono text-xs font-bold text-[#0F9F95] hover:underline cursor-pointer"
                          >
                            {s.supplierCode}
                          </button>
                          {s.isPreferredSupplier && (
                            <span title="Preferred Supplier" className="text-amber-500 text-sm">
                              ⭐
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company & Type */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openViewModal(s)}
                          className="font-bold text-slate-900 text-left hover:text-[#0F9F95] transition-colors cursor-pointer block"
                        >
                          {s.companyName}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">
                            {s.supplierType || "Supplier"}
                          </span>
                          {s.website && (
                            <>
                              <span>•</span>
                              <a
                                href={s.website.startsWith("http") ? s.website : `https://${s.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-700 hover:underline"
                              >
                                Website ↗
                              </a>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-semibold text-slate-900">{s.contactPerson}</div>
                        <div className="text-[11px] text-slate-500">{s.email}</div>
                        <div className="text-[11px] font-mono text-slate-400">{s.phone}</div>
                      </td>

                      {/* Location */}
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        <div>{[s.city, s.state].filter(Boolean).join(", ") || "—"}</div>
                        {s.gstNumber && (
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            GST: {s.gstNumber}
                          </div>
                        )}
                      </td>

                      {/* Modalities / Categories */}
                      <td className="px-4 py-3">
                        {s.productCategories && s.productCategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {s.productCategories.slice(0, 2).map((cat) => (
                              <span
                                key={cat}
                                className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200/50"
                              >
                                {cat}
                              </span>
                            ))}
                            {s.productCategories.length > 2 && (
                              <span
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 cursor-pointer"
                                onClick={() => openViewModal(s)}
                                title={s.productCategories.slice(2).join(", ")}
                              >
                                +{s.productCategories.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">General Supplies</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {getStatusBadge(s)}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openViewModal(s)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-all shadow-2xs cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openMappingModal(s)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-teal-500 hover:text-teal-700 transition-all shadow-2xs cursor-pointer"
                            title="Manage linked catalog equipment and lead times"
                          >
                            Equip. Links
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(s)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-400 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer"
                            title={s.isActive ? "Deactivate in roster" : "Activate in roster"}
                          >
                            {s.isActive ? "Deactivate" : "Activate"}
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

        {/* Enhanced Supplier Registration & Edit Modal */}
        <SupplierRegistrationModal
          isOpen={isRegistrationModalOpen}
          onClose={() => setIsRegistrationModalOpen(false)}
          supplier={editingSupplier}
          onSaved={(savedSup) => {
            showToast(
              editingSupplier
                ? `Supplier ${savedSup.supplierCode} — ${savedSup.companyName} updated.`
                : `New partner registered: ${savedSup.supplierCode} — ${savedSup.companyName}`
            );
            setReloadTrigger((v) => v + 1);
          }}
        />

        {/* Comprehensive Supplier Detail Dossier Modal */}
        <SupplierDetailModal
          isOpen={!!viewingSupplier}
          onClose={() => setViewingSupplier(null)}
          supplier={viewingSupplier}
          onEdit={(sup) => {
            setViewingSupplier(null);
            openEditModal(sup);
          }}
          onToggleActive={(sup) => handleToggleActive(sup)}
        />

        {/* Supplier Product Mapping Modal (Existing Catalog Linkages) */}
        {mappingSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0F9F95]">
                    Supplier ↔ Equipment Catalog Mapping
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {mappingSupplier.supplierCode} — {mappingSupplier.companyName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMappingSupplier(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Products Supplied Table */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  Currently Supplied Biomedical Equipment ({suppliedProducts.length})
                </div>

                {loadingMapping ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Loading mapped equipment lines...
                  </div>
                ) : suppliedProducts.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
                    No equipment mapped to this supplier yet. Use the form below to link equipment lines.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5">Product Code</th>
                          <th className="px-3 py-2.5">Equipment Name</th>
                          <th className="px-3 py-2.5">OEM Part No.</th>
                          <th className="px-3 py-2.5 text-right">Lead Time</th>
                          <th className="px-3 py-2.5 text-right">Proc. Price</th>
                          <th className="px-3 py-2.5 text-right">MOQ</th>
                          <th className="px-3 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {suppliedProducts.map((sp) => (
                          <tr key={sp.productCode} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 font-mono text-xs font-bold text-[#0F9F95]">
                              {sp.productCode}
                            </td>
                            <td className="px-3 py-2.5 text-slate-900 font-semibold">
                              {sp.productName}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                              {sp.supplierProductCode || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-900">
                              {sp.leadTimeDays ? `${sp.leadTimeDays}d` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                              {sp.lastPurchasePrice ? `₹${sp.lastPurchasePrice.toLocaleString("en-IN")}` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                              {sp.minimumOrderQuantity ?? 1}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveProductMapping(sp.productCode)}
                                className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Link New Equipment Sub-Form */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs font-bold text-[#0F9F95] mb-2.5">
                  + Map New Equipment Line to {mappingSupplier.companyName}
                </div>

                {mappingError && (
                  <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
                    {mappingError}
                  </div>
                )}

                <form onSubmit={handleAddProductMapping} className="grid grid-cols-3 gap-3 text-xs">
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Catalog Equipment *
                    </label>
                    <select
                      value={mapFormData.productCode}
                      onChange={(e) => setMapFormData({ ...mapFormData, productCode: e.target.value })}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-[#0F9F95] focus:outline-none"
                    >
                      <option value="">Select Equipment...</option>
                      {allProducts
                        .filter((p) => !suppliedProducts.some((sp) => sp.productCode === p.productCode))
                        .map((p) => (
                          <option key={p.productCode} value={p.productCode}>
                            {p.productCode} — {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Supplier SKU / Part No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BPL-MON-9000"
                      value={mapFormData.supplierProductCode}
                      onChange={(e) => setMapFormData({ ...mapFormData, supplierProductCode: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-[#0F9F95] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Lead Time (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={mapFormData.leadTimeDays}
                      onChange={(e) => setMapFormData({ ...mapFormData, leadTimeDays: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-[#0F9F95] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      Procurement Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Confidential"
                      value={mapFormData.lastPurchasePrice}
                      onChange={(e) => setMapFormData({ ...mapFormData, lastPurchasePrice: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-[#0F9F95] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1">
                      MOQ
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={mapFormData.minimumOrderQuantity}
                      onChange={(e) => setMapFormData({ ...mapFormData, minimumOrderQuantity: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-900 focus:border-[#0F9F95] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={savingMapping}
                      className="w-full rounded-lg bg-[#0F9F95] py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                    >
                      {savingMapping ? "Linking..." : "+ Link Product"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setMappingSupplier(null)}
                  className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Company Bank & Invoice Settings Modal */}
        <InvoiceSettingsModal
          isOpen={isBankSettingsOpen}
          onClose={() => setIsBankSettingsOpen(false)}
          settings={companySettings}
          onSaved={(updated) => {
            setCompanySettings(updated);
            showToast("Company invoice bank account & settlement details updated.");
          }}
        />
      </div>
    </AdminShell>
  );
}
