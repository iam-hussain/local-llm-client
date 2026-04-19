import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-7", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="oklch(0.62 0.2 265)" />
          <stop offset="1" stopColor="oklch(0.48 0.22 295)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="8" fill="url(#logo-bg)" />
      {/* waveform / pulse */}
      <path
        d="M6 19 L10 19 L12 13 L15 22 L18 11 L21 19 L26 19"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* live-dot */}
      <circle cx="25" cy="8" r="2.4" fill="#22d3ee" />
      <circle cx="25" cy="8" r="2.4" fill="#22d3ee" opacity="0.35">
        <animate attributeName="r" values="2.4;5;2.4" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-tight">lmstation</span>
          <span className="text-[9px] text-muted-foreground font-mono tracking-wider">OFFLINE · LOCAL LLM</span>
        </span>
      )}
    </span>
  );
}
