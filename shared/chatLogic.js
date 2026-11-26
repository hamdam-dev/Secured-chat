export function sortMessages(messages) {
  return [...messages].sort((a, b) => {
    const secDiff = (a.createdAtSec || 0) - (b.createdAtSec || 0);
    if (secDiff !== 0) return secDiff;
    const nsDiff = (a.createdAtNs || 0) - (b.createdAtNs || 0);
    if (nsDiff !== 0) return nsDiff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function diffMessageIds(renderedOrder, nextSortedMessages) {
  const nextIds = new Set(nextSortedMessages.map(m => m.id));
  const toRemove = renderedOrder.filter(id => !nextIds.has(id));
  const existingSet = new Set(renderedOrder);
  const toUpsert = nextSortedMessages.map((msg, index) => ({
    msg,
    index,
    isNew: !existingSet.has(msg.id)
  }));
  return { toRemove, toUpsert };
}

export function getBubblePreviewText(dec) {
  if (!dec) return "";
  if (dec.isCallLog) return dec.text || "Call";
  if (dec.isGameResult) return dec.text || "🎮 Game Update";
  if (dec.walletRedeem) return `🎟️ Redeemed: ${dec.walletRedeem.title || "Love Coupon"}`;
  if (dec.carePing) return `${dec.carePing.emoji || "💞"} ${dec.carePing.label || "Care Ping"}`;
  if (dec.letterData) return `💌 ${dec.letterData.title || "Surprise Letter"}`;
  if (dec.questionCard) return `🃏 ${dec.questionCard.question || "Dil Ki Baat"}`;
  if (dec.gameData) return `🎮 ${dec.gameData.title || dec.gameData.kind || "Couple Game"}`;
  if (dec.vibeCard) return `✨ ${dec.vibeCard.headline || "Daily Vibe Summary"}`;
  if (dec.giftData) return `🎁 Gift: ${dec.giftData.label}`;
  if (dec.audioData) return dec.viewOnce ? "🔥 View-Once Voice Note" : "🎤 Voice Note";
  if (dec.imageData) return dec.doodle ? "🎨 Love Doodle" : (dec.viewOnce ? "🔥 View-Once Photo" : "🖼️ Photo");
  return dec.text || "";
}

export function sanitizeAiSnippets(messages, myUid, maxCount = 14) {
  const sorted = sortMessages(messages);
  const snippets = [];
  for (let i = Math.max(0, sorted.length - maxCount * 2); i < sorted.length; i++) {
    const m = sorted[i];
    const dec = m?.decrypted;
    if (!dec || dec.isCallLog || dec.imageData || dec.audioData) continue;
    let text = "";
    if (dec.carePing) text = `${dec.carePing.emoji || ""} ${dec.carePing.label || ""}`.trim();
    else if (dec.letterData) text = `${dec.letterData.title || ""}: ${dec.letterData.body || ""}`.trim();
    else if (dec.text) text = String(dec.text).trim();
    if (!text) continue;
    snippets.push({
      speaker: m.sender === myUid ? "Me" : "Partner",
      text: text.slice(0, 260)
    });
  }
  return snippets.slice(-maxCount);
}

export function buildMessageSignature(m) {
  const dec = m?.decrypted || {};
  return JSON.stringify({
    r: m?.reaction || "",
    rm: m?.reactions ? JSON.stringify(m.reactions) : "",
    t: dec.text || "",
    vo: Boolean(dec.viewOnce),
    hasImg: Boolean(dec.imageData),
    hasAud: Boolean(dec.audioData),
    gift: dec.giftData?.label || "",
    ping: dec.carePing?.label || "",
    letter: dec.letterData?.title || "",
    qcard: dec.questionCard?.answer || dec.questionCard?.question || "",
    game: dec.gameData ? JSON.stringify(dec.gameData) : "",
    wal: dec.walletRedeem?.title || "",
    vibe: dec.vibeCard?.headline || "",
    exp: dec.expiresAtMs || 0,
    reply: dec.replyTo || ""
  });
}

export function getIncomingAlertKind(dec) {
  if (!dec || typeof dec !== "object") return "message";
  if (dec.carePing) return "ping";
  if (dec.letterData || dec.questionCard || dec.gameData) return "letter";
  return "message";
}

export function resolveApiUrl(path, { isNative = false, serverBaseUrl = "" } = {}) {
  const cleanPath = String(path || "").startsWith("/") ? String(path) : `/${String(path || "")}`;
  const cleanBase = String(serverBaseUrl || "").trim().replace(/\/+$/, "");
  if (isNative && /^https?:\/\//i.test(cleanBase)) {
    return `${cleanBase}${cleanPath}`;
  }
  return cleanPath;
}

export function mergeMessageReactions(existingMap = {}, legacyReaction = "", actorUid = "", emoji = "") {
  const next = { ...(existingMap && typeof existingMap === "object" ? existingMap : {}) };
  if (legacyReaction && Object.keys(next).length === 0) {
    next._legacy = legacyReaction;
  }
  if (actorUid) {
    if (!emoji || next[actorUid] === emoji) {
      delete next[actorUid];
      // Clear _legacy if actor removed legacy single reaction
      if (legacyReaction && next._legacy === emoji) delete next._legacy;
    } else {
      delete next._legacy;
      next[actorUid] = emoji;
    }
  }
  const summary = getDisplayReactionsList(next).join(" ");
  return { reactions: next, reaction: summary };
}

export function getDisplayReactionsList(reactionsMap = {}, legacyReaction = "") {
  const vals = [];
  if (reactionsMap && typeof reactionsMap === "object") {
    for (const v of Object.values(reactionsMap)) {
      if (v && typeof v === "string") vals.push(v);
    }
  }
  if (!vals.length && legacyReaction) {
    return String(legacyReaction).split(/\s+/).filter(Boolean);
  }
  return [...new Set(vals)];
}
