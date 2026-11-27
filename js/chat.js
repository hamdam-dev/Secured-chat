import { escapeHtml, playEmotionSound, encryptPayload, decryptPayload } from "./crypto.js";
import {
  sortMessages,
  diffMessageIds,
  getBubblePreviewText,
  buildMessageSignature,
  getIncomingAlertKind,
  mergeMessageReactions,
  getDisplayReactionsList,
  getPayloadUpdatedAtMs,
  shouldApplyGameSync,
  upsertGameSyncEntry,
  isLiveGameFinished
} from "../shared/chatLogic.js";
import {
  EMOJI_SECTIONS,
  getQuickReactions,
  searchEmojis,
  addRecentEmoji
} from "../shared/emojiCatalog.js";
import { isMessageExpired, shouldNotifyCreatorOnMessageChange } from "../shared/gameLogic.js";
import { isCapsuleUnlocked, formatCountdownMs, canEditMessage } from "../shared/featuresLogic.js";

const MSG_CACHE_KEY = "sc_msg_cache_v1";
const DELETED_LOCAL_KEY = "sc_deleted_local_v1";
const RECENT_EMOJIS_KEY = "sc_recent_emojis_v1";
const RECENT_REACTS_KEY = "sc_recent_reacts_v1";
const CUSTOM_QUICK_REACTS_KEY = "sc_custom_quick_reacts_v1";
const REACT_SYNC_LOG_KEY = "sc_react_sync_log_v1";
const LAST_REMOTE_REACT_AT_KEY = "sc_last_remote_react_at_v1";
const GAME_SYNC_LOG_KEY = "sc_game_sync_log_v1";
const LAST_REMOTE_GAME_AT_KEY = "sc_last_remote_game_at_v1";
const STARRED_MSGS_KEY = "sc_starred_msgs_v1";
const DISAPPEAR_HRS_KEY = "sc_disappear_hrs_v1";
const PENDING_QUEUE_KEY = "sc_pending_msgs_v1";

