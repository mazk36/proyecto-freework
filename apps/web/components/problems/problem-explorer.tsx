"use client";

import { Filter, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROBLEM_HASHTAGS } from "@/data/problem-tags";
import { PROBLEMS } from "@/data/problems";
import {
  DEFAULT_PROBLEM_FILTERS,
  filterAndSortProblems,
  type ProblemFilters,
} from "@/lib/problem-utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/problems/empty-state";
import { ProblemGrid } from "@/components/problems/problem-grid";
import { SearchBar } from "@/components/problems/search-bar";

type FilterFieldsProps = {
  filters: ProblemFilters;
  setFilters: (updater: (current: ProblemFilters) => ProblemFilters) => void;
};

function FilterFields({ filters, setFilters }: FilterFieldsProps) {
  const toggleHashtag = (tag: string) => {
    setFilters((current) => ({
      ...current,
      hashtags: current.hashtags.includes(tag)
        ? current.hashtags.filter((selected) => selected !== tag)
        : [...current.hashtags, tag],
    }));
  };

  const selectClass =
    "mt-2 min-h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10";

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-foreground">Áreas del problema</legend>
        <p className="mb-3 mt-1 text-xs leading-5 text-muted-foreground">
          Filtra por el contexto, no por tecnologías.
        </p>
        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {PROBLEM_HASHTAGS.map((tag) => (
            <label className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm text-muted-foreground hover:text-foreground" key={tag}>
              <input
                checked={filters.hashtags.includes(tag)}
                className="size-4 rounded border-border accent-accent focus-visible:ring-2 focus-visible:ring-accent"
                onChange={() => toggleHashtag(tag)}
                type="checkbox"
                value={tag}
              />
              <span>#{tag}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="filter-budget">
          Presupuesto
        </label>
        <select
          className={selectClass}
          id="filter-budget"
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              budget: event.target.value as ProblemFilters["budget"],
            }))
          }
          value={filters.budget}
        >
          <option value="">Cualquier presupuesto</option>
          <option value="under-500">Menos de $500</option>
          <option value="500-1000">$500 – $1,000</option>
          <option value="1000-5000">$1,000 – $5,000</option>
          <option value="over-5000">Más de $5,000</option>
          <option value="unknown">Sin presupuesto definido</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="filter-budget-type">
          Tipo de presupuesto
        </label>
        <select
          className={selectClass}
          id="filter-budget-type"
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              budgetType: event.target.value as ProblemFilters["budgetType"],
            }))
          }
          value={filters.budgetType}
        >
          <option value="">Todos los tipos</option>
          <option value="fixed">Fijo</option>
          <option value="range">Rango</option>
          <option value="unknown">No estoy seguro</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="filter-date">
          Fecha de publicación
        </label>
        <select
          className={selectClass}
          id="filter-date"
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              date: event.target.value as ProblemFilters["date"],
            }))
          }
          value={filters.date}
        >
          <option value="">Cualquier fecha</option>
          <option value="24h">Últimas 24 horas</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground" htmlFor="filter-proposals">
          Número de propuestas
        </label>
        <select
          className={selectClass}
          id="filter-proposals"
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              proposals: event.target.value as ProblemFilters["proposals"],
            }))
          }
          value={filters.proposals}
        >
          <option value="">Cualquier cantidad</option>
          <option value="0-5">0 – 5</option>
          <option value="6-10">6 – 10</option>
          <option value="11-25">11 – 25</option>
          <option value="25+">25+</option>
        </select>
      </div>
    </div>
  );
}

function FilterDialog({
  open,
  onClose,
  filters,
  setFilters,
  onClear,
}: FilterFieldsProps & {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby="mobile-filter-title"
      className="filter-dialog m-0 max-h-[min(88dvh,760px)] w-full max-w-none rounded-t-[24px] border-0 bg-white p-0 text-foreground backdrop:bg-foreground/35 sm:max-w-lg sm:rounded-[24px]"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Explorar</p>
          <h2 className="mt-1 text-lg font-semibold" id="mobile-filter-title">
            Filtrar problemas
          </h2>
        </div>
        <button
          aria-label="Cerrar filtros"
          className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="max-h-[calc(88dvh-145px)] overflow-y-auto px-5 py-5">
        <FilterFields filters={filters} setFilters={setFilters} />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-4">
        <Button onClick={onClear} variant="quiet">
          Limpiar
        </Button>
        <Button onClick={onClose}>
          Mostrar resultados
          <span className="sr-only">con los filtros seleccionados</span>
        </Button>
      </div>
    </dialog>
  );
}

export function ProblemExplorer({
  initialQuery = "",
  now,
}: {
  initialQuery?: string;
  now: number;
}) {
  const [filters, setFilters] = useState<ProblemFilters>({
    ...DEFAULT_PROBLEM_FILTERS,
    query: initialQuery,
  });
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const problems = useMemo(
    () => filterAndSortProblems(PROBLEMS, filters, now),
    [filters, now],
  );

  const activeFilterCount =
    filters.hashtags.length +
    Number(Boolean(filters.budget)) +
    Number(Boolean(filters.budgetType)) +
    Number(Boolean(filters.date)) +
    Number(Boolean(filters.proposals));

  const clearFilters = () => setFilters(DEFAULT_PROBLEM_FILTERS);

  const sortClass =
    "min-h-10 rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/10";

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          onChange={(query) => setFilters((current) => ({ ...current, query }))}
          value={filters.query}
        />
        <Button
          className="w-full sm:w-auto lg:hidden"
          onClick={() => setFilterDialogOpen(true)}
          variant="outline"
        >
          <Filter aria-hidden="true" className="size-4" />
          Filtros
          {activeFilterCount ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)] xl:gap-8">
        <aside className="sticky top-[92px] hidden rounded-card border border-border bg-white p-5 lg:block">
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Filtrar resultados</h2>
          </div>
          <FilterFields filters={filters} setFilters={setFilters} />
          {activeFilterCount ? (
            <Button className="mt-5 w-full" onClick={clearFilters} variant="quiet">
              Limpiar filtros
            </Button>
          ) : null}
        </aside>

        <section aria-label="Problemas disponibles" className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{problems.length}</span>{" "}
              {problems.length === 1 ? "problema" : "problemas"} para explorar
            </p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="shrink-0">Ordenar por</span>
              <select
                className={sortClass}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sort: event.target.value as ProblemFilters["sort"],
                  }))
                }
                value={filters.sort}
              >
                <option value="recent">Más recientes</option>
                <option value="fewest-proposals">Menos propuestas</option>
                <option value="highest-budget">Mayor presupuesto</option>
                <option value="lowest-budget">Menor presupuesto</option>
              </select>
            </label>
          </div>
          {problems.length ? (
            <ProblemGrid now={now} problems={problems} />
          ) : (
            <EmptyState onClear={clearFilters} />
          )}
        </section>
      </div>

      <FilterDialog
        filters={filters}
        onClear={clearFilters}
        onClose={() => setFilterDialogOpen(false)}
        open={filterDialogOpen}
        setFilters={setFilters}
      />
    </>
  );
}
