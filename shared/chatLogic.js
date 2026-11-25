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
  if (dec.carePing) return `${dec.carePing.emoji || "💞"} ${dec.carePing.label || "Care Ping"}`;
  if (dec.letterData) return `💌 ${dec.letterData.title || "Surprise Letter"}`;
  if (dec.vibeCard) return `✨ ${dec.vibeCard.headline || "Daily Vibe Summary"}`;
  if (dec.giftData) return `🎁 Gift: ${dec.giftData.label}`;
  if (dec.audioData) return "🎤 Voice Note";
  if (dec.imageData) return dec.viewOnce ? "🔥 View-Once Photo" : "🖼️ Photo";
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
    t: dec.text || "",
    vo: Boolean(dec.viewOnce),
    hasImg: Boolean(dec.imageData),
    hasAud: Boolean(dec.audioData),
    gift: dec.giftData?.label || "",
    ping: dec.carePing?.label || "",
    letter: dec.letterData?.title || "",
    vibe: dec.vibeCard?.headline || "",
    reply: dec.replyTo || ""
  });
}

export function getIncomingAlertKind(dec) {
  if (!dec || typeof dec !== "object") return "message";
  if (dec.carePing) return "ping";
  if (dec.letterData) return "letter";
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

