import { Suspense } from "react";
import { VerificationClient } from "./[publication]/client";

export default function VerifyIndexPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-muted">Loading cryptographic verifier...</div>}>
      <VerificationClient pubId="PUB-2024-001" />
    </Suspense>
  );
}
