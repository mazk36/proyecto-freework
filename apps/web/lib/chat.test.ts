import { describe, expect, it } from "vitest";
import { groupMessagesByDay, mergeConfirmedMessage, setPendingMessageStatus, type ChatMessage } from "@/lib/chat";

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
