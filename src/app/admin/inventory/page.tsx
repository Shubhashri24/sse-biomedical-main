"use client";

import React, { useState, useEffect } from "react";
import AdminShell from "@/components/admin/AdminShell";
import type { ProductDoc, InventoryTransactionDoc, InventoryTransactionType } from "@/lib/mongodb";
import { categories as staticCategories } from "@/lib/data";

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    reservedStockUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected product for movement modal
  const [movementProduct, setMovementProduct] = useState<ProductDoc | null>(null);
  const [movementType, setMovementType] = useState<InventoryTransactionType>("STOCK_IN");
  const [movementQty, setMovementQty] = useState<number>(1);
  const [movementReason, setMovementReason] = useState("");
  const [movementReorderLevel, setMovementReorderLevel] = useState<string>("");
  const [submittingMovement, setSubmittingMovement] = useState(false);
  const [movementError, setMovementError] = useState("");

  // Selected product for history modal
  const [historyProduct, setHistoryProduct] = useState<ProductDoc | null>(null);
  const [historyList, setHistoryList] = useState<InventoryTransactionDoc[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchInventory() {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/inventory?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setProducts(data.products || []);
            if (data.summary) setSummary(data.summary);
          }
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInventory();
    return () => {
      cancelled = true;
    };
  }, [search, categoryFilter, statusFilter, reloadTrigger]);

  // Open Movement Modal
  const openMovementModal = (product: ProductDoc) => {
    setMovementProduct(product);
    setMovementType("STOCK_IN");
    setMovementQty(1);
    setMovementReason("");
    setMovementReorderLevel(product.reorderLevel ? String(product.reorderLevel) : "5");
    setMovementError("");
  };

  // Open History Modal
  const openHistoryModal = async (product: ProductDoc) => {
    setHistoryProduct(product);
    setLoadingHistory(true);
    setHistoryList([]);
    try {
      const res = await fetch(`/api/admin/inventory/${product.productCode}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHistoryList(data.transactions || []);
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle Movement Submit
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementProduct) return;

    if (!movementReason.trim()) {
      setMovementError("Reason / authorization note is required for the audit trail.");
      return;
    }

    if (movementQty <= 0 && movementType !== "ADJUSTMENT") {
      setMovementError("Quantity must be greater than 0.");
      return;
    }

    const currentStock = movementProduct.stockQuantity ?? 0;
    const currentReserved = movementProduct.reservedQuantity ?? 0;
    const currentAvail = Math.max(0, currentStock - currentReserved);

    if (movementType === "STOCK_OUT" && movementQty > currentAvail) {
      setMovementError(`Cannot dispatch ${movementQty} units. Only ${currentAvail} available.`);
      return;
    }

    if (movementType === "RESERVED" && movementQty > currentAvail) {
      setMovementError(`Cannot reserve ${movementQty} units. Only ${currentAvail} unreserved available.`);
      return;
    }

    if (movementType === "RELEASED" && movementQty > currentReserved) {
      setMovementError(`Cannot release ${movementQty} units. Only ${currentReserved} currently reserved.`);
      return;
    }

    if (movementType === "ADJUSTMENT" && movementQty < currentReserved) {
      setMovementError(`Adjusted stock (${movementQty}) cannot be less than currently reserved units (${currentReserved}).`);
      return;
    }

    setSubmittingMovement(true);
    setMovementError("");

    try {
      // 1. Post transaction
      const txnRes = await fetch(`/api/admin/inventory/${movementProduct.productCode}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movementType,
          quantity: movementQty,
          reason: movementReason.trim(),
        }),
      });

      const txnData = await txnRes.json();
      if (!txnRes.ok || !txnData.success) {
        setMovementError(txnData.message || "Failed to record transaction");
        setSubmittingMovement(false);
        return;
      }

      // 2. If reorder level was edited, update reorder level via PATCH
      const newReorder = parseInt(movementReorderLevel, 10);
      if (!isNaN(newReorder) && newReorder !== movementProduct.reorderLevel) {
        await fetch(`/api/admin/inventory/${movementProduct.productCode}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reorderLevel: newReorder }),
        });
      }

      showToast(`Inventory updated for ${movementProduct.productCode}.`);
      setMovementProduct(null);
      setReloadTrigger((v) => v + 1);
    } catch {
      setMovementError("Network error executing stock movement.");
    } finally {
      setSubmittingMovement(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "IN_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-bold text-[#15803D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
            In Stock
          </span>
        );
      case "LOW_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold text-[#B45309]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B45309]" />
            Low Stock
          </span>
        );
      case "OUT_OF_STOCK":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-bold text-[#B91C1C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#B91C1C]" />
            Out of Stock
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-[11px] font-medium text-[#64748B]">
            Unknown
          </span>
        );
    }
  };

  const getTxnBadge = (type: InventoryTransactionType) => {
    switch (type) {
      case "STOCK_IN":
        return <span className="rounded-full bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-0.5 text-[11px] font-bold text-[#15803D]">Stock In</span>;
      case "STOCK_OUT":
        return <span className="rounded-full bg-[#F0F9FF] border border-[#BAE6FD] px-2.5 py-0.5 text-[11px] font-bold text-[#0369A1]">Stock Out</span>;
      case "ADJUSTMENT":
        return <span className="rounded-full bg-[#FAF5FF] border border-[#E9D5FF] px-2.5 py-0.5 text-[11px] font-bold text-[#7E22CE]">Adjustment</span>;
      case "RESERVED":
        return <span className="rounded-full bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 text-[11px] font-bold text-[#B45309]">Reserved</span>;
      case "RELEASED":
        return <span className="rounded-full bg-[#E6F7F5] border border-[#99E2DC] px-2.5 py-0.5 text-[11px] font-bold text-[#0F9F95]">Released</span>;
      default:
        return <span className="rounded-full bg-[#F8FAFC] px-2.5 py-0.5 text-[11px] text-[#64748B]">{type}</span>;
    }
  };

  return (
    <AdminShell
      title="Biomedical Equipment Stock & Inventory"
      subtitle="Audited warehouse ledger, real-time allocations, and replenishment alerts"
      breadcrumbs={[{ label: "Inventory" }]}
    >
      <div className="space-y-6">
        {toastMessage && (
          <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-3.5 text-xs font-semibold text-[#15803D]">
            ✓ {toastMessage}
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
            <span className="text-xs font-semibold text-[#64748B]">
              Equipment Models
            </span>
            <div className="mt-1 text-2xl font-bold text-[#172033]">
              {summary.totalProducts}
            </div>
          </div>
          <div className="rounded-xl border border-[#99E2DC] bg-[#E6F7F5] p-4 shadow-xs">
            <span className="text-xs font-bold text-[#0F9F95]">
              Total Stock Units
            </span>
            <div className="mt-1 text-2xl font-bold text-[#0F9F95]">
              {summary.totalStockUnits}
            </div>
          </div>
          <div className={`rounded-xl border p-4 shadow-xs ${
            summary.lowStockCount > 0 ? "border-[#FDE68A] bg-[#FFFBEB]" : "border-[#E2E8F0] bg-white"
          }`}>
            <span className="text-xs font-bold text-[#B45309]">
              Low Stock Alerts
            </span>
            <div className="mt-1 text-2xl font-bold text-[#B45309]">
              {summary.lowStockCount}
            </div>
          </div>
          <div className={`rounded-xl border p-4 shadow-xs ${
            summary.outOfStockCount > 0 ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#E2E8F0] bg-white"
          }`}>
            <span className="text-xs font-bold text-[#B91C1C]">
              Out of Stock
            </span>
            <div className="mt-1 text-2xl font-bold text-[#B91C1C]">
              {summary.outOfStockCount}
            </div>
          </div>
          <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4 shadow-xs">
            <span className="text-xs font-bold text-[#C2410C]">
              Reserved Units
            </span>
            <div className="mt-1 text-2xl font-bold text-[#C2410C]">
              {summary.reservedStockUnits}
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code (MON-01), equipment name, or category..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer"
            >
              <option value="all">All Categories</option>
              {staticCategories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Inventory Ledger Table */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Equipment Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Physical Stock</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right font-bold text-[#0F9F95]">Available</th>
                  <th className="px-4 py-3 text-right">Reorder Level</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-[#64748B]">
                      Loading inventory records...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-[#64748B]">
                      No equipment records match the criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const stock = p.stockQuantity ?? 0;
                    const reserved = p.reservedQuantity ?? 0;
                    const avail = Math.max(0, stock - reserved);
                    const reorder = p.reorderLevel ?? 5;
                    const status = p.stockStatus || (avail === 0 ? "OUT_OF_STOCK" : avail <= reorder ? "LOW_STOCK" : "IN_STOCK");

                    return (
                      <tr key={p.productCode} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-[#0F9F95]">
                          {p.productCode}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#172033]">{p.name}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {p.manufacturer} • {p.model}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[#64748B] font-medium">
                          {p.categoryName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[#172033]">
                          {stock}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[#B45309]">
                          {reserved}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-[#0F9F95]">
                          {avail}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[#64748B]">
                          {reorder}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {getStatusBadge(status)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[#64748B]">
                          {p.lastStockUpdate ? new Date(p.lastStockUpdate).toLocaleDateString() : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openMovementModal(p)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs cursor-pointer"
                            >
                              Move Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistoryModal(p)}
                              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#64748B] hover:text-[#172033] hover:border-[#CBD5E1] transition-all shadow-2xs cursor-pointer"
                            >
                              Audit Trail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Movement Modal */}
        {movementProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0F9F95]">
                    Stock Movement & Ledger Entry
                  </div>
                  <h3 className="text-base font-bold text-[#172033] mt-0.5">
                    {movementProduct.productCode} — {movementProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMovementProduct(null)}
                  className="text-[#94A3B8] hover:text-[#172033] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Current Balances Summary */}
              <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-center text-xs">
                <div>
                  <div className="text-[11px] text-[#64748B] font-semibold">Physical Stock</div>
                  <div className="font-mono text-base font-bold text-[#172033]">{movementProduct.stockQuantity ?? 0}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#B45309] font-semibold">Reserved</div>
                  <div className="font-mono text-base font-bold text-[#B45309]">
                    {movementProduct.reservedQuantity ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#0F9F95] font-semibold">Available</div>
                  <div className="font-mono text-base font-bold text-[#0F9F95]">
                    {Math.max(0, (movementProduct.stockQuantity ?? 0) - (movementProduct.reservedQuantity ?? 0))}
                  </div>
                </div>
              </div>

              {movementError && (
                <div className="mb-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs font-medium text-[#B91C1C]">
                  {movementError}
                </div>
              )}

              <form onSubmit={handleMovementSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Movement Type
                  </label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as InventoryTransactionType)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="STOCK_IN">STOCK_IN — Inward Batch / Supplier Delivery</option>
                    <option value="STOCK_OUT">STOCK_OUT — Outward Dispatch / Hospital Fulfillment</option>
                    <option value="ADJUSTMENT">ADJUSTMENT — Audit Reconciliation / Write-off</option>
                    <option value="RESERVED">RESERVED — Allocate Units for Confirmed Order</option>
                    <option value="RELEASED">RELEASED — Release Reserved Allocation</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      {movementType === "ADJUSTMENT" ? "New Exact Stock" : "Quantity to Move"}
                    </label>
                    <input
                      type="number"
                      min={movementType === "ADJUSTMENT" ? "0" : "1"}
                      value={movementQty}
                      onChange={(e) => setMovementQty(parseInt(e.target.value, 10) || 0)}
                      required
                      className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-mono text-xs font-bold text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Reorder Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={movementReorderLevel}
                      onChange={(e) => setMovementReorderLevel(e.target.value)}
                      className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-mono text-xs font-bold text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Audit Reason / Invoice / PO Reference *
                  </label>
                  <textarea
                    rows={2}
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder="e.g., Inward receipt PO-2026-881 from BPL Medical; or Hospital dispatch."
                    required
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-[#F1F5F9] pt-3">
                  <button
                    type="button"
                    onClick={() => setMovementProduct(null)}
                    className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172033] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingMovement}
                    className="rounded-lg bg-[#0F9F95] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    {submittingMovement ? "Recording..." : "Record Audit Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock History Audit Modal */}
        {historyProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between border-b border-[#F1F5F9] pb-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0F9F95]">
                    Audited Inventory Transaction Ledger
                  </div>
                  <h3 className="text-base font-bold text-[#172033] mt-0.5">
                    {historyProduct.productCode} — {historyProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryProduct(null)}
                  className="text-[#94A3B8] hover:text-[#172033] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 max-h-[60vh] overflow-y-auto">
                {loadingHistory ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">
                    Loading historical transactions...
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">
                    No transaction entries recorded for this item yet.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                      <tr>
                        <th className="px-3 py-2.5">Txn ID</th>
                        <th className="px-3 py-2.5">Date & Time</th>
                        <th className="px-3 py-2.5">Action</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3 py-2.5 text-center">Previous → New Stock</th>
                        <th className="px-3 py-2.5">Reason / Audit Trail</th>
                        <th className="px-3 py-2.5">Operator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {historyList.map((tx) => (
                        <tr key={tx.transactionId} className="hover:bg-[#F8FAFC]">
                          <td className="px-3 py-2.5 font-mono text-xs font-bold text-[#0F9F95]">
                            {tx.transactionId}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-[#64748B]">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5">{getTxnBadge(tx.type)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-[#172033]">
                            {["STOCK_IN", "RELEASED"].includes(tx.type) ? `+${tx.quantity}` : `-${tx.quantity}`}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-xs">
                            <span className="text-[#64748B]">{tx.previousStock}</span>
                            <span className="mx-1.5 text-[#94A3B8]">→</span>
                            <span className="font-bold text-[#172033]">{tx.newStock}</span>
                          </td>
                          <td className="px-3 py-2.5 text-[#172033] font-medium">
                            {tx.reason}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-[#64748B]">
                            {tx.createdBy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-4 flex justify-end border-t border-[#F1F5F9] pt-3">
                <button
                  type="button"
                  onClick={() => setHistoryProduct(null)}
                  className="rounded-lg border border-[#E2E8F0] px-4 py-1.5 text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