function formatDuration(sec = 0) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function createChatManager({
  getAuth,
  getDb,
  fsOps,
  notes,
  notifications,
  onActivity
}) {
  const {
    collection, addDoc, query, orderBy, limit, onSnapshot,
    serverTimestamp, doc, setDoc, getDocs, deleteDoc, updateDoc, where, Timestamp
  } = fsOps;

  const messagesContainer = document.getElementById("messages-container");
  const loadOlderBtn = document.getElementById("load-older-btn");
  const scrollBottomBtn = document.getElementById("scroll-bottom-btn");
  const messageInput = document.getElementById("message-input");
  const replyPreview = document.getElementById("reply-preview");
  const replyTextEl = document.getElementById("reply-text");
  const reactionPopup = document.getElementById("reaction-popup");
  const rpScrollStrip = document.getElementById("rp-scroll-strip");
  const reactionAllModal = document.getElementById("reaction-all-modal");
  const reactSearchInput = document.getElementById("react-search-input");
  const reactAllTabs = document.getElementById("react-all-tabs");
  const reactAllSections = document.getElementById("react-all-sections");
  const togglePinReactBtn = document.getElementById("toggle-pin-react-btn");
  const pinnedReactsPreview = document.getElementById("pinned-reacts-preview");
  const mediaBar = document.getElementById("media-actions-bar");
  const expandMediaBtn = document.getElementById("expand-media-btn");
  const quickRepliesBar = document.getElementById("quick-replies-bar");
  const quickRepliesBtn = document.getElementById("quick-replies-btn");
  const emojiPicker = document.getElementById("emoji-picker");
  const epSearchInput = document.getElementById("ep-search-input");
  const epTabs = document.getElementById("ep-tabs");
  const epSections = document.getElementById("ep-sections");
  const pinnedBar = document.getElementById("pinned-msg-bar");
  const pinnedPreviewEl = document.getElementById("pinned-msg-preview");
  const gameUpdateBar = document.getElementById("game-update-bar");
  const gameUpdatePreviewEl = document.getElementById("game-update-preview");
  const searchBar = document.getElementById("chat-search-bar");
  const searchInput = document.getElementById("chat-search-input");
  const searchCountEl = document.getElementById("chat-search-count");
  const disappearBtn = document.getElementById("disappear-cycle-btn");

  let myUid = null;
  let partnerLastReadMs = 0;
  let messagesMap = new Map();
  let renderedElements = new Map();
  let renderedOrder = [];
  let oldestTimestamp = null;
  let isFirstMsgLoad = true;
  let unsubMsgs = null;
  let replyingToText = null;
  let typingTimeout = null;
  let isTyping = false;
  let activePopupMsgId = null;
  let popupOpenedAt = 0;
  let isPinReactMode = false;
  let lastRemoteReactAt = Number(localStorage.getItem(LAST_REMOTE_REACT_AT_KEY) || 0);
  const appliedRemoteReactKeys = new Set();
  let lastRemoteGameAt = Number(localStorage.getItem(LAST_REMOTE_GAME_AT_KEY) || 0);
  const appliedRemoteGameKeys = new Set();
  const pendingGameSyncs = new Map();
  const notifiedUpdateKeys = new Set();
  let selectedIds = new Set();
  let activeAudioEl = null;
  let activeAudioBtn = null;
  let pendingDeleteIds = [];
  let gameRenderer = null;
  let gameUpdateHandler = null;
  let currentPinned = null;
  let activeGameUpdateMsgId = null;
  let searchQuery = "";
  let searchMatches = [];
  let searchIdx = 0;
  let flushingPending = false;
  let walletGiftHandler = null;
  let editingMsgId = null;
  const viewOnceCheck = document.getElementById("view-once-checkbox");
  const viewOnceBtn = document.getElementById("view-once-btn");
  const teaseBlurCheck = document.getElementById("tease-blur-checkbox");
  const teaseBlurBtn = document.getElementById("tease-blur-btn");

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }

  function getDeletedLocalSet() {
    return new Set(readJson(DELETED_LOCAL_KEY, []));
  }

  function addDeletedLocal(ids) {
    const set = getDeletedLocalSet();
    ids.forEach(id => set.add(id));
    writeJson(DELETED_LOCAL_KEY, [...set].slice(-300));
  }

  function getDisappearHours() {
    const h = Number(localStorage.getItem(DISAPPEAR_HRS_KEY) || "0");
    return [0, 1, 24].includes(h) ? h : 0;
  }

  function renderDisappearLabel() {
    if (!disappearBtn) return;
    const h = getDisappearHours();
    disappearBtn.innerText = h ? `⏳ Disappear: ${h}h` : "⏳ Disappear: Off";
  }
  renderDisappearLabel();

  disappearBtn?.addEventListener("click", e => {
    e.stopPropagation();
    const order = [0, 1, 24];
    const next = order[(order.indexOf(getDisappearHours()) + 1) % order.length];
    try { localStorage.setItem(DISAPPEAR_HRS_KEY, String(next)); } catch {}
    renderDisappearLabel();
  });

  function saveMsgCache() {
    try {
      const arr = sortMessages([...messagesMap.values()])
        .filter(m => !m.isPending && !isMessageExpired(m.decrypted))
        .slice(-50)
        .map(m => {
          const copy = { ...m.decrypted };
          if (copy.imageData && copy.imageData.length > 35000) delete copy.imageData;
          if (copy.audioData && copy.audioData.length > 35000) delete copy.audioData;
          return {
            id: m.id,
            sender: m.sender,
            createdAtSec: m.createdAtSec,
            createdAtNs: m.createdAtNs,
            reaction: m.reaction || "",
            reactions: m.reactions || null,
            decrypted: copy
          };
        });
      localStorage.setItem(MSG_CACHE_KEY, JSON.stringify(arr));
    } catch {}
  }

  function loadMsgCache() {
    try {
      const arr = readJson(MSG_CACHE_KEY, []);
      const deleted = getDeletedLocalSet();
      const now = Date.now();
      arr.forEach(m => {
        if (!deleted.has(m.id) && !isMessageExpired(m.decrypted, now)) {
          messagesMap.set(m.id, m);
        }
      });
      loadPendingIntoMap();
      if (messagesMap.size > 0) renderAllMessages(true);
    } catch {}
  }

  function loadPendingIntoMap() {
    const queue = readJson(PENDING_QUEUE_KEY, []);
    queue.forEach(item => {
      messagesMap.set(item.tempId, {
        id: item.tempId,
        sender: myUid || "me",
        createdAtSec: Math.floor(item.createdMs / 1000),
        createdAtNs: 0,
        reaction: "",
        isPending: true,
        decrypted: item.payloadObj
      });
    });
  }

  async function flushPendingQueue() {
    if (flushingPending) return;
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    const queue = readJson(PENDING_QUEUE_KEY, []);
    if (!queue.length) return;
    flushingPending = true;
    const remaining = [];
    for (const item of queue) {
      try {
        const cipher = await encryptPayload(item.payloadObj);
        await addDoc(collection(db, "messages"), {
          text: cipher,
          sender: user.uid,
          read: false,
          createdAt: serverTimestamp()
        });
        messagesMap.delete(item.tempId);
      } catch {
        remaining.push(item);
      }
    }
    writeJson(PENDING_QUEUE_KEY, remaining);
    flushingPending = false;
    renderAllMessages(false);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => flushPendingQueue());
  }

  function sweepExpiredMessages() {
    const now = Date.now();
    const expiredIds = [];
    messagesMap.forEach((m, id) => {
      if (isMessageExpired(m.decrypted, now)) expiredIds.push(id);
    });
    if (!expiredIds.length) return;
    const db = getDb();
    expiredIds.forEach(id => {
      const m = messagesMap.get(id);
      messagesMap.delete(id);
      if (db && m?.sender === myUid && !m?.isPending) {
        deleteDoc(doc(db, "messages", id)).catch(() => {});
      }
    });
    renderAllMessages(false, true);
    saveMsgCache();
  }
  setInterval(sweepExpiredMessages, 30000);

  setInterval(() => {
    const nodes = messagesContainer?.querySelectorAll(".capsule-countdown[data-unlock-ms]");
    if (!nodes || !nodes.length) return;
    const now = Date.now();
    let anyUnlocked = false;
    nodes.forEach(el => {
      const target = Number(el.dataset.unlockMs || 0);
      const rem = target - now;
      if (rem <= 0) {
        anyUnlocked = true;
      } else {
        el.innerText = `⏳ ${formatCountdownMs(rem)}`;
      }
    });
    if (anyUnlocked) {
      renderAllMessages(false, true);
    }
  }, 1000);

  function updateOldestCursor() {
    let minTs = null;
    messagesMap.forEach(m => {
      if (!m.isPending && m.createdAtSec > 0) {
        if (
          !minTs ||
          m.createdAtSec < minTs.seconds ||
          (m.createdAtSec === minTs.seconds && m.createdAtNs < minTs.nanoseconds)
        ) {
          minTs = new Timestamp(m.createdAtSec, m.createdAtNs);
        }
      }
    });
    oldestTimestamp = minTs;
    loadOlderBtn.style.display = minTs ? "inline-block" : "none";
  }

  function triggerReply(txt) {
    replyingToText = (txt || "").slice(0, 90);
    replyTextEl.innerText = replyingToText;
    replyPreview.style.display = "flex";
    messageInput.focus();
  }

  function updateSelectionBar() {
    const normalL = document.getElementById("normal-hdr-left");
    const normalR = document.getElementById("normal-hdr-right");
    const selBar = document.getElementById("selection-bar");
    if (selectedIds.size > 0) {
      normalL.style.display = "none";
      normalR.style.display = "none";
      selBar.style.display = "flex";
      document.getElementById("selected-count").innerText = `${selectedIds.size} selected`;
    } else {
      normalL.style.display = "flex";
      normalR.style.display = "flex";
      selBar.style.display = "none";
    }
  }

  function toggleSelectMsg(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    const entry = renderedElements.get(id);
    if (entry?.el) entry.el.classList.toggle("msg-selected", selectedIds.has(id));
    updateSelectionBar();
  }

  function clearSelection() {
    selectedIds.clear();
    renderedElements.forEach(({ el }) => el.classList.remove("msg-selected"));
    updateSelectionBar();
  }

  async function applyReaction(msgId, emoji) {
    if (!msgId) return;
    const m = messagesMap.get(msgId);
    const actorUid = myUid || getAuth()?.currentUser?.uid || "me";
    const merged = mergeMessageReactions(m?.reactions || {}, m?.reaction || "", actorUid, emoji);
    const myEmoji = merged.reactions[actorUid] || "";

    if (m) {
      m.reactions = merged.reactions;
      m.reaction = merged.reaction;
      renderAllMessages(false, true);
      saveMsgCache();
    }
    if (myEmoji) {
      const rec = addRecentEmoji(readJson(RECENT_REACTS_KEY, []), myEmoji, 12);
      writeJson(RECENT_REACTS_KEY, rec);
    }

    const user = getAuth()?.currentUser;
    const db = getDb();
    if (db && !m?.isPending) {
      // Channel 1: Direct update on message doc (if rules permit)
      try {
        await updateDoc(doc(db, "messages", msgId), {
          reactions: merged.reactions,
          reaction: merged.reaction
        });
      } catch {}

      // Channel 2: Reliable user-owned status fallback sync so partner ALWAYS sees reaction even if rules block cross-user message update
      if (user) {
        const entry = { msgId, emoji: myEmoji, by: user.uid, at: Date.now() };
        const prevLog = readJson(REACT_SYNC_LOG_KEY, []).filter(
          x => !(x.msgId === msgId && x.by === user.uid)
        );
        const nextLog = [...prevLog, entry].slice(-15);
        writeJson(REACT_SYNC_LOG_KEY, nextLog);
        setDoc(
          doc(db, "status", user.uid),
          { reactionSync: entry, reactionSyncLog: nextLog },
          { merge: true }
        ).catch(() => {});
        if (myEmoji) notifications.sendPushAlert("message");
      }
    }
  }

  function applyRemoteReactionSyncs(syncItems = [], partnerUid = "", isInitial = false) {
    if (!Array.isArray(syncItems) || !syncItems.length) return;
    let changed = false;
    let newestNewEmojiAt = 0;
    for (const item of syncItems) {
      if (!item || !item.msgId) continue;
      const actor = item.by || partnerUid;
      if (!actor || actor === myUid) continue;
      const key = `${item.msgId}|${actor}|${item.at || 0}|${item.emoji || ""}`;
      if (appliedRemoteReactKeys.has(key)) continue;
      appliedRemoteReactKeys.add(key);

      const m = messagesMap.get(item.msgId);
      if (m) {
        const nextMap = { ...(m.reactions && typeof m.reactions === "object" ? m.reactions : {}) };
        if (item.emoji) nextMap[actor] = item.emoji;
        else delete nextMap[actor];
        m.reactions = nextMap;
        m.reaction = getDisplayReactionsList(nextMap).join(" ");
        changed = true;
      }
      if (!isInitial && item.at && item.at > lastRemoteReactAt && item.emoji) {
        newestNewEmojiAt = Math.max(newestNewEmojiAt, item.at);
      }
    }
    if (changed) {
      renderAllMessages(false, true);
      saveMsgCache();
    }
    if (newestNewEmojiAt > lastRemoteReactAt) {
      lastRemoteReactAt = newestNewEmojiAt;
      try { localStorage.setItem(LAST_REMOTE_REACT_AT_KEY, String(lastRemoteReactAt)); } catch {}
      if (notes.isChatVisible() && document.visibilityState === "visible") {
        playEmotionSound("chime");
      }
    }
  }

  function buildQuickReactionStrip(currentReaction = "") {
    if (!rpScrollStrip) return;
    rpScrollStrip.innerHTML = "";
    const recentReacts = readJson(RECENT_REACTS_KEY, []);
    const customPinned = readJson(CUSTOM_QUICK_REACTS_KEY, []);
    const list = getQuickReactions(recentReacts, customPinned);
    list.forEach(emoji => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rp-btn" + (currentReaction === emoji ? " active" : "");
      b.innerText = emoji;
      b.setAttribute("aria-label", `React with ${emoji}`);
      b.onclick = e => {
        e.stopPropagation();
        const targetId = activePopupMsgId;
        reactionPopup.style.display = "none";
        applyReaction(targetId, emoji);
      };
      rpScrollStrip.appendChild(b);
    });
    rpScrollStrip.scrollLeft = 0;
  }

  function openMsgActionPopup(bubbleEl, msgId) {
    activePopupMsgId = msgId;
    popupOpenedAt = Date.now();
    const m = messagesMap.get(msgId);
    const myReact = (m?.reactions && myUid && m.reactions[myUid]) || m?.reaction || "";
    buildQuickReactionStrip(myReact);

    const starBtn = document.getElementById("rp-star-btn");
    if (starBtn) {
      const starred = readJson(STARRED_MSGS_KEY, []).some(x => x.id === msgId);
      starBtn.innerText = starred ? "★ Unstar" : "⭐ Star";
    }

    const editBtn = document.getElementById("rp-edit-btn");
    if (editBtn) {
      editBtn.style.display = canEditMessage(m, myUid) ? "inline-flex" : "none";
    }

    const rect = bubbleEl.getBoundingClientRect();
    reactionPopup.style.display = "flex";
    const popupH = reactionPopup.offsetHeight || 96;
    const clampedTop = Math.min(window.innerHeight - popupH - 18, Math.max(66, rect.top - popupH - 8));
    reactionPopup.style.top = clampedTop + "px";
    reactionPopup.style.left = "50%";
    reactionPopup.style.transform = "translateX(-50%)";
  }

  // WhatsApp-style Sectioned Emoji Renderer (shared by Composer & "+" Reaction Sheet)
  function renderSectionedEmojiBrowser({
    tabsEl,
    sectionsEl,
    searchVal = "",
    recentKey,
    onPick
  }) {
    if (!tabsEl || !sectionsEl) return;
    const q = searchVal.trim();
    const recents = readJson(recentKey, []);

    if (q) {
      tabsEl.style.display = "none";
      sectionsEl.innerHTML = "";
      const matches = searchEmojis(q);
      const title = document.createElement("div");
      title.className = "ep-sec-title";
      title.innerText = matches.length ? `Results (${matches.length})` : "Koi emoji nahi mila";
      sectionsEl.appendChild(title);
      const grid = document.createElement("div");
      grid.className = "ep-sec-grid";
      matches.forEach(em => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ep-item";
        b.innerText = em;
        b.onclick = e => {
          e.stopPropagation();
          onPick(em);
        };
        grid.appendChild(b);
      });
      sectionsEl.appendChild(grid);
      return;
    }

    tabsEl.style.display = "flex";
    tabsEl.innerHTML = "";
    sectionsEl.innerHTML = "";

    const allSections = [
      ...(recents.length ? [{ id: "recent", icon: "🕒", label: "Recently Used", emojis: recents }] : []),
      ...EMOJI_SECTIONS
    ];

    allSections.forEach((sec, idx) => {
      const tabBtn = document.createElement("button");
      tabBtn.type = "button";
      tabBtn.className = "ep-tab-btn" + (idx === 0 ? " active" : "");
      tabBtn.innerText = sec.icon;
      tabBtn.setAttribute("aria-label", sec.label);
      tabBtn.title = sec.label;

      const secBlock = document.createElement("div");
      secBlock.dataset.secId = sec.id;
      const head = document.createElement("div");
      head.className = "ep-sec-title";
      head.innerText = sec.label;
      secBlock.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "ep-sec-grid";
      sec.emojis.forEach(em => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ep-item";
        b.innerText = em;
        b.onclick = e => {
          e.stopPropagation();
          onPick(em);
        };
        grid.appendChild(b);
      });
      secBlock.appendChild(grid);
      sectionsEl.appendChild(secBlock);

      tabBtn.onclick = e => {
        e.stopPropagation();
        tabsEl.querySelectorAll(".ep-tab-btn").forEach(t => t.classList.remove("active"));
        tabBtn.classList.add("active");
        sectionsEl.scrollTo({ top: secBlock.offsetTop - sectionsEl.offsetTop, behavior: "smooth" });
      };
      tabsEl.appendChild(tabBtn);
    });
  }

  function renderComposerEmojiPicker() {
    renderSectionedEmojiBrowser({
      tabsEl: epTabs,
      sectionsEl: epSections,
      searchVal: epSearchInput?.value || "",
      recentKey: RECENT_EMOJIS_KEY,
      onPick: em => {
        const start = messageInput.selectionStart ?? messageInput.value.length;
        const end = messageInput.selectionEnd ?? messageInput.value.length;
        messageInput.value = messageInput.value.slice(0, start) + em + messageInput.value.slice(end);
        const pos = start + em.length;
        messageInput.setSelectionRange(pos, pos);
        messageInput.focus();
        closeMediaBar();
        const nextRecents = addRecentEmoji(readJson(RECENT_EMOJIS_KEY, []), em, 24);
        writeJson(RECENT_EMOJIS_KEY, nextRecents);
      }
    });
  }

  function renderPinnedReactsPreview() {
    if (!pinnedReactsPreview) return;
    const customPinned = readJson(CUSTOM_QUICK_REACTS_KEY, []);
    if (!isPinReactMode && !customPinned.length) {
      pinnedReactsPreview.style.display = "none";
      return;
    }
    pinnedReactsPreview.style.display = "flex";
    pinnedReactsPreview.innerHTML = "";
    const lbl = document.createElement("span");
    lbl.innerText = isPinReactMode
      ? "Tap emojis below to Pin/Unpin Quick Bar:"
      : "Pinned Quick Bar:";
    pinnedReactsPreview.appendChild(lbl);

    customPinned.forEach(em => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "pinned-react-chip";
      chip.innerText = `${em} ✕`;
      chip.setAttribute("aria-label", `Unpin ${em}`);
      chip.onclick = e => {
        e.stopPropagation();
        const next = readJson(CUSTOM_QUICK_REACTS_KEY, []).filter(x => x !== em);
        writeJson(CUSTOM_QUICK_REACTS_KEY, next);
        renderPinnedReactsPreview();
      };
      pinnedReactsPreview.appendChild(chip);
    });
  }

  function renderFullReactionSheet() {
    renderPinnedReactsPreview();
    renderSectionedEmojiBrowser({
      tabsEl: reactAllTabs,
      sectionsEl: reactAllSections,
      searchVal: reactSearchInput?.value || "",
      recentKey: RECENT_REACTS_KEY,
      onPick: em => {
        if (isPinReactMode) {
          const cur = readJson(CUSTOM_QUICK_REACTS_KEY, []);
          const next = cur.includes(em)
            ? cur.filter(x => x !== em)
            : addRecentEmoji(cur, em, 10);
          writeJson(CUSTOM_QUICK_REACTS_KEY, next);
          renderPinnedReactsPreview();
          return;
        }
        const targetId = activePopupMsgId;
        reactionAllModal.style.display = "none";
        applyReaction(targetId, em);
      }
    });
  }

  function jumpToMessage(msgId) {
    const entry = renderedElements.get(msgId);
    if (!entry?.el) return;
    entry.el.scrollIntoView({ behavior: "smooth", block: "center" });
    entry.el.classList.remove("msg-flash");
    void entry.el.offsetWidth;
    entry.el.classList.add("msg-flash");
  }

  function setPinnedBarState(pinnedObj) {
    currentPinned = pinnedObj || null;
    if (!pinnedBar) return;
    if (currentPinned?.id && currentPinned?.preview) {
      pinnedPreviewEl.innerText = currentPinned.preview;
      pinnedBar.style.display = "flex";
    } else {
      pinnedBar.style.display = "none";
    }
  }

  function showGameUpdateBanner(msgId, label) {
    if (!gameUpdateBar || !gameUpdatePreviewEl) return;
    activeGameUpdateMsgId = msgId || null;
    gameUpdatePreviewEl.innerText = label || "Love ne game mein chaal chali!";
    gameUpdateBar.style.display = "flex";
  }

  function hideGameUpdateBanner() {
    activeGameUpdateMsgId = null;
    if (gameUpdateBar) gameUpdateBar.style.display = "none";
  }

  function buildGameUpdateLabel(dec) {
    return (
      dec?.gameData?.lastActionText ||
      (dec?.questionCard?.answer ? `🃏 Jawab aaya: "${dec.questionCard.answer}"` : "") ||
      `${getBubblePreviewText(dec)} update hua!`
    );
  }

  async function updateEncryptedMessage(msgId, nextPayloadObj, opts = {}) {
    if (!msgId || !nextPayloadObj || typeof nextPayloadObj !== "object") return;
    const prevAt = Math.max(
      getPayloadUpdatedAtMs(messagesMap.get(msgId)?.decrypted),
      Number(pendingGameSyncs.get(msgId)?.at || 0)
    );
    const updatedAtMs = Math.max(Date.now(), prevAt + 1);
    const actorUid = myUid || getAuth()?.currentUser?.uid || "";

    const stamped = { ...nextPayloadObj };
    if (stamped.gameData && typeof stamped.gameData === "object") {
      stamped.gameData = { ...stamped.gameData, updatedAtMs };
    } else if (stamped.questionCard && typeof stamped.questionCard === "object") {
      stamped.questionCard = { ...stamped.questionCard, updatedAtMs };
    } else {
      stamped.updatedAtMs = updatedAtMs;
    }

    pendingGameSyncs.set(msgId, { at: updatedAtMs, by: actorUid, decrypted: stamped });
    notifiedUpdateKeys.add(`${msgId}|${updatedAtMs}`);

    const m = messagesMap.get(msgId);
    if (m) {
      m.decrypted = stamped;
      renderAllMessages(false, true);
      saveMsgCache();
      if (stamped.gameData && gameUpdateHandler) {
        gameUpdateHandler(m);
      }
    }

    const db = getDb();
    const user = getAuth()?.currentUser;
    if (db && !m?.isPending) {
      const cipher = await encryptPayload(stamped);
      // Channel 1: Direct update on message doc (if Firestore rules permit creator)
      await updateDoc(doc(db, "messages", msgId), { text: cipher }).catch(() => {});

      // Channel 2: User-owned status doc sync so BOTH partners' moves always sync live!
      if (user) {
        const entry = { msgId, cipher, by: user.uid, at: updatedAtMs };
        const nextLog = upsertGameSyncEntry(readJson(GAME_SYNC_LOG_KEY, []), entry, 12);
        writeJson(GAME_SYNC_LOG_KEY, nextLog);
        await setDoc(
          doc(db, "status", user.uid),
          { gameSync: entry, gameSyncLog: nextLog },
          { merge: true }
        ).catch(() => {});
      }

      if (opts.notifyPartner !== false) {
        notifications.sendPushAlert(opts.alertKind || "letter");
      }
      if (opts.gameNoticeText) {
        await sendEncryptedMessage(
          {
            isGameResult: true,
            refGameId: msgId,
            text: opts.gameNoticeText
          },
          opts.alertKind || "letter"
        );
      }
    }
  }

  async function applyRemoteGameSyncs(syncItems = [], ownerUid = "", isInitial = false) {
    if (!Array.isArray(syncItems) || !syncItems.length) return;
    let changed = false;
    let newestRemoteAt = 0;
    let latestUpdate = null;

    for (const item of syncItems) {
      if (!item || !item.msgId || !item.cipher) continue;
      const actor = item.by || ownerUid || "";
      const key = `${item.msgId}|${actor}|${item.at || 0}`;
      if (appliedRemoteGameKeys.has(key)) continue;
      appliedRemoteGameKeys.add(key);

      const dec = await decryptPayload(item.cipher).catch(() => null);
      if (!dec || typeof dec !== "object" || (!dec.gameData && !dec.questionCard && !dec.updatedAtMs)) {
        continue;
      }

      const incomingAt = Number(item.at || getPayloadUpdatedAtMs(dec) || 0);
      if (!incomingAt) continue;

      const curPending = pendingGameSyncs.get(item.msgId);
      if (!curPending || shouldApplyGameSync(curPending.at, incomingAt)) {
        pendingGameSyncs.set(item.msgId, { at: incomingAt, by: actor, decrypted: dec });
      }

      const m = messagesMap.get(item.msgId);
      if (m && shouldApplyGameSync(getPayloadUpdatedAtMs(m.decrypted), incomingAt)) {
        m.decrypted = dec;
        changed = true;
        if (dec.gameData && gameUpdateHandler) {
          gameUpdateHandler(m);
        }
        const nKey = `${item.msgId}|${incomingAt}`;
        if (!isInitial && actor && actor !== myUid && !notifiedUpdateKeys.has(nKey)) {
          notifiedUpdateKeys.add(nKey);
          if (incomingAt > lastRemoteGameAt) {
            newestRemoteAt = Math.max(newestRemoteAt, incomingAt);
            latestUpdate = { id: item.msgId, label: buildGameUpdateLabel(dec) };
          }
        }
      }
    }

    if (changed) {
      renderAllMessages(false, true);
      saveMsgCache();
    }
    if (newestRemoteAt > lastRemoteGameAt && latestUpdate) {
      lastRemoteGameAt = newestRemoteAt;
      try { localStorage.setItem(LAST_REMOTE_GAME_AT_KEY, String(lastRemoteGameAt)); } catch {}
      showGameUpdateBanner(latestUpdate.id, latestUpdate.label);
      if (notes.isChatVisible() && document.visibilityState === "visible") {
        playEmotionSound("gift");
        markMessagesAsRead();
      } else {
        notifications.showBrowserAlert("letter");
      }
    }
  }

  function buildBubbleElement(m) {
    const dec = m.decrypted || {};
    const isMine = m.sender === myUid || m.isPending;
    const div = document.createElement("div");
    div.className = `msg-bubble ${isMine ? "msg-sent" : "msg-received"}${m.isPending ? " msg-pending" : ""}`;
    div.dataset.id = m.id;
    if (selectedIds.has(m.id)) div.classList.add("msg-selected");

    if (dec.replyTo) {
      const rBox = document.createElement("div");
      rBox.className = "msg-reply-box";
      rBox.innerText = dec.replyTo;
      div.appendChild(rBox);
    }

    let allowDoubleTapReact = false;

    if (dec.isCallLog) {
      const cl = document.createElement("div");
      cl.className = "call-log-pill" + (dec.missed ? " call-log-missed" : "");
      cl.innerText = dec.text || "📞 Call";
      div.appendChild(cl);
    } else if (dec.isGameResult) {
      const box = document.createElement("div");
      box.className = "game-result-notice";
      const txt = document.createElement("div");
      txt.className = "game-result-text";
      txt.innerText = dec.text || "🎮 Game Update!";
      box.appendChild(txt);
      if (dec.refGameId) {
        const jBtn = document.createElement("button");
        jBtn.type = "button";
        jBtn.className = "game-mini-btn";
        jBtn.innerText = "👀 Board / Card Dekhein";
        jBtn.onclick = e => {
          e.stopPropagation();
          jumpToMessage(dec.refGameId);
        };
        box.appendChild(jBtn);
      }
      div.appendChild(box);
    } else if (dec.walletRedeem) {
      allowDoubleTapReact = true;
      const wBox = document.createElement("div");
      wBox.className = "wallet-redeem-card";
      wBox.innerHTML = `<div class="wallet-redeem-head">🎟️ Love Coupon Redeemed!</div><div class="wallet-redeem-title">${escapeHtml(dec.walletRedeem.title || "Special Love Reward")}</div><div class="game-card-sub">${escapeHtml(dec.walletRedeem.source || "Love Wallet")} · Ab isko poora karne ka waqt hai! 💖</div>`;
      div.appendChild(wBox);
    } else if (dec.walletGift) {
      allowDoubleTapReact = true;
      const gCard = document.createElement("div");
      gCard.className = "wallet-gift-card";
      gCard.innerHTML = `<div class="wallet-redeem-head">🎁 Love Wallet Gift!</div><div class="wallet-redeem-title">${escapeHtml(dec.walletGift.title || "Special Surprise Pass")}</div><div class="game-card-sub">${escapeHtml(dec.walletGift.source || "Partner Gift")} · Sirf tumhare liye 💖</div>`;
      if (!isMine) {
        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "game-mini-btn active";
        saveBtn.innerText = "🎟️ Wallet Mein Save Karein";
        saveBtn.onclick = e => {
          e.stopPropagation();
          walletGiftHandler?.(dec.walletGift);
          saveBtn.innerText = "✅ Wallet Mein Saved!";
          saveBtn.disabled = true;
          playEmotionSound("gift");
        };
        gCard.appendChild(saveBtn);
      }
      div.appendChild(gCard);
    } else if (dec.capsuleData) {
      allowDoubleTapReact = true;
      const cap = dec.capsuleData;
      const unlocked = isCapsuleUnlocked(cap.unlockAtMs);
      const cBox = document.createElement("div");
      cBox.className = "capsule-card" + (unlocked ? " unlocked" : " locked");
      if (unlocked) {
        cBox.innerHTML = `<div class="game-card-head">🕰️ Time Capsule Unlocked!</div><div class="capsule-body">${escapeHtml(cap.text || "")}</div>`;
      } else {
        const rem = Math.max(0, Number(cap.unlockAtMs || 0) - Date.now());
        cBox.innerHTML = `<div class="game-card-head">🔒 Time Capsule Sealed</div><div class="capsule-countdown tabular-nums" data-unlock-ms="${Number(cap.unlockAtMs || 0)}">⏳ ${formatCountdownMs(rem)}</div><div class="game-card-sub">Set waqt poora hone par yeh message khulega ✨</div>`;
      }
      div.appendChild(cBox);
    } else if (dec.songCard) {
      allowDoubleTapReact = true;
      const sc = dec.songCard;
      const sBox = document.createElement("div");
      sBox.className = "song-card";
      sBox.innerHTML = `
        <div class="song-card-top">
          <span class="song-disc" aria-hidden="true">💿</span>
          <div class="song-meta">
            <div class="song-title">${escapeHtml(sc.title || "Special Song")}</div>
            ${sc.artist ? `<div class="song-artist">${escapeHtml(sc.artist)}</div>` : ""}
          </div>
        </div>
        ${sc.lyrics ? `<div class="song-lyrics">"${escapeHtml(sc.lyrics)}"</div>` : ""}
        ${sc.note ? `<div class="song-note">💌 ${escapeHtml(sc.note)}</div>` : ""}
      `;
      const chimeBtn = document.createElement("button");
      chimeBtn.type = "button";
      chimeBtn.className = "game-mini-btn";
      chimeBtn.innerText = "🎶 Dil Chime";
      chimeBtn.onclick = e => {
        e.stopPropagation();
        playEmotionSound("love");
      };
      sBox.appendChild(chimeBtn);
      div.appendChild(sBox);
    } else if (dec.carePing) {
      allowDoubleTapReact = true;
      const pBox = document.createElement("div");
      pBox.className = "care-ping-card";
      pBox.innerHTML = `<span class="care-ping-emoji">${escapeHtml(dec.carePing.emoji || "💞")}</span><div><div class="care-ping-title">${escapeHtml(dec.carePing.label || "Care Ping")}</div><div class="care-ping-sub">${escapeHtml(dec.carePing.sub || "Pyar bhara ishaara")}</div></div>`;
      div.appendChild(pBox);
    } else if (dec.questionCard) {
      const qBox = document.createElement("div");
      qBox.className = "question-card-msg";
      qBox.innerHTML = `<div class="game-card-head">🃏 Dil Ki Baat</div><div class="game-card-prompt">${escapeHtml(dec.questionCard.question || "")}</div>`;
      if (dec.questionCard.answer) {
        const ans = document.createElement("div");
        ans.className = "game-card-answer";
        ans.innerText = `💖 Jawab: ${dec.questionCard.answer}`;
        qBox.appendChild(ans);
      } else {
        const row = document.createElement("div");
        row.className = "game-inline-reply";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "game-inline-input";
        inp.placeholder = "Dil se jawab likhein...";
        inp.onclick = e => e.stopPropagation();
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "game-mini-btn";
        btn.innerText = "Bhejein";
        btn.onclick = async e => {
          e.stopPropagation();
          const val = inp.value.trim();
          if (!val) return;
          playEmotionSound("love");
          await updateEncryptedMessage(
            m.id,
            {
              ...dec,
              questionCard: { ...dec.questionCard, answer: val, lastUpdatedBy: myUid }
            },
            {
              notifyPartner: true,
              alertKind: "letter",
              gameNoticeText: `🃏 Dil Ki Baat ka jawab mila:\n"${dec.questionCard.question}"\n💖 ${val}`
            }
          );
        };
        row.appendChild(inp);
        row.appendChild(btn);
        qBox.appendChild(row);
      }
      div.appendChild(qBox);
    } else if (dec.gameData && gameRenderer) {
      div.appendChild(gameRenderer(m));
    } else if (dec.letterData) {
      const lBox = document.createElement("div");
      lBox.className = "surprise-letter-card";
      let opened = false;
      const renderClosed = () => {
        lBox.innerHTML = `<div class="letter-seal">💌</div><div class="letter-title">${escapeHtml(dec.letterData.title || "Pyar Bhara Khat")}</div><div class="letter-hint">Tap karke khat kholen</div>`;
      };
      renderClosed();
      lBox.onclick = e => {
        if (selectedIds.size > 0) return;
        e.stopPropagation();
        if (opened) return;
        opened = true;
        playEmotionSound("love");
        lBox.classList.add("opened");
        lBox.innerHTML = `<div class="letter-open-head">💖 ${escapeHtml(dec.letterData.title || "Pyar Bhara Khat")}</div><div class="letter-body">${escapeHtml(dec.letterData.body || "")}</div>`;
      };
      div.appendChild(lBox);
    } else if (dec.vibeCard) {
      const vBox = document.createElement("div");
      vBox.className = "vibe-summary-card";
      vBox.innerHTML = `
        <div class="vibe-head">✨ ${escapeHtml(dec.vibeCard.headline || "Daily Vibe Summary")}</div>
        <div class="vibe-balance">${escapeHtml(dec.vibeCard.moodBalance || "")}</div>
        ${dec.vibeCard.partnerCareTip ? `<div class="vibe-tip">Tip: ${escapeHtml(dec.vibeCard.partnerCareTip)}</div>` : ""}
        ${dec.vibeCard.sweetNote ? `<div class="vibe-sweet">"${escapeHtml(dec.vibeCard.sweetNote)}"</div>` : ""}
      `;
      div.appendChild(vBox);
    } else if (dec.giftData) {
      const gBox = document.createElement("div");
      gBox.className = "gift-card-msg";
      gBox.innerHTML = `<div style="font-size:28px;">🎁</div><div style="font-weight:700;font-size:13px;">${escapeHtml(dec.giftData.label)}</div><div style="font-size:11px;opacity:0.85;">Tap to open</div>`;
      gBox.onclick = e => {
        if (selectedIds.size > 0) return;
        e.stopPropagation();
        playEmotionSound("gift");
        gBox.innerHTML = `<div style="font-size:32px;">${dec.giftData.emoji}</div><div style="font-weight:700;font-size:14px;">${escapeHtml(dec.giftData.label)}</div><div style="font-size:12px;margin-top:4px;">${escapeHtml(dec.giftData.note || "Pyar se bheja gaya ❤️")}</div>`;
        const user = getAuth()?.currentUser;
        const db = getDb();
        if (!isMine && user && db) {
          setDoc(doc(db, "status", user.uid), { lastGiftOpened: Date.now() }, { merge: true }).catch(() => {});
        }
      };
      div.appendChild(gBox);
    } else if (dec.audioData) {
      if (dec.viewOnce) {
        const vo = document.createElement("div");
        vo.className = "view-once-box";
        vo.innerText = isMine ? "🔥 View-Once Voice Sent" : "🔥 Tap to Listen Voice (1x)";
        let playingVo = false;
        vo.onclick = async e => {
          if (selectedIds.size > 0 || isMine || playingVo) return;
          e.stopPropagation();
          playingVo = true;
          vo.innerText = "🔊 Playing (1x)...";
          const aud = new Audio(dec.audioData);
          const cleanupVo = async () => {
            addDeletedLocal([m.id]);
            messagesMap.delete(m.id);
            div.remove();
            renderedElements.delete(m.id);
            renderedOrder = renderedOrder.filter(id => id !== m.id);
            const db = getDb();
            if (db) {
              try { await deleteDoc(doc(db, "messages", m.id)); } catch {}
            }
          };
          aud.onended = cleanupVo;
          aud.onerror = cleanupVo;
          aud.play().catch(cleanupVo);
        };
        div.appendChild(vo);
      } else {
        const aBox = document.createElement("div");
        aBox.className = "audio-player-box";
        const btn = document.createElement("button");
        btn.className = "audio-play-btn";
        btn.type = "button";
        btn.setAttribute("aria-label", "Play voice note");
        btn.innerText = "▶";

        const metaCol = document.createElement("div");
        metaCol.className = "audio-meta-col";
        const seekRow = document.createElement("div");
        seekRow.className = "audio-seek-row";
        const range = document.createElement("input");
        range.type = "range";
        range.min = "0";
        range.max = "100";
        range.value = "0";
        range.className = "audio-range";
        range.setAttribute("aria-label", "Seek voice note");

        const speeds = [1, 1.5, 2];
        let speedIdx = 0;
        const speedBtn = document.createElement("button");
        speedBtn.type = "button";
        speedBtn.className = "audio-speed-btn";
        speedBtn.innerText = "1x";

        const timeRow = document.createElement("div");
        timeRow.className = "audio-time-row";
        const curLbl = document.createElement("span");
        curLbl.innerText = "0:00";
        const durLbl = document.createElement("span");
        durLbl.innerText = formatDuration(dec.duration || 0);
        timeRow.appendChild(curLbl);
        timeRow.appendChild(durLbl);

        const aud = new Audio(dec.audioData);
        range.onclick = e => e.stopPropagation();
        range.oninput = () => {
          if (aud.duration && isFinite(aud.duration)) {
            aud.currentTime = (Number(range.value) / 100) * aud.duration;
          }
        };
        speedBtn.onclick = e => {
          e.stopPropagation();
          speedIdx = (speedIdx + 1) % speeds.length;
          aud.playbackRate = speeds[speedIdx];
          speedBtn.innerText = `${speeds[speedIdx]}x`;
        };
        aud.ontimeupdate = () => {
          const total = (aud.duration && isFinite(aud.duration)) ? aud.duration : (dec.duration || 1);
          range.value = String(Math.min(100, Math.round((aud.currentTime / Math.max(0.5, total)) * 100)));
          curLbl.innerText = formatDuration(aud.currentTime);
          if (aud.duration && isFinite(aud.duration)) durLbl.innerText = formatDuration(aud.duration);
        };
        btn.onclick = e => {
          if (selectedIds.size > 0) return;
          e.stopPropagation();
          if (activeAudioEl && activeAudioEl !== aud && !activeAudioEl.paused) {
            activeAudioEl.pause();
            if (activeAudioBtn) activeAudioBtn.innerText = "▶";
          }
          if (aud.paused) {
            activeAudioEl = aud;
            activeAudioBtn = btn;
            aud.playbackRate = speeds[speedIdx];
            aud.play().catch(() => {});
            btn.innerText = "⏸";
          } else {
            aud.pause();
            btn.innerText = "▶";
          }
        };
        aud.onended = () => {
          btn.innerText = "▶";
          range.value = "0";
          curLbl.innerText = "0:00";
        };
        seekRow.appendChild(range);
        seekRow.appendChild(speedBtn);
        metaCol.appendChild(seekRow);
        metaCol.appendChild(timeRow);
        aBox.appendChild(btn);
        aBox.appendChild(metaCol);
        div.appendChild(aBox);
      }
    } else if (dec.imageData) {
      if (dec.viewOnce) {
        const vo = document.createElement("div");
        vo.className = "view-once-box";
        vo.innerText = isMine ? "🔥 View-Once Photo Sent" : "🔥 Tap to View Photo (1x)";
        vo.onclick = async e => {
          if (selectedIds.size > 0 || isMine) return;
          e.stopPropagation();
          document.getElementById("viewer-img").src = dec.imageData;
          document.getElementById("img-viewer-modal").style.display = "flex";
          addDeletedLocal([m.id]);
          messagesMap.delete(m.id);
          div.remove();
          renderedElements.delete(m.id);
          renderedOrder = renderedOrder.filter(id => id !== m.id);
          const db = getDb();
          if (db) {
            try { await deleteDoc(doc(db, "messages", m.id)); } catch {}
          }
        };
        div.appendChild(vo);
      } else if (dec.teaseBlur) {
        allowDoubleTapReact = true;
        const wrap = document.createElement("div");
        wrap.className = "tease-scratch-wrap";
        const img = document.createElement("img");
        img.className = "msg-img tease-blurred-img";
        img.alt = "Tease blur photo";
        img.src = dec.imageData;

        const cvs = document.createElement("canvas");
        cvs.className = "tease-scratch-canvas";
        cvs.width = 230;
        cvs.height = 190;
        const hint = document.createElement("div");
        hint.className = "tease-scratch-hint";
        hint.innerText = "🫥 Ungli se ragad kar dekhein";

        const ctx = cvs.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, cvs.width, cvs.height);
        grad.addColorStop(0, "rgba(216, 27, 96, 0.94)");
        grad.addColorStop(1, "rgba(136, 14, 79, 0.96)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✨ Scratch to Peek ✨", cvs.width / 2, cvs.height / 2);

        let scratching = false;
        let strokeHits = 0;
        let revealed = false;

        const finishReveal = () => {
          if (revealed) return;
          revealed = true;
          img.classList.remove("tease-blurred-img");
          cvs.style.opacity = "0";
          cvs.style.pointerEvents = "none";
          hint.innerText = "👀 Tap to view full";
          playEmotionSound("gift");
        };

        const scratchAt = (cx, cy) => {
          if (revealed) return;
          const rect = cvs.getBoundingClientRect();
          const x = ((cx - rect.left) / Math.max(1, rect.width)) * cvs.width;
          const y = ((cy - rect.top) / Math.max(1, rect.height)) * cvs.height;
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fill();
          strokeHits++;
          if (strokeHits >= 18) finishReveal();
        };

        cvs.addEventListener("pointerdown", e => {
          if (selectedIds.size > 0) return;
          e.stopPropagation();
          scratching = true;
          scratchAt(e.clientX, e.clientY);
        });
        cvs.addEventListener("pointermove", e => {
          if (!scratching) return;
          e.stopPropagation();
          scratchAt(e.clientX, e.clientY);
        });
        window.addEventListener("pointerup", () => { scratching = false; });

        img.onclick = e => {
          if (selectedIds.size > 0 || !revealed) return;
          e.stopPropagation();
          document.getElementById("viewer-img").src = dec.imageData;
          document.getElementById("img-viewer-modal").style.display = "flex";
        };

        wrap.append(img, cvs, hint);
        div.appendChild(wrap);
      } else {
        allowDoubleTapReact = true;
        const img = document.createElement("img");
        img.className = "msg-img";
        img.alt = dec.polaroid ? "Couple Polaroid" : (dec.doodle ? "Love Doodle" : "Shared photo");
        img.src = dec.imageData;
        img.onclick = e => {
          if (selectedIds.size > 0) return;
          e.stopPropagation();
          document.getElementById("viewer-img").src = dec.imageData;
          document.getElementById("img-viewer-modal").style.display = "flex";
        };
        div.appendChild(img);
        if (dec.text) {
          const cap = document.createElement("span");
          cap.innerText = dec.text;
          div.appendChild(cap);
        }
      }
    } else {
      allowDoubleTapReact = true;
      const tSpan = document.createElement("span");
      tSpan.innerText = dec.text || "";
      div.appendChild(tSpan);
    }

    const meta = document.createElement("div");
    meta.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:4px;";
    if (dec.expiresAtMs) {
      const expBadge = document.createElement("span");
      expBadge.style.cssText = "font-size:10px;opacity:0.8;";
      expBadge.innerText = "⏳";
      expBadge.title = "Auto-delete message";
      meta.appendChild(expBadge);
    }
    if (dec.edited) {
      const edSpan = document.createElement("span");
      edSpan.className = "edited-tag";
      edSpan.innerText = "(edited)";
      meta.appendChild(edSpan);
    }
    const timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    timeSpan.style.margin = "0";
    if (m.isPending) {
      timeSpan.innerText = "⏳ Sending";
    } else if (m.createdAtSec) {
      timeSpan.innerText = new Date(m.createdAtSec * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    meta.appendChild(timeSpan);

    if (isMine && !m.isPending) {
      const tick = document.createElement("span");
      tick.className = "msg-tick";
      tick.style.fontSize = "12px";
      const isRead = m.createdAtSec > 0 && partnerLastReadMs >= m.createdAtSec * 1000;
      tick.innerText = isRead ? "✓✓" : "✓";
      tick.style.color = isRead ? "#53bdeb" : "rgba(255,255,255,0.75)";
      meta.appendChild(tick);
    }
    div.appendChild(meta);

    const reactionDisplayList = getDisplayReactionsList(m.reactions, m.reaction);
    if (reactionDisplayList.length) {
      const rPill = document.createElement("span");
      rPill.className = "msg-reaction-pill";
      rPill.innerText = reactionDisplayList.join(" ");
      rPill.title = "Tap to open reactions";
      rPill.onclick = e => {
        e.stopPropagation();
        openMsgActionPopup(div, m.id);
      };
      div.appendChild(rPill);
    }

    let sx = 0;
    let pressTimer = null;
    let lastTapAt = 0;
    div.addEventListener(
      "touchstart",
      e => {
        sx = e.touches[0].clientX;
        pressTimer = setTimeout(() => {
          navigator.vibrate?.(25);
          openMsgActionPopup(div, m.id);
        }, 420);
      },
      { passive: true }
    );
    div.addEventListener("touchmove", () => clearTimeout(pressTimer), { passive: true });
    div.addEventListener(
      "touchend",
      e => {
        clearTimeout(pressTimer);
        if (e.changedTouches[0].clientX - sx > 65 && selectedIds.size === 0) {
          triggerReply(getBubblePreviewText(dec));
          return;
        }
        if (allowDoubleTapReact && selectedIds.size === 0 && Math.abs(e.changedTouches[0].clientX - sx) < 12) {
          const now = Date.now();
          if (now - lastTapAt < 280) {
            lastTapAt = 0;
            applyReaction(m.id, "❤️");
          } else {
            lastTapAt = now;
          }
        }
      },
      { passive: true }
    );
    div.addEventListener("dblclick", e => {
      if (allowDoubleTapReact && selectedIds.size === 0) {
        e.stopPropagation();
        applyReaction(m.id, "❤️");
      }
    });
    div.addEventListener("click", e => {
      if (selectedIds.size > 0) {
        e.stopPropagation();
        toggleSelectMsg(m.id);
      }
    });
    div.addEventListener("contextmenu", e => {
      e.preventDefault();
      openMsgActionPopup(div, m.id);
    });

    return div;
  }

  function renderAllMessages(scrollToBottom = false, preserveTopDelta = false) {
    const prevH = messagesContainer.scrollHeight;
    const prevTop = messagesContainer.scrollTop;
    const deleted = getDeletedLocalSet();
    const now = Date.now();

    const sorted = sortMessages(
      [...messagesMap.values()].filter(m => !deleted.has(m.id) && !isMessageExpired(m.decrypted, now))
    );
    const { toRemove, toUpsert } = diffMessageIds(renderedOrder, sorted);

    toRemove.forEach(id => {
      const entry = renderedElements.get(id);
      if (entry?.el) entry.el.remove();
      renderedElements.delete(id);
    });

    let cursorNode = loadOlderBtn.nextSibling;
    toUpsert.forEach(({ msg }) => {
      const sig = buildMessageSignature(msg) + (msg.isPending ? "_p" : "");
      const existing = renderedElements.get(msg.id);
      let el = existing?.el;

      if (!el || existing.sig !== sig) {
        const nextEl = buildBubbleElement(msg);
        if (el && el.parentNode === messagesContainer) {
          messagesContainer.replaceChild(nextEl, el);
        }
        el = nextEl;
        renderedElements.set(msg.id, { el, sig });
      }

      while (cursorNode && !cursorNode.classList?.contains("msg-bubble")) {
        cursorNode = cursorNode.nextSibling;
      }
      if (el !== cursorNode) {
        messagesContainer.insertBefore(el, cursorNode || null);
      } else {
        cursorNode = el.nextSibling;
      }
    });

    renderedOrder = sorted.map(m => m.id);
    updateOldestCursor();
    if (searchQuery) applySearchHighlight();

    if (preserveTopDelta) {
      messagesContainer.scrollTop = prevTop + (messagesContainer.scrollHeight - prevH);
    } else if (scrollToBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function refreshTicksInPlace() {
    renderedElements.forEach(({ el }, id) => {
      const m = messagesMap.get(id);
      if (!m || m.sender !== myUid || m.isPending) return;
      const tick = el.querySelector(".msg-tick");
      if (!tick) return;
      const isRead = m.createdAtSec > 0 && partnerLastReadMs >= m.createdAtSec * 1000;
      tick.innerText = isRead ? "✓✓" : "✓";
      tick.style.color = isRead ? "#53bdeb" : "rgba(255,255,255,0.75)";
    });
  }

  async function markMessagesAsRead() {
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db || !notes.isChatVisible()) return;
    try {
      await setDoc(
        doc(db, "status", user.uid),
        { lastReadAt: serverTimestamp(), online: true, lastActiveAt: Date.now() },
        { merge: true }
      );
    } catch {}
  }

  function startMessagesListener() {
    const db = getDb();
    if (!db) return;
    if (unsubMsgs) unsubMsgs();
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(30));

    unsubMsgs = onSnapshot(q, async snap => {
      const changes = snap.docChanges();
      const decResults = await Promise.all(
        changes.map(async ch => {
          if (ch.type === "removed") return { ch, dec: null };
          const raw = ch.doc.data();
          const dec = await decryptPayload(raw.text);
          return { ch, raw, dec };
        })
      );

      let incomingNew = false;
      let incomingKind = "message";
      let changed = false;
      const creatorGameUpdates = [];

      for (const item of decResults) {
        const { ch, raw, dec } = item;
        if (ch.type === "removed") {
          if (messagesMap.delete(ch.doc.id)) changed = true;
        } else if (!isMessageExpired(dec)) {
          const prevLocal = messagesMap.get(ch.doc.id);
          const msgAt = getPayloadUpdatedAtMs(dec);
          const pending = pendingGameSyncs.get(ch.doc.id);
          const effectiveDec = pending && shouldApplyGameSync(msgAt, pending.at)
            ? pending.decrypted
            : dec;
          const effAt = getPayloadUpdatedAtMs(effectiveDec);
          if (msgAt && (!pending || msgAt >= pending.at)) {
            pendingGameSyncs.set(ch.doc.id, { at: msgAt, by: raw.sender, decrypted: dec });
          }

          const mergedReactions = raw.reactions || prevLocal?.reactions || null;
          const reactionSummary = mergedReactions
            ? getDisplayReactionsList(mergedReactions, raw.reaction || "").join(" ")
            : (raw.reaction || prevLocal?.reaction || "");
          const nextMsg = {
            id: ch.doc.id,
            sender: raw.sender,
            createdAtSec: raw.createdAt?.seconds || Math.floor(Date.now() / 1000),
            createdAtNs: raw.createdAt?.nanoseconds || 0,
            reaction: reactionSummary,
            reactions: mergedReactions,
            decrypted: effectiveDec
          };
          messagesMap.set(ch.doc.id, nextMsg);

          if (ch.type === "added" && !isFirstMsgLoad && raw.sender !== myUid) {
            incomingNew = true;
            incomingKind = getIncomingAlertKind(effectiveDec);
            if (effectiveDec?.walletGift) {
              walletGiftHandler?.(effectiveDec.walletGift);
            }
          } else if (
            shouldNotifyCreatorOnMessageChange({
              changeType: ch.type,
              isFirstLoad: isFirstMsgLoad,
              docSender: raw.sender,
              myUid,
              nextDec: effectiveDec
            })
          ) {
            const nKey = `${ch.doc.id}|${effAt}`;
            if (!notifiedUpdateKeys.has(nKey)) {
              notifiedUpdateKeys.add(nKey);
              creatorGameUpdates.push({ id: ch.doc.id, label: buildGameUpdateLabel(effectiveDec) });
            }
          }
          if (effectiveDec?.gameData && gameUpdateHandler) {
            gameUpdateHandler(nextMsg);
          }
          changed = true;
        }
      }

      isFirstMsgLoad = false;
      if (changed) {
        const nearBottom =
          messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 180;
        renderAllMessages(nearBottom || incomingNew);
        saveMsgCache();
      }
      if (incomingNew) {
        if (notes.isChatVisible() && document.visibilityState === "visible") {
          playEmotionSound("chime");
          markMessagesAsRead();
        } else {
          notifications.showBrowserAlert(incomingKind);
        }
      } else if (creatorGameUpdates.length) {
        const latest = creatorGameUpdates[creatorGameUpdates.length - 1];
        showGameUpdateBanner(latest.id, latest.label);
        if (notes.isChatVisible() && document.visibilityState === "visible") {
          playEmotionSound("gift");
          markMessagesAsRead();
        } else {
          notifications.showBrowserAlert("letter");
        }
      }
      flushPendingQueue();
    });
  }

  async function sendEncryptedMessage(payloadObj, alertKind = "message") {
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db) return null;
    onActivity?.();
    if (replyingToText && !payloadObj.isCallLog && !payloadObj.isGameResult) {
      payloadObj.replyTo = replyingToText;
      replyingToText = null;
      replyPreview.style.display = "none";
    }
    const hrs = getDisappearHours();
    if (hrs > 0 && !payloadObj.isCallLog && !payloadObj.expiresAtMs) {
      payloadObj.expiresAtMs = Date.now() + hrs * 3600 * 1000;
    }

    const canQueue = Boolean(payloadObj.text && !payloadObj.imageData && !payloadObj.audioData);
    try {
      if (canQueue && typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Offline");
      }
      const cipher = await encryptPayload(payloadObj);
      const docRef = await addDoc(collection(db, "messages"), {
        text: cipher,
        sender: user.uid,
        read: false,
        createdAt: serverTimestamp()
      });
      if (docRef?.id && !messagesMap.has(docRef.id)) {
        messagesMap.set(docRef.id, {
          id: docRef.id,
          sender: user.uid,
          createdAtSec: Math.floor(Date.now() / 1000),
          createdAtNs: 0,
          reaction: "",
          reactions: null,
          decrypted: payloadObj
        });
        renderAllMessages(true);
        saveMsgCache();
      }
      if (!payloadObj.isCallLog) notifications.sendPushAlert(alertKind);
      return { id: docRef.id, payload: payloadObj };
    } catch {
      if (canQueue) {
        const tempId = "pending_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        const queue = readJson(PENDING_QUEUE_KEY, []);
        queue.push({ tempId, payloadObj, createdMs: Date.now() });
        writeJson(PENDING_QUEUE_KEY, queue);
        loadPendingIntoMap();
        renderAllMessages(true);
      }
      return null;
    }
  }

  function closeMediaBar() {
    mediaBar?.classList.remove("mobile-open");
    expandMediaBtn?.classList.remove("active");
  }

  function toggleMediaBar(e) {
    e?.stopPropagation?.();
    const isOpen = mediaBar?.classList.toggle("mobile-open");
    expandMediaBtn?.classList.toggle("active", Boolean(isOpen));
    if (isOpen && quickRepliesBar) {
      quickRepliesBar.style.display = "none";
      quickRepliesBtn?.classList.remove("active");
    }
  }

  async function sendCurrentInput() {
    const txt = messageInput.value.trim();
    if (!txt) return;
    emojiPicker.style.display = "none";
    if (quickRepliesBar) quickRepliesBar.style.display = "none";
    messageInput.value = "";
    messageInput.style.height = "auto";
    closeMediaBar();
    playEmotionSound("chime");
    clearTimeout(typingTimeout);
    isTyping = false;
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (user && db) {
      setDoc(doc(db, "status", user.uid), { typing: false }, { merge: true }).catch(() => {});
    }
    await sendEncryptedMessage({ text: txt });
  }

  function applySearchHighlight() {
    const q = searchQuery.trim().toLowerCase();
    searchMatches = [];
    if (!q) {
      if (searchCountEl) searchCountEl.innerText = "";
      return;
    }
    const sorted = sortMessages([...messagesMap.values()]);
    sorted.forEach(m => {
      const txt = getBubblePreviewText(m.decrypted).toLowerCase();
      if (txt.includes(q)) searchMatches.push(m.id);
    });
    if (searchCountEl) {
      searchCountEl.innerText = searchMatches.length ? `${searchMatches.length} found` : "0";
    }
  }

  document.getElementById("open-search-btn")?.addEventListener("click", () => {
    document.getElementById("more-dropdown").style.display = "none";
    if (searchBar) {
      searchBar.style.display = "flex";
      searchInput?.focus();
    }
  });
  document.getElementById("chat-search-close")?.addEventListener("click", () => {
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    if (searchCountEl) searchCountEl.innerText = "";
    if (searchBar) searchBar.style.display = "none";
  });
  searchInput?.addEventListener("input", () => {
    searchQuery = searchInput.value;
    applySearchHighlight();
    searchIdx = searchMatches.length - 1;
    if (searchMatches[searchIdx]) jumpToMessage(searchMatches[searchIdx]);
  });
  searchInput?.addEventListener("keydown", e => {
    if (e.key === "Enter" && searchMatches.length) {
      searchIdx = (searchIdx - 1 + searchMatches.length) % searchMatches.length;
      jumpToMessage(searchMatches[searchIdx]);
    }
  });

  // Starred & Backup Modal
  function renderStarredModal() {
    const listEl = document.getElementById("starred-list");
    if (!listEl) return;
    const items = readJson(STARRED_MSGS_KEY, []);
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.innerHTML = `<p style="font-size:13px;opacity:0.75;">Abhi koi starred message nahi hai. Kisi message par long-press karke ⭐ Star karein.</p>`;
      return;
    }
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "starred-item";
      const txt = document.createElement("span");
      txt.innerText = item.preview;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "pinned-close-btn";
      del.innerText = "✕";
      del.onclick = () => {
        const next = readJson(STARRED_MSGS_KEY, []).filter(x => x.id !== item.id);
        writeJson(STARRED_MSGS_KEY, next);
        renderStarredModal();
      };
      row.appendChild(txt);
      row.appendChild(del);
      listEl.appendChild(row);
    });
  }

  document.getElementById("open-starred-btn")?.addEventListener("click", () => {
    document.getElementById("more-dropdown").style.display = "none";
    renderStarredModal();
    document.getElementById("starred-modal").style.display = "flex";
  });
  document.getElementById("close-starred-btn")?.addEventListener("click", () => {
    document.getElementById("starred-modal").style.display = "none";
  });
  document.getElementById("export-backup-btn")?.addEventListener("click", () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      starred: readJson(STARRED_MSGS_KEY, []),
      messages: sortMessages([...messagesMap.values()]).map(m => ({
        at: m.createdAtSec ? new Date(m.createdAtSec * 1000).toISOString() : "",
        reaction: m.reaction || "",
        preview: getBubblePreviewText(m.decrypted)
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-notes-memories-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });

  // Pinned bar & Game Update alert bar wiring
  document.getElementById("pinned-jump-btn")?.addEventListener("click", () => {
    if (currentPinned?.id) jumpToMessage(currentPinned.id);
  });
  document.getElementById("unpin-msg-btn")?.addEventListener("click", () => {
    setPinnedBarState(null);
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (user && db) {
      setDoc(doc(db, "status", user.uid), { pinnedMsg: null }, { merge: true }).catch(() => {});
    }
  });
  document.getElementById("game-update-jump-btn")?.addEventListener("click", () => {
    const targetId = activeGameUpdateMsgId;
    hideGameUpdateBanner();
    if (targetId) jumpToMessage(targetId);
  });
  document.getElementById("close-game-update-btn")?.addEventListener("click", hideGameUpdateBanner);

  // Event wiring
  messagesContainer.addEventListener("scroll", () => {
    const nearBottom =
      messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 120;
    scrollBottomBtn.style.display = nearBottom ? "none" : "flex";
  });

  scrollBottomBtn.addEventListener("click", () => {
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: "smooth" });
  });

  loadOlderBtn.addEventListener("click", async () => {
    const db = getDb();
    if (!oldestTimestamp || !db) return;
    loadOlderBtn.innerText = "Loading... ⏳";
    try {
      const q = query(
        collection(db, "messages"),
        orderBy("createdAt", "desc"),
        where("createdAt", "<", oldestTimestamp),
        limit(25)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        loadOlderBtn.innerText = "Sab purane messages load ho gaye ✅";
        setTimeout(() => {
          loadOlderBtn.style.display = "none";
        }, 2000);
        return;
      }
      const decrypted = await Promise.all(
        snap.docs.map(async d => {
          const raw = d.data();
          return { d, raw, dec: await decryptPayload(raw.text) };
        })
      );
      decrypted.forEach(({ d, raw, dec }) => {
        if (!isMessageExpired(dec)) {
          messagesMap.set(d.id, {
            id: d.id,
            sender: raw.sender,
            createdAtSec: raw.createdAt?.seconds || 0,
            createdAtNs: raw.createdAt?.nanoseconds || 0,
            reaction: raw.reaction || "",
            reactions: raw.reactions || null,
            decrypted: dec
          });
        }
      });
      renderAllMessages(false, true);
      loadOlderBtn.innerText = "⬆️ Purane Messages Load Karein";
    } catch {
      loadOlderBtn.innerText = "⬆️ Purane Messages Load Karein";
    }
  });

  document.getElementById("cancel-reply").addEventListener("click", () => {
    replyingToText = null;
    replyPreview.style.display = "none";
  });

  document.getElementById("cancel-select-btn").addEventListener("click", clearSelection);

  document.getElementById("copy-selected-btn").addEventListener("click", async () => {
    const lines = [...selectedIds]
      .map(id => getBubblePreviewText(messagesMap.get(id)?.decrypted))
      .filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch {}
    clearSelection();
  });

  reactionPopup.addEventListener("click", e => e.stopPropagation());

  document.getElementById("rp-more-react-btn")?.addEventListener("click", e => {
    e.stopPropagation();
    reactionPopup.style.display = "none";
    isPinReactMode = false;
    togglePinReactBtn?.classList.remove("active");
    if (reactSearchInput) reactSearchInput.value = "";
    renderFullReactionSheet();
    reactionAllModal.style.display = "flex";
  });
  togglePinReactBtn?.addEventListener("click", e => {
    e.stopPropagation();
    isPinReactMode = !isPinReactMode;
    togglePinReactBtn.classList.toggle("active", isPinReactMode);
    renderPinnedReactsPreview();
  });
  document.getElementById("close-react-all-btn")?.addEventListener("click", () => {
    isPinReactMode = false;
    togglePinReactBtn?.classList.remove("active");
    reactionAllModal.style.display = "none";
  });
  reactSearchInput?.addEventListener("input", renderFullReactionSheet);

  document.getElementById("rp-reply-btn").addEventListener("click", () => {
    const m = messagesMap.get(activePopupMsgId);
    reactionPopup.style.display = "none";
    if (m) triggerReply(getBubblePreviewText(m.decrypted));
  });

  const editModal = document.getElementById("edit-msg-modal");
  const editInput = document.getElementById("edit-msg-input");
  document.getElementById("rp-edit-btn")?.addEventListener("click", () => {
    const m = messagesMap.get(activePopupMsgId);
    reactionPopup.style.display = "none";
    if (!m || !canEditMessage(m, myUid)) return;
    editingMsgId = m.id;
    if (editInput) editInput.value = m.decrypted?.text || "";
    if (editModal) editModal.style.display = "flex";
    editInput?.focus();
  });
  document.getElementById("edit-msg-cancel-btn")?.addEventListener("click", () => {
    editingMsgId = null;
    if (editModal) editModal.style.display = "none";
  });
  document.getElementById("edit-msg-save-btn")?.addEventListener("click", async () => {
    const nextText = (editInput?.value || "").trim();
    if (!nextText || !editingMsgId) return;
    const m = messagesMap.get(editingMsgId);
    const targetId = editingMsgId;
    editingMsgId = null;
    if (editModal) editModal.style.display = "none";
    if (!m) return;
    await updateEncryptedMessage(
      targetId,
      { ...m.decrypted, text: nextText, edited: true },
      { notifyPartner: false }
    );
  });

  document.getElementById("rp-pin-btn")?.addEventListener("click", () => {
    const id = activePopupMsgId;
    const m = messagesMap.get(id);
    reactionPopup.style.display = "none";
    if (!m) return;
    const pinnedObj = {
      id,
      preview: getBubblePreviewText(m.decrypted).slice(0, 90) || "Pinned message",
      at: Date.now()
    };
    setPinnedBarState(pinnedObj);
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (user && db) {
      setDoc(doc(db, "status", user.uid), { pinnedMsg: pinnedObj }, { merge: true }).catch(() => {});
    }
  });

  document.getElementById("rp-star-btn")?.addEventListener("click", () => {
    const id = activePopupMsgId;
    const m = messagesMap.get(id);
    reactionPopup.style.display = "none";
    if (!m) return;
    const list = readJson(STARRED_MSGS_KEY, []);
    const exists = list.some(x => x.id === id);
    const next = exists
      ? list.filter(x => x.id !== id)
      : [{ id, preview: getBubblePreviewText(m.decrypted).slice(0, 180), at: Date.now() }, ...list].slice(0, 120);
    writeJson(STARRED_MSGS_KEY, next);
  });

  document.getElementById("rp-select-btn").addEventListener("click", () => {
    reactionPopup.style.display = "none";
    if (activePopupMsgId) toggleSelectMsg(activePopupMsgId);
  });

  const deleteModal = document.getElementById("delete-msg-modal");
  document.getElementById("rp-delete-btn").addEventListener("click", () => {
    reactionPopup.style.display = "none";
    if (!activePopupMsgId) return;
    pendingDeleteIds = [activePopupMsgId];
    document.getElementById("delete-modal-desc").innerText = "1 message delete karna hai?";
    deleteModal.style.display = "flex";
  });

  document.getElementById("delete-selected-btn").addEventListener("click", () => {
    if (!selectedIds.size) return;
    pendingDeleteIds = [...selectedIds];
    document.getElementById("delete-modal-desc").innerText = `${pendingDeleteIds.length} messages delete karne hain?`;
    deleteModal.style.display = "flex";
  });

  document.getElementById("del-cancel-btn").addEventListener("click", () => {
    deleteModal.style.display = "none";
  });

  document.getElementById("del-for-me-btn").addEventListener("click", () => {
    deleteModal.style.display = "none";
    addDeletedLocal(pendingDeleteIds);
    pendingDeleteIds.forEach(id => messagesMap.delete(id));
    clearSelection();
    renderAllMessages(false, true);
    saveMsgCache();
  });

  document.getElementById("del-for-all-btn").addEventListener("click", async () => {
    deleteModal.style.display = "none";
    const ids = [...pendingDeleteIds];
    ids.forEach(id => messagesMap.delete(id));
    clearSelection();
    renderAllMessages(false, true);
    saveMsgCache();
    const db = getDb();
    if (!db) return;
    for (let i = 0; i < ids.length; i += 25) {
      await Promise.allSettled(ids.slice(i, i + 25).map(id => deleteDoc(doc(db, "messages", id))));
    }
  });

  const clearConfirmModal = document.getElementById("clear-confirm-modal");
  document.getElementById("clear-chat-btn").addEventListener("click", () => {
    document.getElementById("more-dropdown").style.display = "none";
    clearConfirmModal.style.display = "flex";
  });
  document.getElementById("cancel-clear-btn").addEventListener("click", () => {
    clearConfirmModal.style.display = "none";
  });
  document.getElementById("confirm-clear-btn").addEventListener("click", async () => {
    clearConfirmModal.style.display = "none";
    messagesMap.clear();
    try { localStorage.removeItem(MSG_CACHE_KEY); } catch {}
    renderAllMessages(false);
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (user && db) {
      setDoc(doc(db, "status", user.uid), { clearedAtMs: Date.now() }, { merge: true }).catch(() => {});
    }
    if (!db) return;
    try {
      while (true) {
        const snap = await getDocs(query(collection(db, "messages"), limit(50)));
        if (snap.empty) break;
        await Promise.allSettled(snap.docs.map(d => deleteDoc(doc(db, "messages", d.id))));
        if (snap.docs.length < 50) break;
      }
    } catch {}
  });

  messageInput.addEventListener("focus", closeMediaBar);
  expandMediaBtn?.addEventListener("click", toggleMediaBar);
  mediaBar?.addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => closeMediaBar());

  quickRepliesBtn?.addEventListener("click", e => {
    e.stopPropagation();
    if (!quickRepliesBar) return;
    const opening = quickRepliesBar.style.display === "none" || !quickRepliesBar.style.display;
    quickRepliesBar.style.display = opening ? "flex" : "none";
    quickRepliesBtn.classList.toggle("active", opening);
    closeMediaBar();
  });

  quickRepliesBar?.querySelectorAll(".quick-reply-chip[data-qr]").forEach(chip => {
    chip.addEventListener("click", e => {
      e.stopPropagation();
      const qr = chip.dataset.qr || "";
      if (!qr) return;
      messageInput.value = messageInput.value ? `${messageInput.value.trimEnd()} ${qr}` : qr;
      messageInput.style.height = "auto";
      messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + "px";
      quickRepliesBar.style.display = "none";
      quickRepliesBtn?.classList.remove("active");
      messageInput.focus();
      playEmotionSound("chime");
    });
  });

  messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCurrentInput();
    }
  });

  messageInput.addEventListener("input", function () {
    onActivity?.();
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 100) + "px";
    if (this.value.trim()) closeMediaBar();
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db) return;
    if (!isTyping) {
      isTyping = true;
      setDoc(doc(db, "status", user.uid), { typing: true, lastActiveAt: Date.now() }, { merge: true }).catch(() => {});
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
      const u = getAuth()?.currentUser;
      if (u && db) setDoc(doc(db, "status", u.uid), { typing: false }, { merge: true }).catch(() => {});
    }, 1500);
  });

  emojiPicker.addEventListener("click", e => e.stopPropagation());
  epSearchInput?.addEventListener("input", renderComposerEmojiPicker);
  renderComposerEmojiPicker();

  document.getElementById("emoji-btn").addEventListener("click", e => {
    e.stopPropagation();
    const opening = emojiPicker.style.display !== "flex";
    if (opening) {
      if (epSearchInput) epSearchInput.value = "";
      renderComposerEmojiPicker();
      emojiPicker.style.display = "flex";
    } else {
      emojiPicker.style.display = "none";
    }
  });
  document.getElementById("ep-close-btn").addEventListener("click", e => {
    e.stopPropagation();
    emojiPicker.style.display = "none";
  });

  document.getElementById("send-btn").addEventListener("click", sendCurrentInput);

  viewOnceBtn?.addEventListener("click", () => {
    viewOnceCheck.checked = !viewOnceCheck.checked;
    viewOnceBtn.classList.toggle("active", viewOnceCheck.checked);
    if (viewOnceCheck.checked && teaseBlurCheck) {
      teaseBlurCheck.checked = false;
      teaseBlurBtn?.classList.remove("active");
    }
  });

  teaseBlurBtn?.addEventListener("click", () => {
    if (!teaseBlurCheck) return;
    teaseBlurCheck.checked = !teaseBlurCheck.checked;
    teaseBlurBtn.classList.toggle("active", teaseBlurCheck.checked);
    if (teaseBlurCheck.checked && viewOnceCheck) {
      viewOnceCheck.checked = false;
      viewOnceBtn?.classList.remove("active");
    }
  });

  document.getElementById("camera-btn").addEventListener("click", () => {
    notes.setPickingMedia(true);
    document.getElementById("camera-input").click();
  });
  document.getElementById("gallery-btn").addEventListener("click", () => {
    notes.setPickingMedia(true);
    document.getElementById("photo-input").click();
  });

  window.addEventListener("focus", () => {
    setTimeout(() => notes.setPickingMedia(false), 600);
  });

  async function handleImageFile(file) {
    notes.setPickingMedia(false);
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const max = 820;
      let w = img.width;
      let h = img.height;
      if (w > max || h > max) {
        const r = Math.min(max / w, max / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      const isVO = Boolean(viewOnceCheck?.checked);
      const isTB = !isVO && Boolean(teaseBlurCheck?.checked);
      if (viewOnceCheck) viewOnceCheck.checked = false;
      viewOnceBtn?.classList.remove("active");
      if (teaseBlurCheck) teaseBlurCheck.checked = false;
      teaseBlurBtn?.classList.remove("active");
      playEmotionSound("chime");
      await sendEncryptedMessage({ imageData: dataUrl, viewOnce: isVO, teaseBlur: isTB, text: "" });
    };
    img.src = url;
  }

  document.getElementById("photo-input").addEventListener("change", e => {
    handleImageFile(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("camera-input").addEventListener("change", e => {
    handleImageFile(e.target.files[0]);
    e.target.value = "";
  });

  let mediaRec = null;
  let recChunks = [];
  let recTimerInt = null;
  let recSec = 0;
  let recCanceled = false;
  const voiceBtn = document.getElementById("voice-btn");
  const recInd = document.getElementById("rec-indicator");
  const textWrap = document.getElementById("text-input-wrapper");

  function pickSupportedAudioMime() {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
    for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
      if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return "";
  }

  voiceBtn.addEventListener("click", async () => {
    if (mediaRec && mediaRec.state === "recording") {
      mediaRec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunks = [];
      recSec = 0;
      recCanceled = false;
      const mimeType = pickSupportedAudioMime();
      mediaRec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRec.ondataavailable = e => {
        if (e.data.size > 0) recChunks.push(e.data);
      };
      mediaRec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recTimerInt);
        voiceBtn.classList.remove("recording");
        recInd.style.display = "none";
        textWrap.style.display = "flex";
        if (recCanceled || !recChunks.length) return;
        const isVO = viewOnceCheck.checked;
        viewOnceCheck.checked = false;
        viewOnceBtn.classList.remove("active");
        const blob = new Blob(recChunks, { type: mediaRec.mimeType || mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          await sendEncryptedMessage({ audioData: reader.result, duration: recSec, viewOnce: isVO });
        };
        reader.readAsDataURL(blob);
      };
      mediaRec.start();
      voiceBtn.classList.add("recording");
      textWrap.style.display = "none";
      recInd.style.display = "flex";
      document.getElementById("rec-timer").innerText = "🔴 0s / 20s";
      recTimerInt = setInterval(() => {
        recSec++;
        document.getElementById("rec-timer").innerText = `🔴 ${recSec}s / 20s`;
        if (recSec >= 20 && mediaRec.state === "recording") mediaRec.stop();
      }, 1000);
    } catch {}
  });

  document.getElementById("rec-cancel-btn").addEventListener("click", () => {
    recCanceled = true;
    if (mediaRec && mediaRec.state === "recording") mediaRec.stop();
  });

  const GIFTS = [
    { emoji: "🧸", label: "Teddy Bear" },
    { emoji: "🍫", label: "Chocolate" },
    { emoji: "🌹", label: "Red Rose" },
    { emoji: "💍", label: "Ring" },
    { emoji: "🤗", label: "Tight Hug" },
    { emoji: "💋", label: "Sweet Kiss" }
  ];
  const giftGrid = document.getElementById("gift-grid");
  GIFTS.forEach(g => {
    const b = document.createElement("button");
    b.className = "mood-item";
    b.type = "button";
    b.innerText = `${g.emoji} ${g.label}`;
    b.onclick = async () => {
      const note = document.getElementById("gift-note-input").value.trim();
      document.getElementById("gift-note-input").value = "";
      document.getElementById("gift-modal").style.display = "none";
      playEmotionSound("gift");
      await sendEncryptedMessage({ giftData: { emoji: g.emoji, label: g.label, note } });
    };
    giftGrid.appendChild(b);
  });
  document.getElementById("gift-btn").addEventListener("click", () => {
    document.getElementById("gift-modal").style.display = "flex";
  });
  document.getElementById("close-gift-btn").addEventListener("click", () => {
    document.getElementById("gift-modal").style.display = "none";
  });

  function stopTransientMedia() {
    if (mediaRec && mediaRec.state === "recording") {
      recCanceled = true;
      mediaRec.stop();
    }
    if (activeAudioEl && !activeAudioEl.paused) {
      activeAudioEl.pause();
    }
  }

  function resetOnSignOut() {
    if (unsubMsgs) {
      unsubMsgs();
      unsubMsgs = null;
    }
    myUid = null;
    messagesMap.clear();
    pendingGameSyncs.clear();
    appliedRemoteGameKeys.clear();
    notifiedUpdateKeys.clear();
    renderAllMessages(false);
    setPinnedBarState(null);
    isTyping = false;
  }

  function getMessageById(msgId) {
    return msgId ? messagesMap.get(msgId) || null : null;
  }

  function getLatestLiveGameMsg(kind, includeFinished = false) {
    const sorted = sortMessages([...messagesMap.values()]);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const m = sorted[i];
      const gd = m?.decrypted?.gameData;
      if (!gd || gd.kind !== kind) continue;
      if (!includeFinished && isLiveGameFinished(gd)) continue;
      return m;
    }
    return null;
  }

  return {
    setMyUid(uid) { myUid = uid; },
    setPartnerLastReadMs(ms) { partnerLastReadMs = ms; refreshTicksInPlace(); },
    setGameRenderer(fn) { gameRenderer = fn; },
    setGameUpdateHandler(fn) { gameUpdateHandler = fn; },
    setWalletGiftHandler(fn) { walletGiftHandler = fn; },
    getLoadedMessages() { return [...messagesMap.values()]; },
    getMessageById,
    getLatestLiveGameMsg,
    setPinnedBarState,
    showGameUpdateBanner,
    hideGameUpdateBanner,
    jumpToMessage,
    applyRemoteReactionSyncs,
    applyRemoteGameSyncs,
    loadMsgCache,
    startMessagesListener,
    markMessagesAsRead,
    sendEncryptedMessage,
    updateEncryptedMessage,
    clearFromRemote() {
      messagesMap.clear();
      try { localStorage.removeItem(MSG_CACHE_KEY); } catch {}
      renderAllMessages(false);
    },
    getComposerText() {
      return messageInput.value.trim();
    },
    insertTextToComposer(text) {
      messageInput.value = text;
      messageInput.style.height = "auto";
      messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + "px";
      closeMediaBar();
      messageInput.focus();
    },
    getSelectedCount() { return selectedIds.size; },
    clearSelection,
    getPopupOpenedAt() { return popupOpenedAt; },
    stopTransientMedia,
    resetOnSignOut
  };
}
