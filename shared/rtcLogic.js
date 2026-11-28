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
    const downgradeThreshold = connectionState === "failed" ? 2 : 3;
    return {
      badge: "📶 Reconnecting...",
      tier: "weak",
      shouldRestartIce: true,
      shouldDowngradeToAudio: isVideoCall && !isAudioFallback && nextWeak >= downgradeThreshold,
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

export function isOfferActiveAndFresh({
  offer = null,
  hangup = null,
  lastOfferTs = 0,
  handledCallIds = [],
  nowMs = Date.now(),
  maxAgeMs = 60000
} = {}) {
  if (!offer || !offer.callId || !offer.sdp || !offer.ts) return false;
  if (offer.iceRestart) return false;
  if (offer.ts <= lastOfferTs) return false;
  if (nowMs - offer.ts >= maxAgeMs) return false;
  if (handledCallIds instanceof Set ? handledCallIds.has(offer.callId) : Array.isArray(handledCallIds) && handledCallIds.includes(offer.callId)) {
    return false;
  }
  if (hangup && hangup.callId === offer.callId) return false;
  return true;
}

export function shouldProcessIceRestartOffer({
  offer = null,
  currentCallId = null,
  lastProcessedRestartTs = 0
} = {}) {
  if (!offer || !offer.iceRestart || !offer.sdp || !currentCallId) return false;
  if (offer.callId !== currentCallId) return false;
  return Number(offer.ts || 0) > Number(lastProcessedRestartTs || 0);
}

export function resolveCallLogOnEnd({
  notifyPartner = true,
  currentCallId = null,
  wasConnected = false,
  wasVideo = false,
  durationStr = "00:00",
  loggedCallIds = null
} = {}) {
  if (!notifyPartner || !currentCallId) return null;
  if (loggedCallIds && loggedCallIds.has(currentCallId)) return null;
  if (!wasConnected) {
    return {
      isCallLog: true,
      missed: true,
      callId: currentCallId,
      text: `📵 Missed ${wasVideo ? "Video" : "Audio"} Call`
    };
  }
  return {
    isCallLog: true,
    missed: false,
    callId: currentCallId,
    text: `${wasVideo ? "📹" : "📞"} Call Ended (${durationStr || "00:00"})`
  };
}
