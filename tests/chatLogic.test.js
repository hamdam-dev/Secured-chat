import test from "node:test";
import assert from "node:assert/strict";
import {
  sortMessages,
  diffMessageIds,
  getBubblePreviewText,
  sanitizeAiSnippets,
  buildMessageSignature,
  getIncomingAlertKind,
  resolveApiUrl,
  mergeMessageReactions,
  getDisplayReactionsList
} from "../shared/chatLogic.js";
import { getQuickReactions } from "../shared/emojiCatalog.js";

test("sortMessages sorts deterministically by createdAtSec, createdAtNs, and id", () => {
  const input = [
    { id: "b", createdAtSec: 100, createdAtNs: 20 },
    { id: "a", createdAtSec: 100, createdAtNs: 20 },
    { id: "c", createdAtSec: 99, createdAtNs: 900 },
    { id: "d", createdAtSec: 100, createdAtNs: 5 }
  ];
  const sorted = sortMessages(input);
  assert.deepEqual(sorted.map(m => m.id), ["c", "d", "a", "b"]);
});

test("diffMessageIds identifies removed IDs and marks new vs existing messages", () => {
  const renderedOrder = ["m1", "m2", "m3"];
  const nextSorted = [
    { id: "m1", decrypted: { text: "hi" } },
    { id: "m3", decrypted: { text: "yo" } },
    { id: "m4", decrypted: { text: "new" } }
  ];
  const { toRemove, toUpsert } = diffMessageIds(renderedOrder, nextSorted);
  assert.deepEqual(toRemove, ["m2"]);
  assert.deepEqual(
    toUpsert.map(item => ({ id: item.msg.id, index: item.index, isNew: item.isNew })),
    [
      { id: "m1", index: 0, isNew: false },
      { id: "m3", index: 1, isNew: false },
      { id: "m4", index: 2, isNew: true }
    ]
  );
});

test("getBubblePreviewText formats carePing, letterData, walletRedeem, vibeCard, giftData, media, and text", () => {
  assert.equal(getBubblePreviewText({ carePing: { emoji: "🍲", label: "Khana Khaya?" } }), "🍲 Khana Khaya?");
  assert.equal(getBubblePreviewText({ letterData: { title: "Jab yaad aaye" } }), "💌 Jab yaad aaye");
  assert.equal(getBubblePreviewText({ walletRedeem: { title: "2-Min Honey Pass" } }), "🎟️ Redeemed: 2-Min Honey Pass");
  assert.equal(getBubblePreviewText({ vibeCard: { headline: "Aaj Ka Vibe" } }), "✨ Aaj Ka Vibe");
  assert.equal(getBubblePreviewText({ giftData: { label: "Rose" } }), "🎁 Gift: Rose");
  assert.equal(getBubblePreviewText({ audioData: "data:audio/webm;base64,..." }), "🎤 Voice Note");
  assert.equal(getBubblePreviewText({ imageData: "data:image/jpeg;base64,...", viewOnce: true }), "🔥 View-Once Photo");
  assert.equal(getBubblePreviewText({ imageData: "data:image/jpeg;base64,...", viewOnce: false }), "🖼️ Photo");
  assert.equal(getBubblePreviewText({ text: "Assalam o Alaikum" }), "Assalam o Alaikum");
});

test("sanitizeAiSnippets filters media/call logs, maps Me vs Partner, and enforces maxCount", () => {
  const messages = [
    { id: "1", createdAtSec: 1, sender: "u1", decrypted: { isCallLog: true, text: "Audio Call" } },
    { id: "2", createdAtSec: 2, sender: "u2", decrypted: { imageData: "abc" } },
    { id: "3", createdAtSec: 3, sender: "u1", decrypted: { text: "Khana khaya?" } },
    { id: "4", createdAtSec: 4, sender: "u2", decrypted: { carePing: { emoji: "💧", label: "Paani Piya?" } } },
    { id: "5", createdAtSec: 5, sender: "u1", decrypted: { letterData: { title: "Miss You", body: "Bohat yaad aa rahi ho" } } }
  ];
  const snippets = sanitizeAiSnippets(messages, "u1", 2);
  assert.deepEqual(snippets, [
    { speaker: "Partner", text: "💧 Paani Piya?" },
    { speaker: "Me", text: "Miss You: Bohat yaad aa rahi ho" }
  ]);
});

test("buildMessageSignature changes when reaction, reactions map, or decrypted payload changes", () => {
  const base = { reaction: "", reactions: {}, decrypted: { text: "Hi", carePing: { label: "Hug" } } };
  const withReaction = { reaction: "❤️", reactions: { u1: "❤️" }, decrypted: { text: "Hi", carePing: { label: "Hug" } } };
  const withTwoReactions = { reaction: "❤️ 😘", reactions: { u1: "❤️", u2: "😘" }, decrypted: { text: "Hi", carePing: { label: "Hug" } } };
  assert.notEqual(buildMessageSignature(base), buildMessageSignature(withReaction));
  assert.notEqual(buildMessageSignature(withReaction), buildMessageSignature(withTwoReactions));
});

test("mergeMessageReactions keeps both partners reactions side-by-side and toggles cleanly", () => {
  const step1 = mergeMessageReactions({}, "", "u1", "❤️");
  assert.deepEqual(step1.reactions, { u1: "❤️" });
  assert.deepEqual(getDisplayReactionsList(step1.reactions, step1.reaction), ["❤️"]);

  const step2 = mergeMessageReactions(step1.reactions, step1.reaction, "u2", "😘");
  assert.deepEqual(step2.reactions, { u1: "❤️", u2: "😘" });
  assert.deepEqual(getDisplayReactionsList(step2.reactions, step2.reaction), ["❤️", "😘"]);

  // Toggling same emoji removes only actor's reaction
  const step3 = mergeMessageReactions(step2.reactions, step2.reaction, "u1", "❤️");
  assert.deepEqual(step3.reactions, { u2: "😘" });
  assert.deepEqual(getDisplayReactionsList(step3.reactions, step3.reaction), ["😘"]);
});

test("getQuickReactions places customPinned emojis at front without duplicates", () => {
  const quick = getQuickReactions(["🔥", "🫶🏻"], ["🍯", "🍫", "❤️"]);
  assert.equal(quick[0], "🍯");
  assert.equal(quick[1], "🍫");
  assert.equal(quick[2], "❤️");
  assert.equal(quick.filter(x => x === "❤️").length, 1);
  assert.ok(quick.includes("🫶🏻"));
});

test("getIncomingAlertKind distinguishes ping, letter, and message payloads", () => {
  assert.equal(getIncomingAlertKind({ carePing: { label: "Hug" } }), "ping");
  assert.equal(getIncomingAlertKind({ letterData: { title: "Secret" } }), "letter");
  assert.equal(getIncomingAlertKind({ text: "Salam" }), "message");
});

test("resolveApiUrl keeps relative paths on web and prepends https server URL on native APK", () => {
  assert.equal(resolveApiUrl("/api/send-push", { isNative: false, serverBaseUrl: "https://example.com" }), "/api/send-push");
  assert.equal(resolveApiUrl("/api/send-push", { isNative: true, serverBaseUrl: "https://my-app.run.app/" }), "https://my-app.run.app/api/send-push");
  assert.equal(resolveApiUrl("api/rtc-config", { isNative: true, serverBaseUrl: "" }), "/api/rtc-config");
});
