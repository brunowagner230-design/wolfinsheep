import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Row = {
  id: string;
  user_id: string;
  title: string;
  body: string;
};

type Sub = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Envia as notificações pendentes (pushed_at nulo) para os dispositivos
 * inscritos, usando Web Push (funciona com o app fechado no celular).
 */
export const flushPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const publicKey = process.env["VAPID_PUBLIC_KEY"];
    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    const subject = process.env["VAPID_SUBJECT"] ?? "mailto:admin@wolfinsheepaffiliates.com";
    if (!publicKey || !privateKey) return { sent: 0, reason: "vapid-missing" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");

    const { data: pending } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, title, body")
      .is("pushed_at", null)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true })
      .limit(50);

    const candidates = (pending ?? []) as Row[];
    if (candidates.length === 0) return { sent: 0 };

    // Claim each notification before delivery. Multiple open tabs/devices can
    // call flushPush at the same time; the conditional update makes only the
    // first caller responsible for a given notification.
    const { data: claimedData } = await supabaseAdmin
      .from("notifications")
      .update({ pushed_at: new Date().toISOString() })
      .in("id", candidates.map((r) => r.id))
      .is("pushed_at", null)
      .select("id, user_id, title, body");

    const rows = (claimedData ?? []) as Row[];
    if (rows.length === 0) return { sent: 0 };

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: subsData } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    const subs = (subsData ?? []) as Sub[];

    let sent = 0;
    const stale: string[] = [];
    const deliveredRows = new Set<string>();

    for (const row of rows) {
      const targets = subs.filter((s) => s.user_id === row.user_id);
      for (const target of targets) {
        try {
          const payload = await buildPushPayload(
            {
              data: JSON.stringify({
                title: row.title,
                body: row.body,
                tag: row.id,
                url: "/dashboard",
              }),
              options: { ttl: 60 * 60 * 24 },
            },
            {
              endpoint: target.endpoint,
              expirationTime: null,
              keys: { p256dh: target.p256dh, auth: target.auth },
            },
            { subject, publicKey, privateKey },
          );
          const res = await fetch(target.endpoint, payload);
          if (res.ok) {
            sent += 1;
            deliveredRows.add(row.id);
          } else if (res.status === 404 || res.status === 410) stale.push(target.id);
          else console.error(`push falhou [${res.status}]: ${await res.text()}`);
        } catch (error) {
          console.error("push erro", error);
        }
      }
    }

    // A notification stays claimed once at least one device accepted it.
    // If every delivery failed, release the claim so a later flush can retry.
    const undeliveredIds = rows
      .filter((row) => !deliveredRows.has(row.id))
      .map((row) => row.id);
    if (undeliveredIds.length > 0) {
      await supabaseAdmin
        .from("notifications")
        .update({ pushed_at: null })
        .in("id", undeliveredIds)
        .not("pushed_at", "is", null);
    }

    if (stale.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
    }

    return { sent };
  });
