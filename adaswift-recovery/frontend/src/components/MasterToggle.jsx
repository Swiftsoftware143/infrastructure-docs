import { cn } from "@/lib/utils";

export default function MasterToggle({ active, onChange, disabled, testId = "master-toggle-switch" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      data-testid={testId}
      onClick={() => onChange(!active)}
      className={cn(
        "relative inline-flex h-9 w-[68px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007bff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]",
        active
          ? "bg-[#10b981] shadow-[0_0_22px_rgba(16,185,129,0.45)]"
          : "bg-[#ef4444] shadow-[0_0_22px_rgba(239,68,68,0.4)]",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-out",
          active ? "translate-x-[34px]" : "translate-x-1"
        )}
      />
    </button>
  );
}
