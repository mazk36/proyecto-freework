export type ToastTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type ToastOptions = {
  title: string;
  description?: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

export type ToastEntry = ToastOptions & {
  id: string;
  durationMs: number;
  state: "visible" | "closing";
};

export type ToastQueueAction =
  | { type: "add"; toast: ToastEntry }
  | { type: "dismiss" | "expire" | "remove"; id: string };

export function toastQueueReducer(state: ToastEntry[], action: ToastQueueAction): ToastEntry[] {
  switch (action.type) {
    case "add":
      return [...state, action.toast].slice(-3);
    case "dismiss":
    case "expire":
      return state.map((toast) =>
        toast.id === action.id ? { ...toast, state: "closing" } : toast,
      );
    case "remove":
      return state.filter((toast) => toast.id !== action.id);
  }
}
