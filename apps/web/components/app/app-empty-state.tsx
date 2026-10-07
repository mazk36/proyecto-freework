import type { ReactNode } from "react";

export function AppEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="mx-auto grid min-h-[48vh] w-full max-w-3xl place-items-center px-5 py-12 sm:px-8">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </section>
  );
}
