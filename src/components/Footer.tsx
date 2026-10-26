"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { company } from "@/lib/data";

export default function Footer() {
  const pathname = usePathname();

  // Hide public footer on all admin console pages
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-[#1E3F66] bg-[#10243A] text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#0F9F95]/40 bg-[#0F9F95]/15 text-xs font-bold text-[#0F9F95]">
                SSE
              </div>
              <div>
                <span className="block text-sm font-bold text-white tracking-tight">
                  {company.name}
                </span>
                <span className="block text-[11px] font-medium text-slate-300">
                  {company.division}
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-300">
              Authorized clinical technology distributor and biomedical engineering service provider.
              Supplying precision patient monitoring, critical care infrastructure, surgical suites,
              and hospital diagnostic equipment across healthcare facilities.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-[#0F9F95]" />
              <span>Direct OEM Sourcing & Field Engineering Support</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Navigation
            </h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li>
                <Link
                  href="/#catalog"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Equipment Catalog
                </Link>
              </li>
              <li>
                <Link
                  href="/#search"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Search & Filters
                </Link>
              </li>
              <li>
                <Link
                  href="/#about"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Engineering Standards
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  Commercial RFQ Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Commercial & Engineering Support */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Engineering Support
            </h3>
            <div className="mt-3.5 space-y-2 text-xs text-slate-300">
              <div>
                <span className="block text-[11px] text-slate-400">Representative:</span>
                <span className="font-medium text-white">{company.contactPerson}</span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Direct Telephone:</span>
                <a
                  href={`tel:${company.phoneHref}`}
                  className="font-mono text-sm font-semibold text-[#99E2DC] hover:text-white transition-colors"
                >
                  {company.phone}
                </a>
              </div>
              <div className="pt-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0F9F95] hover:bg-[#0B827B] px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-xs"
                >
                  <span>Request Quote</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#1E3F66] pt-6 sm:flex-row text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} {company.name} — {company.division}. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-500">Healthcare Technology & Supplies</span>
            <span className="text-slate-600">•</span>
            <Link
              href="/admin"
              className="text-slate-400 hover:text-[#99E2DC] transition-colors"
            >
              Operations Console
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
