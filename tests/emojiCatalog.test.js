import test from "node:test";
import assert from "node:assert/strict";
import {
  PRIORITY_REACTIONS,
  EMOJI_SECTIONS,
  dedupeEmojis,
  getQuickReactions,
  searchEmojis,
  addRecentEmoji
} from "../shared/emojiCatalog.js";

test("getQuickReactions keeps the original 6 reactions prioritized first", () => {
  const list = getQuickReactions(["🥳", "👍🏻", "❤️"]);
  assert.deepEqual(list.slice(0, PRIORITY_REACTIONS.length), PRIORITY_REACTIONS);
  assert.equal(list[PRIORITY_REACTIONS.length], "🥳");
  assert.equal(list[PRIORITY_REACTIONS.length + 1], "👍🏻");
});

test("getQuickReactions deduplicates all emojis and includes ZWJ emojis", () => {
  const list = getQuickReactions(["😀", "❤️‍🩹"]);
  assert.equal(new Set(list).size, list.length);
  assert.ok(list.includes("❤️‍🩹"));
  assert.ok(list.includes("❤️‍🔥"));
  assert.ok(list.includes("😮‍💨"));
  assert.ok(list.includes("🤝"));
  assert.ok(list.length > 140);
});

test("EMOJI_SECTIONS are non-empty and structured into WhatsApp-style categories", () => {
  assert.ok(EMOJI_SECTIONS.length >= 5);
  for (const sec of EMOJI_SECTIONS) {
    assert.ok(sec.id && sec.icon && sec.label);
    assert.ok(sec.emojis.length > 10);
    const deduped = dedupeEmojis(sec.emojis);
    assert.equal(deduped.length, sec.emojis.length);
  }
});

test("searchEmojis finds matches by keyword and section name", () => {
  const heartHits = searchEmojis("heart");
  assert.ok(heartHits.includes("❤️"));
  assert.ok(heartHits.includes("❤️‍🩹"));

  const kissHits = searchEmojis("kiss");
  assert.ok(kissHits.includes("😘"));
  assert.ok(kissHits.includes("💋"));
});

test("addRecentEmoji prepends cleanly without duplicates and respects maxCount", () => {
  let recents = [];
  recents = addRecentEmoji(recents, "😘", 3);
  recents = addRecentEmoji(recents, "🥳", 3);
  recents = addRecentEmoji(recents, "🔥", 3);
  recents = addRecentEmoji(recents, "😘", 3);
  assert.deepEqual(recents, ["😘", "🔥", "🥳"]);
  recents = addRecentEmoji(recents, "🫶🏻", 3);
  assert.deepEqual(recents, ["🫶🏻", "😘", "🔥"]);
});
