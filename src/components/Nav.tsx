"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { company } from "@/lib/data";
import { useRFQ } from "@/context/RFQContext";
import BrandLogo from "@/components/BrandLogo";

export default function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { totalCount, openDrawer } = useRFQ();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Hide public navigation on admin pages
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#1E3F66] bg-[#10243A] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Company Identity */}
        <BrandLogo
          variant="responsive"
          theme="dark"
          size="md"
          href="/"
          onClick={() => setIsOpen(false)}
          priority
        />

        {/* Desktop Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-6 text-xs text-slate-200 md:flex font-medium"
        >
          <Link
            href="/#catalog"
            className="focus-ring py-1 hover:text-white transition-colors"
          >
            Equipment Catalog
          </Link>
          <Link
            href="/#search"
            className="focus-ring py-1 hover:text-white transition-colors"
          >
            Search
          </Link>
          <Link
            href="/#about"
            className="focus-ring py-1 hover:text-white transition-colors"
          >
            Engineering Standards
          </Link>
          <Link
            href="/contact"
            className="focus-ring py-1 hover:text-white transition-colors"
          >
            Contact Desk
          </Link>

          {/* Quote List Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className="focus-ring relative flex items-center gap-2 rounded-lg border border-[#1E3F66] bg-[#173252] px-3.5 py-1.5 text-xs font-medium text-white hover:border-[#0F9F95] hover:bg-[#1C3B5E] transition-all cursor-pointer shadow-xs"
            title="View selected equipment quotation list"
          >
            <span>Quote List</span>
            <span
              suppressHydrationWarning
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0F9F95] px-1.5 text-[10px] font-bold text-white shadow-xs"
            >
              {totalCount}
            </span>
          </button>

          {/* Direct CTA */}
          <Link
            href="/contact"
            className="focus-ring rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm hover:shadow"
          >
            Request Quote
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile Quote button */}
          <button
            type="button"
            onClick={openDrawer}
            className="focus-ring relative flex h-9 items-center gap-1.5 rounded-lg border border-[#1E3F66] bg-[#173252] px-2.5 text-xs text-white cursor-pointer"
            aria-label={`Open Quote List with ${totalCount} items`}
          >
            <span className="text-xs font-medium">Quotes</span>
            <span
              suppressHydrationWarning
              className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0F9F95] px-1 text-[10px] font-bold text-white"
            >
              {totalCount}
            </span>
          </button>

          <a
            href={`tel:${company.phoneHref}`}
            className="focus-ring rounded-lg border border-[#1E3F66] bg-[#173252] px-2.5 py-1.5 text-xs font-medium text-[#99E2DC] hover:border-[#0F9F95]"
          >
            Call
          </a>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E3F66] bg-[#173252] text-white hover:border-[#0F9F95] cursor-pointer"
          >
            {isOpen ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isOpen && (
        <div
          id="mobile-nav"
          className="border-t border-[#1E3F66] bg-[#0E1E30] px-5 py-4 md:hidden animate-in slide-in-from-top duration-200"
        >
          <nav className="flex flex-col gap-2.5 text-sm font-medium text-slate-200">
            <Link
              href="/#catalog"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#173252] hover:text-white transition-colors"
            >
              Equipment Catalog
            </Link>
            <Link
              href="/#search"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#173252] hover:text-white transition-colors"
            >
              Search & Filter
            </Link>
            <Link
              href="/#about"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#173252] hover:text-white transition-colors"
            >
              Engineering Standards
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-[#173252] hover:text-white transition-colors"
            >
              Contact Desk
            </Link>
            <div className="pt-2 border-t border-[#1E3F66]">
              <Link
                href="/contact"
                onClick={() => setIsOpen(false)}
                className="block text-center rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-4 py-2.5 text-xs font-semibold text-white transition-colors shadow-sm"
              >
                Request Commercial Quote
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
