import type { ReactNode } from "react";

export const controlClass =
  "w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent";

export const primaryClass =
  "inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-45";

export const quietClass =
  "inline-flex items-center justify-center rounded-full border border-line bg-card px-4 py-2 text-sm transition hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-45";

export const dangerClass =
  "inline-flex items-center justify-center rounded-full border border-[#e7c3b6] bg-[#fff6f2] px-4 py-2 text-sm text-accent-deep transition hover:border-accent disabled:opacity-45";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-[#fff1ea] px-3 py-2 text-sm text-accent-deep">
      {children}
    </p>
  );
}

export function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Не удалось выполнить запрос";
}
