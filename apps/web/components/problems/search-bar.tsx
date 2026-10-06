import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <label className="sr-only" htmlFor="problem-search">
        Busca problemas por título, descripción o área
      </label>
      <input
        autoComplete="off"
        className="min-h-14 w-full rounded-2xl border border-border bg-white pl-12 pr-12 text-sm text-foreground shadow-[0_4px_24px_-20px_rgba(30,27,40,0.35)] outline-none placeholder:text-muted-foreground/75 focus:border-accent/50 focus:ring-4 focus:ring-accent/10"
        id="problem-search"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Busca un problema que puedas resolver..."
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
