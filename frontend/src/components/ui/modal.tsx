"use client";

// Shared modal shell — extracted from the original students/page.tsx pattern so
// every create/edit form across the dashboard looks identical. Click-outside and
// the ✕ both close; the card stops propagation so clicks inside don't dismiss.
// Claymorphism: big soft radius, layered clay shadow (outer drop + inset rim +
// inset highlight), pastel-tinted card instead of flat white.
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-[32px] bg-white p-7 ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
        style={{ boxShadow: "var(--clay-shadow-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-extrabold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-muted transition-colors hover:bg-purple-lt hover:text-purple"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
