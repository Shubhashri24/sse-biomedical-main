"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

export default function AdminShell({
  children,
  title,
  subtitle,
  breadcrumbs = [],
  actions,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminUsername, setAdminUsername] = useState("admin");
  const [isVerifying, setIsVerifying] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth/me");
        if (!res.ok) {
          router.push("/admin/login");
          return;
        }
        const data = await res.json();
        if (!cancelled && data.username) {
          setAdminUsername(data.username);
        }
      } catch {
        router.push("/admin/login");
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  }

  const navGroups = [
    {
      title: "OPERATIONS",
      items: [
        {
          label: "Dashboard",
          href: "/admin",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1v-9z" />
            </svg>
          ),
        },
        {
          label: "Quotations",
          href: "/admin#quotations",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: "Inventory",
          href: "/admin/inventory",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
        {
          label: "Suppliers",
          href: "/admin/suppliers",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          label: "Service",
          href: "/admin/service",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          label: "Technicians",
          href: "/admin/technicians",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "SALES & BILLING",
      items: [
        {
          label: "Invoices",
          href: "/admin/invoices",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "CATALOG",
      items: [
        {
          label: "Products",
          href: "/admin/products",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          ),
        },
        {
          label: "Categories",
          href: "/admin/categories",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "CUSTOMERS",
      items: [
        {
          label: "Customers",
          href: "/admin/customers",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: "Enquiries",
          href: "/admin/messages",
          icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
        },
      ],
    },
  ];

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] text-xs font-medium text-[#64748B]">
        <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-xs">
          <BrandLogo variant="symbol" theme="light" size="md" priority />
          <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F9F95] border-t-transparent" />
            <span>Verifying administrative session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
      {/* Top Header (White surface, crisp border) */}
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white px-4 py-2.5 sm:px-6 shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-xs font-bold text-[#172033] hover:bg-[#F8FAFC] md:hidden cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              ☰
            </button>
            <Link href="/admin" className="flex items-center gap-2.5">
              <BrandLogo variant="symbol" theme="light" size="xs" />
              <span className="hidden text-xs font-bold tracking-tight text-[#172033] sm:inline">
                Biomedical Operations Console
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              target="_blank"
              className="hidden text-xs font-semibold text-[#64748B] hover:text-[#0F9F95] sm:inline transition-colors"
            >
              Public Catalog ↗
            </Link>
            <span className="hidden text-[#CBD5E1] sm:inline">•</span>
            <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-[#15803D]" />
              <span className="font-semibold text-[#172033]">{adminUsername}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#64748B] hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace with Deep Navy Sidebar */}
      <div className="mx-auto flex max-w-7xl">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-2xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar (Deep Navy #10243A) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-60 transform border-r border-[#1E3F66] bg-[#10243A] text-white transition-transform md:static md:block md:w-60 md:min-h-[calc(100vh-49px)] md:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col justify-between p-4 space-y-6">
            <div className="space-y-6">
              {/* Mobile Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#1E3F66] pb-3 md:hidden">
                <div className="flex items-center gap-2">
                  <BrandLogo variant="symbol" theme="dark" size="xs" />
                  <span className="font-bold text-xs text-[#0F9F95]">SSE BIOMEDICAL</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              {navGroups.map((group) => (
                <div key={group.title}>
                  <div className="px-2.5 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {group.title}
                  </div>
                  <nav className="space-y-1">
                    {group.items.map((item) => {
                      const isActive =
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname === item.href || (item.href !== "/admin#quotations" && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                            isActive
                              ? "bg-[#173252] text-white font-semibold border-l-3 border-[#0F9F95] shadow-2xs"
                              : "text-slate-300 hover:bg-[#173252]/60 hover:text-white"
                          }`}
                        >
                          <span className={isActive ? "text-[#0F9F95]" : "text-slate-400"}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>

            {/* Bottom System Status */}
            <div className="border-t border-[#1E3F66] pt-4">
              <div className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                SYSTEM STATUS
              </div>
              <div className="px-2.5 py-2 text-[11px] text-slate-300 leading-relaxed">
                <div>Next.js 16 App Router</div>
                <div>MongoDB Local 27017</div>
                <div className="text-[10px] text-[#4ADE80] font-bold mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                  <span>Production DB Active</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area (Clean Light Canvas #F5F7FA) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="mb-3 flex items-center gap-1.5 text-xs text-[#64748B]">
              <Link href="/admin" className="hover:text-[#172033] transition-colors">
                Admin
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-[#CBD5E1]">/</span>
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-[#172033] transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[#172033] font-semibold">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Action Header */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#172033] sm:text-2xl">
                {title}
              </h1>
              {subtitle && <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>

          {/* Body Content */}
          {children}
        </main>
      </div>
    </div>
  );
}
