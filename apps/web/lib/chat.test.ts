import { describe, expect, it } from "vitest";
import { formatChatRelativeTime, groupMessagesByDay, isScrollNearBottom, mergeConfirmedMessage, needsEarlierPageToBridge, setPendingMessageStatus, sortAndDedupeMessages, summarizeLastMessage, type ChatMessage } from "@/lib/chat";

function message(id: string, senderId: string, createdAt: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id, senderId, createdAt, matchId: "match", body: id, clientId: null, status: "sent", ...overrides };
}

// Local dates avoid relying on the machine's time zone for calendar-day tests.
const at = (year: number, month: number, day: number, hour: number) => new Date(year, month - 1, day, hour).toISOString();

describe("chat message grouping", () => {
  it("separates days and consecutive senders, including across midnight and month boundaries", () => {
    const rows = [
      message("a", "one", at(2026, 10, 30, 10)),
      message("b", "one", at(2026, 10, 31, 23)),
      message("c", "one", at(2026, 11, 1, 8)),
      message("d", "one", at(2026, 11, 1, 9)),
      message("e", "two", at(2026, 11, 1, 10)),
      message("f", "one", at(2026, 11, 1, 11)),
    ];
    const days = groupMessagesByDay(rows, new Date(2026, 10, 1, 12));
    expect(days.map((day) => [day.date, day.label])).toEqual([
      ["2026-10-30", "30 de octubre de 2026"], ["2026-10-31", "Ayer"], ["2026-11-01", "Hoy"],
    ]);
    expect(days[2].groups.map((group) => group.messages.map((item) => item.id))).toEqual([["c", "d"], ["e"], ["f"]]);
    expect(groupMessagesByDay([], new Date())).toEqual([]);
  });
});

describe("chat list and scrolling", () => {
  it("summarizes whitespace and truncates without cutting Unicode characters", () => {
    expect(summarizeLastMessage(null)).toBe("Aún no hay mensajes");
    expect(summarizeLastMessage(" \n Hola   mundo \t ")).toBe("Hola mundo");
    expect(summarizeLastMessage("Hola 😊 mundo", 7)).toBe("Hola 😊…");
    expect(summarizeLastMessage("Mensaje", 1)).toBe("…");
  });

  it("formats recent, yesterday, older and invalid dates using local calendar days", () => {
    const now = new Date(2026, 10, 2, 12, 0);
    expect(formatChatRelativeTime(new Date(2026, 10, 2, 11, 59, 30).toISOString(), now)).toBe("Ahora");
    expect(formatChatRelativeTime(new Date(2026, 10, 2, 11, 55).toISOString(), now)).toBe("hace 5 min");
    expect(formatChatRelativeTime(new Date(2026, 10, 2, 10).toISOString(), now)).toBe("hace 2 h");
    expect(formatChatRelativeTime(new Date(2026, 10, 1, 23).toISOString(), now)).toBe("Ayer");
    expect(formatChatRelativeTime(new Date(2025, 11, 31, 12).toISOString(), now)).toContain("2025");
    expect(formatChatRelativeTime("invalid", now)).toBe("");
    expect(formatChatRelativeTime(null, now)).toBe("");
  });

  it("recognizes the bottom within the tolerance, including short lists and overscroll", () => {
    expect(isScrollNearBottom(420, 500, 1000)).toBe(true);
    expect(isScrollNearBottom(419, 500, 1000)).toBe(false);
    expect(isScrollNearBottom(0, 500, 300)).toBe(true);
    expect(isScrollNearBottom(510, 500, 1000)).toBe(true);
  });
});

describe("message ordering and deduplication", () => {
  it("sorts timestamps with microseconds and reconciles server, realtime and pending copies", () => {
    const first = message("a", "one", "2026-11-02T00:00:00.000001+00:00");
    const confirmed = message("server", "one", "2026-11-02T00:00:00.000002+00:00", { clientId: "same" });
    const pending = message("pending", "one", "2026-11-02T00:00:00.000Z", { clientId: "same", status: "error" });
    expect(sortAndDedupeMessages([pending, confirmed, first, confirmed])).toEqual([first, confirmed]);
    expect(sortAndDedupeMessages([confirmed, pending])).toEqual([confirmed]);
  });

  it("keeps identical client IDs belonging to another sender or conversation", () => {
    const first = message("first", "one", at(2026, 11, 1, 10), { clientId: "same" });
    const otherSender = message("second", "two", at(2026, 11, 1, 11), { clientId: "same" });
    const otherMatch = message("third", "one", at(2026, 11, 1, 12), { clientId: "same", matchId: "elsewhere" });
    expect(sortAndDedupeMessages([otherMatch, first, otherSender])).toEqual([first, otherSender, otherMatch]);
  });

  it("keeps paging after a long disconnection until it reaches a known message or the start", () => {
    const known = message("known", "one", "2026-11-02T00:00:00.000001+00:00");
    const second = message("second", "one", "2026-11-02T00:00:00.000002+00:00");
    const third = message("third", "one", "2026-11-02T00:00:00.000003+00:00");
    expect(needsEarlierPageToBridge([second, third], known, 2)).toBe(true);
    expect(needsEarlierPageToBridge([known, second], known, 2)).toBe(false);
    expect(needsEarlierPageToBridge([known], undefined, 2)).toBe(false);
    expect(needsEarlierPageToBridge([second, third], undefined, 2)).toBe(true);
    expect(needsEarlierPageToBridge([known, second], third, 2)).toBe(false);
  });
});

describe("optimistic messages", () => {
  const optimistic = message("temporary", "one", at(2026, 11, 1, 10), { clientId: "client-1", status: "sending" });
  const confirmed = message("server-id", "one", at(2026, 11, 1, 10), { clientId: "client-1", body: "Hola" });

  it("replaces a pending or failed message with its server confirmation", () => {
    expect(mergeConfirmedMessage([optimistic], confirmed)).toEqual([confirmed]);
    expect(mergeConfirmedMessage([{ ...optimistic, status: "error" }], confirmed)).toEqual([confirmed]);
  });

  it("deduplicates RPC and Realtime results regardless of arrival order", () => {
    expect(mergeConfirmedMessage([optimistic, confirmed], confirmed)).toEqual([confirmed]);
    expect(mergeConfirmedMessage(mergeConfirmedMessage([], confirmed), confirmed)).toEqual([confirmed]);
  });

  it("tracks failure and retry without downgrading a confirmed realtime message", () => {
    const failed = setPendingMessageStatus([optimistic], "match", "one", "client-1", "error");
    expect(failed[0].status).toBe("error");
    expect(setPendingMessageStatus(failed, "match", "one", "client-1", "sending")[0].status).toBe("sending");
    expect(setPendingMessageStatus([confirmed], "match", "one", "client-1", "error")[0].status).toBe("sent");
    expect(setPendingMessageStatus([optimistic], "match", "two", "client-1", "error")[0].status).toBe("sending");
  });

  it("does not merge another sender or conversation even if client ids match", () => {
    const otherSender = { ...optimistic, id: "other", senderId: "two" };
    const otherMatch = { ...optimistic, id: "elsewhere", matchId: "other-match" };
    expect(mergeConfirmedMessage([otherSender, otherMatch, optimistic], confirmed)).toEqual([otherSender, otherMatch, confirmed]);
  });
});
