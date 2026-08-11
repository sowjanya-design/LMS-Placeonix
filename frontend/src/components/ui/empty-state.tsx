import Image from "next/image";

// Mascot-illustrated empty state — drop-in visual replacement for the plain
// "No X yet." <p> text every list page already renders when a fetch returns
// zero rows. Same message text every page already used; this only adds the
// clay mascot + softer layout around it, per the design spec's "empty
// state" / "no results" mascot guidance. Scene mascots cropped from the
// project's own clay illustration sheets (frontend/public/mascots).
const MASCOTS = {
  // General "nothing here yet" — dashboard/tablet mascot (spec: "Dashboard empty state").
  dashboard: "/mascots/mascot2-dashboard.png",
  // Search/filter yielded nothing (spec: "Brainstorming Ideas… empty search/no results screens").
  search: "/mascots/scene-brainstorming.png",
  // A friendly generic wave for lighter, low-stakes empty lists.
  waving: "/mascots/scene-waving.png",
} as const;

const SIZE_CLASS = {
  sm: "h-20",
  md: "h-44",
} as const;

export function EmptyState({
  message,
  mascot = "dashboard",
  size = "md",
  className = "",
}: {
  message: string;
  mascot?: keyof typeof MASCOTS;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 py-8 text-center ${className}`}>
      <Image
        src={MASCOTS[mascot]}
        alt=""
        width={228}
        height={213}
        className={`${SIZE_CLASS[size]} w-auto object-contain opacity-95`}
      />
      <p className="text-sm font-semibold text-muted">{message}</p>
    </div>
  );
}
