"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceDoc, ProductDoc, CompanyQuotationSettings } from "@/lib/mongodb";
import type { CustomerSummary } from "@/app/api/admin/customers/route";
import {
  calculateInvoiceLineItem,
  calculateInvoiceTotals,
  formatINR,
  type TaxTreatment,
} from "@/lib/invoice-calculations";

interface QuotationOption {
  requestId: string;
  customerName: string;
  equipment: string;
  quantity: number;
}

interface InvoiceFormProps {
  initialInvoice?: InvoiceDoc | null;
  isEdit?: boolean;
}

export default function InvoiceForm({ initialInvoice, isEdit = false }: InvoiceFormProps) {
  const router = useRouter();

  // Loading state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aux state for dropdowns
  const [catalogProducts, setCatalogProducts] = useState<ProductDoc[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanyQuotationSettings | null>(null);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice?.invoiceNumber || ""
  );
  const [invoiceDate, setInvoiceDate] = useState(
    initialInvoice?.invoiceDate
      ? new Date(initialInvoice.invoiceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialInvoice?.dueDate
      ? new Date(initialInvoice.dueDate).toISOString().split("T")[0]
      : ""
  );
  const [poNumber, setPoNumber] = useState(initialInvoice?.poNumber || "");
  const [quotationReference, setQuotationReference] = useState(
    initialInvoice?.quotationReference || ""
  );

  // Customer State
  const [customer, setCustomer] = useState({
    customerName: initialInvoice?.customer?.customerName || "",
    facilityName: initialInvoice?.customer?.facilityName || "",
    billingAddress: initialInvoice?.customer?.billingAddress || "",
    city: initialInvoice?.customer?.city || "",
    state: initialInvoice?.customer?.state || "Maharashtra",
    stateCode: initialInvoice?.customer?.stateCode || "27",
    pinCode: initialInvoice?.customer?.pinCode || "",
    contactPerson: initialInvoice?.customer?.contactPerson || "",
    phone: initialInvoice?.customer?.phone || "",
    email: initialInvoice?.customer?.email || "",
    gstin: initialInvoice?.customer?.gstin || "",
    customerReference: initialInvoice?.customer?.customerReference || "",
  });

  // Items State
  const [items, setItems] = useState<
    Array<{
      productId?: string;
      productCode?: string;
      description: string;
      detailedDescription?: string;
      quantity: number;
      unit: string;
      rate: number;
      discount: number;
      taxRate: number;
      taxableAmount: number;
      taxAmount: number;
      amount: number;
    }>
  >(
    initialInvoice?.items?.length
      ? initialInvoice.items.map((it) => {
          const initialTaxType = initialInvoice?.taxType || "NONE";
          const effectiveTaxRate = initialTaxType === "NONE" ? 0 : (it.taxRate || 0);
          return {
            productId: it.productId,
            productCode: it.productCode,
            description: it.description,
            detailedDescription: it.detailedDescription,
            quantity: it.quantity,
            unit: it.unit || "Qty",
            rate: it.rate,
            discount: it.discount || 0,
            taxRate: effectiveTaxRate,
            taxableAmount: it.taxableAmount || it.amount,
            taxAmount: initialTaxType === "NONE" ? 0 : (it.taxAmount || 0),
            amount: it.amount,
          };
        })
      : [
          {
            description: "",
            detailedDescription: "",
            quantity: 1,
            unit: "Qty",
            rate: 0,
            discount: 0,
            taxRate: 0,
            taxableAmount: 0,
            taxAmount: 0,
            amount: 0,
          },
        ]
  );

  // Financial Summary State
  const [taxType, setTaxType] = useState<TaxTreatment>(
    initialInvoice?.taxType || "NONE"
  );
  const [additionalCharges, setAdditionalCharges] = useState<number>(
    initialInvoice?.additionalCharges || 0
  );
  const [additionalChargesNote, setAdditionalChargesNote] = useState(
    initialInvoice?.additionalChargesNote || ""
  );
  const [applyRoundOff, setApplyRoundOff] = useState(
    Boolean(initialInvoice?.roundOff)
  );
  const [notes, setNotes] = useState(initialInvoice?.notes || "");

  // Load supporting catalog products, customers, quotations, and company settings
  useEffect(() => {
    let cancelled = false;

    async function loadAux() {
      try {
        setLoading(true);
        const [prodRes, custRes, quoteRes, settingsRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/admin/customers"),
          fetch("/api/admin/quotations"),
          fetch("/api/admin/settings/company"),
        ]);

        if (prodRes.ok) {
          const pData = await prodRes.json();
          if (!cancelled && pData.success) {
            setCatalogProducts(pData.products || []);
          }
        }

        if (custRes.ok) {
          const cData = await custRes.json();
          if (!cancelled && cData.success) {
            setCustomers(cData.customers || []);
          }
        }

        if (quoteRes.ok) {
          const qData = await quoteRes.json();
          if (!cancelled && qData.success && Array.isArray(qData.quotations)) {
            setQuotations(
              qData.quotations.map((q: { requestId: string; customerName: string; equipment: string; quantity: number }) => ({
                requestId: q.requestId,
                customerName: q.customerName,
                equipment: q.equipment,
                quantity: q.quantity,
              }))
            );
          }
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (!cancelled && sData.success) {
            setCompanySettings(sData.settings);
            // Default prefix preview if creating new invoice
            if (!isEdit && !invoiceNumber && sData.settings?.invoicePrefix) {
              setInvoiceNumber(`${sData.settings.invoicePrefix}XXXX`);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load auxiliary invoice data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAux();
    return () => {
      cancelled = true;
    };
  }, [isEdit, invoiceNumber]);

  function handleTaxTypeChange(newType: TaxTreatment) {
    setTaxType(newType);
    const updated = items.map((it) => {
      const targetTaxRate = newType === "NONE" ? 0 : Number(it.taxRate) || 0;
      const calc = calculateInvoiceLineItem({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate) || 0,
        unit: it.unit || "Qty",
        discount: Number(it.discount) || 0,
        taxRate: targetTaxRate,
        taxTreatment: newType,
      });
      return {
        ...it,
        taxRate: targetTaxRate,
        discount: calc.discountAmount,
        taxableAmount: calc.taxableAmount,
        taxAmount: calc.taxAmount,
        amount: calc.totalAmount,
      };
    });
    setItems(updated);
  }

  // Recalculate line item on change
  function handleItemChange(
    index: number,
    field: string,
    value: string | number
  ) {
    const updated = [...items];
    const target = { ...updated[index], [field]: value };
    const effectiveTaxRate = taxType === "NONE" ? 0 : (Number(target.taxRate) || 0);

    const calc = calculateInvoiceLineItem({
      description: target.description,
      quantity: Number(target.quantity) || 1,
      rate: Number(target.rate) || 0,
      unit: target.unit || "Qty",
      discount: Number(target.discount) || 0,
      taxRate: effectiveTaxRate,
      taxTreatment: taxType,
    });

    target.discount = calc.discountAmount;
    target.taxRate = effectiveTaxRate;
    target.taxableAmount = calc.taxableAmount;
    target.taxAmount = calc.taxAmount;
    target.amount = calc.totalAmount;

    updated[index] = target;
    setItems(updated);
  }

  function handleProductSelect(index: number, productCode: string) {
    const matched = catalogProducts.find((p) => p.productCode === productCode);
    if (matched) {
      handleItemChange(index, "description", matched.name);
      const updated = [...items];
      updated[index].productCode = matched.productCode;
      updated[index].productId = matched._id?.toString();
      if (matched.model) {
        updated[index].detailedDescription = `Model: ${matched.model}`;
      }
      setItems(updated);
    }
  }

  function addItem() {
    setItems([
      ...items,
      {
        description: "",
        detailedDescription: "",
        quantity: 1,
        unit: "Qty",
        rate: 0,
        discount: 0,
        taxRate: 0,
        taxableAmount: 0,
        taxAmount: 0,
        amount: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      setError("An invoice must contain at least one line item.");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  }

  // Pre-fill customer from directory
  function handleCustomerSelect(selectedEmail: string) {
    const matched = customers.find((c) => c.email === selectedEmail);
    if (matched) {
      setCustomer((prev) => ({
        ...prev,
        customerName: matched.name || prev.customerName,
        facilityName: matched.facility || prev.facilityName,
        email: matched.email || prev.email,
        phone: matched.phone || prev.phone,
        contactPerson: matched.name || prev.contactPerson,
      }));
    }
  }

  // Pre-fill quotation items
  async function handleQuotationSelect(reqId: string) {
    setQuotationReference(reqId);
    if (!reqId) return;

    try {
      const res = await fetch(`/api/admin/quotations/${reqId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.quotation) {
          const q = data.quotation;
          // Fill customer
          setCustomer((prev) => ({
            ...prev,
            customerName: q.customerName || prev.customerName,
            facilityName: q.facility || prev.facilityName,
            email: q.customerEmail || prev.email,
            phone: q.phone || prev.phone,
          }));

          // Fill commercial quote items if available
          if (q.commercialQuote?.items?.length) {
            const isTaxExempt = taxType === "NONE";
            const importedItems = q.commercialQuote.items.map((it: { productId?: string; productCode?: string; productName: string; quantity: number; unitPrice: number; discountAmount?: number; gstRate?: number }) => {
              const effectiveTaxRate = isTaxExempt ? 0 : (it.gstRate || 0);
              const calc = calculateInvoiceLineItem({
                description: it.productName,
                quantity: it.quantity,
                rate: it.unitPrice,
                discount: it.discountAmount,
                taxRate: effectiveTaxRate,
                taxTreatment: taxType,
              });
              return {
                productId: it.productId,
                productCode: it.productCode,
                description: it.productName,
                detailedDescription: it.productCode ? `Item Code: ${it.productCode}` : undefined,
                quantity: it.quantity,
                unit: "Qty",
                rate: it.unitPrice,
                discount: calc.discountAmount,
                taxRate: effectiveTaxRate,
                taxableAmount: calc.taxableAmount,
                taxAmount: calc.taxAmount,
                amount: calc.totalAmount,
              };
            });
            setItems(importedItems);
          } else if (q.equipment) {
            setItems([
              {
                description: q.equipment,
                quantity: q.quantity || 1,
                unit: "Qty",
                rate: 0,
                discount: 0,
                taxRate: 0,
                taxableAmount: 0,
                taxAmount: 0,
                amount: 0,
              },
            ]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to prefill from quotation:", err);
    }
  }

  // Live Totals
  const liveTotals = calculateInvoiceTotals({
    items,
    taxTreatment: taxType,
    additionalCharges,
    applyRoundOff,
  });

  async function handleSave(action: "SAVE_DRAFT" | "FINALIZE") {
    setError(null);

    // Validation
    if (!customer.customerName.trim()) {
      setError("Customer / Party Name is required.");
      return;
    }

    if (items.some((it) => !it.description.trim())) {
      setError("All line items must have a description or product name.");
      return;
    }

    if (items.some((it) => it.quantity <= 0)) {
      setError("Line item quantities must be greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        action,
        invoiceNumber: invoiceNumber.includes("XXXX") ? undefined : invoiceNumber.trim() || undefined,
        invoiceDate,
        dueDate: dueDate || undefined,
        poNumber: poNumber.trim() || undefined,
        quotationReference: quotationReference.trim() || undefined,
        customer,
        items,
        taxType,
        additionalCharges,
        additionalChargesNote: additionalChargesNote.trim() || undefined,
        applyRoundOff,
        notes: notes.trim() || undefined,
      };

      const url = isEdit && initialInvoice
        ? `/api/admin/invoices/${initialInvoice.invoiceId}`
        : "/api/admin/invoices";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const targetId = data.invoice?.invoiceId || initialInvoice?.invoiceId;
        router.push(`/admin/invoices/${targetId}`);
      } else {
        setError(data.message || "Failed to save invoice.");
      }
    } catch {
      setError("Network error saving invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 shadow-2xs">
          {error}
        </div>
      )}

      {/* Section A: Invoice Metadata */}
      {companySettings && (!companySettings.bankName || !companySettings.accountNumber) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Company Bank Details Incomplete:</strong> Invoices generated will omit bank transfer details until configured under Invoice Settings.
            </span>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Section A — Invoice Information
            </h2>
            <p className="text-xs text-slate-500">
              Unique identifier, issuance date, purchase reference, and quotation link.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0F9F95]">
            {isEdit ? "Editing Invoice" : "New Invoice"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. 00103/0386"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Auto-generated server sequence if left blank or containing XXXX.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Invoice Date *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              PO / Reference Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-AKOLA-2026-04"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
            />
          </div>

          {/* Related Quotation Link */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Import from Quotation Request (Optional)
            </label>
            <select
              value={quotationReference}
              onChange={(e) => handleQuotationSelect(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:border-teal-600 focus:outline-none"
            >
              <option value="">-- Direct Sale / No Quotation Link --</option>
              {quotations.map((q) => (
                <option key={q.requestId} value={q.requestId}>
                  {q.requestId} • {q.customerName} ({q.equipment} × {q.quantity})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Selecting a quotation will automatically pre-fill customer details and equipment items.
            </span>
          </div>
        </div>
      </div>

      {/* Section B: Customer / Party Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Section B — Customer / Party Details
            </h2>
            <p className="text-xs text-slate-500">
              Healthcare institution, hospital or clinic billing address and tax identifiers.
            </p>
          </div>

          {/* Customer prefill selector */}
          {customers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Select existing:</span>
              <select
                onChange={(e) => handleCustomerSelect(e.target.value)}
                defaultValue=""
                className="h-8 rounded-lg border border-slate-300 px-2.5 text-xs text-slate-900 bg-white focus:border-teal-600 focus:outline-none max-w-xs"
              >
                <option value="">-- Choose from recognized directory --</option>
                {customers.map((c) => (
                  <option key={c.email} value={c.email}>
                    {c.name} {c.facility ? `(${c.facility})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="lg:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Customer / Hospital / Party Name *
            </label>
            <input
              type="text"
              value={customer.customerName}
              onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })}
              placeholder="e.g. Care Hospital Cardiac & Superspeciality Center, Akola"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Facility / Department
            </label>
            <input
              type="text"
              value={customer.facilityName}
              onChange={(e) => setCustomer({ ...customer, facilityName: e.target.value })}
              placeholder="e.g. ICU / Cardiology Dept"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Billing Address
            </label>
            <input
              type="text"
              value={customer.billingAddress}
              onChange={(e) => setCustomer({ ...customer, billingAddress: e.target.value })}
              placeholder="e.g. Station Road, Near Civil Hospital"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={customer.city}
              onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
              placeholder="e.g. Akola"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              State
            </label>
            <input
              type="text"
              value={customer.state}
              onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              State Code
            </label>
            <input
              type="text"
              value={customer.stateCode}
              onChange={(e) => setCustomer({ ...customer, stateCode: e.target.value })}
              placeholder="27"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              PIN / Postal Code
            </label>
            <input
              type="text"
              value={customer.pinCode}
              onChange={(e) => setCustomer({ ...customer, pinCode: e.target.value })}
              placeholder="444001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              value={customer.contactPerson}
              onChange={(e) => setCustomer({ ...customer, contactPerson: e.target.value })}
              placeholder="Dr. Patil / Purchase Officer"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              placeholder="98XXXXXXXX"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Customer Email
            </label>
            <input
              type="email"
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              placeholder="billing@carehospital.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Customer GSTIN (If registered)
            </label>
            <input
              type="text"
              value={customer.gstin}
              onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })}
              placeholder="27ABCDE1234F1Z5"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono uppercase focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Section C: Line Items */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Section C — Invoice Equipment & Line Items
            </h2>
            <p className="text-xs text-slate-500">
              Select biomedical equipment from the catalog or enter manual product descriptions and rates.
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-[#0B827B] hover:bg-teal-100 transition-colors cursor-pointer"
          >
            <span>+ Add Line Item</span>
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10243A] text-white text-[10px]">
                    {idx + 1}
                  </span>
                  <span>Item #{idx + 1}</span>
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline cursor-pointer"
                  >
                    Remove Item
                  </button>
                )}
              </div>

              {/* Product catalog pre-fill selector */}
              {catalogProducts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Choose from Biomedical Product Catalog
                    </label>
                    <select
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      value={item.productCode || ""}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    >
                      <option value="">-- Custom / Manual Entry --</option>
                      {catalogProducts.map((p) => (
                        <option key={p.productCode} value={p.productCode}>
                          [{p.productCode}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Description of Goods (Appears on Invoice Table) *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      placeholder="e.g. LifeCare 5para Monitor"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-teal-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Rates and calculations row */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 font-mono text-center focus:border-teal-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Per / Unit</label>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                    placeholder="Qty"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 text-center focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.rate}
                    onChange={(e) => handleItemChange(idx, "rate", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 font-mono text-right focus:border-teal-600 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.discount}
                    onChange={(e) => handleItemChange(idx, "discount", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 font-mono text-right focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">
                    Tax Rate (%) {taxType === "NONE" && <span className="text-slate-400 font-normal">(Exempt)</span>}
                  </label>
                  <select
                    value={taxType === "NONE" ? 0 : item.taxRate}
                    disabled={taxType === "NONE"}
                    onChange={(e) => handleItemChange(idx, "taxRate", Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900 focus:border-teal-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-600 mb-1">Line Total</label>
                  <div className="h-8.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-slate-900 font-mono font-bold text-right flex items-center justify-end">
                    ₹{formatINR(item.amount)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Section D & E: Financial Summary & Amount in Words */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Tax Options & Notes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Tax Treatment & Additional Adjustments
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GST Tax Classification
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "NONE", label: "No Tax / Standard" },
                  { id: "INTRA_STATE", label: "Intra-State (CGST + SGST)" },
                  { id: "INTER_STATE", label: "Inter-State (IGST)" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTaxTypeChange(t.id as TaxTreatment)}
                    className={`rounded-lg border p-2 text-center text-xs font-semibold transition-all cursor-pointer ${
                      taxType === t.id
                        ? "border-[#0F9F95] bg-teal-50 text-[#0B827B]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Additional Charges (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Charges Description
                </label>
                <input
                  type="text"
                  value={additionalChargesNote}
                  onChange={(e) => setAdditionalChargesNote(e.target.value)}
                  placeholder="e.g. Shipping / Installation Charges"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="applyRoundOff"
                checked={applyRoundOff}
                onChange={(e) => setApplyRoundOff(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="applyRoundOff" className="font-semibold text-slate-700 cursor-pointer">
                Apply Integer Round Off to Final Invoice Amount
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Internal Remarks / Customer Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional delivery notes or customer special instructions..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Financial Summary & Amount in Words */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Section D & E — Financial Summary & Words
            </h2>

            <div className="mt-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal (Gross):</span>
                <span className="font-mono font-medium">₹{formatINR(liveTotals.subtotal)}</span>
              </div>

              {liveTotals.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span className="font-mono font-medium">- ₹{formatINR(liveTotals.totalDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between font-semibold text-slate-900">
                <span>Taxable Amount:</span>
                <span className="font-mono">₹{formatINR(liveTotals.taxableAmount)}</span>
              </div>

              {taxType === "INTRA_STATE" && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (Central Tax):</span>
                    <span className="font-mono">₹{formatINR(liveTotals.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (State Tax):</span>
                    <span className="font-mono">₹{formatINR(liveTotals.sgstAmount)}</span>
                  </div>
                </>
              )}

              {taxType === "INTER_STATE" && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (Integrated Tax):</span>
                  <span className="font-mono">₹{formatINR(liveTotals.igstAmount)}</span>
                </div>
              )}

              {liveTotals.additionalCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Additional Charges:</span>
                  <span className="font-mono">₹{formatINR(liveTotals.additionalCharges)}</span>
                </div>
              )}

              {applyRoundOff && (
                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">₹{formatINR(liveTotals.roundOff)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-base font-bold text-slate-950">
                <span>Grand Total:</span>
                <span className="font-mono text-xl text-[#0B827B]">
                  ₹{formatINR(liveTotals.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Amount in words display */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 mt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Amount Chargeable (in words)
            </span>
            <p className="font-serif italic text-xs font-semibold text-slate-900 leading-relaxed">
              {liveTotals.amountInWords}
            </p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={() => router.push("/admin/invoices")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-full sm:w-auto"
        >
          ← Cancel and Return
        </button>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            disabled={submitting || loading}
            onClick={() => handleSave("SAVE_DRAFT")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save as Draft"}
          </button>

          <button
            type="button"
            disabled={submitting || loading}
            onClick={() => handleSave("FINALIZE")}
            className="rounded-lg bg-[#0F9F95] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0B827B] transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>✓</span>
            <span>{submitting ? "Processing..." : "Save & Finalize Invoice"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
