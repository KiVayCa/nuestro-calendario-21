import webpush from "npm:web-push@3.6.7";
import { JWT } from "npm:google-auth-library@9.15.1";

type WebDevice = { endpoint: string; p256dh: string; auth: string };
type AndroidDevice = { token: string };
export type PushDevice = WebDevice | AndroidDevice;

let credentials: { client: JWT; project: string } | undefined;

export async function sendCalendarPush(device: PushDevice, payload: string) {
  if ("endpoint" in device) {
    await webpush.sendNotification(
      {
        endpoint: device.endpoint,
        keys: { p256dh: device.p256dh, auth: device.auth },
      },
      payload,
      { TTL: 900, timeout: 5000 },
    );
    return;
  }

  if (!credentials) {
    const account = JSON.parse(
      Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") || "{}",
    );
    if (!account.client_email || !account.private_key || !account.project_id)
      throw new Error("FCM credentials unavailable");
    credentials = {
      project: account.project_id,
      client: new JWT({
        email: account.client_email,
        key: account.private_key,
        scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
      }),
    };
  }
  const { token } = await credentials.client.getAccessToken();
  if (!token) throw new Error("FCM authorization unavailable");

  const response = await fetch(
    "https://fcm.googleapis.com/v1/projects/" +
      encodeURIComponent(credentials.project) +
      "/messages:send",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: device.token,
          data: JSON.parse(payload),
          android: { priority: "HIGH", ttl: "900s" },
        },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
  if (response.ok) return;

  const body = await response.json().catch(() => ({}));
  const unregistered =
    Array.isArray(body.error?.details) &&
    body.error.details.some(
      (detail: { errorCode?: string }) => detail.errorCode === "UNREGISTERED",
    );
  throw Object.assign(new Error("FCM delivery failed"), {
    statusCode: unregistered
      ? 410
      : response.status === 404
        ? 502
        : response.status,
  });
}
