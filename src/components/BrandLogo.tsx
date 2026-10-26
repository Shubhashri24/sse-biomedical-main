import React from "react";
import Image from "next/image";
import Link from "next/link";

export interface BrandLogoProps {
  /**
   * "full" - The complete horizontal logo graphic
   * "symbol" - The S-shaped medical symbol with heartbeat line only
   * "responsive" - Symbol + clean brand typography on mobile, full graphic on tablet/desktop
   * "badge" - Styled symbol inside a soft biomedical container (compact icon badge)
   */
  variant?: "full" | "symbol" | "responsive" | "badge";

  /**
   * "dark" - For dark navy backgrounds (#10243A) with crisp white/cyan text
   * "light" - For white or light gray surfaces (#FFFFFF, #F8FAFC) with navy text
   */
  theme?: "dark" | "light";

  /**
   * Predefined visual size scale
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl";

  /**
   * Optional custom class for outer container
   */
  className?: string;

  /**
   * If provided, wraps the logo in a Link to href (e.g. "/")
   */
  href?: string;

  /**
   * Optional custom alt text. Defaults to accessible standard.
   */
  alt?: string;

  /**
   * Next.js image priority flag
   */
  priority?: boolean;

  /**
   * Optional click handler (e.g. to close mobile drawer on click)
   */
  onClick?: () => void;
}

const heightMap = {
  xs: { h: 26, symW: 28, fullW: 72 },
  sm: { h: 32, symW: 35, fullW: 89 },
  md: { h: 42, symW: 46, fullW: 117 },
  lg: { h: 52, symW: 57, fullW: 145 },
  xl: { h: 64, symW: 70, fullW: 178 },
};

export default function BrandLogo({
  variant = "full",
  theme = "dark",
  size = "md",
  className = "",
  href,
  alt = "Shree Shyam Electronics — Biomedical Systems",
  priority = false,
  onClick,
}: BrandLogoProps) {
  const { h, symW, fullW } = heightMap[size] || heightMap.md;

  const fullSrc =
    theme === "dark"
      ? "/brand/sse-logo-dark.png"
      : "/brand/sse-logo.png";
  const symSrc = "/brand/sse-symbol.png";

  const renderContent = () => {
    if (variant === "symbol") {
      return (
        <div className={`relative inline-flex items-center shrink-0 ${className}`}>
          <Image
            src={symSrc}
            alt={alt}
            width={symW * 2}
            height={h * 2}
            style={{ width: "auto", height: `${h}px` }}
            className="object-contain"
            priority={priority}
          />
        </div>
      );
    }

    if (variant === "badge") {
      const badgeH = Math.max(h, 38);
      return (
        <div
          className={`flex items-center justify-center rounded-xl border transition-all shrink-0 ${
            theme === "dark"
              ? "border-[#1E3F66] bg-[#0E1E30]/90 shadow-xs"
              : "border-[#E2E8F0] bg-white shadow-2xs"
          } ${className}`}
          style={{ width: `${badgeH}px`, height: `${badgeH}px` }}
        >
          <Image
            src={symSrc}
            alt={alt}
            width={badgeH * 2}
            height={badgeH * 2}
            style={{ width: "auto", height: `${Math.round(badgeH * 0.72)}px` }}
            className="object-contain"
            priority={priority}
          />
        </div>
      );
    }

    if (variant === "responsive") {
      const mobileH = Math.max(h - 6, 32);
      return (
        <div className={`inline-flex items-center ${className}`}>
          {/* Mobile: compact S symbol + crisp typography */}
          <div className="flex md:hidden items-center gap-2.5">
            <Image
              src={symSrc}
              alt={alt}
              width={symW * 2}
              height={mobileH * 2}
              style={{ width: "auto", height: `${mobileH}px` }}
              className="object-contain shrink-0"
              priority={priority}
            />
            <div className="leading-tight">
              <span
                className={`block text-xs font-bold tracking-tight transition-colors ${
                  theme === "dark" ? "text-white group-hover:text-[#99E2DC]" : "text-[#172033]"
                }`}
              >
                Shree Shyam Electronics
              </span>
              <span
                className={`block text-[10px] font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-[#64748B]"
                }`}
              >
                Biomedical Systems
              </span>
            </div>
          </div>

          {/* Desktop & Tablet: complete horizontal logo */}
          <div className="hidden md:flex items-center">
            <Image
              src={fullSrc}
              alt={alt}
              width={fullW * 2}
              height={h * 2}
              style={{ width: "auto", height: `${h}px` }}
              className="object-contain shrink-0"
              priority={priority}
            />
          </div>
        </div>
      );
    }

    // Default "full"
    return (
      <div className={`relative inline-flex items-center shrink-0 ${className}`}>
        <Image
          src={fullSrc}
          alt={alt}
          width={fullW * 2}
          height={h * 2}
          style={{ width: "auto", height: `${h}px` }}
          className="object-contain shrink-0"
          priority={priority}
        />
      </div>
    );
  };

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="focus-ring inline-flex items-center group transition-opacity hover:opacity-95"
        aria-label={alt}
      >
        {renderContent()}
      </Link>
    );
  }

  return renderContent();
}
