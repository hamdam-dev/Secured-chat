export const DEFAULT_STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

export function normalizeIceServers(turnConfig = {}) {
  const servers = [...DEFAULT_STUN_SERVERS];
  const rawUrls = String(turnConfig.url || "")
    .split(",")
    .map(u => u.trim())
    .filter(Boolean);
  if (rawUrls.length > 0) {
    const entry = { urls: rawUrls.length === 1 ? rawUrls[0] : rawUrls };
    if (turnConfig.username) entry.username = String(turnConfig.username).trim();
    if (turnConfig.credential) entry.credential = String(turnConfig.credential);
    servers.push(entry);
  }
  return { iceServers: servers, hasTurn: rawUrls.length > 0 };
}

export function filterNewIceCandidates(icePayload, activeCallId, processedCount = 0) {
  if (!icePayload || !Array.isArray(icePayload.candidates) || !activeCallId) {
    return { candidates: [], nextCount: processedCount };
  }
  if (icePayload.callId !== activeCallId) {
    return { candidates: [], nextCount: processedCount };
  }
  const start = Math.max(0, Number(processedCount) || 0);
  if (icePayload.candidates.length <= start) {
    return { candidates: [], nextCount: start };
  }
  return {
    candidates: icePayload.candidates.slice(start),
    nextCount: icePayload.candidates.length
  };
}

export function evaluateNetworkQuality({
  rttMs = null,
  connectionState = "connected",
  isVideoCall = false,
  isAudioFallback = false,
  consecutiveWeakCount = 0
}) {
  if (connectionState === "failed" || connectionState === "disconnected") {
    const nextWeak = consecutiveWeakCount + 1;
    return {
      badge: "📶 Reconnecting...",
      tier: "weak",
      shouldRestartIce: true,
      shouldDowngradeToAudio: isVideoCall && !isAudioFallback && nextWeak >= 2,
      nextWeakCount: nextWeak
    };
  }

  if (typeof rttMs === "number" && rttMs >= 0) {
    if (rttMs > 450) {
      const nextWeak = consecutiveWeakCount + 1;
      return {
        badge: `📶 Very Slow (${Math.round(rttMs)}ms)`,
        tier: "weak",
        shouldRestartIce: false,
        shouldDowngradeToAudio: isVideoCall && !isAudioFallback && nextWeak >= 3,
        nextWeakCount: nextWeak
      };
    }
    if (rttMs > 240) {
      return {
        badge: `📶 Fair (${Math.round(rttMs)}ms)`,
        tier: "fair",
        shouldRestartIce: false,
        shouldDowngradeToAudio: false,
        nextWeakCount: 0
      };
    }
    return {
      badge: `📶 ${Math.round(rttMs)}ms`,
      tier: "good",
      shouldRestartIce: false,
      shouldDowngradeToAudio: false,
      nextWeakCount: 0
    };
  }

  return {
    badge: isAudioFallback ? "📶 Audio Saver" : "📶 Good",
    tier: "good",
    shouldRestartIce: false,
    shouldDowngradeToAudio: false,
    nextWeakCount: 0
  };
}
