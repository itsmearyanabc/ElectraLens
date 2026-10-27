import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "synthetic"
  | "orange"
  | "blue"
  | "green"
  | "signal-strong"
  | "signal-moderate"
  | "signal-weak"
  | "status-published"
  | "status-pending"
  | "status-reviewed"
  | "status-disputed"
  | "verified"
  | "critical";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 border border-slate-200",
  synthetic: "synthetic-badge",
  orange: "bg-[#F07824]/10 text-[#F07824] border border-[#F07824]/30",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "signal-strong": "bg-red-50 text-red-700 border border-red-200",
  "signal-moderate": "bg-amber-50 text-amber-700 border border-amber-200",
  "signal-weak": "bg-slate-100 text-slate-600 border border-slate-200",
  "status-published": "bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold",
  "status-pending": "bg-amber-50 text-amber-700 border border-amber-200",
  "status-reviewed": "bg-blue-50 text-blue-700 border border-blue-200",
  "status-disputed": "bg-red-50 text-red-700 border border-red-200",
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold",
  critical: "bg-red-50 text-red-700 border border-red-200",
};

export function Badge({
  variant = "default",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold tracking-wide uppercase rounded-full",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
