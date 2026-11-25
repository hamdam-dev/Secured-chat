import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDisguisedPushPayload,
  parseServiceAccountJson,
  parseWebPushSubscription
} from "../server/push.js";

test("buildDisguisedPushPayload uses disguised My Notes copy and high priority Android channel", () => {
  const callPayload = buildDisguisedPushPayload("fcm-token-123", "call");
  assert.equal(callPayload.message.token, "fcm-token-123");
  assert.equal(callPayload.message.notification.title, "My Notes");
  assert.equal(callPayload.message.notification.body, "Important note sync alert");
  assert.equal(callPayload.message.android.priority, "HIGH");
  assert.equal(callPayload.message.android.ttl, "30s");
  assert.equal(callPayload.message.android.notification.channel_id, "notes_sync");
  assert.equal(callPayload.message.android.notification.notification_priority, "PRIORITY_MAX");

  const defaultPayload = buildDisguisedPushPayload("fcm-token-123", "unknown");
  assert.equal(defaultPayload.message.notification.body, "Notes backup synced");
  assert.equal(defaultPayload.message.android.ttl, "3600s");
});

test("parseServiceAccountJson parses service account JSON and normalizes escaped newlines", () => {
  const raw = JSON.stringify({
    project_id: "chat-8e3ff",
    client_email: "svc@chat-8e3ff.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"
  });
  const parsed = parseServiceAccountJson(`  ${raw}  `);
  assert.equal(parsed.project_id, "chat-8e3ff");
  assert.equal(parsed.private_key, "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n");
  assert.equal(parseServiceAccountJson("not-json"), null);
  assert.equal(parseServiceAccountJson(JSON.stringify({ project_id: "only-id" })), null);
});

test("parseWebPushSubscription validates https endpoint and keys", () => {
  const valid = JSON.stringify({
    endpoint: "https://fcm.googleapis.com/fcm/send/abc",
    keys: { p256dh: "key1", auth: "auth1" }
  });
  assert.equal(parseWebPushSubscription(valid).endpoint, "https://fcm.googleapis.com/fcm/send/abc");
  assert.equal(parseWebPushSubscription({ endpoint: "http://insecure.local", keys: { p256dh: "a", auth: "b" } }), null);
  assert.equal(parseWebPushSubscription("bad-json"), null);
});
