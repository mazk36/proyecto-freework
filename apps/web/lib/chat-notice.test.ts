import { describe, expect, it } from "vitest";
import { CHAT_NOTICE, dismissConversationNotice, isConversationNoticeDismissed } from "@/lib/chat-notice";

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe("conversation notice storage", () => {
  it("remembers dismissal separately for each conversation", () => {
    const storage = fakeStorage();

    expect(isConversationNoticeDismissed("match-1", storage)).toBe(false);
    dismissConversationNotice("match-1", storage);

    expect(storage.getItem(`${CHAT_NOTICE.storageKeyPrefix}match-1`)).toBe("1");
    expect(isConversationNoticeDismissed("match-1", storage)).toBe(true);
    expect(isConversationNoticeDismissed("match-2", storage)).toBe(false);

    dismissConversationNotice("match-2", storage);
    expect(isConversationNoticeDismissed("match-2", storage)).toBe(true);
  });

  it("only treats the dismissal marker as dismissed", () => {
    const storage = fakeStorage();
    storage.setItem(`${CHAT_NOTICE.storageKeyPrefix}match-1`, "unexpected");

    expect(isConversationNoticeDismissed("match-1", storage)).toBe(false);
  });

  it("tolerates unavailable storage", () => {
    expect(isConversationNoticeDismissed("match-1", null)).toBe(false);
    expect(isConversationNoticeDismissed("match-1", undefined)).toBe(false);
    expect(() => dismissConversationNotice("match-1", null)).not.toThrow();
    expect(() => dismissConversationNotice("match-1", undefined)).not.toThrow();
  });

  it("tolerates read and write failures", () => {
    const storage = {
      getItem: () => { throw new Error("Storage read unavailable"); },
      setItem: () => { throw new Error("Storage write unavailable"); },
    };

    expect(isConversationNoticeDismissed("match-1", storage)).toBe(false);
    expect(() => dismissConversationNotice("match-1", storage)).not.toThrow();
  });

  it("keeps a failed dismissal for the current visit but shows it on the next visit", () => {
    const storage = {
      getItem: () => { throw new Error("Storage read unavailable"); },
      setItem: () => { throw new Error("Storage write unavailable"); },
    };
    const currentVisit = new Set<string>();

    dismissConversationNotice("match-1", storage, currentVisit);

    expect(isConversationNoticeDismissed("match-1", storage, currentVisit)).toBe(true);
    expect(isConversationNoticeDismissed("match-2", storage, currentVisit)).toBe(false);
    expect(isConversationNoticeDismissed("match-1", storage, new Set())).toBe(false);
  });
});
