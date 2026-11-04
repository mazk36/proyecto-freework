import Image from "next/image";
// Web-sized derivatives of the official brand files in public/brand (which stay untouched):
// the originals are 1254-3919 px PNGs and the logo is shown at ~160 px, so the derivatives cut the transfer by ~95%.
import officialMark from "@/public/optimized/mark-256.webp";
import officialWordmark from "@/public/optimized/wordmark-horizontal-480.webp";
import officialReversedWordmark from "@/public/optimized/wordmark-reversed-480.webp";

type MatchWorkLogoProps = { className?: string; preload?: boolean };
type MatchWorkLogoLockupProps = MatchWorkLogoProps & {
  size?: "compact" | "default" | "large";
  variant?: "standard" | "reversed";
};

export function MatchWorkLogo({ className = "", preload = false }: MatchWorkLogoProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={`block h-auto shrink-0 ${className}`.trim()}
      height={officialMark.height}
      preload={preload}
      src={officialMark}
      unoptimized
      width={officialMark.width}
    />
  );
}

export function MatchWorkLogoLockup({
  className = "",
  size = "default",
  preload = false,
  variant = "standard",
}: MatchWorkLogoLockupProps) {
  const wordmark = variant === "reversed" ? officialReversedWordmark : officialWordmark;
  const sizeClass = {
    compact: "h-8 w-24 sm:h-10 sm:w-32",
    default: "h-10 w-32 sm:h-12 sm:w-40",
    large: "h-10 w-[7.5rem] sm:h-[3.125rem] sm:w-40",
  }[size];

  return (
    <span
      aria-label="MatchWork"
      className={`relative inline-flex shrink-0 overflow-hidden rounded-lg ${
        variant === "standard" ? "bg-brand-white" : "bg-transparent"
      } ${sizeClass} ${className}`.trim()}
      role="img"
    >
      <Image
        alt=""
        aria-hidden="true"
        className="absolute left-0 top-1/2 block h-auto w-full max-w-none -translate-y-1/2"
        height={wordmark.height}
        preload={preload}
        src={wordmark}
        unoptimized
        width={wordmark.width}
      />
    </span>
  );
}
