import Image from "next/image";
import officialLogo from "@/public/brand/matchwork-logo.png";

type MatchWorkLogoProps = { className?: string; compact?: boolean; preload?: boolean };

export function MatchWorkLogo({ className = "", preload = false }: MatchWorkLogoProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={`block h-auto shrink-0 ${className}`.trim()}
      height={officialLogo.height}
      preload={preload}
      src={officialLogo}
      unoptimized
      width={officialLogo.width}
    />
  );
}

export function MatchWorkLogoLockup({
  className = "",
  compact = false,
  preload = false,
}: MatchWorkLogoProps) {
  return (
    <span
      aria-label="MatchWork"
      className={`inline-flex items-center ${className}`.trim()}
      role="img"
    >
      <MatchWorkLogo
        className={compact ? "w-12 sm:w-20" : "w-[4.5rem] sm:w-20"}
        preload={preload}
      />
    </span>
  );
}
