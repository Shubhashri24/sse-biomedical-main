"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import type { InvoiceDoc, InvoiceStatus, CompanyQuotationSettings } from "@/lib/mongodb";
import { formatINR, formatDateDDMMYYYY } from "@/lib/invoice-calculations";
import RecordPaymentModal from "@/components/admin/RecordPaymentModal";
import CancelInvoiceModal from "@/components/admin/CancelInvoiceModal";
import InvoiceSettingsModal from "@/components/admin/InvoiceSettingsModal";

interface InvoiceMetrics {
  totalInvoices: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [metrics, setMetrics] = useState<InvoiceMetrics>({
    totalInvoices: 0,
    totalInvoicedAmount: 0,
    totalPaidAmount: 0,
    totalOutstandingAmount: 0,
  });
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    ALL: 0,
    DRAFT: 0,
    UNPAID: 0,
    PARTIALLY_PAID: 0,
    PAID: 0,
    CANCELLED: 0,
  });
  const [companySettings, setCompanySettings] = useState<CompanyQuotationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const sortBy = "createdAt";
  const sortOrder = "desc";

  // Modals state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<InvoiceDoc | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceDoc | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Status message
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function reloadInvoices() {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const [invRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/invoices?${params.toString()}`),
        fetch("/api/admin/settings/company"),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        if (invData.success) {
          setInvoices(invData.invoices || []);
          if (invData.statusCounts) {
            setStatusCounts(invData.statusCounts);
          }
          setMetrics(
            invData.metrics || {
              totalInvoices: 0,
              totalInvoicedAmount: 0,
              totalPaidAmount: 0,
              totalOutstandingAmount: 0,
            }
          );
        }
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.success) {
          setCompanySettings(sData.settings);
        }
      }
    } catch (err) {
      console.error("Failed to reload invoices:", err);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInvoices() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);

        const [invRes, settingsRes] = await Promise.all([
          fetch(`/api/admin/invoices?${params.toString()}`),
          fetch("/api/admin/settings/company"),
        ]);

        if (invRes.ok) {
          const invData = await invRes.json();
          if (!cancelled && invData.success) {
            setInvoices(invData.invoices || []);
            if (invData.statusCounts) {
              setStatusCounts(invData.statusCounts);
            }
            setMetrics(
              invData.metrics || {
                totalInvoices: 0,
                totalInvoicedAmount: 0,
                totalPaidAmount: 0,
                totalOutstandingAmount: 0,
              }
            );
          }
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (!cancelled && sData.success) {
            setCompanySettings(sData.settings);
          }
        }
      } catch (err) {
        console.error("Failed to load invoices:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInvoices();
    return () => {
      cancelled = true;
    };
  }, [search, statusFilter, startDate, endDate, sortBy, sortOrder]);

  function getStatusBadge(status: InvoiceStatus) {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
      case "UNPAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unpaid
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Partially Paid
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Paid
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  }

  function handlePaymentSuccess(updated: InvoiceDoc) {
    reloadInvoices();
    setToast({ type: "success", text: `Customer payment recorded successfully for ${updated.invoiceNumber || updated.invoiceId}.` });
    setTimeout(() => setToast(null), 4000);
  }

  function handleCancelSuccess(updated: InvoiceDoc) {
    reloadInvoices();
    setToast({ type: "success", text: `Invoice ${updated.invoiceNumber || updated.invoiceId} cancelled successfully.` });
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <AdminShell
      title="Invoices & Billing"
      subtitle="Manage customer invoices, invoice documents, and payment records."
      breadcrumbs={[{ label: "Invoices" }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span>Invoice Settings</span>
          </button>

          <Link
            href="/admin/invoices/new"
            className="flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-2xs"
          >
            <span className="text-sm leading-none">+</span>
            <span>Create Invoice</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {toast && (
          <div
            className={`rounded-xl p-3 text-xs font-medium border ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Financial Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {metrics.totalInvoices}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">All stored customer invoices</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoiced Amount
            </span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 font-mono">
              ₹{formatINR(metrics.totalInvoicedAmount)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Active finalized receivables</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Paid Amount
            </span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 font-mono">
              ₹{formatINR(metrics.totalPaidAmount)}
            </div>
            <p className="mt-1 text-[11px] text-emerald-600">Verified received collections</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Outstanding Amount
            </span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 font-mono">
              ₹{formatINR(metrics.totalOutstandingAmount)}
            </div>
            <p className="mt-1 text-[11px] text-amber-600">Pending customer balance</p>
          </div>
        </div>

        {/* Company Bank Details Notice if Unconfigured or Unverified */}
        {companySettings && !companySettings.isBankVerified && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">⚠️</span>
              <div>
                {!companySettings.bankName || !companySettings.accountNumber ? (
                  <>
                    <strong className="font-semibold text-amber-950">Bank Account Details Unconfigured:</strong>
                    <span className="ml-1 text-amber-800">
                      Bank name and account number are missing. Invoices will omit bank transfer details until verified in Settings.
                    </span>
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-amber-950">Bank Account Details Pending Verification:</strong>
                    <span className="ml-1 text-amber-800">
                      Bank details have been saved but require admin verification before appearing on invoice PDFs.
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="shrink-0 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors cursor-pointer"
            >
              {!companySettings.bankName || !companySettings.accountNumber
                ? "Configure Banking Details →"
                : "Verify Banking Details →"}
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3 text-xs">
            {["ALL", "DRAFT", "UNPAID", "PARTIALLY_PAID", "PAID", "CANCELLED"].map((status) => {
              const label =
                status === "ALL"
                  ? "All Invoices"
                  : status === "PARTIALLY_PAID"
                  ? "Partially Paid"
                  : status.charAt(0) + status.slice(1).toLowerCase();

              const count = statusCounts[status] ?? 0;

              const isSelected = statusFilter === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#10243A] text-white font-semibold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected
                        ? "bg-white/20 text-white font-bold"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Date Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by invoice #, hospital, customer, PO, email..."
                className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 px-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 text-slate-600">
                <span>To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 rounded-lg border border-slate-300 px-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {(search || startDate || endDate || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStartDate("");
                    setEndDate("");
                    setStatusFilter("ALL");
                  }}
                  className="h-8 rounded-lg px-2 text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Listing Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                  <span>Loading invoice documents...</span>
                </div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">No Invoices Found</h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {search || statusFilter !== "ALL"
                      ? "No invoices match the active filters. Try adjusting your search query."
                      : "Create your first professional invoice for healthcare facilities or hospital equipment orders."}
                  </p>
                  <Link
                    href="/admin/invoices/new"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors"
                  >
                    <span>+ Create Invoice</span>
                  </Link>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Invoice Number</th>
                    <th className="py-3 px-3.5">Invoice Date</th>
                    <th className="py-3 px-3.5">Customer / Party Name</th>
                    <th className="py-3 px-3.5 text-center">Items</th>
                    <th className="py-3 px-3.5 text-right">Invoice Total</th>
                    <th className="py-3 px-3.5 text-center">Payment Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.invoiceId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Invoice Number */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/invoices/${inv.invoiceId}`}
                            className="font-mono font-bold text-[#0F9F95] hover:underline"
                          >
                            {inv.invoiceNumber || inv.invoiceId}
                          </Link>
                          {(!inv.isFinalized || !inv.invoiceNumber) && (
                            <span className="rounded bg-slate-100 border border-slate-200 px-1 py-0.2 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                              Draft
                            </span>
                          )}
                        </div>
                        {inv.poNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">PO: {inv.poNumber}</div>
                        )}
                      </td>

                      {/* Invoice Date */}
                      <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                        {formatDateDDMMYYYY(inv.invoiceDate)}
                      </td>

                      {/* Customer / Party Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">
                          {inv.customer?.customerName || "Customer"}
                        </div>
                        {inv.customer?.facilityName && (
                          <div className="text-[11px] text-slate-500">
                            {inv.customer.facilityName}
                          </div>
                        )}
                      </td>

                      {/* Number of Items */}
                      <td className="py-3 px-3.5 text-center text-slate-700">
                        <span className="font-semibold">{inv.items?.length || 0}</span>
                        <span className="text-[11px] text-slate-400"> ({inv.totalQuantity || 0} qty)</span>
                      </td>

                      {/* Invoice Total */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                        ₹{formatINR(inv.grandTotal)}
                        {inv.amountPaid > 0 && inv.status !== "PAID" && (
                          <div className="text-[10px] text-emerald-700 font-medium">
                            Paid: ₹{formatINR(inv.amountPaid)}
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3.5 text-center">
                        {getStatusBadge(inv.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View */}
                          <Link
                            href={`/admin/invoices/${inv.invoiceId}`}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                            title="View Invoice & Details"
                          >
                            View
                          </Link>

                          {/* Edit Draft */}
                          {inv.status === "DRAFT" && (
                            <Link
                              href={`/admin/invoices/${inv.invoiceId}/edit`}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-teal-700 hover:border-teal-300 hover:bg-teal-50 transition-colors shadow-2xs"
                              title="Edit Draft"
                            >
                              Edit
                            </Link>
                          )}

                          {/* Download PDF */}
                          <a
                            href={`/api/admin/invoices/${inv.invoiceId}/pdf?download=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                            title="Download PDF"
                          >
                            PDF
                          </a>

                          {/* Print */}
                          <Link
                            href={`/admin/invoices/${inv.invoiceId}/print`}
                            target="_blank"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-2xs"
                            title="Print Invoice"
                          >
                            Print
                          </Link>

                          {/* Record Payment */}
                          {inv.isFinalized && inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => setPaymentModalInvoice(inv)}
                              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                              title="Record Customer Payment"
                            >
                              Payment
                            </button>
                          )}

                          {/* Cancel Invoice */}
                          {inv.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => setCancelModalInvoice(inv)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors shadow-2xs"
                              title="Cancel Invoice"
                            >
                              Cancel
                            </button>
                          )}
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

      {/* Payment Recording Modal */}
      <RecordPaymentModal
        isOpen={Boolean(paymentModalInvoice)}
        onClose={() => setPaymentModalInvoice(null)}
        invoice={paymentModalInvoice}
        onPaymentRecorded={handlePaymentSuccess}
      />

      {/* Cancel Confirmation Modal */}
      <CancelInvoiceModal
        isOpen={Boolean(cancelModalInvoice)}
        onClose={() => setCancelModalInvoice(null)}
        invoice={cancelModalInvoice}
        onInvoiceCancelled={handleCancelSuccess}
      />

      {/* Invoice Settings Modal */}
      <InvoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={companySettings}
        onSaved={(updated) => {
          setCompanySettings(updated);
          setToast({ type: "success", text: "Invoice configuration updated successfully." });
          setTimeout(() => setToast(null), 4000);
        }}
      />
    </AdminShell>
  );
}
