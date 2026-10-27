import type { Metadata } from "next";
import { Caprasimo, Figtree, JetBrains_Mono } from "next/font/google";
import { LanguageProvider } from "@/context/language-context";
import "./globals.css";

const caprasimo = Caprasimo({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-caprasimo",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ElectraLens — Electoral Roll Transparency",
    template: "%s — ElectraLens",
  },
  description:
    "Explore changes between electoral-roll versions, understand unusual statistical patterns, and verify how published findings were produced.",
  keywords: ["electoral roll", "transparency", "civic tech", "data analysis", "voter registration"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${caprasimo.variable} ${figtree.variable} ${jetbrainsMono.variable} ${figtree.className}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
