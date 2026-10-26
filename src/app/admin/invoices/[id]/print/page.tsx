"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { InvoiceDoc } from "@/lib/mongodb";
import { formatINR, formatDateDDMMYYYY } from "@/lib/invoice-calculations";

export default function PrintInvoicePage() {
  const params = useParams();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/invoices/${id}`);
        if (!res.ok) {
          setError(`Invoice '${id}' could not be loaded.`);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
          <span>Preparing print document...</span>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center text-xs text-red-700">
        <p>{error || "Invoice not found."}</p>
      </div>
    );
  }

  const company = invoice.company || {};
  const customer = invoice.customer || { customerName: "" };

  const isDraft = !invoice.isFinalized || invoice.status === "DRAFT";
  const isCancelled = invoice.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-black font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Floating Action Bar (Hidden on Print) */}
      <div className="no-print mx-auto max-w-[800px] mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-md border border-slate-200">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/invoices/${invoice.invoiceId}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ← Back to Invoice View
          </Link>
          <span className="text-xs text-slate-500">
            {isDraft ? "Draft Ref: " : "Invoice: "}
            <strong className="font-mono text-slate-800">{isDraft ? invoice.invoiceId : (invoice.invoiceNumber || invoice.invoiceId)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/invoices/${invoice.invoiceId}/pdf?download=true`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Download PDF
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#0F9F95] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Invoice Document</span>
          </button>
        </div>
      </div>

      {/* Main A4 Document Sheet */}
      <div className="relative mx-auto max-w-[800px] bg-white p-10 sm:p-14 shadow-lg print:shadow-none print:p-0 print:max-w-none text-black overflow-hidden">
        {/* Draft or Cancelled Watermark */}
        {(isDraft || isCancelled) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden">
            <span
              className={`transform -rotate-45 font-black uppercase tracking-widest text-center ${
                isCancelled ? "text-red-500/15 text-6xl" : "text-slate-400/15 text-4xl"
              }`}
            >
              {isCancelled ? "CANCELLED" : "DRAFT / ESTIMATE — NOT A TAX INVOICE"}
            </span>
          </div>
        )}

        {/* Top Row: Invoice No (Left) and Dated (Right) */}
        <div className="flex items-start justify-between text-xs">
          <div>
            <span className="font-normal">{isDraft ? "Draft Ref. " : "Invoice No. "}</span>
            <span className="font-bold font-mono text-sm tracking-tight">
              {isDraft ? invoice.invoiceId : (invoice.invoiceNumber || invoice.invoiceId)}
            </span>
          </div>
          <div>
            <span className="font-normal">Dated </span>
            <span className="font-bold font-mono text-xs">
              {formatDateDDMMYYYY(invoice.invoiceDate)}
            </span>
          </div>
        </div>

        {/* Centered Company Header */}
        <div className="mt-1 text-center">
          <h1 className="text-base font-bold tracking-tight">
            {company.companyName || "Shree Shyam Electronics"}
          </h1>
          <div className="mt-1 text-[11px] leading-tight space-y-0.5">
            {company.address && <p>{company.address}</p>}
            <p>State Name : {company.state || "Maharashtra"}, Code : {company.stateCode || "27"}</p>
            {company.email && <p>E-Mail : {company.email}</p>}
            {company.gstin && <p>GSTIN : {company.gstin}</p>}
          </div>
        </div>

        {/* Centered "Invoice" heading */}
        <div className="mt-6 text-center">
          <h2 className={`text-sm font-bold uppercase tracking-wider ${isCancelled ? "text-red-600" : isDraft ? "text-slate-600" : "text-black"}`}>
            {isCancelled ? "CANCELLED INVOICE" : isDraft ? "ESTIMATE / PROFORMA (DRAFT)" : "Invoice"}
          </h2>
        </div>

        {/* Party Name Section */}
        <div className="mt-6 flex items-baseline gap-8 text-xs">
          <span className="font-bold w-12 shrink-0">Party</span>
          <div className="flex-1">
            <span className="font-bold text-xs">
              {customer.customerName}
              {customer.facilityName && ` (${customer.facilityName})`}
            </span>
            {customer.billingAddress && (
              <div className="text-[11px] mt-0.5 text-slate-800">
                {customer.billingAddress}
                {[customer.city, customer.state, customer.pinCode].filter(Boolean).length > 0 && (
                  <span>, {[customer.city, customer.state, customer.pinCode].filter(Boolean).join(", ")}</span>
                )}
              </div>
            )}
            {customer.gstin && (
              <div className="text-[11px] font-mono mt-0.5">
                GSTIN: {customer.gstin}
              </div>
            )}
          </div>
        </div>

        {/* Classic Framed Goods Table */}
        <div className="mt-6 border border-black">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-black text-[11px] font-normal">
                <th className="border-r border-black p-2 text-center font-normal w-[48%]">
                  Description of Goods
                </th>
                <th className="border-r border-black p-2 text-center font-normal w-[12%]">
                  Quantity
                </th>
                <th className="border-r border-black p-2 text-center font-normal w-[14%]">
                  Rate
                </th>
                <th className="border-r border-black p-2 text-center font-normal w-[10%]">
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
                  <td className="border-r border-black px-3 py-2.5 font-bold">
                    <div>
                      {idx + 1}. {item.description}
                    </div>
                    {item.detailedDescription && (
                      <div className="text-[11px] font-normal text-slate-700 mt-0.5">
                        {item.detailedDescription}
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="border-r border-black px-2 py-2.5 text-center font-bold font-mono">
                    {Number(item.quantity).toFixed(2)}
                  </td>

                  {/* Rate */}
                  <td className="border-r border-black px-3 py-2.5 text-right font-normal font-mono">
                    {formatINR(item.rate)}
                  </td>

                  {/* per */}
                  <td className="border-r border-black px-2 py-2.5 text-center font-normal">
                    {item.unit || "Qty"}
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-2.5 text-right font-normal font-mono">
                    {formatINR(item.amount)}
                  </td>
                </tr>
              ))}

              {/* Vertical spacing row to match reference layout */}
              <tr className="h-52">
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
              </tr>

              {/* Total Row */}
              <tr className="border-t border-black font-bold">
                <td className="border-r border-black px-3 py-2 text-right">
                  Total
                </td>
                <td className="border-r border-black px-2 py-2 text-center font-mono">
                  {Number(invoice.totalQuantity || 0).toFixed(2)}
                </td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="border-r border-black px-2 py-2"></td>
                <td className="px-3 py-2 text-right font-mono text-sm">
                  {formatINR(invoice.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Under Table: E. & O.E */}
        <div className="mt-1 text-right text-[10px] italic">
          E. & O.E
        </div>

        {/* Amount in words & Bank Details */}
        <div className="mt-2 grid grid-cols-2 gap-6 text-xs">
          {/* Left: Amount Chargeable (in words) */}
          <div>
            <span className="text-[11px] block">
              Amount Chargeable (in words)
            </span>
            <p className="mt-1 font-bold leading-relaxed font-serif text-[11px]">
              {invoice.amountInWords || "INR Zero only."}
            </p>
          </div>

          {/* Right: Company's Bank Details */}
          {(company.bankName || company.accountNumber) && (
            <div className="text-[11px] leading-relaxed pl-8">
              <span className="font-normal block mb-1">Company’s Bank Details</span>
              <div className="space-y-0.5">
                <div className="flex">
                  <span className="w-24 shrink-0 text-slate-800">Bank Name</span>
                  <span className="font-bold">: {company.bankName}</span>
                </div>
                <div className="flex">
                  <span className="w-24 shrink-0 text-slate-800">A/c No.</span>
                  <span className="font-bold font-mono">: {company.accountNumber}</span>
                </div>
                {company.branchAndIfsc && (
                  <div className="mt-1">
                    <span className="text-slate-800">Branch & IFS Code: </span>
                    <span className="font-mono font-bold">{company.branchAndIfsc}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Declaration and Signatory */}
        <div className="mt-12 grid grid-cols-2 gap-6 text-xs items-end">
          {/* Declaration Left */}
          <div>
            <span className="text-[10px] block font-normal">Declaration</span>
            <p className="mt-1 text-[10px] leading-tight max-w-xs text-slate-900">
              {company.declaration ||
                "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
            </p>
          </div>

          {/* Signatory Right */}
          <div className="text-right">
            <span className="text-xs font-bold block">
              for {company.companyName || "Shree Shyam Electronics"}
            </span>
            <div className="h-12 flex items-center justify-end">
              {/* Space for stamp/signature */}
            </div>
            <span className="text-xs block font-normal">
              {company.signatoryTitle || "Authorised Signatory"}
            </span>
          </div>
        </div>

        {/* Bottom Centered: This is a Computer Generated Invoice */}
        <div className="mt-14 text-center">
          <span className="text-[10px] tracking-wider inline-block border-b border-black pb-0.5">
            This is a Computer Generated Invoice
          </span>
        </div>
      </div>
    </div>
  );
}
