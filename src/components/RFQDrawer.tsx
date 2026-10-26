"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRFQ } from "@/context/RFQContext";

export default function RFQDrawer() {
  const pathname = usePathname();
  const { items, removeItem, updateQuantity, clearRFQ, totalCount, isDrawerOpen, closeDrawer } =
    useRFQ();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Hide RFQ Drawer on admin pages
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  if (!isDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rfq-drawer-title"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header (Deep Navy) */}
        <div className="flex items-center justify-between border-b border-[#1E3F66] bg-[#10243A] px-6 py-4 text-white">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#0F9F95]">
              Quotation List
            </span>
            <h2 id="rfq-drawer-title" className="text-base font-bold text-white">
              Selected Equipment ({totalCount} {totalCount === 1 ? "unit" : "units"})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E3F66] bg-[#173252] text-slate-300 hover:border-[#0F9F95] hover:text-white transition-all cursor-pointer"
            aria-label="Close quotation panel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8FAFC]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-white text-slate-400 shadow-xs">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#172033]">Your quotation list is empty</p>
              <p className="mt-1.5 max-w-xs text-xs text-[#64748B] leading-relaxed">
                Browse our biomedical equipment catalog and click &quot;+ Add to Quote&quot; to build a custom procurement request.
              </p>
              <Link
                href="/#catalog"
                onClick={closeDrawer}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-[#0F9F95] bg-[#E6F7F5] px-4 py-2 text-xs font-semibold text-[#0F9F95] hover:bg-[#0F9F95] hover:text-white transition-all shadow-xs"
              >
                Browse Equipment Catalog
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productCode}
                className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs transition-all hover:border-[#CBD5E1] hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#EDF2F7] text-[#10243A] border border-[#E2E8F0]">
                        {item.productCode}
                      </span>
                      {item.category && (
                        <span className="text-[11px] font-medium text-[#64748B]">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-[#172033] leading-snug">
                      {item.equipmentName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productCode)}
                    className="text-[#94A3B8] hover:text-[#B91C1C] transition-colors p-1 rounded-md hover:bg-[#FEF2F2]"
                    title="Remove item"
                    aria-label={`Remove ${item.equipmentName}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Quantity adjuster */}
                <div className="mt-3.5 flex items-center justify-between border-t border-[#F1F5F9] pt-3">
                  <span className="text-xs font-medium text-[#64748B]">Required Quantity:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productCode, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all cursor-pointer shadow-2xs"
                      aria-label="Decrease quantity"
                    >
                      –
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) updateQuantity(item.productCode, val);
                      }}
                      className="h-7 w-12 rounded-lg border border-[#E2E8F0] bg-white text-center font-mono text-xs font-bold text-[#172033] focus:border-[#0F9F95] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productCode, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all cursor-pointer shadow-2xs"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        {items.length > 0 && (
          <div className="border-t border-[#E2E8F0] bg-white p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#64748B]">Selected Items Summary:</span>
              <span className="font-bold text-[#172033]">
                {items.length} {items.length === 1 ? "model" : "models"} • {totalCount} {totalCount === 1 ? "unit" : "units"}
              </span>
            </div>

            <Link
              href="/contact"
              onClick={closeDrawer}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] py-3 text-sm font-semibold text-white transition-all shadow-sm hover:shadow"
            >
              <span>Submit Quotation Request</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <div className="flex justify-between items-center pt-1 text-xs">
              <button
                type="button"
                onClick={clearRFQ}
                className="text-[#64748B] hover:text-[#B91C1C] transition-colors cursor-pointer"
              >
                Clear all items
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-[#64748B] hover:text-[#172033] transition-colors cursor-pointer"
              >
                Continue browsing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
