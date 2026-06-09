// Lightweight wrapper around Telegram WebApp SDK so the UI can call
// haptics, MainButton, BackButton without caring about the SDK import.
export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  close: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  MainButton?: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    enable: () => void;
    disable: () => void;
  };
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  initData?: string;
  initDataUnsafe?: { user?: { id: number; first_name: string; language_code?: string } };
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as any).Telegram?.WebApp ?? null;
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  const tg = getTelegram();
  tg?.HapticFeedback?.impactOccurred(style);
}

export function hapticSuccess() { getTelegram()?.HapticFeedback?.notificationOccurred("success"); }
export function hapticError()   { getTelegram()?.HapticFeedback?.notificationOccurred("error"); }

export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#000000");
    tg.setBackgroundColor?.("#000000");
  } catch {}
}
