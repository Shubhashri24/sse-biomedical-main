"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRFQ } from "@/context/RFQContext";

export interface ItemCardProps {
  item: {
    productCode?: string;
    code?: string;
    name: string;
    function?: string;
    shortDescription?: string;
    description?: string;
    options?: string;
    specifications?: string;
    application?: string;
    note?: string;
    selectionNote?: string;
    availability?: "In Stock" | "Available on Order" | "Procurement on Request" | string;
    manufacturer?: string;
    image?: string;
  };
  accent?: string;
  categoryName?: string;
}

export default function ItemCard({
  item,
  categoryName,
}: ItemCardProps) {
  const { addItem, items } = useRFQ();
  const [justAdded, setJustAdded] = useState(false);

  const code = item.productCode || item.code || "";
  const functionText = item.shortDescription || item.function || "";
  const specsText = item.specifications || item.options || "";
  const appText = item.application || "";
  const noteText = item.selectionNote || item.note || "";
  const availability = item.availability || "Available on Order";

  const isInBasket = items.some((i) => i.productCode.toUpperCase() === code.toUpperCase());

  const quoteParams = new URLSearchParams({
    equipment: item.name,
    code,
    ...(categoryName ? { category: categoryName } : {}),
  });
  const quoteUrl = `/contact?${quoteParams.toString()}`;

  function handleAddToRFQ() {
    addItem({
      productCode: code,
      equipmentName: item.name,
      category: categoryName,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  const isStock = availability === "In Stock";

  return (
    <article className="group relative flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-[#CBD5E1] hover:shadow-md">
      <div>
        {/* Top meta strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[#EDF2F7] text-[#10243A] border border-[#E2E8F0]">
              {code}
            </span>
            {categoryName && (
              <span className="text-xs text-[#64748B] font-medium">
                {categoryName}
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isStock
                ? "border border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                : "border border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]"
            }`}
          >
            {availability}
          </span>
        </div>

        {/* Technical Product Header */}
        <h3 className="mt-3 text-base font-bold leading-snug text-[#172033] group-hover:text-[#0F9F95] transition-colors">
          {item.name}
        </h3>

        {/* Structured Spec List */}
        <div className="mt-3.5 space-y-2.5 text-xs">
          {functionText && (
            <div>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Clinical Function
              </span>
              <p className="mt-0.5 leading-relaxed text-[#172033]">{functionText}</p>
            </div>
          )}

          {specsText && (
            <div>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Configuration & Options
              </span>
              <p className="mt-0.5 leading-relaxed text-[#64748B]">{specsText}</p>
            </div>
          )}

          {appText && (
            <div>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Department Application
              </span>
              <p className="mt-0.5 leading-relaxed text-[#64748B]">{appText}</p>
            </div>
          )}
        </div>

        {/* Selection Note */}
        {noteText && (
          <div className="mt-3.5 rounded-lg border-l-2 border-[#0F9F95] bg-[#F8FAFC] px-3.5 py-2.5 text-xs leading-relaxed border border-r-[#E2E8F0] border-t-[#E2E8F0] border-b-[#E2E8F0]">
            <span className="font-semibold text-[#0F9F95]">
              Procurement note —{" "}
            </span>
            <span className="text-[#172033]">{noteText}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#F1F5F9] pt-3.5">
        <span className="font-mono text-xs text-[#94A3B8]">
          Ref: {code}
        </span>

        <div className="flex items-center gap-2">
          {/* Add to Request (RFQ Basket) */}
          <button
            type="button"
            onClick={handleAddToRFQ}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              justAdded
                ? "border-[#15803D] bg-[#F0FDF4] text-[#15803D]"
                : isInBasket
                ? "border-[#0F9F95] bg-[#E6F7F5] text-[#0F9F95]"
                : "border-[#E2E8F0] bg-white text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95]"
            }`}
            title="Add equipment to quotation list"
          >
            <span>{justAdded ? "✓ Added" : isInBasket ? "+ Add More" : "+ Add to Quote"}</span>
          </button>

          {/* Direct Quotation CTA */}
          <Link
            href={quoteUrl}
            className="inline-flex items-center gap-1 rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-3.5 py-1.5 text-xs font-semibold text-white transition-all shadow-xs hover:shadow"
          >
            <span>Request Quote</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
