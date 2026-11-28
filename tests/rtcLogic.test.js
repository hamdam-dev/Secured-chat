import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STUN_SERVERS,
  normalizeIceServers,
  filterNewIceCandidates,
  evaluateNetworkQuality,
  isOfferActiveAndFresh,
  shouldProcessIceRestartOffer,
  resolveCallLogOnEnd
} from "../shared/rtcLogic.js";

test("normalizeIceServers returns default STUN servers when no TURN url is provided", () => {
  const result = normalizeIceServers({});
  assert.equal(result.hasTurn, false);
  assert.deepEqual(result.iceServers, DEFAULT_STUN_SERVERS);
});

test("normalizeIceServers appends TURN credentials when configured", () => {
  const result = normalizeIceServers({
    url: "turn:relay.example.com:3478",
    username: "janan",
    credential: "secret"
  });
  assert.equal(result.hasTurn, true);
  assert.equal(result.iceServers.length, DEFAULT_STUN_SERVERS.length + 1);
  assert.deepEqual(result.iceServers.at(-1), {
    urls: "turn:relay.example.com:3478",
    username: "janan",
    credential: "secret"
  });

  const multi = normalizeIceServers({
    url: "turn:global.relay.metered.ca:80, turns:global.relay.metered.ca:443?transport=tcp",
    username: "u1",
    credential: "p1"
  });
  assert.equal(multi.hasTurn, true);
  assert.deepEqual(multi.iceServers.at(-1), {
    urls: ["turn:global.relay.metered.ca:80", "turns:global.relay.metered.ca:443?transport=tcp"],
    username: "u1",
    credential: "p1"
  });
});

test("filterNewIceCandidates ignores mismatched callId and slices only unseen candidates", () => {
  const payload = { callId: "c1", candidates: [{ c: 1 }, { c: 2 }, { c: 3 }] };
  assert.deepEqual(filterNewIceCandidates(payload, "c2", 0), { candidates: [], nextCount: 0 });
  assert.deepEqual(filterNewIceCandidates(payload, "c1", 1), {
    candidates: [{ c: 2 }, { c: 3 }],
    nextCount: 3
  });
  assert.deepEqual(filterNewIceCandidates(payload, "c1", 3), {
    candidates: [],
    nextCount: 3
  });
});

test("evaluateNetworkQuality triggers ICE restart on disconnect and downgrades after sustained drops", () => {
  const firstDrop = evaluateNetworkQuality({
    connectionState: "disconnected",
    isVideoCall: true,
    isAudioFallback: false,
    consecutiveWeakCount: 0
  });
  assert.equal(firstDrop.shouldRestartIce, true);
  assert.equal(firstDrop.shouldDowngradeToAudio, false);
  assert.equal(firstDrop.nextWeakCount, 1);

  const secondDrop = evaluateNetworkQuality({
    connectionState: "disconnected",
    isVideoCall: true,
    isAudioFallback: false,
    consecutiveWeakCount: firstDrop.nextWeakCount
  });
  assert.equal(secondDrop.shouldDowngradeToAudio, false);
  assert.equal(secondDrop.nextWeakCount, 2);

  const thirdDrop = evaluateNetworkQuality({
    connectionState: "disconnected",
    isVideoCall: true,
    isAudioFallback: false,
    consecutiveWeakCount: secondDrop.nextWeakCount
  });
  assert.equal(thirdDrop.shouldRestartIce, true);
  assert.equal(thirdDrop.shouldDowngradeToAudio, true);
  assert.equal(thirdDrop.nextWeakCount, 3);

  const failedDrop = evaluateNetworkQuality({
    connectionState: "failed",
    isVideoCall: true,
    isAudioFallback: false,
    consecutiveWeakCount: 1
  });
  assert.equal(failedDrop.shouldDowngradeToAudio, true);

  const slowPing = evaluateNetworkQuality({
    rttMs: 520,
    connectionState: "connected",
    isVideoCall: true,
    isAudioFallback: false,
    consecutiveWeakCount: 2
  });
  assert.equal(slowPing.tier, "weak");
  assert.equal(slowPing.shouldDowngradeToAudio, true);

  const goodPing = evaluateNetworkQuality({
    rttMs: 85,
    connectionState: "connected",
    isVideoCall: true,
    isAudioFallback: false,
    consecutiveWeakCount: 2
  });
  assert.equal(goodPing.tier, "good");
  assert.equal(goodPing.nextWeakCount, 0);
});

test("isOfferActiveAndFresh rejects stale, already-hung-up, restart, and already-handled offers", () => {
  const now = 1_000_000;
  const freshOffer = { callId: "call-1", ts: now - 5000, sdp: { type: "offer", sdp: "v=0" } };

  assert.equal(isOfferActiveAndFresh({ offer: freshOffer, nowMs: now }), true);
  assert.equal(isOfferActiveAndFresh({ offer: freshOffer, hangup: { callId: "call-1" }, nowMs: now }), false);
  assert.equal(isOfferActiveAndFresh({ offer: freshOffer, handledCallIds: new Set(["call-1"]), nowMs: now }), false);
  assert.equal(isOfferActiveAndFresh({ offer: { ...freshOffer, iceRestart: true }, nowMs: now }), false);
  assert.equal(isOfferActiveAndFresh({ offer: { ...freshOffer, ts: now - 70000 }, nowMs: now }), false);
  assert.equal(isOfferActiveAndFresh({ offer: freshOffer, lastOfferTs: freshOffer.ts, nowMs: now }), false);
});

test("shouldProcessIceRestartOffer validates matching active callId and increasing timestamp", () => {
  assert.equal(
    shouldProcessIceRestartOffer({
      offer: { callId: "c1", iceRestart: true, ts: 200, sdp: { type: "offer" } },
      currentCallId: "c1",
      lastProcessedRestartTs: 100
    }),
    true
  );
  assert.equal(
    shouldProcessIceRestartOffer({
      offer: { callId: "c1", iceRestart: true, ts: 100, sdp: { type: "offer" } },
      currentCallId: "c1",
      lastProcessedRestartTs: 100
    }),
    false
  );
  assert.equal(
    shouldProcessIceRestartOffer({
      offer: { callId: "c2", iceRestart: true, ts: 200, sdp: { type: "offer" } },
      currentCallId: "c1",
      lastProcessedRestartTs: 100
    }),
    false
  );
});

test("resolveCallLogOnEnd formats logs cleanly and prevents duplicate call logs per callId", () => {
  const logged = new Set(["already-logged"]);
  assert.equal(resolveCallLogOnEnd({ notifyPartner: false, currentCallId: "c1" }), null);
  assert.equal(resolveCallLogOnEnd({ notifyPartner: true, currentCallId: "already-logged", loggedCallIds: logged }), null);

  assert.deepEqual(
    resolveCallLogOnEnd({ notifyPartner: true, currentCallId: "c2", wasConnected: false, wasVideo: true, loggedCallIds: logged }),
    { isCallLog: true, missed: true, callId: "c2", text: "📵 Missed Video Call" }
  );
  assert.deepEqual(
    resolveCallLogOnEnd({ notifyPartner: true, currentCallId: "c3", wasConnected: true, wasVideo: false, durationStr: "04:12", loggedCallIds: logged }),
    { isCallLog: true, missed: false, callId: "c3", text: "📞 Call Ended (04:12)" }
  );
});
