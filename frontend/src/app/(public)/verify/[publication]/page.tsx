import { Suspense } from "react";
import { publicationManifests } from "@/lib/data";
import { VerificationClient } from "./client";

export function generateStaticParams() {
  return publicationManifests.map((m) => ({ publication: m.id }));
}

interface PageProps {
  params: Promise<{ publication: string }>;
}

export default async function VerificationPage({ params }: PageProps) {
  const { publication } = await params;

  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-muted">Loading cryptographic verifier...</div>}>
      <VerificationClient pubId={publication} />
    </Suspense>
  );
}
