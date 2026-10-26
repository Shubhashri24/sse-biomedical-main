"use client";

import { useState, useEffect } from "react";
import type {
  CommercialQuotation,
  CompanyQuotationSettings,
  QuotationCommercialItem,
  DiscountType,
  ProductDoc,
} from "@/lib/mongodb";
import {
  calculateLineItem,
  calculateQuotationTotals,
  formatINR,
} from "@/lib/quotation-calculations";

interface QuotationBuilderProps {
  requestId: string;
  initialQuote?: CommercialQuotation | null;
  onSaved: (quote: CommercialQuotation) => void;
  onClose?: () => void;
}

export default function CommercialQuotationBuilder({
  requestId,
  onSaved,
  onClose,
}: QuotationBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Quote State
  const [quote, setQuote] = useState<CommercialQuotation | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanyQuotationSettings | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<ProductDoc[]>([]);

  // Feedback notifications
  const [statusNotice, setStatusNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Modals
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [showCompanySettingsModal, setShowCompanySettingsModal] = useState(false);
  const [resendConfirmed, setResendConfirmed] = useState(false);

  // Load quotation commercial data and product catalog
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const [commRes, productsRes] = await Promise.all([
          fetch(`/api/admin/quotations/${requestId}/commercial`),
          fetch("/api/products"),
        ]);

        if (commRes.ok) {
          const commData = await commRes.json();
          if (!isCancelled && commData.success) {
            setQuote(commData.commercialQuote);
            setCompanySettings(commData.companySettings);
          }
        }

        if (productsRes.ok) {
          const prodData = await productsRes.json();
          if (!isCancelled && prodData.success) {
            setCatalogProducts(prodData.products || []);
          }
        }
      } catch (err) {
        console.error("Failed to load commercial quotation data:", err);
        setStatusNotice({ type: "error", msg: "Failed to load quotation data from server." });
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [requestId]);

  // Recalculate quotation line items and totals
  function updateLineItem(index: number, updates: Partial<QuotationCommercialItem>) {
    if (!quote) return;

    const nextItems = [...quote.items];
    const item = { ...nextItems[index], ...updates };

    const calc = calculateLineItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountType: item.discountType,
      discountValue: item.discountValue,
      gstRate: item.gstRate,
    });

    nextItems[index] = {
      ...item,
      discountAmount: calc.discountAmount,
      taxableAmount: calc.taxableAmount,
      gstAmount: calc.gstAmount,
      totalAmount: calc.totalAmount,
    };

    const totals = calculateQuotationTotals(nextItems);

    setQuote({
      ...quote,
      items: nextItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
    });
  }

  function handleProductSelect(index: number, selectedCode: string) {
    const matched = catalogProducts.find((p) => p.productCode === selectedCode);
    if (matched) {
      updateLineItem(index, {
        productCode: matched.productCode,
        productName: matched.name,
        productId: matched._id?.toString(),
      });
    } else {
      updateLineItem(index, { productCode: selectedCode });
    }
  }

  function addLineItem() {
    if (!quote) return;
    const newItem: QuotationCommercialItem = {
      productCode: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      discountType: "PERCENT",
      discountValue: 0,
      discountAmount: 0,
      taxableAmount: 0,
      gstRate: 0,
      gstAmount: 0,
      totalAmount: 0,
    };

    const nextItems = [...quote.items, newItem];
    const totals = calculateQuotationTotals(nextItems);

    setQuote({
      ...quote,
      items: nextItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
    });
  }

  function removeLineItem(index: number) {
    if (!quote || quote.items.length <= 1) {
      setStatusNotice({ type: "error", msg: "A quotation must have at least one line item." });
      return;
    }
    const nextItems = quote.items.filter((_, i) => i !== index);
    const totals = calculateQuotationTotals(nextItems);

    setQuote({
      ...quote,
      items: nextItems,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
    });
  }

  // Terms and conditions handlers
  function updateTerm(index: number, val: string) {
    if (!quote) return;
    const nextTerms = [...quote.terms];
    nextTerms[index] = val;
    setQuote({ ...quote, terms: nextTerms });
  }

  function addTerm() {
    if (!quote) return;
    setQuote({ ...quote, terms: [...quote.terms, ""] });
  }

  function removeTerm(index: number) {
    if (!quote) return;
    setQuote({ ...quote, terms: quote.terms.filter((_, i) => i !== index) });
  }

  // Save Draft
  async function handleSaveDraft() {
    if (!quote) return;
    setSaving(true);
    setStatusNotice(null);

    try {
      const res = await fetch(`/api/admin/quotations/${requestId}/commercial`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quote,
          action: "SAVE_DRAFT",
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (res.ok && data?.success) {
        setQuote(data.commercialQuote);
        onSaved(data.commercialQuote);
        setStatusNotice({ type: "success", msg: "Quotation draft saved successfully." });
      } else {
        setStatusNotice({ type: "error", msg: data?.message || `Failed to save draft (HTTP ${res.status}).` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusNotice({ type: "error", msg: `Network error saving draft: ${msg}` });
    } finally {
      setSaving(false);
    }
  }

  // Finalize Quote
  async function handleFinalize() {
    if (!quote) return;
    setFinalizing(true);
    setStatusNotice(null);

    try {
      const res = await fetch(`/api/admin/quotations/${requestId}/commercial`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quote,
          action: "FINALIZE",
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (res.ok && data?.success) {
        setQuote(data.commercialQuote);
        onSaved(data.commercialQuote);
        setStatusNotice({
          type: "success",
          msg: `Quotation finalized as version ${data.commercialQuote.version}. Ready to generate official PDF or email.`,
        });
      } else {
        setStatusNotice({ type: "error", msg: data?.message || `Failed to finalize quotation (HTTP ${res.status}).` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusNotice({ type: "error", msg: `Network error finalizing quotation: ${msg}` });
    } finally {
      setFinalizing(false);
    }
  }

  // Email Quotation PDF
  async function handleSendEmail(confirmedResend = false) {
    if (!quote) return;
    setSendingEmail(true);
    setStatusNotice(null);

    try {
      const res = await fetch(`/api/admin/quotations/${requestId}/commercial/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmResend: confirmedResend }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (res.status === 409 && data?.requiresConfirmation) {
        setResendConfirmed(true);
        setStatusNotice({
          type: "info",
          msg: "Quotation was already dispatched recently. Please confirm if you wish to re-send.",
        });
        return;
      }

      if (res.ok && data?.success) {
        setShowEmailConfirm(false);
        setResendConfirmed(false);
        setStatusNotice({
          type: "success",
          msg: `Quotation PDF dispatched successfully to ${quote.billingDetails.email}.`,
        });
        // Refresh quote status
        const commRes = await fetch(`/api/admin/quotations/${requestId}/commercial`);
        const commData = await commRes.json().catch(() => null);
        if (commData?.success && commData?.commercialQuote) {
          setQuote(commData.commercialQuote);
          onSaved(commData.commercialQuote);
        }
      } else {
        setStatusNotice({ type: "error", msg: data?.message || `Failed to send email (HTTP ${res.status}).` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusNotice({ type: "error", msg: `Network error sending email: ${msg}` });
    } finally {
      setSendingEmail(false);
    }
  }

  // Update Company Settings
  async function handleSaveCompanySettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!companySettings) return;

    try {
      const res = await fetch("/api/admin/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCompanySettings(data.settings);
        setShowCompanySettingsModal(false);
        setStatusNotice({ type: "success", msg: "Company header information updated." });
      } else {
        setStatusNotice({ type: "error", msg: data.message || "Failed to update company settings." });
      }
    } catch {
      setStatusNotice({ type: "error", msg: "Network error updating company settings." });
    }
  }

  if (loading || !quote) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-xs text-[#64748B] shadow-xs">
        Loading commercial quotation editor...
      </div>
    );
  }

  const pdfUrl = `/api/admin/quotations/${requestId}/commercial/pdf`;
  const isFinalized = quote.status === "FINALIZED";

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#172033]">
              Commercial Quotation Builder: <span className="font-mono text-[#0F9F95] font-bold">{quote.quotationNumber}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                isFinalized
                  ? "border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                  : "border border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isFinalized ? "bg-[#15803D]" : "bg-[#B45309]"}`} />
              {isFinalized ? `Finalized (v${quote.version})` : "Draft In Progress"}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            Formulate itemized pricing, taxes, terms, and generate professional PDF matching Shree Shyam Electronics standards.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCompanySettingsModal(true)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#CBD5E1] transition-all shadow-2xs cursor-pointer"
          >
            ⚙ Company Header
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={() => setShowPdfPreview(true)}
            className="rounded-lg border border-[#99E2DC] bg-[#E6F7F5] px-3.5 py-1.5 text-xs font-semibold text-[#0F9F95] hover:bg-[#0F9F95] hover:text-white transition-all shadow-2xs cursor-pointer"
          >
            📄 Preview PDF
          </button>

          <a
            href={`${pdfUrl}?download=true`}
            download={quote.pdfFilename || `Quotation-${quote.quotationNumber}.pdf`}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs cursor-pointer"
          >
            ⬇ Download PDF
          </a>

          <button
            type="button"
            onClick={handleFinalize}
            disabled={finalizing}
            className="rounded-lg bg-[#15803D] hover:bg-[#166534] px-3.5 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {finalizing ? "Finalizing..." : isFinalized ? "Create Revision" : "✓ Finalize Quote"}
          </button>

          <button
            type="button"
            onClick={() => setShowEmailConfirm(true)}
            disabled={sendingEmail}
            className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50 shadow-xs cursor-pointer"
          >
            ✉ Send to Customer
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs text-[#64748B] hover:text-[#172033] cursor-pointer"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Notification banner */}
      {statusNotice && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-semibold ${
            statusNotice.type === "success"
              ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
              : statusNotice.type === "error"
              ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
              : "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]"
          }`}
        >
          {statusNotice.msg}
        </div>
      )}

      {/* 1. Customer Billing Profile (BILL TO Snapshot) */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F9F95]">
              Customer Billing Details (BILL TO)
            </span>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Edit billing details for this quotation. Changes here do not overwrite the customer&apos;s master contact profile.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div>
            <label className="text-[#172033] font-semibold block mb-1">Customer / Contact Name *</label>
            <input
              type="text"
              value={quote.billingDetails.customerName}
              onChange={(e) =>
                setQuote({
                  ...quote,
                  billingDetails: { ...quote.billingDetails, customerName: e.target.value },
                })
              }
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[#172033] font-semibold block mb-1">Hospital / Clinic / Organization</label>
            <input
              type="text"
              value={quote.billingDetails.organizationName || ""}
              onChange={(e) =>
                setQuote({
                  ...quote,
                  billingDetails: { ...quote.billingDetails, organizationName: e.target.value },
                })
              }
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[#172033] font-semibold block mb-1">Customer Email *</label>
            <input
              type="email"
              value={quote.billingDetails.email}
              onChange={(e) =>
                setQuote({
                  ...quote,
                  billingDetails: { ...quote.billingDetails, email: e.target.value },
                })
              }
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[#172033] font-semibold block mb-1">Phone Number</label>
            <input
              type="text"
              value={quote.billingDetails.phone}
              onChange={(e) =>
                setQuote({
                  ...quote,
                  billingDetails: { ...quote.billingDetails, phone: e.target.value },
                })
              }
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[#172033] font-semibold block mb-1">Street Address</label>
            <input
              type="text"
              value={quote.billingDetails.address || ""}
              onChange={(e) =>
                setQuote({
                  ...quote,
                  billingDetails: { ...quote.billingDetails, address: e.target.value },
                })
              }
              placeholder="e.g. Near Collector Office, Ramdas Peth"
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[#172033] font-semibold block mb-1">City</label>
              <input
                type="text"
                value={quote.billingDetails.city || ""}
                onChange={(e) =>
                  setQuote({
                    ...quote,
                    billingDetails: { ...quote.billingDetails, city: e.target.value },
                  })
                }
                placeholder="e.g. Akola"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[#172033] font-semibold block mb-1">PIN / Postal</label>
              <input
                type="text"
                value={quote.billingDetails.postalCode || ""}
                onChange={(e) =>
                  setQuote({
                    ...quote,
                    billingDetails: { ...quote.billingDetails, postalCode: e.target.value },
                  })
                }
                placeholder="444001"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[#172033] font-semibold block mb-1">State</label>
              <input
                type="text"
                value={quote.billingDetails.state || ""}
                onChange={(e) =>
                  setQuote({
                    ...quote,
                    billingDetails: { ...quote.billingDetails, state: e.target.value },
                  })
                }
                placeholder="Maharashtra"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[#172033] font-semibold block mb-1">Country</label>
              <input
                type="text"
                value={quote.billingDetails.country || "India"}
                onChange={(e) =>
                  setQuote({
                    ...quote,
                    billingDetails: { ...quote.billingDetails, country: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Itemized Equipment Table (Matching Reference Sample) */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F9F95]">
              Itemized Equipment &amp; Commercial Pricing Schedule
            </span>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Configure products, quantities, prices, discounts, and GST rates. Amounts recalculate automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={addLineItem}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F9F95] hover:bg-[#E6F7F5] hover:border-[#99E2DC] transition-all shadow-2xs cursor-pointer"
          >
            + Add Equipment Line
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold">
                <th className="py-2.5 px-3 min-w-[220px]">Product / Equipment Name</th>
                <th className="py-2.5 px-2 min-w-[100px]">Product Code</th>
                <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                <th className="py-2.5 px-2 min-w-[110px] text-right">Price (₹)</th>
                <th className="py-2.5 px-2 min-w-[140px] text-right">Discount</th>
                <th className="py-2.5 px-2 min-w-[100px] text-right">TAX/GST</th>
                <th className="py-2.5 px-3 min-w-[120px] text-right font-bold text-[#172033]">Amount (₹)</th>
                <th className="py-2.5 px-2 w-10 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {quote.items.map((it, idx) => (
                <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                  {/* Product Name & Catalog Picker */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={it.productName}
                        onChange={(e) => updateLineItem(idx, { productName: e.target.value })}
                        placeholder="e.g. Technocare 5 para multi board moniter"
                        className="w-full rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:outline-none"
                      />
                      {catalogProducts.length > 0 && (
                        <select
                          value={it.productCode || ""}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[11px] font-medium text-[#64748B] focus:border-[#0F9F95] focus:outline-none"
                        >
                          <option value="">-- Or pick from Catalog --</option>
                          {catalogProducts.map((p) => (
                            <option key={p.productCode} value={p.productCode}>
                              {p.productCode}: {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>

                  {/* Product Code */}
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      value={it.productCode}
                      onChange={(e) => updateLineItem(idx, { productCode: e.target.value })}
                      placeholder="e.g. MON-01"
                      className="w-full rounded-md border border-[#E2E8F0] bg-white px-2 py-1 font-mono text-xs font-bold text-[#0F9F95] focus:border-[#0F9F95] focus:outline-none"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="py-2.5 px-2 text-center">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={it.quantity}
                      onChange={(e) => updateLineItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                      className="w-16 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-center font-mono text-xs font-bold text-[#172033] focus:border-[#0F9F95] focus:outline-none"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={it.unitPrice}
                      onChange={(e) => updateLineItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-24 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-right font-mono text-xs font-bold text-[#172033] focus:border-[#0F9F95] focus:outline-none"
                    />
                  </td>

                  {/* Discount (Type + Value) */}
                  <td className="py-2.5 px-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <select
                        value={it.discountType}
                        onChange={(e) => updateLineItem(idx, { discountType: e.target.value as DiscountType })}
                        className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1 py-1 text-[11px] font-semibold text-[#172033] focus:border-[#0F9F95] focus:outline-none"
                      >
                        <option value="PERCENT">%</option>
                        <option value="FIXED">₹</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={it.discountValue}
                        onChange={(e) => updateLineItem(idx, { discountValue: parseFloat(e.target.value) || 0 })}
                        className="w-20 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-right font-mono text-xs font-bold text-[#172033] focus:border-[#0F9F95] focus:outline-none"
                      />
                    </div>
                    {it.discountAmount > 0 && (
                      <div className="text-[10px] text-[#B45309] font-semibold mt-0.5">
                        -₹{formatINR(it.discountAmount)}
                      </div>
                    )}
                  </td>

                  {/* TAX / GST */}
                  <td className="py-2.5 px-2 text-right">
                    <select
                      value={it.gstRate}
                      onChange={(e) => updateLineItem(idx, { gstRate: parseFloat(e.target.value) || 0 })}
                      className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-1 text-[11px] font-semibold text-[#172033] focus:border-[#0F9F95] focus:outline-none"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </select>
                    {it.gstAmount > 0 && (
                      <div className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                        +₹{formatINR(it.gstAmount)}
                      </div>
                    )}
                  </td>

                  {/* Final Line Amount */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#172033]">
                    ₹{formatINR(it.totalAmount)}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      title="Remove Item"
                      className="rounded-md p-1 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation Summary (Matches Sample Total Bar) */}
        <div className="mt-5 border-t border-[#F1F5F9] pt-4 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3 max-w-sm">
            <span className="text-xs font-bold text-[#172033] uppercase tracking-wider">
              Quotation Validity & Remarks
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[#64748B] font-semibold block mb-1">Quotation Date</label>
                <input
                  type="date"
                  value={new Date(quote.date).toISOString().split("T")[0]}
                  onChange={(e) => setQuote({ ...quote, date: new Date(e.target.value) })}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[#64748B] font-semibold block mb-1">Valid Until</label>
                <input
                  type="date"
                  value={new Date(quote.validUntil).toISOString().split("T")[0]}
                  onChange={(e) => setQuote({ ...quote, validUntil: new Date(e.target.value) })}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[#64748B] font-semibold block mb-1 text-xs">Customer Notes / Payment Remarks</label>
              <textarea
                rows={2}
                value={quote.notes || ""}
                onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
                placeholder="Optional customer-facing payment instructions or delivery notes..."
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] placeholder-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Grand Totals Card */}
          <div className="w-full md:w-80 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4.5 space-y-2.5 text-xs shadow-2xs">
            <div className="flex justify-between text-[#64748B]">
              <span className="font-semibold">Gross Subtotal:</span>
              <span className="font-mono font-bold text-[#172033]">₹{formatINR(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span className="font-semibold">Total Discount:</span>
              <span className="font-mono font-bold text-[#B45309]">-₹{formatINR(quote.totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span className="font-semibold">Taxable Value:</span>
              <span className="font-mono font-bold text-[#172033]">₹{formatINR(quote.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span className="font-semibold">Total GST:</span>
              <span className="font-mono font-bold text-[#172033]">+₹{formatINR(quote.totalTax)}</span>
            </div>
            <div className="border-t border-[#E2E8F0] pt-2.5 flex justify-between items-baseline text-sm font-bold text-[#172033]">
              <span className="text-[#0F9F95]">Final Grand Total:</span>
              <span className="font-mono text-xl text-[#15803D]">₹{formatINR(quote.grandTotal)}</span>
            </div>
            <div className="text-[11px] text-right text-[#94A3B8] font-mono">
              Currency: INR (₹)
            </div>
          </div>
        </div>
      </div>

      {/* 3. Terms & Conditions Section */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F9F95]">
              Terms &amp; Conditions
            </span>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              These terms will be printed on the bottom of the quotation PDF. Matching the reference sample defaults.
            </p>
          </div>
          <button
            type="button"
            onClick={addTerm}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-semibold text-[#172033] hover:border-[#CBD5E1] transition-all shadow-2xs cursor-pointer"
          >
            + Add Clause
          </button>
        </div>

        <div className="mt-4 space-y-2 text-xs">
          {quote.terms.map((term, tIdx) => (
            <div key={tIdx} className="flex items-center gap-2">
              <span className="text-[#94A3B8] font-mono font-bold">•</span>
              <input
                type="text"
                value={term}
                onChange={(e) => updateTerm(tIdx, e.target.value)}
                placeholder="Enter quotation clause..."
                className="flex-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => removeTerm(tIdx)}
                className="p-1 text-[#94A3B8] hover:text-[#B91C1C] cursor-pointer"
                title="Remove clause"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PDF PREVIEW MODAL */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="relative flex flex-col h-[90vh] w-full max-w-5xl rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#172033]">
                  PDF Preview: <span className="font-mono text-[#0F9F95]">Quotation-{quote.quotationNumber}.pdf</span>
                </span>
                <span className="text-xs text-[#64748B]">(Live Generated Server-Side PDF)</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`${pdfUrl}?download=true`}
                  download={quote.pdfFilename || `Quotation-${quote.quotationNumber}.pdf`}
                  className="rounded-lg bg-[#0F9F95] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0B827B] shadow-xs"
                >
                  ⬇ Download File
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-semibold text-[#172033] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Close ✕
                </button>
              </div>
            </div>
            <div className="flex-1 bg-[#F1F5F9] p-2">
              <iframe
                src={pdfUrl}
                title="Quotation PDF Preview"
                className="w-full h-full rounded-xl border border-[#E2E8F0]"
              />
            </div>
          </div>
        </div>
      )}

      {/* SEND EMAIL CONFIRMATION MODAL */}
      {showEmailConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#172033] border-b border-[#F1F5F9] pb-2">
              Dispatch Quotation PDF by Email
            </h3>

            {resendConfirmed && (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs font-semibold text-[#B45309]">
                ⚠️ Quotation was recently sent to this recipient. Confirming below will dispatch a fresh copy.
              </div>
            )}

            <div className="space-y-2 text-xs text-[#172033]">
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Recipient:</span>
                <span className="font-semibold text-[#172033]">{quote.billingDetails.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Customer Name:</span>
                <span className="font-semibold text-[#172033]">{quote.billingDetails.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Quotation No:</span>
                <span className="font-mono font-bold text-[#0F9F95]">{quote.quotationNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Payable Total:</span>
                <span className="font-mono font-bold text-[#15803D]">₹{formatINR(quote.grandTotal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Attachment:</span>
                <span className="font-bold text-[#0F9F95]">📎 Quotation-{quote.quotationNumber}.pdf</span>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Upon successful delivery, the status will automatically transition to{" "}
              <strong className="text-[#7E22CE]">QUOTATION_SENT</strong>, and the send event will be permanently recorded in the audit trail.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => {
                  setShowEmailConfirm(false);
                  setResendConfirmed(false);
                }}
                className="rounded-lg border border-[#E2E8F0] px-3.5 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172033] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingEmail}
                onClick={() => handleSendEmail(resendConfirmed)}
                className="rounded-lg bg-[#0F9F95] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {sendingEmail ? "Dispatching..." : "Confirm & Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPANY SETTINGS MODAL */}
      {showCompanySettingsModal && companySettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="relative w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#172033] border-b border-[#F1F5F9] pb-2">
              Configure Company Quotation Header
            </h3>
            <p className="text-xs text-[#64748B]">
              Update business details appearing on the quotation PDF header without editing source code.
            </p>

            <form onSubmit={handleSaveCompanySettings} className="space-y-3 text-xs">
              <div>
                <label className="text-[#172033] font-semibold block mb-1">Company Trade Name</label>
                <input
                  type="text"
                  value={companySettings.companyName}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, companyName: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#172033] font-semibold block mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    value={companySettings.contactPerson}
                    onChange={(e) =>
                      setCompanySettings({ ...companySettings, contactPerson: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#172033] font-semibold block mb-1">Official Contact Phone</label>
                  <input
                    type="text"
                    value={companySettings.phone}
                    onChange={(e) =>
                      setCompanySettings({ ...companySettings, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#172033] font-semibold block mb-1">Office Address Line</label>
                <input
                  type="text"
                  value={companySettings.address}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, address: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#172033] font-semibold block mb-1">Official Inquiries Email</label>
                  <input
                    type="email"
                    value={companySettings.email}
                    onChange={(e) =>
                      setCompanySettings({ ...companySettings, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#172033] font-semibold block mb-1">Default Quote Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={companySettings.defaultValidityDays}
                    onChange={(e) =>
                      setCompanySettings({
                        ...companySettings,
                        defaultValidityDays: parseInt(e.target.value, 10) || 30,
                      })
                    }
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowCompanySettingsModal(false)}
                  className="rounded-lg border border-[#E2E8F0] px-3.5 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#172033] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#0F9F95] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0B827B] shadow-xs cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
