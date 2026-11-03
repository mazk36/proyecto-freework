"use client";

import { Info, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { CHAT_NOTICE, dismissConversationNotice, isConversationNoticeDismissed } from "@/lib/chat-notice";

const dismissedThisVisit = new Set<string>();

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ConversationNotice({ matchId, onDismiss }: { matchId: string; onDismiss?: () => void }) {
  const [state, setState] = useState<{ matchId: string; dismissed: boolean } | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!CHAT_NOTICE.enabled) return;
    setState({
      matchId,
      dismissed: isConversationNoticeDismissed(matchId, browserStorage(), dismissedThisVisit),
    });
  }, [matchId]);

  function dismiss() {
    dismissConversationNotice(matchId, browserStorage(), dismissedThisVisit);
    setState({ matchId, dismissed: true });
    onDismiss?.();
  }

  const visible = CHAT_NOTICE.enabled && state?.matchId === matchId && !state.dismissed;

  return <AnimatePresence initial={false}>
    {visible ? <motion.div
      animate={{ height: "auto", opacity: 1, y: 0 }}
      className="shrink-0 overflow-hidden"
      exit={{ height: 0, opacity: 0, y: reducedMotion ? 0 : -4 }}
      initial={reducedMotion ? false : { height: 0, opacity: 0, y: -4 }}
      key={matchId}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
    >
      <div className="flex items-start gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5" role="note">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-foreground">{CHAT_NOTICE.title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{CHAT_NOTICE.body}</p>
        </div>
        <button aria-label="Cerrar aviso" className="-my-2 grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={dismiss} type="button">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </motion.div> : null}
  </AnimatePresence>;
}
