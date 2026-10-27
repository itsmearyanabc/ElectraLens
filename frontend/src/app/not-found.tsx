import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-data text-sm text-muted mb-2">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Page not found
        </h1>
        <p className="text-sm text-muted mb-8 leading-relaxed">
          The page you're looking for doesn't exist or may have been moved.
          If you followed a link to a specific finding or publication, it may
          not be published yet.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 text-sm font-medium text-surface bg-foreground rounded-sm hover:bg-foreground/90 transition-colors"
        >
          Return to homepage
        </Link>
      </div>
    </div>
  );
}
