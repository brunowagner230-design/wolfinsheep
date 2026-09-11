import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const VAPID_PUBLIC_KEY =
  "BE0BLSlwpNWUwqA0yh3Cd7dEkIOJwO0yBWvmLMDUCKIXKur2Fxmc9cbTz2BNY1PvVl4dblD5Ux-63UueySUdpyg";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPreviewContext() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return (
    window.top !== window.self ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev")
  );
}

/** Registra o dispositivo no servidor para receber push com o app fechado. */
export async function registerPushDevice() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const json = subscription.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    const p256dh = json.keys?.p256dh ?? bufferToBase64Url(subscription.getKey("p256dh"));
    const auth = json.keys?.auth ?? bufferToBase64Url(subscription.getKey("auth"));
    const endpoint = json.endpoint ?? subscription.endpoint;
    if (!endpoint || !p256dh || !auth) return false;

    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return false;

    await (supabase as unknown as { from: (t: string) => any })
      .from("push_subscriptions")
      .upsert({ user_id: userId, endpoint, p256dh, auth }, { onConflict: "endpoint" });
    return true;
  } catch (error) {
    console.error("push subscribe falhou", error);
    return false;
  }
}

export function usePwa() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const inPreview = isPreviewContext();

    if ("serviceWorker" in navigator) {
      if (inPreview || !import.meta.env.PROD) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => {
            if (r.active?.scriptURL.endsWith("/sw.js")) r.unregister();
          });
        });
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => registerPushDevice())
          .catch(() => undefined);
      }
    }
    if ("Notification" in window) setPermission(Notification.permission);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
    return choice.outcome === "accepted";
  }, [promptEvent]);

  const enableNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") await registerPushDevice();
    return result;
  }, []);

  return { canInstall: !!promptEvent, installed, install, permission, enableNotifications };
}

export function pushLocalNotification(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "notify", title, body, tag });
    return;
  }
  try {
    new Notification(title, { body, icon: "/favicon.png", ...(tag ? { tag } : {}) });
  } catch {
    /* ignora navegadores sem suporte */
  }
}
