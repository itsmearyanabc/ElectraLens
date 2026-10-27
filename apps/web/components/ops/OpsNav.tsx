'use client';

import { Link, usePathname } from '@/i18n/navigation';

export function OpsNav({
  items,
  light = false,
}: {
  items: { href: string; label: string }[];
  light?: boolean;
}) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.href === '/ops' ? pathname === '/ops' : pathname.startsWith(item.href);
        const style = light
          ? active
            ? 'bg-saffron-tint text-ink'
            : 'text-ink hover:bg-mist'
          : active
            ? 'bg-white text-ink'
            : 'text-white/80 hover:bg-white/10 hover:text-white';
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[0.9375rem] font-semibold no-underline transition-colors ${style}`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-saffron' : 'bg-current opacity-40'}`}
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
