type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden="true" className={`ui-skeleton rounded-lg bg-surface-raised ${className}`} />;
}

export function SkeletonText({ className = "" }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`grid gap-3 ${className}`}>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`rounded-2xl border border-border bg-surface p-5 ring-1 ring-inset ring-white/5 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 shrink-0 rounded-xl" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText className="mt-6" />
      <Skeleton className="mt-6 h-10 w-32" />
    </div>
  );
}
