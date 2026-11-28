import test from "node:test";
import assert from "node:assert/strict";
import {
  SECRET_VIBES,
  NIGHT_DESIRES,
  DISGUISE_SKINS,
  LUXURY_THEMES,
  AMBIENCE_MODES,
  POSE_CHALLENGES,
  computeCapsuleUnlockTime,
  isCapsuleUnlocked,
  formatCountdownMs,
  canEditMessage,
  computeTouchDistance,
  areTouchesMeeting,
  recordIntruderAttempt,
  normalizeBackupBundle,
  PERIOD_SYMPTOMS,
  PERIOD_CARE_PACKAGES,
  MORNING_PROMPTS,
  NIGHT_PROMPTS,
  calculatePeriodPhase,
  buildRitualCardPayload
} from "../shared/featuresLogic.js";

test("catalogs expose 4 secret vibes, 5 desires, 3 disguise skins, 4 themes, 4 ambience modes, 5 poses", () => {
  assert.equal(SECRET_VIBES.length, 4);
  assert.equal(NIGHT_DESIRES.length, 5);
  assert.equal(DISGUISE_SKINS.length, 3);
  assert.equal(LUXURY_THEMES.length, 4);
  assert.equal(AMBIENCE_MODES.length, 4);
  assert.equal(POSE_CHALLENGES.length, 5);
  assert.equal(PERIOD_SYMPTOMS.length, 6);
  assert.equal(PERIOD_CARE_PACKAGES.length, 4);
  assert.ok(MORNING_PROMPTS.length >= 5);
  assert.ok(NIGHT_PROMPTS.length >= 5);
});

test("capsule time helpers compute unlock state and countdown formatting", () => {
  const now = 1_700_000_000_000;
  const u15 = computeCapsuleUnlockTime("15m", now);
  assert.equal(u15 - now, 15 * 60 * 1000);
  assert.equal(isCapsuleUnlocked(u15, now), false);
  assert.equal(isCapsuleUnlocked(u15, u15), true);
  assert.equal(formatCountdownMs(95_000), "01:35");
  assert.equal(formatCountdownMs(3_665_000), "1h 01m 05s");
});

test("canEditMessage only permits editing own non-media text within 15 minutes", () => {
  const now = 1_700_000_900_000;
  const myText = {
    sender: "u1",
    createdAtSec: Math.floor((now - 5 * 60 * 1000) / 1000),
    decrypted: { text: "Hello Jaan" }
  };
  assert.equal(canEditMessage(myText, "u1", now), true);
  assert.equal(canEditMessage(myText, "u2", now), false);
  const expired = { ...myText, createdAtSec: Math.floor((now - 20 * 60 * 1000) / 1000) };
  assert.equal(canEditMessage(expired, "u1", now), false);
  const photoMsg = { sender: "u1", createdAtSec: myText.createdAtSec, decrypted: { text: "pic", imageData: "data:..." } };
  assert.equal(canEditMessage(photoMsg, "u1", now), false);
  const ritualMsg = { sender: "u1", createdAtSec: myText.createdAtSec, decrypted: { text: "", ritualCard: { mode: "morning" } } };
  assert.equal(canEditMessage(ritualMsg, "u1", now), false);
  const periodMsg = { sender: "u1", createdAtSec: myText.createdAtSec, decrypted: { text: "", periodCard: { title: "Care" } } };
  assert.equal(canEditMessage(periodMsg, "u1", now), false);
});

test("touch sync proximity detects active close touches and ignores stale ones", () => {
  const now = 1_700_000_000_000;
  const a = { x: 0.5, y: 0.5, active: true, ts: now };
  const b = { x: 0.55, y: 0.55, active: true, ts: now - 500 };
  assert.ok(computeTouchDistance(a, b) < 0.14);
  assert.equal(areTouchesMeeting(a, b, 0.14, now), true);
  const far = { x: 0.9, y: 0.9, active: true, ts: now };
  assert.equal(areTouchesMeeting(a, far, 0.14, now), false);
  const stale = { x: 0.5, y: 0.5, active: true, ts: now - 6000 };
  assert.equal(areTouchesMeeting(a, stale, 0.14, now), false);
});

test("recordIntruderAttempt prepends bounded log and normalizeBackupBundle validates backup shape", () => {
  let log = [];
  for (let i = 0; i < 30; i++) {
    log = recordIntruderAttempt(log, { at: i, source: "Notes", snippet: `try_${i}` }, 25);
  }
  assert.equal(log.length, 25);
  assert.equal(log[0].snippet, "try_29");

  assert.equal(normalizeBackupBundle(null), null);
  const norm = normalizeBackupBundle({ version: 2, wallet: [{ id: "1" }], vault: [], starred: [{ id: "s1" }] });
  assert.equal(norm.version, 2);
  assert.equal(norm.wallet.length, 1);
  assert.equal(norm.starred.length, 1);
});

test("calculatePeriodPhase computes unset, period, ovulation, and pms phases accurately", () => {
  const unset = calculatePeriodPhase({});
  assert.equal(unset.configured, false);
  assert.equal(unset.phase, "unset");

  // Day 2 of cycle (period phase)
  const d2Now = Date.parse("2026-11-02T12:00:00Z");
  const p = calculatePeriodPhase({ lastStartIso: "2026-11-01", cycleDays: 28, periodDays: 5 }, d2Now);
  assert.equal(p.configured, true);
  assert.equal(p.phase, "period");
  assert.equal(p.dayOfCycle, 2);
  assert.equal(p.daysUntilNext, 27);

  // Day 14 of cycle (ovulation window)
  const d14Now = Date.parse("2026-11-14T12:00:00Z");
  const ov = calculatePeriodPhase({ lastStartIso: "2026-11-01", cycleDays: 28, periodDays: 5 }, d14Now);
  assert.equal(ov.phase, "ovulation");
  assert.equal(ov.dayOfCycle, 14);

  // Day 26 of cycle (PMS window)
  const d26Now = Date.parse("2026-11-26T12:00:00Z");
  const pms = calculatePeriodPhase({ lastStartIso: "2026-11-01", cycleDays: 28, periodDays: 5 }, d26Now);
  assert.equal(pms.phase, "pms");
  assert.equal(pms.dayOfCycle, 26);
});

test("buildRitualCardPayload formats morning and night ritual cards", () => {
  const card = buildRitualCardPayload({
    mode: "night",
    prompt: "Aaj ki best baat?",
    text: "Tumhari call!",
    authorUid: "u1",
    nowMs: 12345
  });
  assert.equal(card.mode, "night");
  assert.equal(card.prompt, "Aaj ki best baat?");
  assert.equal(card.entryA, "Tumhari call!");
  assert.equal(card.authorA, "u1");
  assert.equal(card.entryB, "");
  assert.equal(card.updatedAtMs, 12345);
});
