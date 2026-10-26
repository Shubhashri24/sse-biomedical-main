"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import type { InvoiceDoc, InvoiceStatus } from "@/lib/mongodb";
import { formatINR, formatDateDDMMYYYY } from "@/lib/invoice-calculations";
import RecordPaymentModal from "@/components/admin/RecordPaymentModal";
import CancelInvoiceModal from "@/components/admin/CancelInvoiceModal";
import SendInvoiceEmailModal from "@/components/admin/SendInvoiceEmailModal";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/invoices/${id}`);
        if (!res.ok) {
          setError(`Invoice '${id}' could not be found.`);
          return;
        }

        const data = await res.json();
        if (!cancelled && data.success && data.invoice) {
          setInvoice(data.invoice);
        }
      } catch (err) {
        console.error("Failed to load invoice:", err);
        setError("Error loading invoice.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) {
      loadInvoice();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  function getStatusBadge(status: InvoiceStatus) {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Draft (Not Finalized)
          </span>
        );
      case "UNPAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Unpaid
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Partially Paid
          </span>
        );
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Paid in Full
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  }

  async function handleFinalize() {
    if (!invoice) return;
    if (!confirm("Are you sure you want to finalize this invoice? Once finalized, line items and rates are permanently locked.")) {
      return;
    }

    setFinalizing(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FINALIZE",
          items: invoice.items,
          customer: invoice.customer,
          taxType: invoice.taxType,
          additionalCharges: invoice.additionalCharges || 0,
          additionalChargesNote: invoice.additionalChargesNote || undefined,
          applyRoundOff: Boolean(invoice.roundOff),
          notes: invoice.notes || undefined,
          poNumber: invoice.poNumber || undefined,
          quotationReference: invoice.quotationReference || undefined,
          dueDate: invoice.dueDate || undefined,
          invoiceDate: invoice.invoiceDate || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInvoice(data.invoice);
        setToast({ type: "success", text: "Invoice finalized and locked successfully." });
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast({ type: "error", text: data.message || "Failed to finalize invoice." });
      }
    } catch {
      setToast({ type: "error", text: "Network error finalizing invoice." });
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) {
    return (
      <AdminShell
        title="Invoice Details"
        breadcrumbs={[
          { label: "Invoices", href: "/admin/invoices" },
          { label: "Loading..." },
        ]}
      >
        <div className="py-24 text-center text-xs text-slate-500">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <span>Loading invoice document...</span>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (error || !invoice) {
    return (
      <AdminShell
        title="Invoice Not Found"
        breadcrumbs={[
          { label: "Invoices", href: "/admin/invoices" },
          { label: "Error" },
        ]}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-800">
          <p>{error || "The requested invoice document could not be found."}</p>
          <Link
            href="/admin/invoices"
            className="mt-4 inline-block font-semibold text-teal-700 underline"
          >
            ← Return to Invoices List
          </Link>
        </div>
      </AdminShell>
    );
  }

  const company = invoice.company || {};
  const customer = invoice.customer || { customerName: "" };
  const isDraft = !invoice.isFinalized || invoice.status === "DRAFT";
  const isCancelled = invoice.status === "CANCELLED";

  return (
    <AdminShell
      title={isDraft ? `Draft Invoice (${invoice.invoiceId})` : `Invoice ${invoice.invoiceNumber || invoice.invoiceId}`}
      subtitle={`${isDraft ? "Created" : "Issued"} on ${formatDateDDMMYYYY(invoice.invoiceDate)} for ${customer.customerName}`}
      breadcrumbs={[
        { label: "Invoices", href: "/admin/invoices" },
        { label: isDraft ? `Draft (${invoice.invoiceId})` : (invoice.invoiceNumber || invoice.invoiceId) },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Finalize button if draft */}
          {!invoice.isFinalized && invoice.status === "DRAFT" && (
            <button
              type="button"
              disabled={finalizing}
              onClick={handleFinalize}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {finalizing ? "Finalizing..." : "✓ Finalize Invoice"}
            </button>
          )}

          {/* Edit Draft */}
          {invoice.status === "DRAFT" && (
            <Link
              href={`/admin/invoices/${invoice.invoiceId}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Edit Draft
            </Link>
          )}

          {/* Record Payment */}
          {invoice.isFinalized && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setIsPaymentOpen(true)}
              className="rounded-lg bg-[#0F9F95] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-2xs cursor-pointer"
            >
              + Record Payment
            </button>
          )}

          {/* Email Invoice */}
          {invoice.isFinalized && invoice.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setIsEmailOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email Invoice</span>
            </button>
          )}

          {/* Download Real PDF */}
          <a
            href={`/api/admin/invoices/${invoice.invoiceId}/pdf?download=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download PDF</span>
          </a>

          {/* Print Document */}
          <Link
            href={`/admin/invoices/${invoice.invoiceId}/print`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </Link>

          {/* Cancel Invoice */}
          {invoice.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setIsCancelOpen(true)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
          )}
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

        {/* Status Alert Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            {getStatusBadge(invoice.status)}
            <span className="text-xs text-slate-500">
              {invoice.isFinalized
                ? `Finalized on ${new Date(invoice.finalizedAt || invoice.createdAt).toLocaleDateString("en-IN")}`
                : "This document is a draft and can be edited prior to finalization."}
            </span>
            {invoice.lastEmailedAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-2xs font-semibold text-teal-800">
                <span>✉️ Dispatched {new Date(invoice.lastEmailedAt).toLocaleDateString("en-IN")}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 font-sans">Total: </span>
              <strong className="text-slate-900">₹{formatINR(invoice.grandTotal)}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Paid: </span>
              <strong className="text-emerald-700">₹{formatINR(invoice.amountPaid)}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Due: </span>
              <strong className="text-amber-700">₹{formatINR(invoice.balanceDue)}</strong>
            </div>
          </div>
        </div>

        {/* Bank Configuration Notice if Incomplete */}
        {(!company.bankName || !company.accountNumber) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Bank details incomplete:</strong> Real invoices will omit bank instructions until company banking details are configured in Settings.
              </span>
            </div>
            <Link
              href="/admin/invoices"
              className="shrink-0 rounded-lg bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700 transition-colors"
            >
              Open Invoice Settings
            </Link>
          </div>
        )}

        {/* =========================================================================
            INVOICE DOCUMENT SHEET (Precise reproduction of Care_monitor (1).pdf)
            ========================================================================= */}
        <div className="mx-auto max-w-[800px] rounded-xl border border-slate-300 bg-white p-8 sm:p-12 shadow-md text-slate-900 font-sans relative overflow-hidden">
          {/* Diagonal Watermark for Draft or Cancelled */}
          {isCancelled && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden">
              <span className="transform -rotate-45 text-6xl sm:text-7xl font-extrabold tracking-widest text-red-500/15 uppercase font-mono">
                CANCELLED
              </span>
            </div>
          )}
          {!isCancelled && isDraft && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden">
              <span className="transform -rotate-45 text-2xl sm:text-3xl font-extrabold tracking-wider text-slate-400/20 uppercase font-mono text-center px-4">
                DRAFT / ESTIMATE — NOT A TAX INVOICE
              </span>
            </div>
          )}

          {/* Top Row: Invoice No (Left) and Dated (Right) */}
          <div className="flex items-start justify-between text-xs">
            <div>
              <span className="text-slate-700 font-normal">
                {isDraft ? "Draft Ref. " : "Invoice No. "}
              </span>
              <span className="font-bold font-mono text-sm tracking-tight text-slate-950">
                {invoice.invoiceNumber || invoice.invoiceId}
              </span>
            </div>
            <div>
              <span className="text-slate-700 font-normal">Dated </span>
              <span className="font-bold font-mono text-xs text-slate-950">
                {formatDateDDMMYYYY(invoice.invoiceDate)}
              </span>
            </div>
          </div>

          {/* Centered Company Header */}
          <div className="mt-2 text-center">
            <h1 className="text-base font-bold tracking-tight text-slate-950">
              {company.companyName || "Shree Shyam Electronics"}
            </h1>
            <div className="mt-1 text-[11px] leading-tight text-slate-800 space-y-0.5">
              {company.address && <p>{company.address}</p>}
              <p>State Name : {company.state || "Maharashtra"}, Code : {company.stateCode || "27"}</p>
              {company.email && <p>E-Mail : {company.email}</p>}
              {company.gstin && <p>GSTIN : {company.gstin}</p>}
            </div>
          </div>

          {/* Centered "Invoice" heading */}
          <div className="mt-6 text-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950">
              {isCancelled
                ? "CANCELLED INVOICE"
                : isDraft
                ? "PROFORMA / ESTIMATE (DRAFT)"
                : "Invoice"}
            </h2>
          </div>

          {/* Party Name Section */}
          <div className="mt-6 flex items-baseline gap-8 text-xs">
            <span className="font-bold text-slate-950 w-12 shrink-0">Party</span>
            <div className="flex-1">
              <span className="font-bold text-slate-950 text-xs">
                {customer.customerName}
                {customer.facilityName && ` (${customer.facilityName})`}
              </span>
              {customer.billingAddress && (
                <div className="text-[11px] text-slate-700 mt-0.5">
                  {customer.billingAddress}
                  {[customer.city, customer.state, customer.pinCode].filter(Boolean).length > 0 && (
                    <span>, {[customer.city, customer.state, customer.pinCode].filter(Boolean).join(", ")}</span>
                  )}
                </div>
              )}
              {customer.gstin && (
                <div className="text-[11px] text-slate-700 font-mono mt-0.5">
                  GSTIN: {customer.gstin}
                </div>
              )}
            </div>
          </div>

          {/* Classic Framed Goods Table */}
          <div className="mt-6 border border-slate-950">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-950 text-[11px] font-normal text-slate-950">
                  <th className="border-r border-slate-950 p-2 text-center font-normal w-[48%]">
                    Description of Goods
                  </th>
                  <th className="border-r border-slate-950 p-2 text-center font-normal w-[12%]">
                    Quantity
                  </th>
                  <th className="border-r border-slate-950 p-2 text-center font-normal w-[14%]">
                    Rate
                  </th>
                  <th className="border-r border-slate-950 p-2 text-center font-normal w-[10%]">
                    per
                  </th>
                  <th className="p-2 text-center font-normal w-[16%]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    {/* Description */}
                    <td className="border-r border-slate-950 px-3 py-2.5 font-bold text-slate-950">
                      <div>
                        {idx + 1}. {item.description}
                      </div>
                      {item.detailedDescription && (
                        <div className="text-[11px] font-normal text-slate-600 mt-0.5">
                          {item.detailedDescription}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="border-r border-slate-950 px-2 py-2.5 text-center font-bold font-mono">
                      {Number(item.quantity).toFixed(2)}
                    </td>

                    {/* Rate */}
                    <td className="border-r border-slate-950 px-3 py-2.5 text-right font-normal font-mono">
                      {formatINR(item.rate)}
                    </td>

                    {/* per */}
                    <td className="border-r border-slate-950 px-2 py-2.5 text-center font-normal">
                      {item.unit || "Qty"}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2.5 text-right font-normal font-mono">
                      {formatINR(item.amount)}
                    </td>
                  </tr>
                ))}

                {/* Empty table filler space matching the reference PDF */}
                <tr className="h-44">
                  <td className="border-r border-slate-950"></td>
                  <td className="border-r border-slate-950"></td>
                  <td className="border-r border-slate-950"></td>
                  <td className="border-r border-slate-950"></td>
                  <td></td>
                </tr>

                {/* Total Row */}
                <tr className="border-t border-slate-950 font-bold text-slate-950">
                  <td className="border-r border-slate-950 px-3 py-2 text-right">
                    Total
                  </td>
                  <td className="border-r border-slate-950 px-2 py-2 text-center font-mono">
                    {Number(invoice.totalQuantity || 0).toFixed(2)}
                  </td>
                  <td className="border-r border-slate-950 px-2 py-2"></td>
                  <td className="border-r border-slate-950 px-2 py-2"></td>
                  <td className="px-3 py-2 text-right font-mono text-sm">
                    {formatINR(invoice.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Under Table: E. & O.E */}
          <div className="mt-1 text-right text-[10px] italic text-slate-800">
            E. & O.E
          </div>

          {/* Amount in words & Bank Details */}
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Left: Amount Chargeable (in words) */}
            <div>
              <span className="text-[11px] text-slate-800 block">
                Amount Chargeable (in words)
              </span>
              <p className="mt-1 font-bold text-slate-950 leading-relaxed font-serif">
                {invoice.amountInWords || "INR Zero only."}
              </p>
            </div>

            {/* Right: Company's Bank Details */}
            {(company.bankName || company.accountNumber) && (
              <div className="text-[11px] leading-relaxed text-slate-900 sm:pl-8">
                <span className="font-normal block mb-1">Company’s Bank Details</span>
                <div className="space-y-0.5">
                  <div className="flex">
                    <span className="w-24 shrink-0 text-slate-700">Bank Name</span>
                    <span className="font-bold">: {company.bankName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 shrink-0 text-slate-700">A/c No.</span>
                    <span className="font-bold font-mono">: {company.accountNumber}</span>
                  </div>
                  {company.branchAndIfsc && (
                    <div className="mt-1">
                      <span className="text-slate-700">Branch & IFS Code: </span>
                      <span className="font-mono font-bold">{company.branchAndIfsc}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Declaration and Signatory */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs items-end">
            {/* Declaration Left */}
            <div>
              <span className="text-[10px] text-slate-800 block">Declaration</span>
              <p className="mt-1 text-[10px] text-slate-800 leading-tight max-w-xs">
                {company.declaration ||
                  "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
              </p>
            </div>

            {/* Signatory Right */}
            <div className="text-right">
              <span className="text-xs font-bold text-slate-950 block">
                for {company.companyName || "Shree Shyam Electronics"}
              </span>
              <div className="h-12 flex items-center justify-end">
                {/* Space for stamp/signature */}
              </div>
              <span className="text-xs text-slate-900 block font-normal">
                {company.signatoryTitle || "Authorised Signatory"}
              </span>
            </div>
          </div>

          {/* Bottom Centered: This is a Computer Generated Invoice */}
          <div className="mt-12 text-center">
            <span className="text-[10px] text-slate-800 tracking-wider inline-block border-b border-slate-400 pb-0.5">
              This is a Computer Generated Invoice
            </span>
          </div>
        </div>

        {/* =========================================================================
            PAYMENT HISTORY & AUDIT METADATA SECTION
            ========================================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Payment History & Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Logged payment transactions and lifecycle audit events.
              </p>
            </div>
            {invoice.isFinalized && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
              <button
                type="button"
                onClick={() => setIsPaymentOpen(true)}
                className="rounded-lg bg-teal-50 border border-teal-300 px-3 py-1 text-xs font-semibold text-[#0B827B] hover:bg-teal-100 transition-colors"
              >
                + Record Payment
              </button>
            )}
          </div>

          {/* Payments Table */}
          {invoice.paymentRecords && invoice.paymentRecords.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Reference / Cheque #</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.paymentRecords.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {formatDateDDMMYYYY(pay.paymentDate)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {pay.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {pay.referenceNumber || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {pay.recordedBy}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹{formatINR(pay.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No payments have been recorded for this invoice yet.
            </div>
          )}

          {/* Audit Metadata */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-slate-400">Created At</span>
              <span className="font-mono text-slate-700">
                {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-slate-400">Created By</span>
              <span className="text-slate-700">{invoice.createdBy || "admin"}</span>
            </div>
            {invoice.finalizedAt && (
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-400">Finalized By</span>
                <span className="text-slate-700">{invoice.finalizedBy}</span>
              </div>
            )}
            {invoice.cancelledAt && (
              <div>
                <span className="block text-[10px] uppercase font-semibold text-red-500">Cancelled Reason</span>
                <span className="text-red-700 font-medium">{invoice.cancellationReason || "Cancelled"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Email Dispatch Audit Trail */}
        {invoice.emailHistory && invoice.emailHistory.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>✉️ Email Dispatch History</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600">
                  {invoice.emailHistory.length}
                </span>
              </h3>
              <span className="text-2xs text-slate-400">
                Dispatched via Gmail SMTP
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-medium">
                    <th className="py-2 pr-3">Date &amp; Time</th>
                    <th className="py-2 pr-3">Recipient</th>
                    <th className="py-2 pr-3">Dispatched By</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 text-right">Message ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.emailHistory.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 pr-3 font-mono text-slate-700">
                        {new Date(rec.sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{rec.recipientEmail}</td>
                      <td className="py-2 pr-3 text-slate-500">{rec.sentBy}</td>
                      <td className="py-2 pr-3">
                        {rec.status === "SENT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-2xs font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Sent via SMTP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-2xs font-semibold text-red-800" title={rec.error}>
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono text-2xs text-slate-400">
                        {rec.messageId || (rec.error ? rec.error.slice(0, 30) + "..." : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        invoice={invoice}
        onPaymentRecorded={(updated) => {
          setInvoice(updated);
          setToast({ type: "success", text: "Payment recorded successfully." });
          setTimeout(() => setToast(null), 4000);
        }}
      />

      <CancelInvoiceModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        invoice={invoice}
        onInvoiceCancelled={(updated) => {
          setInvoice(updated);
          setToast({ type: "success", text: "Invoice cancelled successfully." });
          setTimeout(() => setToast(null), 4000);
        }}
      />

      <SendInvoiceEmailModal
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        invoice={invoice}
        onEmailSent={(updated, msg) => {
          setInvoice(updated);
          setToast({ type: "success", text: msg });
          setTimeout(() => setToast(null), 5000);
        }}
      />
    </AdminShell>
  );
}
