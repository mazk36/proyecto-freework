import Image from "next/image";
import officialMark from "@/public/brand/matchwork-mark.png";
import officialWordmark from "@/public/brand/matchwork-wordmark-horizontal.png";
import officialReversedWordmark from "@/public/brand/matchwork-wordmark-reversed.png";

type MatchWorkLogoProps = { className?: string; preload?: boolean };
type MatchWorkLogoLockupProps = MatchWorkLogoProps & {
  compact?: boolean;
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
  compact = false,
  preload = false,
  variant = "standard",
}: MatchWorkLogoLockupProps) {
  const wordmark = variant === "reversed" ? officialReversedWordmark : officialWordmark;

  return (
    <span
      aria-label="MatchWork"
      className={`relative inline-flex shrink-0 overflow-hidden rounded-lg ${
        variant === "standard" ? "bg-brand-white" : "bg-transparent"
      } ${
        compact ? "h-8 w-24 sm:h-10 sm:w-32" : "h-10 w-32 sm:h-12 sm:w-40"
      } ${className}`.trim()}
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
