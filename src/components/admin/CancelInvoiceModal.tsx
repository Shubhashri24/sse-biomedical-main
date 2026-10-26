"use client";

import React, { useState } from "react";
import type { InvoiceDoc } from "@/lib/mongodb";
import { formatINR } from "@/lib/invoice-calculations";

interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceDoc | null;
  onInvoiceCancelled: (cancelledInvoice: InvoiceDoc) => void;
}

export default function CancelInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onInvoiceCancelled,
}: CancelInvoiceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice || !reason.trim()) {
      setError("Please provide a cancellation reason for auditing purposes.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/invoices/${invoice.invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL",
          cancellationReason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onInvoiceCancelled(data.invoice);
        onClose();
      } else {
        setError(data.message || "Failed to cancel invoice.");
      }
    } catch {
      setError("Network error cancelling invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-red-200">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Confirm Invoice Cancellation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoice <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber || invoice.invoiceId}</span> (₹{formatINR(invoice.grandTotal)})
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 border border-amber-200 space-y-1">
          <p className="font-semibold">Important Accounting Safeguard:</p>
          <p className="leading-relaxed text-amber-700">
            Finalized invoices are never deleted. Cancelling will permanently mark this document as <strong>CANCELLED</strong> and exclude it from active receivables, while preserving the complete audit history.
          </p>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleCancel} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cancellation Reason (Required)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Order cancelled by hospital, incorrect equipment selection, issued under revised quotation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-red-600 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Do Not Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
