import Image from "next/image";
import Link from "next/link";

// Custom 404 — Next.js renders this for any unmatched route across the app.
// Mascot 1 (cheerful, welcoming) per the clay design spec's "404 page" case.
export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(160deg, #ede7fb 0%, #e3f0f9 35%, #e1f5ee 65%, #fbe9da 100%)",
      }}
    >
      <div
        className="relative w-full max-w-md rounded-[40px] bg-white px-8 pt-36 pb-10 text-center"
        style={{ boxShadow: "var(--clay-shadow-card)" }}
      >
        <Image
          src="/mascots/mascot1-waving.png"
          alt=""
          width={386}
          height={666}
          className="absolute top-0 left-1/2 w-[130px] -translate-x-1/2 -translate-y-[58%] drop-shadow-[0_14px_22px_rgba(17,24,39,0.18)]"
        />
        <div className="mb-1 text-sm font-bold tracking-[2px] text-purple uppercase">
          404
        </div>
        <h1 className="mb-2 text-2xl font-extrabold text-ink">
          Lost your way?
        </h1>
        <p className="mb-6 text-sm text-muted">
          We couldn&apos;t find the page you were looking for. Let&apos;s get
          you back on track.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          style={{
            background: "var(--clay-ink)",
            boxShadow: "var(--clay-shadow-btn)",
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
