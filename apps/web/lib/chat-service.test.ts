import { beforeEach, describe, expect, it, vi } from "vitest";
import { listConversations, listMessages, markConversationRead, sendMessage, subscribeToAllMessages, subscribeToMessages, unreadTotal } from "@/lib/chat-service";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), on: vi.fn(), subscribe: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(), configured: true,
}));
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => mocks.configured ? {
    rpc: mocks.rpc, channel: mocks.channel, removeChannel: mocks.removeChannel,
  } : null,
}));

const row = {
  id: "message", match_id: "match", sender_id: "sender", body: "Hola",
  created_at: "2026-11-02T00:00:00.000001+00:00", client_id: "client",
};
const message = {
  id: "message", matchId: "match", senderId: "sender", body: "Hola",
  createdAt: "2026-11-02T00:00:00.000001+00:00", clientId: "client", status: "sent",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured = true;
  mocks.channel.mockReturnValue({ on: mocks.on });
  mocks.on.mockReturnValue({ subscribe: mocks.subscribe });
  mocks.subscribe.mockReturnValue("channel-instance");
  mocks.removeChannel.mockResolvedValue("ok");
});

describe("chat service", () => {
  it("sends and maps composite RPC results, including a single-row response", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: row, error: null }).mockResolvedValueOnce({ data: [row], error: null });
    await expect(sendMessage("match", " Hola ", "client")).resolves.toEqual(message);
    await expect(sendMessage("match", "Hola")).resolves.toEqual(message);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "send_message", { p_match_id: "match", p_body: " Hola ", p_client_id: "client" });
  });

  it("loads paginated messages without losing the server timestamp precision", async () => {
    mocks.rpc.mockResolvedValue({ data: [row], error: null });
    await expect(listMessages("match", row.created_at, 20)).resolves.toEqual([message]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_messages", { p_match_id: "match", p_before: row.created_at, p_limit: 20 });
  });

  it("maps conversation privacy and unread values and marks a conversation read", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{
      match_id: "match", problem_title: "Título guardado", counterpart_name: null, counterpart_role: "company",
      last_message_body: null, last_message_at: null, last_message_sender_is_me: null, unread_count: 0,
    }], error: null }).mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: 2, error: null });
    await expect(listConversations()).resolves.toEqual([{
      matchId: "match", problemTitle: "Título guardado", counterpartName: null, counterpartRole: "company",
      lastMessageBody: null, lastMessageAt: null, lastMessageSenderIsMe: null, unreadCount: 0,
    }]);
    await markConversationRead("match");
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "mark_conversation_read", { p_match_id: "match" });
    await expect(unreadTotal()).resolves.toBe(2);
  });

  it("rejects malformed and cross-conversation payloads", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: [{ ...row, match_id: "other" }], error: null })
      .mockResolvedValueOnce({ data: [{ ...row, client_id: 7 }], error: null })
      .mockResolvedValueOnce({ data: [{ match_id: "match" }], error: null })
      .mockResolvedValueOnce({ data: -1, error: null });
    await expect(listMessages("match")).rejects.toThrow("No pudimos cargar");
    await expect(sendMessage("match", "Hola")).rejects.toThrow("No pudimos confirmar");
    await expect(listConversations()).rejects.toThrow("No pudimos cargar");
    await expect(unreadTotal()).rejects.toThrow("No pudimos cargar");
  });

  it.each([
    ["message rate limit: maximum 30 messages per minute", "demasiados mensajes"],
    ["message body empty", "Escribe un mensaje"],
    ["message body too long", "2000 caracteres"],
    ["conversation not found", "esta conversación"],
  ])("translates %s", async (error, expected) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: error } });
    await expect(sendMessage("match", "Hola")).rejects.toThrow(expected);
  });

  it("subscribes only to inserts for the match, validates events and cleans up", () => {
    const onMessage = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const cleanup = subscribeToMessages("match", onMessage);
    expect(mocks.on).toHaveBeenCalledWith("postgres_changes", {
      event: "INSERT", schema: "public", table: "messages", filter: "match_id=eq.match",
    }, expect.any(Function));
    const callback = mocks.on.mock.calls[0][2] as (payload: { new: unknown }) => void;
    callback({ new: row });
    callback({ new: { ...row, match_id: "other" } });
    expect(onMessage).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith(message);
    expect(error).toHaveBeenCalledOnce();
    cleanup();
    expect(mocks.removeChannel).toHaveBeenCalledWith("channel-instance");
    error.mockRestore();
  });

  it("returns a no-op cleanup when Supabase is not configured", () => {
    mocks.configured = false;
    expect(() => subscribeToMessages("match", vi.fn())()).not.toThrow();
    expect(mocks.channel).not.toHaveBeenCalled();
  });

  it("reports connection failures and subscribes globally through the RLS-protected table", () => {
    const onStatus = vi.fn();
    const onMessage = vi.fn();
    const cleanup = subscribeToMessages("match", onMessage, onStatus);
    const status = mocks.subscribe.mock.calls[0][0] as (value: string) => void;
    status("SUBSCRIBED");
    status("CHANNEL_ERROR");
    expect(onStatus.mock.calls.map(([value]) => value)).toEqual(["connecting", "connected", "unavailable"]);
    cleanup();

    subscribeToAllMessages(onMessage);
    expect(mocks.on).toHaveBeenLastCalledWith("postgres_changes", {
      event: "INSERT", schema: "public", table: "messages",
    }, expect.any(Function));
    const callback = mocks.on.mock.calls.at(-1)?.[2] as (payload: { new: unknown }) => void;
    callback({ new: row });
    expect(onMessage).toHaveBeenCalledWith(message);
  });
});
