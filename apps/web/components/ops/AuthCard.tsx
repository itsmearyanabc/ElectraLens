import type { ReactNode } from 'react';

import { LogoMark, Wordmark } from '@/components/ui/Logo';

/** The centred card used by the staff sign-in and second-factor screens. */
export function AuthCard({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="glow flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="card-float w-full max-w-md p-8 sm:p-10">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <Wordmark className="text-2xl" />
        </div>
        <p className="eyebrow mt-8">{eyebrow}</p>
        <h1 className="mt-3 text-[2.25rem]">{title}</h1>
        <p className="mt-3 text-muted">{lede}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
