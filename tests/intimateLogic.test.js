import test from "node:test";
import assert from "node:assert/strict";
import {
  CODEWORD_GLOSSARY,
  INTIMATE_GAMES_META,
  DEFAULT_DICE_CONFIG,
  rollNaughtyDice,
  stepHeatLevel,
  evaluateFantasyMatches,
  resolveStripRound,
  checkBlurredAnswer,
  formatTonightPlan,
  pickBodyMapAction,
  pickTastingCombo,
  createMysteryBoxes,
  unwrapMysteryBox,
  createWalletCoupon,
  receiveWalletGift,
  redeemWalletCoupon,
  rollKissZone,
  resolveRiskDare,
  pickBlindCards,
  checkLockboxPass,
  evaluateCravingSync,
  addCustomItemToPool,
  removeCustomItemFromPool
} from "../shared/intimateLogic.js";

test("INTIMATE_GAMES_META exposes 36 distinct intimacy & spicy games and 3 codewords", () => {
  assert.equal(INTIMATE_GAMES_META.length, 36);
  const ids = new Set(INTIMATE_GAMES_META.map(g => g.id));
  assert.equal(ids.size, 36);
  assert.deepEqual(
    CODEWORD_GLOSSARY.map(c => c.key),
    ["honey", "chocolate", "mam"]
  );
});

test("rollNaughtyDice picks from custom config arrays and builds summary", () => {
  const custom = {
    actions: ["Custom Kiss"],
    targets: ["🍯 Honey"],
    durations: ["45 sec"]
  };
  const res = rollNaughtyDice(custom, () => 0);
  assert.equal(res.action, "Custom Kiss");
  assert.equal(res.target, "🍯 Honey");
  assert.equal(res.duration, "45 sec");
  assert.equal(res.summary, "Custom Kiss → 🍯 Honey (45 sec)");

  const fallback = rollNaughtyDice({}, () => 0);
  assert.equal(fallback.action, DEFAULT_DICE_CONFIG.actions[0]);
});

test("stepHeatLevel clamps between 1 and max level", () => {
  const down = stepHeatLevel(1, -1);
  assert.equal(down.level, 1);
  const up = stepHeatLevel(3, 1);
  assert.equal(up.level, 4);
  const top = stepHeatLevel(5, 3);
  assert.equal(top.level, 5);
});

test("evaluateFantasyMatches finds mutual yes and maybe pairs", () => {
  const items = ["A", "B", "C", "D"];
  const res = evaluateFantasyMatches(
    items,
    { 0: "yes", 1: "yes", 2: "maybe", 3: "no" },
    { 0: "yes", 1: "maybe", 2: "yes", 3: "yes" }
  );
  assert.deepEqual(res.mutual, ["A"]);
  assert.deepEqual(res.maybeMatches, ["B", "C"]);
  assert.equal(res.totalReviewed, 4);
});

test("resolveStripRound computes round winner and stake", () => {
  const r = resolveStripRound(2, 13, 9, ["S1", "S2", "S3"]);
  assert.equal(r.winner, "A");
  assert.equal(r.stake, "S3");
  const draw = resolveStripRound(5, 7, 7, ["S1", "S2"]);
  assert.equal(draw.winner, "draw");
  assert.equal(draw.stake, "S2");
});

test("checkBlurredAnswer matches case-insensitively and partially", () => {
  assert.equal(checkBlurredAnswer("Honey", "honey"), true);
  assert.equal(checkBlurredAnswer("Chocolate", "sweet chocolate"), true);
  assert.equal(checkBlurredAnswer("Mam", "nope"), false);
  assert.equal(checkBlurredAnswer("Honey", "   "), false);
});

test("formatTonightPlan formats 4-step plan cleanly", () => {
  const txt = formatTonightPlan({
    starter: "Oil Massage",
    tease: "Mam Kisses",
    main: "Honey + Chocolate",
    aftercare: "Cuddle"
  });
  assert.match(txt, /1️⃣ Starter: Oil Massage/);
  assert.match(txt, /4️⃣ Aftercare: Cuddle/);
});

test("pickBodyMapAction and pickTastingCombo build spicy combos cleanly", () => {
  const bm = pickBodyMapAction("🍫 Chocolate", "Wild");
  assert.match(bm, /Chocolate/);
  assert.match(bm, /Wild/);
  const tc = pickTastingCombo({ treats: ["🍯 Honey"], zones: ["🎀 Mam"] }, () => 0);
  assert.equal(tc.summary, "🍯 Honey on 🎀 Mam");
});

test("createMysteryBoxes and unwrapMysteryBox unwrap 7 mystery gifts once", () => {
  const boxes = createMysteryBoxes(["Box 1", "Box 2"]);
  assert.equal(boxes.length, 7);
  assert.equal(boxes[0].reward, "Box 1");
  const { next, unlockedBox } = unwrapMysteryBox(boxes, 0);
  assert.equal(unlockedBox.reward, "Box 1");
  assert.equal(next[0].opened, true);
  const twice = unwrapMysteryBox(next, 0);
  assert.equal(twice.unlockedBox, null);
});

test("receiveWalletGift deduplicates by giftId and adds coupon to wallet", () => {
  const { next, added } = receiveWalletGift([], { giftId: "g_1", title: "🍯 Honey VIP Pass", source: "Partner Gift" });
  assert.equal(next.length, 1);
  assert.equal(added.title, "🍯 Honey VIP Pass");
  const dup = receiveWalletGift(next, { giftId: "g_1", title: "🍯 Honey VIP Pass" });
  assert.equal(dup.added, null);
  assert.equal(dup.next.length, 1);
});

test("createWalletCoupon and redeemWalletCoupon manage reward lifecycle", () => {
  const c1 = createWalletCoupon("🍯 Free 2-Min Honey Pass", "Scratch Card");
  const c2 = createWalletCoupon("🍫 Chocolate Token", "Dartboard");
  assert.equal(c1.redeemed, false);

  const { next, redeemedItem } = redeemWalletCoupon([c1, c2], c1.id);
  assert.equal(redeemedItem.id, c1.id);
  assert.equal(redeemedItem.redeemed, true);
  assert.equal(next.find(x => x.id === c1.id).redeemed, true);
  assert.equal(next.find(x => x.id === c2.id).redeemed, false);

  // Re-redeeming same coupon returns null
  const again = redeemWalletCoupon(next, c1.id);
  assert.equal(again.redeemedItem, null);
});

test("new spicy games pure helpers and custom task/saza deck CRUD work deterministically", () => {
  const kiss = rollKissZone({ zones: ["🎀 Mam"], styles: ["Slow 🌸"] }, () => 0);
  assert.equal(kiss.summary, "🎀 Mam — Slow 🌸");

  const risk = resolveRiskDare(3, undefined, () => 0);
  assert.equal(risk.multiplier, 3);
  assert.equal(risk.tier, "triple");

  const cards = pickBlindCards(["A", "B", "C", "D"], () => 0);
  assert.equal(cards.length, 4);

  assert.equal(checkLockboxPass("Honey123", " honey123 "), true);
  assert.equal(checkLockboxPass("Honey123", "wrong"), false);

  const match = evaluateCravingSync("🍫 Sweet Chocolate Focus", "🍫 Sweet Chocolate Focus");
  assert.equal(match.synced, true);

  const added = addCustomItemToPool([], ["Default 1"], "Custom Saza 💋");
  assert.equal(added[0], "Custom Saza 💋");
  const removed = removeCustomItemFromPool(added, ["Default 1"], 0);
  assert.deepEqual(removed, ["Default 1"]);
});

