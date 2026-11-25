import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const webpush = require("web-push");

let cachedOAuthToken = null;
let cachedOAuthExpiry = 0;
let cachedVapidKeys = null;

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function parseServiceAccountJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.client_email && parsed.private_key && parsed.project_id) {
      return {
        ...parsed,
        private_key: String(parsed.private_key).replace(/\\n/g, "\n")
      };
    }
    return null;
  } catch {
    return null;
  }
}

function parseServiceAccount() {
  return parseServiceAccountJson(process.env.FCM_SERVICE_ACCOUNT_JSON);
}

export function parseWebPushSubscription(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (
    obj &&
    typeof obj === "object" &&
    typeof obj.endpoint === "string" &&
    /^https:\/\//i.test(obj.endpoint) &&
    obj.keys &&
    typeof obj.keys.p256dh === "string" &&
    typeof obj.keys.auth === "string"
  ) {
    return obj;
  }
  return null;
}

function getVapidKeys() {
  const envPub = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const envPriv = (process.env.VAPID_PRIVATE_KEY || "").trim();
  if (envPub && envPriv) {
    return { publicKey: envPub, privateKey: envPriv, persistent: true };
  }
  if (!cachedVapidKeys) {
    const generated = webpush.generateVAPIDKeys();
    cachedVapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      persistent: false
    };
  }
  return cachedVapidKeys;
}

async function getFcmAccessToken(serviceAccount) {
  if (cachedOAuthToken && Date.now() < cachedOAuthExpiry) {
    return cachedOAuthToken;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600
  }));

  const signInput = `${header}.${claimSet}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  signer.end();
  const signature = base64UrlEncode(signer.sign(serviceAccount.private_key));
  const assertion = `${signInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!tokenRes.ok) {
    const errTxt = await tokenRes.text();
    throw new Error(`OAuth token exchange failed (${tokenRes.status}): ${errTxt.slice(0, 120)}`);
  }

  const tokenData = await tokenRes.json();
  cachedOAuthToken = tokenData.access_token;
  cachedOAuthExpiry = Date.now() + Math.max(60, (tokenData.expires_in || 3600) - 90) * 1000;
  return cachedOAuthToken;
}

export function getDisguisedCopy(kind = "message") {
  const map = {
    call: { title: "My Notes", body: "Important note sync alert" },
    ping: { title: "My Notes", body: "Pinned reminder updated" },
    letter: { title: "My Notes", body: "New note synced to your pad" },
    message: { title: "My Notes", body: "Notes backup synced" }
  };
  return map[kind] || map.message;
}

export function buildDisguisedPushPayload(targetToken, kind = "message") {
  const copy = getDisguisedCopy(kind);
  const isCall = kind === "call";
  return {
    message: {
      token: targetToken,
      notification: { title: copy.title, body: copy.body },
      data: { kind: String(kind) },
      android: {
        priority: "HIGH",
        ttl: isCall ? "30s" : "3600s",
        notification: {
          channel_id: "notes_sync",
          sound: "default",
          notification_priority: isCall ? "PRIORITY_MAX" : "PRIORITY_HIGH"
        }
      }
    }
  };
}

export function registerPushRoutes(app, requireAuth) {
  app.get("/api/push/public-key", requireAuth, (_req, res) => {
    const { publicKey, persistent } = getVapidKeys();
    res.json({
      publicKey,
      persistent,
      hasFcmServer: Boolean(parseServiceAccount())
    });
  });

  app.post("/api/send-push", requireAuth, async (req, res) => {
    const { targetToken = "", targetWebSub = null, kind = "message" } = req.body || {};
    const hasFcmTarget = typeof targetToken === "string" && targetToken.trim().length > 0;
    const webSub = parseWebPushSubscription(targetWebSub);

    if (!hasFcmTarget && !webSub) {
      return res.status(400).json({ ok: false, error: "Missing targetToken or targetWebSub" });
    }

    const legacyWorkerUrl = (process.env.PUSH_WORKER_URL || "").trim();
    const serviceAccount = parseServiceAccount();
    const copy = getDisguisedCopy(kind);
    const modes = [];
    const errors = [];

    const tasks = [];

    if (webSub) {
      tasks.push((async () => {
        const { publicKey, privateKey } = getVapidKeys();
        webpush.setVapidDetails("mailto:sync@mynotes.local", publicKey, privateKey);
        const payload = JSON.stringify({
          title: copy.title,
          body: copy.body,
          kind: String(kind),
          tag: kind === "call" ? "my-notes-call" : "my-notes-sync"
        });
        await webpush.sendNotification(webSub, payload, {
          TTL: kind === "call" ? 30 : 3600,
          urgency: kind === "call" ? "high" : "normal"
        });
        modes.push("web_push");
      })().catch(err => {
        errors.push(`WebPush: ${err?.message || "failed"}`);
      }));
    }

    if (hasFcmTarget && serviceAccount) {
      tasks.push((async () => {
        const accessToken = await getFcmAccessToken(serviceAccount);
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
        const fcmRes = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(buildDisguisedPushPayload(targetToken.trim(), kind))
        });
        const txt = await fcmRes.text();
        if (!fcmRes.ok) {
          throw new Error(txt.slice(0, 140));
        }
        modes.push("fcm_v1");
      })().catch(err => {
        errors.push(`FCM: ${err?.message || "failed"}`);
      }));
    } else if (hasFcmTarget && legacyWorkerUrl) {
      tasks.push((async () => {
        const workerRes = await fetch(legacyWorkerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.authorization || ""
          },
          body: JSON.stringify({ targetToken: targetToken.trim(), kind })
        });
        if (!workerRes.ok) {
          const txt = await workerRes.text();
          throw new Error(txt.slice(0, 120));
        }
        modes.push("worker");
      })().catch(err => {
        errors.push(`Worker: ${err?.message || "failed"}`);
      }));
    } else if (hasFcmTarget) {
      errors.push("APK push ke liye server par FCM_SERVICE_ACCOUNT_JSON zaroori hai");
    }

    await Promise.all(tasks);

    if (modes.length > 0) {
      return res.json({
        ok: true,
        mode: modes.join("+"),
        modes,
        warnings: errors.length ? errors : undefined
      });
    }

    return res.json({
      ok: false,
      configured: false,
      reason: errors.join(" | ") || "Push dispatch unavailable"
    });
  });
}
