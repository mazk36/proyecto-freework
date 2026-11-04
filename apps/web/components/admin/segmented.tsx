"use client";

export function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div aria-label={label} className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            aria-checked={selected}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected ? "border-accent/60 bg-accent/15 text-foreground" : "border-border text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            }`}
            key={option.id}
            onClick={() => onChange(option.id)}
            role="radio"
            type="button"
          >
            {option.label}{option.count !== undefined ? <span className="ml-1.5 font-mono text-xs text-muted-foreground">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
