import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STUN_SERVERS,
  normalizeIceServers,
  filterNewIceCandidates,
  evaluateNetworkQuality
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

test("evaluateNetworkQuality triggers ICE restart on disconnect and audio downgrade after threshold", () => {
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
  assert.equal(secondDrop.shouldRestartIce, true);
  assert.equal(secondDrop.shouldDowngradeToAudio, true);
  assert.equal(secondDrop.nextWeakCount, 2);

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
