import { MatchWorkLogoLockup } from "@/components/brand/matchwork-logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <MatchWorkLogoLockup />
        <span className="text-muted-foreground">
          Problemas, <span className="text-brand-lavender">propuestas</span> y el{" "}
          <span className="font-medium text-brand-purple">Match correcto.</span>
        </span>
      </div>
    </footer>
  );
}
