"use client";

// Shared form primitives — the exact brand styling used across the dashboard
// (purple/ink tokens from globals.css). Use these instead of re-declaring the
// same className string on every page so create/edit forms stay consistent.
// Claymorphism: soft rgba fills (no harsh borders), pill-shaped buttons with
// a dark clay fill, generous rounding everywhere.

const controlClass =
  "w-full rounded-2xl border border-transparent bg-[rgba(17,24,39,0.045)] px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-purple/40 focus:bg-white disabled:opacity-60";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 cursor-pointer">
      <span className="text-sm font-bold text-ink">
        {label}
        {required && <span className="text-red"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted block">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`${controlClass} ${props.className ?? ""}`} />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${controlClass} ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${controlClass} ${props.className ?? ""}`} />
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`rounded-full bg-[var(--clay-ink)] px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 ${props.className ?? ""}`}
      style={{ boxShadow: "var(--clay-shadow-btn)", ...props.style }}
    />
  );
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`rounded-full border border-transparent bg-[rgba(17,24,39,0.05)] px-5 py-2.5 text-sm font-bold text-ink2 transition-colors hover:bg-[rgba(17,24,39,0.09)] disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function DangerButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      {...props}
      className={`rounded-full border border-transparent bg-red-lt px-3.5 py-1.5 text-xs font-bold text-red transition-colors hover:bg-red hover:text-white disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red">{children}</p>;
}

// Standard footer row for modal forms: Cancel + submit.
export function ModalActions({
  onCancel,
  submitting,
  submitLabel,
  disabled,
}: {
  onCancel: () => void;
  submitting?: boolean;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <SecondaryButton type="button" onClick={onCancel}>
        Cancel
      </SecondaryButton>
      <PrimaryButton type="submit" disabled={submitting || disabled}>
        {submitting ? "Saving…" : submitLabel}
      </PrimaryButton>
    </div>
  );
}
