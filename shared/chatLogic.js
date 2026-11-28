import {
  isWordSolved,
  countWrongGuesses,
  resolveTwoPlayerTurn,
  resolveLiveLudoTurnAccess
} from "./gameLogic.js";

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
  if (dec.walletGift) return `🎁 Love Coupon Gift: ${dec.walletGift.title || "Surprise Pass"}`;
  if (dec.capsuleData) return `🕰️ Time Capsule Message`;
  if (dec.songCard) return `🎶 Song: ${dec.songCard.title || "Special Song"}`;
  if (dec.carePing) return `${dec.carePing.emoji || "💞"} ${dec.carePing.label || "Care Ping"}`;
  if (dec.letterData) return `💌 ${dec.letterData.title || "Surprise Letter"}`;
  if (dec.questionCard) return `🃏 ${dec.questionCard.question || "Dil Ki Baat"}`;
  if (dec.gameData) return `🎮 ${dec.gameData.title || dec.gameData.kind || "Couple Game"}`;
  if (dec.vibeCard) return `✨ ${dec.vibeCard.headline || "Daily Vibe Summary"}`;
  if (dec.giftData) return `🎁 Gift: ${dec.giftData.label}`;
  if (dec.audioData) return dec.viewOnce ? "🔥 View-Once Voice Note" : "🎤 Voice Note";
  if (dec.imageData) {
    if (dec.polaroid) return "📸 Couple Polaroid";
    if (dec.doodle) return "🎨 Love Doodle";
    if (dec.teaseBlur) return "🫥 Scratch-to-Reveal Tease Photo";
    return dec.viewOnce ? "🔥 View-Once Photo" : "🖼️ Photo";
  }
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
    ed: Boolean(dec.edited),
    vo: Boolean(dec.viewOnce),
    tb: Boolean(dec.teaseBlur),
    hasImg: Boolean(dec.imageData),
    hasAud: Boolean(dec.audioData),
    gift: dec.giftData?.label || "",
    wg: dec.walletGift?.giftId || "",
    cap: dec.capsuleData ? `${dec.capsuleData.unlockAtMs}` : "",
    song: dec.songCard?.title || "",
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
  if (dec.letterData || dec.questionCard || dec.gameData || dec.walletGift || dec.capsuleData || dec.songCard) return "letter";
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

export function getPayloadUpdatedAtMs(dec) {
  if (!dec || typeof dec !== "object") return 0;
  return Number(
    dec.gameData?.updatedAtMs ||
    dec.questionCard?.updatedAtMs ||
    dec.updatedAtMs ||
    0
  );
}

export function shouldApplyGameSync(currentUpdatedMs = 0, incomingAt = 0) {
  const cur = Number(currentUpdatedMs || 0);
  const inc = Number(incomingAt || 0);
  if (!inc || inc <= 0) return false;
  return inc > cur;
}

export function upsertGameSyncEntry(log = [], entry, maxEntries = 12) {
  const arr = Array.isArray(log) ? [...log] : [];
  if (!entry || !entry.msgId || !entry.cipher) return arr.slice(-maxEntries);
  const at = Number(entry.at || 0);
  let best = entry;
  const filtered = [];
  for (const item of arr) {
    if (!item || !item.msgId) continue;
    if (item.msgId === entry.msgId) {
      if (Number(item.at || 0) > Number(best.at || 0)) {
        best = item;
      }
    } else {
      filtered.push(item);
    }
  }
  filtered.push({ ...best, at: Number(best.at || at) });
  filtered.sort((a, b) => Number(a.at || 0) - Number(b.at || 0));
  return filtered.slice(-maxEntries);
}

export function isLiveGameFinished(gd) {
  if (!gd || typeof gd !== "object") return true;
  if (gd.kind === "ludo") return Boolean(gd.ludoState?.winner);
  if (gd.kind === "c4" || gd.kind === "ttt") return Boolean(gd.winnerSymbol || gd.draw);
  if (gd.kind === "dots") return Boolean(gd.dotsState?.winner);
  if (gd.kind === "rps") return Boolean(gd.moveB);
  if (gd.kind === "lock") return Boolean(gd.solved || (gd.attempts || []).length >= 7);
  if (gd.kind === "word") return Boolean(isWordSolved(gd.word, gd.guessed || []) || countWrongGuesses(gd.word, gd.guessed || []) >= 6);
  if (gd.kind === "coupon") return Number.isInteger(gd.pickedIdx) && gd.pickedIdx >= 0;
  if (gd.kind === "wyr") return Boolean(gd.choiceA && gd.choiceB);
  if (gd.kind === "quiz") return Boolean(gd.completed);
  if (gd.kind === "tdw" || gd.kind === "intimate_dare") return Boolean(gd.replyText);
  if (gd.kind === "score_duel") return Boolean(gd.winner);
  if (gd.kind === "intimate_strip") return Number(gd.roundIdx || 0) >= 5;
  if (gd.kind === "intimate_auction") return Boolean(gd.closed);
  if (gd.kind === "intimate_craving") return Boolean(gd.choiceB);
  if (gd.kind === "intimate_fantasy") return (gd.items || []).length > 0 && Object.keys(gd.votesB || {}).length >= (gd.items || []).length;
  if (gd.kind === "intimate_lockbox" || gd.kind === "intimate_blur") return Boolean(gd.unlocked);
  if (gd.kind === "intimate_blind4") return typeof gd.pickedIdx === "number" && gd.pickedIdx >= 0;
  if (gd.kind === "intimate_confess") return Boolean(gd.paidTax || gd.answer);
  if (gd.kind === "intimate_wishes" || gd.kind === "intimate_boss") return Boolean(gd.accepted);
  if (gd.kind === "intimate_plan") return Boolean(gd.approved);
  if (gd.kind === "intimate_scratch") return Boolean(gd.scratched);
  if (gd.kind === "intimate_mystery") return (gd.boxes || []).length > 0 && (gd.boxes || []).every(b => b.opened);
  return true;
}

