"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Globe,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { UserAuthBadge } from "@/components/auth/user-auth-badge";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { locale, toggleLocale, t } = useLanguage();

  const navLinks = [
    { href: "/compare", label: t("nav.compare", "Compare") },
    { href: "/findings", label: t("nav.findings", "Findings") },
    { href: "/methodology", label: t("nav.methodology", "Methodology") },
    { href: "/claims", label: t("nav.claims", "Claims") },
    { href: "/sources", label: t("nav.sources", "Sources") },
  ];

  const moreLinks = [
    { href: "/about", label: t("nav.about", "About") },
    { href: "/privacy", label: t("nav.privacy", "Privacy") },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Trap focus in mobile menu
  useEffect(() => {
    if (mobileOpen && mobileMenuRef.current) {
      const focusable = mobileMenuRef.current.querySelectorAll(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }
  }, [mobileOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isVerifyActive = pathname === "/verify" || pathname.startsWith("/verify/");

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Wordmark & Emblem Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F07824] rounded-full"
            aria-label="ElectraLens home"
          >
            <Image
              src="/emblem.png"
              alt="ElectraLens Emblem"
              width={38}
              height={38}
              className="h-8 md:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              priority
            />
            <div className="flex flex-col leading-none">
              <div className="flex items-center">
                <span className="text-xl md:text-2xl font-normal tracking-tight text-[#172033] font-serif">
                  Electra
                </span>
                <span className="text-xl md:text-2xl font-normal tracking-tight text-[#F07824] font-serif">
                  Lens
                </span>
              </div>
              <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#475467] -mt-0.5 hidden sm:block">
                {t("nav.tagline", "Electoral Roll Transparency")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center gap-1.5"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => {
              const isActive =
                link.href === "/verify"
                  ? isVerifyActive
                  : pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2 text-[15px] font-bold rounded-full transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F07824]",
                    isActive
                      ? "text-[#172033] bg-[#F7F8FA] shadow-xs"
                      : "text-[#475467] hover:text-[#172033] hover:bg-[#F7F8FA]/70"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-1.5 left-4 right-4 h-[2.5px] bg-[#F07824] rounded-full"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Language Segmented Pill Switcher with Gliding Spring Physics */}
            <div
              className="relative flex items-center bg-[#F2F4F7] p-1 rounded-full border border-[#E4E7EC] shadow-2xs"
              role="group"
              aria-label="Language selection"
            >
              <button
                type="button"
                onClick={() => {
                  if (locale !== "en") toggleLocale();
                }}
                className={cn(
                  "relative px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer z-10",
                  locale === "en"
                    ? "text-white"
                    : "text-[#475467] hover:text-[#172033]"
                )}
                aria-label="English"
              >
                {locale === "en" && (
                  <motion.div
                    layoutId="desktop-lang-active"
                    className="absolute inset-0 bg-[#172033] rounded-full shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  if (locale !== "hi") toggleLocale();
                }}
                className={cn(
                  "relative px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer z-10",
                  locale === "hi"
                    ? "text-white"
                    : "text-[#475467] hover:text-[#172033]"
                )}
                aria-label="हिंदी (Hindi)"
              >
                {locale === "hi" && (
                  <motion.div
                    layoutId="desktop-lang-active"
                    className="absolute inset-0 bg-[#172033] rounded-full shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
                हि
              </button>
            </div>

            {/* User Account / Google Sign-in */}
            <UserAuthBadge />

            {/* Verify CTA Button — Exact Match to Explore the Live Data Button */}
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/verify"
                className="btn-pill btn-orange shadow-sm text-[#172033] group flex items-center gap-2 font-bold !py-2.5 !px-5 text-sm md:text-[15px] cursor-pointer"
              >
                <span>{t("nav.verify", "Verify")}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-[#172033] rounded-full hover:bg-[#F7F8FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F07824]"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 md:top-18 bg-[#172033]/40 z-40 lg:hidden backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              ref={mobileMenuRef}
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="fixed top-16 md:top-18 left-0 right-0 bg-white border-b border-[#E4E7EC] z-50 lg:hidden max-h-[calc(100vh-4.5rem)] overflow-y-auto shadow-xl"
            >
              <nav className="p-5 space-y-2" aria-label="Mobile navigation">
                {[...navLinks, ...moreLinks].map((link) => {
                  const isActive =
                    link.href === "/verify"
                      ? isVerifyActive
                      : pathname === link.href || pathname.startsWith(link.href + "/");

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "block px-4 py-3 text-base font-bold rounded-2xl transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F07824]",
                        isActive
                          ? "text-[#172033] bg-[#F7F8FA] border border-[#E4E7EC]"
                          : "text-[#475467] hover:bg-[#F7F8FA]"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                <div className="pt-4 mt-2 border-t border-[#E4E7EC] flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[#475467]">Account</span>
                    <UserAuthBadge />
                  </div>

                  <Link
                    href="/verify"
                    onClick={() => setMobileOpen(false)}
                    className="btn-pill btn-orange text-[#172033] font-bold text-center flex items-center justify-center gap-2 shadow-sm group"
                  >
                    <span>{t("hero.cta.verify", "Verify a publication")}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </Link>

                  <div className="relative p-1 bg-[#F2F4F7] rounded-full border border-[#E4E7EC] flex items-center justify-between shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (locale !== "en") toggleLocale();
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "relative flex-1 py-2 text-xs font-bold rounded-full transition-colors text-center cursor-pointer z-10",
                        locale === "en" ? "text-white" : "text-[#475467] hover:text-[#172033]"
                      )}
                    >
                      {locale === "en" && (
                        <motion.div
                          layoutId="mobile-lang-active"
                          className="absolute inset-0 bg-[#172033] rounded-full shadow-xs -z-10"
                          transition={{ type: "spring", stiffness: 500, damping: 32 }}
                        />
                      )}
                      English (EN)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (locale !== "hi") toggleLocale();
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "relative flex-1 py-2 text-xs font-bold rounded-full transition-colors text-center cursor-pointer z-10",
                        locale === "hi" ? "text-white" : "text-[#475467] hover:text-[#172033]"
                      )}
                    >
                      {locale === "hi" && (
                        <motion.div
                          layoutId="mobile-lang-active"
                          className="absolute inset-0 bg-[#172033] rounded-full shadow-xs -z-10"
                          transition={{ type: "spring", stiffness: 500, damping: 32 }}
                        />
                      )}
                      हिंदी (HI)
                    </button>
                  </div>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
