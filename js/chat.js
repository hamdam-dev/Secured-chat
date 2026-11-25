import { escapeHtml, playEmotionSound, encryptPayload, decryptPayload } from "./crypto.js";
import {
  sortMessages,
  diffMessageIds,
  getBubblePreviewText,
  buildMessageSignature,
  getIncomingAlertKind
} from "../shared/chatLogic.js";

const MSG_CACHE_KEY = "sc_msg_cache_v1";
const DELETED_LOCAL_KEY = "sc_deleted_local_v1";

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
  const mediaBar = document.getElementById("media-actions-bar");
  const expandMediaBtn = document.getElementById("expand-media-btn");
  const emojiPicker = document.getElementById("emoji-picker");

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
  let selectedIds = new Set();
  let activeAudioEl = null;
  let activeAudioBtn = null;
  let pendingDeleteIds = [];

  function getDeletedLocalSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(DELETED_LOCAL_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function addDeletedLocal(ids) {
    const set = getDeletedLocalSet();
    ids.forEach(id => set.add(id));
    try {
      localStorage.setItem(DELETED_LOCAL_KEY, JSON.stringify([...set].slice(-300)));
    } catch {}
  }

  function saveMsgCache() {
    try {
      const arr = sortMessages([...messagesMap.values()])
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
            decrypted: copy
          };
        });
      localStorage.setItem(MSG_CACHE_KEY, JSON.stringify(arr));
    } catch {}
  }

  function loadMsgCache() {
    try {
      const arr = JSON.parse(localStorage.getItem(MSG_CACHE_KEY) || "[]");
      const deleted = getDeletedLocalSet();
      arr.forEach(m => {
        if (!deleted.has(m.id)) messagesMap.set(m.id, m);
      });
      if (messagesMap.size > 0) renderAllMessages(true);
    } catch {}
  }

  function updateOldestCursor() {
    let minTs = null;
    messagesMap.forEach(m => {
      if (m.createdAtSec > 0) {
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

  function openMsgActionPopup(bubbleEl, msgId) {
    activePopupMsgId = msgId;
    popupOpenedAt = Date.now();
    const rect = bubbleEl.getBoundingClientRect();
    reactionPopup.style.display = "flex";
    reactionPopup.style.top = Math.max(70, rect.top - 52) + "px";
    reactionPopup.style.left = "50%";
    reactionPopup.style.transform = "translateX(-50%)";
  }

  function buildBubbleElement(m) {
    const dec = m.decrypted || {};
    const isMine = m.sender === myUid;
    const div = document.createElement("div");
    div.className = `msg-bubble ${isMine ? "msg-sent" : "msg-received"}`;
    div.dataset.id = m.id;
    if (selectedIds.has(m.id)) div.classList.add("msg-selected");

    if (dec.replyTo) {
      const rBox = document.createElement("div");
      rBox.className = "msg-reply-box";
      rBox.innerText = dec.replyTo;
      div.appendChild(rBox);
    }

    if (dec.isCallLog) {
      const cl = document.createElement("div");
      cl.className = "call-log-pill" + (dec.missed ? " call-log-missed" : "");
      cl.innerText = dec.text || "📞 Call";
      div.appendChild(cl);
    } else if (dec.carePing) {
      const pBox = document.createElement("div");
      pBox.className = "care-ping-card";
      pBox.innerHTML = `<span class="care-ping-emoji">${escapeHtml(dec.carePing.emoji || "💞")}</span><div><div class="care-ping-title">${escapeHtml(dec.carePing.label || "Care Ping")}</div><div class="care-ping-sub">${escapeHtml(dec.carePing.sub || "Pyar bhara ishaara")}</div></div>`;
      div.appendChild(pBox);
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
      const aBox = document.createElement("div");
      aBox.className = "audio-player-box";
      const btn = document.createElement("button");
      btn.className = "audio-play-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "Play voice note");
      btn.innerText = "▶";
      const lbl = document.createElement("span");
      lbl.style.fontSize = "12px";
      lbl.innerText = `Voice Note (${dec.duration || 0}s)`;
      const aud = new Audio(dec.audioData);
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
          aud.play().catch(() => {});
          btn.innerText = "⏸";
        } else {
          aud.pause();
          btn.innerText = "▶";
        }
      };
      aud.onended = () => {
        btn.innerText = "▶";
      };
      aBox.appendChild(btn);
      aBox.appendChild(lbl);
      div.appendChild(aBox);
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
      } else {
        const img = document.createElement("img");
        img.className = "msg-img";
        img.alt = "Shared photo";
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
      const tSpan = document.createElement("span");
      tSpan.innerText = dec.text || "";
      div.appendChild(tSpan);
    }

    const meta = document.createElement("div");
    meta.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:4px;";
    const timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    timeSpan.style.margin = "0";
    if (m.createdAtSec) {
      timeSpan.innerText = new Date(m.createdAtSec * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    meta.appendChild(timeSpan);

    if (isMine) {
      const tick = document.createElement("span");
      tick.className = "msg-tick";
      tick.style.fontSize = "12px";
      const isRead = m.createdAtSec > 0 && partnerLastReadMs >= m.createdAtSec * 1000;
      tick.innerText = isRead ? "✓✓" : "✓";
      tick.style.color = isRead ? "#53bdeb" : "rgba(255,255,255,0.75)";
      meta.appendChild(tick);
    }
    div.appendChild(meta);

    if (m.reaction) {
      const rPill = document.createElement("span");
      rPill.className = "msg-reaction-pill";
      rPill.innerText = m.reaction;
      div.appendChild(rPill);
    }

    let sx = 0;
    let pressTimer = null;
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
        }
      },
      { passive: true }
    );
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

    const sorted = sortMessages([...messagesMap.values()].filter(m => !deleted.has(m.id)));
    const { toRemove, toUpsert } = diffMessageIds(renderedOrder, sorted);

    toRemove.forEach(id => {
      const entry = renderedElements.get(id);
      if (entry?.el) entry.el.remove();
      renderedElements.delete(id);
    });

    let cursorNode = loadOlderBtn.nextSibling;
    toUpsert.forEach(({ msg }) => {
      const sig = buildMessageSignature(msg);
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

    if (preserveTopDelta) {
      messagesContainer.scrollTop = prevTop + (messagesContainer.scrollHeight - prevH);
    } else if (scrollToBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function refreshTicksInPlace() {
    renderedElements.forEach(({ el }, id) => {
      const m = messagesMap.get(id);
      if (!m || m.sender !== myUid) return;
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

      for (const item of decResults) {
        const { ch, raw, dec } = item;
        if (ch.type === "removed") {
          if (messagesMap.delete(ch.doc.id)) changed = true;
        } else {
          messagesMap.set(ch.doc.id, {
            id: ch.doc.id,
            sender: raw.sender,
            createdAtSec: raw.createdAt?.seconds || Math.floor(Date.now() / 1000),
            createdAtNs: raw.createdAt?.nanoseconds || 0,
            reaction: raw.reaction || "",
            decrypted: dec
          });
          if (ch.type === "added" && !isFirstMsgLoad && raw.sender !== myUid) {
            incomingNew = true;
            incomingKind = getIncomingAlertKind(dec);
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
      }
    });
  }

  async function sendEncryptedMessage(payloadObj, alertKind = "message") {
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db) return;
    onActivity?.();
    if (replyingToText) {
      payloadObj.replyTo = replyingToText;
      replyingToText = null;
      replyPreview.style.display = "none";
    }
    const cipher = await encryptPayload(payloadObj);
    await addDoc(collection(db, "messages"), {
      text: cipher,
      sender: user.uid,
      read: false,
      createdAt: serverTimestamp()
    });
    if (!payloadObj.isCallLog) notifications.sendPushAlert(alertKind);
  }

  function collapseMediaBar() {
    mediaBar.classList.add("collapsed");
    expandMediaBtn.style.display = "flex";
  }

  function expandMediaBar() {
    mediaBar.classList.remove("collapsed");
    expandMediaBtn.style.display = "none";
  }

  async function sendCurrentInput() {
    const txt = messageInput.value.trim();
    if (!txt) return;
    emojiPicker.style.display = "none";
    messageInput.value = "";
    messageInput.style.height = "auto";
    expandMediaBar();
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
        messagesMap.set(d.id, {
          id: d.id,
          sender: raw.sender,
          createdAtSec: raw.createdAt?.seconds || 0,
          createdAtNs: raw.createdAt?.nanoseconds || 0,
          reaction: raw.reaction || "",
          decrypted: dec
        });
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
  reactionPopup.querySelectorAll("[data-react]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const emoji = btn.dataset.react;
      const id = activePopupMsgId;
      reactionPopup.style.display = "none";
      if (!id) return;
      const m = messagesMap.get(id);
      if (m) {
        m.reaction = emoji;
        renderAllMessages(false, true);
        saveMsgCache();
      }
      const db = getDb();
      if (db) {
        try { await updateDoc(doc(db, "messages", id), { reaction: emoji }); } catch {}
      }
    });
  });

  document.getElementById("rp-reply-btn").addEventListener("click", () => {
    const m = messagesMap.get(activePopupMsgId);
    reactionPopup.style.display = "none";
    if (m) triggerReply(getBubblePreviewText(m.decrypted));
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

  messageInput.addEventListener("focus", collapseMediaBar);
  expandMediaBtn.addEventListener("click", expandMediaBar);
  messageInput.addEventListener("blur", () => {
    if (!messageInput.value.trim()) setTimeout(expandMediaBar, 150);
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
    if (this.value.trim()) collapseMediaBar();
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

  const emojiList = [
    "❤️", "😘", "🥰", "😍", "💕", "💖", "💘", "💓", "💞", "💋", "🫶", "🤗",
    "😂", "🤣", "🥹", "🥺", "😭", "😊", "🙈", "🤭", "😉", "😋", "🤩", "😌",
    "😡", "😤", "😒", "😔", "😢", "🤒", "😴", "🤯", "🥳", "😎", "🙏", "🤝",
    "🌹", "🌷", "🌸", "🌺", "🌻", "🦋", "🧸", "🐥", "🍫", "🍯", "🍓", "💍",
    "🌙", "✨", "⭐", "🔥", "💫", "🎀", "🎁", "👑", "♾️", "❤️‍🔥", "💐", "🕊️"
  ];
  const epGrid = document.getElementById("ep-grid");
  emojiPicker.addEventListener("click", e => e.stopPropagation());
  emojiList.forEach(em => {
    const b = document.createElement("button");
    b.className = "ep-item";
    b.type = "button";
    b.innerText = em;
    b.onclick = e => {
      e.stopPropagation();
      const start = messageInput.selectionStart ?? messageInput.value.length;
      const end = messageInput.selectionEnd ?? messageInput.value.length;
      messageInput.value = messageInput.value.slice(0, start) + em + messageInput.value.slice(end);
      const pos = start + em.length;
      messageInput.setSelectionRange(pos, pos);
      messageInput.focus();
      collapseMediaBar();
    };
    epGrid.appendChild(b);
  });

  document.getElementById("emoji-btn").addEventListener("click", e => {
    e.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === "flex" ? "none" : "flex";
  });
  document.getElementById("ep-close-btn").addEventListener("click", e => {
    e.stopPropagation();
    emojiPicker.style.display = "none";
  });

  document.getElementById("send-btn").addEventListener("click", sendCurrentInput);

  const viewOnceCheck = document.getElementById("view-once-checkbox");
  const viewOnceBtn = document.getElementById("view-once-btn");
  viewOnceBtn.addEventListener("click", () => {
    viewOnceCheck.checked = !viewOnceCheck.checked;
    viewOnceBtn.classList.toggle("active", viewOnceCheck.checked);
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
      const isVO = viewOnceCheck.checked;
      viewOnceCheck.checked = false;
      viewOnceBtn.classList.remove("active");
      playEmotionSound("chime");
      await sendEncryptedMessage({ imageData: dataUrl, viewOnce: isVO, text: "" });
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
        const blob = new Blob(recChunks, { type: mediaRec.mimeType || mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          await sendEncryptedMessage({ audioData: reader.result, duration: recSec });
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
    renderAllMessages(false);
    isTyping = false;
  }

  return {
    setMyUid(uid) { myUid = uid; },
    setPartnerLastReadMs(ms) { partnerLastReadMs = ms; refreshTicksInPlace(); },
    loadMsgCache,
    startMessagesListener,
    markMessagesAsRead,
    sendEncryptedMessage,
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
      collapseMediaBar();
      messageInput.focus();
    },
    getSelectedCount() { return selectedIds.size; },
    clearSelection,
    getPopupOpenedAt() { return popupOpenedAt; },
    stopTransientMedia,
    resetOnSignOut
  };
}
