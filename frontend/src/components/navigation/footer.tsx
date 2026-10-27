"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export function Footer() {
  const { t } = useLanguage();

  const footerSections = [
    {
      title: t("nav.compare", "Analysis"),
      links: [
        { href: "/compare", label: t("nav.compare", "Compare versions") },
        { href: "/findings", label: t("nav.findings", "Findings directory") },
        { href: "/claims", label: t("nav.claims", "Check a claim") },
        { href: "/methodology", label: t("nav.methodology", "Methodology") },
      ],
    },
    {
      title: "Transparency",
      links: [
        { href: "/verify", label: t("hero.cta.verify", "Verify a publication") },
        { href: "/sources", label: t("nav.sources", "Data sources") },
        { href: "/about", label: t("nav.about", "About ElectraLens") },
        { href: "/privacy", label: t("nav.privacy", "Privacy practices") },
      ],
    },
    {
      title: "Official resources",
      links: [
        {
          href: "https://eci.gov.in",
          label: "Election Commission of India",
          external: true,
        },
        {
          href: "https://nvsp.in",
          label: "National Voter Services Portal",
          external: true,
        },
      ],
    },
  ];

  return (
    <footer className="border-t border-[#E4E7EC] bg-[#F7F8FA]" role="contentinfo">
      <div className="max-w-[1240px] mx-auto px-4 md:px-8">
        {/* Main Footer Grid */}
        <div className="py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <Image
                src="/emblem.png"
                alt="ElectraLens Emblem"
                width={38}
                height={38}
                className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col leading-none">
                <div className="flex items-center">
                  <span className="text-xl font-normal tracking-tight text-[#172033] font-serif">
                    Electra
                  </span>
                  <span className="text-xl font-normal tracking-tight text-[#F07824] font-serif">
                    Lens
                  </span>
                </div>
                <span className="text-[8px] font-bold tracking-[0.14em] uppercase text-[#475467] -mt-0.5">
                  {t("nav.tagline", "Electoral Roll Transparency")}
                </span>
              </div>
            </Link>
            <p className="text-sm font-medium text-[#475467] leading-relaxed max-w-[280px]">
              Independent civic-tech platform examining revisions between electoral roll releases through published statistical methodology.
            </p>
          </div>

          {/* Link Columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-mono text-xs font-bold tracking-[0.14em] uppercase text-[#172033] mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#475467] hover:text-[#172033] transition-colors"
                      >
                        <span>{link.label}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                        <span className="sr-only">(opens in new tab — external official resource)</span>
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm font-semibold text-[#475467] hover:text-[#172033] transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar with Non-Affiliation Notice */}
        <div className="py-8 border-t border-[#E4E7EC] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs font-medium text-[#475467] leading-relaxed max-w-[620px]">
            {t("disclaimer.independence", "ElectraLens is an independent public-interest civic technology project. Not affiliated with, sponsored by, or endorsed by the Election Commission of India. All demonstration data is synthetic.")}
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#14663F]" />
            <p className="text-xs font-bold text-[#172033] font-mono whitespace-nowrap">
              {t("footer.methodology", "Methodology v1.0.0 · Synthetic dataset")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
