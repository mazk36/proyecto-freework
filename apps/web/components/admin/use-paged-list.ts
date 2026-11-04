"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendPage, type ListState } from "@/lib/admin-panel";

type Fetcher<T> = (cursor: { at: string; id: string } | null) => Promise<ListState<T>>;

/** Keyset-paginated list with explicit loading/error states and stale-response protection. */
export function usePagedList<T>(fetchPage: Fetcher<T>, key: (item: T) => string, deps: readonly unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<ListState<T>["nextCursor"]>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const reload = useCallback(async () => {
    const current = ++sequence.current;
    setStatus("loading");
    try {
      const page = await fetchRef.current(null);
      if (current !== sequence.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setStatus("ready");
    } catch (reason) {
      if (current !== sequence.current) return;
      setError(reason instanceof Error ? reason.message : "No pudimos cargar la lista.");
      setStatus("error");
    }
  }, []);

  useEffect(() => { void reload(); }, [reload, ...deps]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const current = sequence.current;
    setLoadingMore(true);
    try {
      const page = await fetchRef.current(cursor);
      if (current !== sequence.current) return;
      setItems((list) => appendPage(list, page.items, key));
      setCursor(page.nextCursor);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos cargar más resultados.");
      setStatus("error");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, key, loadingMore]);

  return { items, setItems, status, error, hasMore: cursor !== null, loadMore, loadingMore, reload };
}
