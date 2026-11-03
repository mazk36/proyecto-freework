import type { ChatMessage } from "@/lib/chat";
import type { ChatConversation, ChatServices } from "@/lib/chat-service";

export type SampleMode = "normal" | "loading" | "empty" | "error";

export function createSampleChatServices(mode: SampleMode, onFailureConsumed: () => void) {
  const now = Date.now();
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  let conversations: ChatConversation[] = [
    { matchId: "muestra-ana", counterpartName: "Ana Torres", counterpartRole: "freelancer", problemTitle: "Ordenar la atención de nuestros clientes", lastMessageBody: "Me parece una buena idea. ¿Podemos revisar el proceso actual?", lastMessageAt: at(8), lastMessageSenderIsMe: false, unreadCount: 2 },
    { matchId: "muestra-estudio", counterpartName: "Estudio Lumen", counterpartRole: "company", problemTitle: "Reducir el trabajo manual en reportes", lastMessageBody: "Gracias por compartir tu propuesta, conversemos sobre los siguientes pasos.", lastMessageAt: at(185), lastMessageSenderIsMe: false, unreadCount: 3 },
    { matchId: "muestra-diego", counterpartName: "Diego Salazar", counterpartRole: "freelancer", problemTitle: "Entender mejor nuestro proceso de ventas", lastMessageBody: null, lastMessageAt: null, lastMessageSenderIsMe: null, unreadCount: 0 },
  ];
  let messages: ChatMessage[] = [
    { id: "muestra-1", matchId: "muestra-ana", senderId: "ana", body: "¡Hola! Gracias por el Match. Me gustaría conocer un poco más sobre cómo reciben las solicitudes hoy.", createdAt: at(1550), clientId: null, status: "sent" },
    { id: "muestra-2", matchId: "muestra-ana", senderId: "yo", body: "Hola, Ana. Las recibimos por varios canales y el equipo termina revisando todo manualmente.", createdAt: at(45), clientId: null, status: "sent" },
    { id: "muestra-3", matchId: "muestra-ana", senderId: "yo", body: "Buscamos una forma sencilla de tener visibilidad del seguimiento.", createdAt: at(42), clientId: null, status: "sent" },
    { id: "muestra-4", matchId: "muestra-ana", senderId: "ana", body: "Me parece una buena idea. ¿Podemos revisar el proceso actual?", createdAt: at(8), clientId: null, status: "sent" },
    { id: "muestra-5", matchId: "muestra-estudio", senderId: "estudio", body: "Gracias por compartir tu propuesta, conversemos sobre los siguientes pasos.", createdAt: at(185), clientId: null, status: "sent" },
  ];
  let shouldFailNext = false;
  const subscribers = new Map<string, Set<(message: ChatMessage) => void>>();
  const never = <T,>() => new Promise<T>(() => {});
  const services: ChatServices = {
    listConversations: async () => {
      if (mode === "loading") return never<ChatConversation[]>();
      if (mode === "error") throw new Error("Error simulado");
      return mode === "empty" ? [] : conversations.map((conversation) => ({ ...conversation }));
    },
    listMessages: async (matchId, before, limit = 50) => messages.filter((message) => message.matchId === matchId && (!before || message.createdAt < before)).slice(-limit).map((message) => ({ ...message })),
    markConversationRead: async (matchId) => {
      conversations = conversations.map((conversation) => conversation.matchId === matchId ? { ...conversation, unreadCount: 0 } : conversation);
    },
    sendMessage: async (matchId, body, clientId = null) => {
      const failThisAttempt = shouldFailNext;
      shouldFailNext = false;
      if (failThisAttempt) onFailureConsumed();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
      if (failThisAttempt) {
        throw new Error("Este fallo es simulado. Puedes reintentar.");
      }
      const existing = messages.find((message) => message.matchId === matchId && message.senderId === "yo" && message.clientId === clientId);
      if (existing) return existing;
      const message: ChatMessage = { id: `muestra-${crypto.randomUUID()}`, matchId, senderId: "yo", body, createdAt: new Date().toISOString(), clientId, status: "sent" };
      messages = [...messages, message];
      conversations = conversations.map((conversation) => conversation.matchId === matchId ? { ...conversation, lastMessageBody: body, lastMessageAt: message.createdAt, lastMessageSenderIsMe: true } : conversation);
      subscribers.get(matchId)?.forEach((subscriber) => subscriber(message));
      return message;
    },
    subscribeToMessages: (matchId, onMessage, onStatus) => {
      const listeners = subscribers.get(matchId) ?? new Set<(message: ChatMessage) => void>();
      listeners.add(onMessage);
      subscribers.set(matchId, listeners);
      onStatus?.("connected");
      return () => { listeners.delete(onMessage); };
    },
  };
  return { services, failNextSend: () => { shouldFailNext = true; } };
}
