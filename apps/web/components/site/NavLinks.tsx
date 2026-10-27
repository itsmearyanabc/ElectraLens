'use client';

import { Link, usePathname } from '@/i18n/navigation';

export interface NavItem {
  href: string;
  label: string;
}

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

/** Primary navigation as pills; the current section is marked with aria-current. */
export function NavLinks({ items, vertical = false }: { items: NavItem[]; vertical?: boolean }) {
  const pathname = usePathname();
  return (
    <ul className={vertical ? 'flex flex-col gap-1 p-2' : 'flex items-center gap-1'}>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={
                vertical
                  ? `flex items-center justify-between rounded-2xl px-4 py-3 font-semibold no-underline ${active ? 'bg-saffron-tint text-ink' : 'text-ink hover:bg-mist'}`
                  : `block rounded-full px-3.5 py-2 text-[0.9375rem] font-semibold no-underline transition-colors ${active ? 'bg-ink text-white' : 'text-ink hover:bg-mist'}`
              }
            >
              {item.label}
              {vertical && active && (
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-saffron" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
