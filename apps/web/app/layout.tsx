import type { ReactNode } from 'react';

// The document is rendered by app/[locale]/layout.tsx. This pass-through layout exists only so
// that app/not-found.tsx can catch requests outside any locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
