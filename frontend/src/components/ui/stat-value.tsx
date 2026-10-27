import { cn } from "@/lib/utils";

export function StatValue({
  label,
  value,
  sublabel,
  mono = false,
  size = "default",
  className,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  mono?: boolean;
  size?: "default" | "large";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-[11px] font-medium tracking-wide uppercase text-muted">
        {label}
      </span>
      <span
        className={cn(
          "font-semibold text-foreground leading-tight",
          mono && "font-data",
          size === "large" ? "text-2xl md:text-3xl" : "text-lg"
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {sublabel && (
        <span className="text-xs text-muted">{sublabel}</span>
      )}
    </div>
  );
}