export function describeLiveGameTurn(gd, myUid = "") {
  if (!gd || typeof gd !== "object") return null;
  const finished = isLiveGameFinished(gd);
  if (gd.kind === "ludo") {
    const access = resolveLiveLudoTurnAccess(gd.ludoState || {}, gd, myUid);
    const isMyTurn = !finished && (access.canRoll || access.canMoveToken);
    const homeA = (gd.ludoState?.tokensA || []).filter(p => p === 56).length;
    const homeB = (gd.ludoState?.tokensB || []).filter(p => p === 56).length;
    return {
      icon: "🎲",
      title: "Ludo Live",
      subtab: "ludo",
      isMyTurn,
      finished,
      statusLine: finished
        ? "Match khatam! Tap karke board dekhein"
        : (isMyTurn
          ? `Aapki Baari (${access.mySide})! Ghar: ❤️${homeA} · 😘${homeB}`
          : `Partner ki Baari ⏳ · Ghar: ❤️${homeA} · 😘${homeB}`)
    };
  }
  if (gd.kind === "c4" || gd.kind === "ttt") {
    const t = resolveTwoPlayerTurn({
      playerA: gd.playerA || "",
      playerB: gd.playerB || "",
      turnSide: gd.turnSide || "",
      lastMover: gd.lastMover || "",
      myUid,
      finished
    });
    const icon = gd.kind === "c4" ? "🍓" : "❤️";
    const subtab = gd.kind === "c4" ? "easy:c4" : "easy:ttt";
    return {
      icon,
      title: gd.kind === "c4" ? "Connect 4 Live" : "Tic-Tac Live",
      subtab,
      isMyTurn: t.canMove,
      finished,
      statusLine: finished
        ? (gd.draw ? "Draw! Tap to view" : `${gd.winnerSymbol} Jeet gaya!`)
        : (t.canMove ? `Aapki Baari (${t.mySym})!` : "Partner ki Baari ⏳")
    };
  }
  if (gd.kind === "dots") {
    const st = gd.dotsState || {};
    const t = resolveTwoPlayerTurn({
      playerA: gd.playerA || "",
      playerB: gd.playerB || "",
      turnSide: st.turn || gd.turnSide || "A",
      lastMover: gd.lastMover || "",
      myUid,
      finished
    });
    return {
      icon: "📦",
      title: "Dots & Boxes",
      subtab: "hard:dots",
      isMyTurn: t.canMove,
      finished,
      statusLine: finished
        ? `Final: ❤️${st.scoreA || 0} - 😘${st.scoreB || 0}`
        : (t.canMove ? `Aapki Baari! ❤️${st.scoreA || 0}·😘${st.scoreB || 0}` : `Partner ki Baari ⏳ (❤️${st.scoreA || 0}·😘${st.scoreB || 0})`)
    };
  }
  if (gd.kind === "score_duel") {
    const isMyTurn = !finished && Boolean(myUid && gd.playerA !== myUid && (!gd.playerB || gd.playerB === myUid));
    return {
      icon: "⚔️",
      title: gd.title || "Live Duel",
      subtab: gd.challengeSubtab || "arcade:catcher",
      isMyTurn,
      finished,
      statusLine: finished
        ? `Result: ${gd.detailA} vs ${gd.detailB}`
        : (isMyTurn ? `Beat karo: ${gd.detailA}!` : `Partner ki baari ⏳ (${gd.detailA})`)
    };
  }
  const creatorUid = gd.creator || gd.playerA || "";
  const isMyTurn = !finished && Boolean(myUid && creatorUid !== myUid);
  return {
    icon: "🎮",
    title: gd.title || "Couple Game",
    subtab: gd.challengeSubtab || "",
    isMyTurn,
    finished,
    statusLine: finished
      ? (gd.lastActionText || "Completed!")
      : (isMyTurn ? "Aapki Baari — Tap karein!" : "Partner ki Baari ⏳")
  };
}

export function extractActiveLiveGameIds(messages = [], maxCount = 8) {
  const sorted = sortMessages(messages || []);
  const ids = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    const gd = m?.decrypted?.gameData;
    if (!m?.id || !gd || isLiveGameFinished(gd)) continue;
    ids.push(m.id);
    if (ids.length >= maxCount) break;
  }
  return ids;
}

export function pickActiveResumeGame(messages = [], myUid = "", preferredMsgId = "") {
  const sorted = sortMessages(messages || []);
  const active = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    const gd = m?.decrypted?.gameData;
    if (!m?.id || !gd || isLiveGameFinished(gd)) continue;
    active.push(m);
  }
  if (!active.length) return null;
  if (preferredMsgId) {
    const pref = active.find(m => m.id === preferredMsgId);
    if (pref) return pref;
  }
  const myTurnGame = active.find(m => describeLiveGameTurn(m.decrypted.gameData, myUid)?.isMyTurn);
  return myTurnGame || active[0];
}


