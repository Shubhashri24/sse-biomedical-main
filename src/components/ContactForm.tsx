"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { categories as staticCategories } from "@/lib/data";
import { useRFQ } from "@/context/RFQContext";

export default function ContactForm() {
  const searchParams = useSearchParams();
  const { items: rfqItems, removeItem, updateQuantity, clearRFQ, openDrawer } = useRFQ();

  const paramEquipment = searchParams.get("equipment") || "";
  const paramCategory = searchParams.get("category") || "";
  const paramCode = searchParams.get("code") || "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    facility: "",
    category: paramCategory,
    equipment: paramEquipment,
    equipmentCode: paramCode,
    quantity: "1",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submittedRequestId, setSubmittedRequestId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Client-side validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setStatus("error");
      setErrorMessage("Please fill in all required contact fields (Full Name, Email, and Phone Number).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    // Determine payload items
    let payloadItems = [];
    if (rfqItems.length > 0) {
      payloadItems = rfqItems.map((i) => ({
        productId: i.productId,
        productCode: i.productCode,
        equipmentName: i.equipmentName,
        category: i.category,
        quantity: i.quantity,
      }));
    } else {
      if (!formData.equipment.trim()) {
        setStatus("error");
        setErrorMessage("Please specify the equipment required or add equipment from the catalog.");
        return;
      }
      const qty = parseInt(formData.quantity, 10);
      payloadItems = [
        {
          productCode: formData.equipmentCode.trim() || "GEN-01",
          equipmentName: formData.equipment.trim(),
          category: formData.category || "General",
          quantity: isNaN(qty) || qty < 1 ? 1 : qty,
        },
      ];
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          facility: formData.facility.trim(),
          items: payloadItems,
          equipment: formData.equipment.trim() || (payloadItems[0]?.equipmentName ?? "General"),
          equipmentCode: formData.equipmentCode.trim() || (payloadItems[0]?.productCode ?? ""),
          category: formData.category || (payloadItems[0]?.category ?? "General"),
          quantity: payloadItems.reduce((acc, curr) => acc + curr.quantity, 0),
          message: formData.message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.message || "Unable to submit quotation request. Please try again.");
        return;
      }

      setSubmittedRequestId(data.requestId);
      setStatus("success");
      clearRFQ(); // Clear basket on success
    } catch {
      setStatus("error");
      setErrorMessage("Network error: Unable to contact quotation server. Please verify your connection.");
    }
  }

  function handleReset() {
    setFormData({
      name: "",
      email: "",
      phone: "",
      facility: "",
      category: "",
      equipment: "",
      equipmentCode: "",
      quantity: "1",
      message: "",
    });
    setStatus("idle");
    setSubmittedRequestId("");
    setErrorMessage("");
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-xs">
      {status === "success" ? (
        <div className="py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[#0F9F95]">
            Quotation Logged
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl">
            Quotation Request Received
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
            Thank you for reaching out to Shree Shyam Electronics. Your formal commercial quotation request has been recorded.
          </p>

          <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-xs">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Reference Request ID
            </span>
            <div className="mt-1 font-mono text-2xl font-bold text-[#10243A]">
              {submittedRequestId}
            </div>
            <p className="mt-2 text-[#64748B]">
              Please quote this reference number for follow-up discussions regarding technical configurations, installation scope, or delivery schedules.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-xs"
            >
              Submit Another Request
            </button>
            <Link
              href="/#catalog"
              className="rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 py-2.5 text-xs font-semibold text-[#172033] transition-all shadow-2xs"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F9F95]">
              Official Quotation Form
            </span>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#172033] sm:text-2xl">
              Commercial & Technical Enquiry
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
              Provide your clinical facility details and required equipment. Our engineering and commercial team will respond with comprehensive pricing, specifications, and delivery terms.
            </p>
          </div>

          {/* Multi-Item RFQ Review Panel */}
          {rfqItems.length > 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4.5">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="text-xs font-bold text-[#172033]">
                  Selected Equipment List ({rfqItems.length} {rfqItems.length === 1 ? "item" : "items"})
                </span>
                <button
                  type="button"
                  onClick={openDrawer}
                  className="text-xs font-semibold text-[#0F9F95] hover:underline cursor-pointer"
                >
                  Manage items in drawer
                </button>
              </div>

              <div className="mt-3 divide-y divide-[#E2E8F0] text-xs">
                {rfqItems.map((item) => (
                  <div key={item.productCode} className="flex items-center justify-between py-2.5">
                    <div className="pr-2">
                      <span className="font-mono font-bold text-[#0F9F95] mr-2">
                        {item.productCode}
                      </span>
                      <span className="text-[#172033] font-medium">
                        {item.equipmentName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#64748B]">Qty:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productCode, item.quantity - 1)}
                          className="h-6 w-6 rounded-md border border-[#E2E8F0] bg-white text-center text-xs font-bold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] cursor-pointer"
                          aria-label="Decrease"
                        >
                          –
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-[#172033]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productCode, item.quantity + 1)}
                          className="h-6 w-6 rounded-md border border-[#E2E8F0] bg-white text-center text-xs font-bold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] cursor-pointer"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productCode)}
                        className="text-[#94A3B8] hover:text-[#B91C1C] pl-1 cursor-pointer"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Single Equipment Fields */
            <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172033]">
                  Equipment Selection
                </span>
                <Link
                  href="/#catalog"
                  className="text-xs font-semibold text-[#0F9F95] hover:underline"
                >
                  Browse catalog to add multiple items →
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className="block text-xs font-semibold text-[#172033] mb-1">
                    Department / Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 px-3 text-xs font-medium text-[#172033] focus:border-[#0F9F95] focus:outline-none transition-colors"
                  >
                    <option value="">Select Department</option>
                    {staticCategories.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                    <option value="General">Other / General Requirement</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="equipment" className="block text-xs font-semibold text-[#172033] mb-1">
                    Equipment Name <span className="text-[#0F9F95]">*</span>
                  </label>
                  <input
                    id="equipment"
                    name="equipment"
                    type="text"
                    required
                    value={formData.equipment}
                    onChange={handleChange}
                    placeholder="e.g. Multiparameter Patient Monitor"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 px-3 text-xs font-medium text-[#172033] placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="equipmentCode" className="block text-xs font-semibold text-[#172033] mb-1">
                    Equipment Code (if known)
                  </label>
                  <input
                    id="equipmentCode"
                    name="equipmentCode"
                    type="text"
                    value={formData.equipmentCode}
                    onChange={handleChange}
                    placeholder="e.g. MON-01"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 px-3 text-xs font-mono font-medium text-[#172033] placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="quantity" className="block text-xs font-semibold text-[#172033] mb-1">
                    Required Quantity <span className="text-[#0F9F95]">*</span>
                  </label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 px-3 text-xs font-mono font-medium text-[#172033] focus:border-[#0F9F95] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-4">
            <span className="block text-xs font-bold text-[#172033]">
              Professional & Contact Information
            </span>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-[#172033] mb-1">
                  Full Name <span className="text-[#0F9F95]">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Rajesh Sharma / Procurement Officer"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs font-medium text-[#172033] placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-[#172033] mb-1">
                  Official Email Address <span className="text-[#0F9F95]">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. procurement@cityhospital.in"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs font-medium text-[#172033] placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-[#172033] mb-1">
                  Phone / Mobile Number <span className="text-[#0F9F95]">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs font-medium text-[#172033] placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="facility" className="block text-xs font-semibold text-[#172033] mb-1">
                  Hospital / Clinical Facility Name
                </label>
                <input
                  id="facility"
                  name="facility"
                  type="text"
                  value={formData.facility}
                  onChange={handleChange}
                  placeholder="e.g. Apollo Clinic / District Hospital"
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs font-medium text-[#172033] placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-semibold text-[#172033] mb-1">
                Clinical Requirement / Preferred Specs / Delivery Timelines
              </label>
              <textarea
                id="message"
                name="message"
                rows={3}
                value={formData.message}
                onChange={handleChange}
                placeholder="Specify preferred configurations, parameters, sensor requirements, installation location, or target delivery dates..."
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 px-3 text-xs font-medium text-[#172033] placeholder:text-[#94A3B8] focus:border-[#0F9F95] focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-xs font-medium text-[#B91C1C]">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] py-3 text-sm font-semibold text-white transition-all shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
          >
            {status === "submitting" ? (
              <span>Submitting Request...</span>
            ) : (
              <>
                <span>Submit Quotation Request</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
