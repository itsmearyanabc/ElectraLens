import { Suspense } from "react";
import { Header } from "@/components/navigation/header";
import { Footer } from "@/components/navigation/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div className="h-14 md:h-16 bg-surface border-b border-border" />}>
        <Header />
      </Suspense>
      <main id="main-content" role="main" className="min-h-[60vh]">
        <Suspense fallback={<div className="p-12 text-center text-xs text-muted">Loading content...</div>}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
