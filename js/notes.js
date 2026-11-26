import { escapeHtml } from "./crypto.js";

const DEFAULT_SECRET_CODE = "Janan";
const SECRET_CODE_KEY = "sc_secret_code_v1";
const DECOY_CODE_KEY = "sc_decoy_code_v1";
const SHAKE_HIDE_KEY = "sc_shake_hide_v1";
const NOTES_KEY = "sc_offline_phone_notes_v1";
const AUTO_HIDE_KEY = "sc_auto_hide_min_v1";

export function createNotesManager({ onUnlock }) {
  const notesScreen = document.getElementById("notes-screen");
  const loginScreen = document.getElementById("login-screen");
  const chatScreen = document.getElementById("chat-screen");
  const noteTitleEl = document.getElementById("note-title");
  const noteContentEl = document.getElementById("note-content");
  const noteStatusEl = document.getElementById("note-status");
  const savedNotesWrap = document.getElementById("saved-notes-wrap");
  const secretCallDot = document.getElementById("secret-call-dot");
  const currentDateEl = document.getElementById("current-date");

  let editingNoteId = null;
  let autoHideTimer = null;
  let isPickingMedia = false;
  let dateTapCount = 0;
  let dateTapTimer = null;
  let lastShakeAt = 0;

  currentDateEl.innerText = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  currentDateEl.addEventListener("click", () => {
    dateTapCount++;
    clearTimeout(dateTapTimer);
    if (dateTapCount >= 3) {
      dateTapCount = 0;
      onUnlock();
      return;
    }
    dateTapTimer = setTimeout(() => {
      dateTapCount = 0;
    }, 900);
  });

  function getSecretCode() {
    try {
      return (localStorage.getItem(SECRET_CODE_KEY) || "").trim() || DEFAULT_SECRET_CODE;
    } catch {
      return DEFAULT_SECRET_CODE;
    }
  }

  function setSecretCode(nextCode) {
    const clean = String(nextCode || "").trim();
    try {
      if (clean) localStorage.setItem(SECRET_CODE_KEY, clean);
      else localStorage.removeItem(SECRET_CODE_KEY);
    } catch {}
    return getSecretCode();
  }

  function getDecoyCode() {
    try {
      return (localStorage.getItem(DECOY_CODE_KEY) || "").trim();
    } catch {
      return "";
    }
  }

  function setDecoyCode(nextCode) {
    const clean = String(nextCode || "").trim();
    try {
      if (clean) localStorage.setItem(DECOY_CODE_KEY, clean);
      else localStorage.removeItem(DECOY_CODE_KEY);
    } catch {}
    return getDecoyCode();
  }

  function isShakeHideEnabled() {
    try {
      return localStorage.getItem(SHAKE_HIDE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setShakeHideEnabled(val) {
    try {
      localStorage.setItem(SHAKE_HIDE_KEY, val ? "1" : "0");
    } catch {}
  }

  if (typeof window !== "undefined") {
    window.addEventListener("devicemotion", e => {
      if (!isShakeHideEnabled() || !isChatVisible()) return;
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const mag = Math.hypot(acc.x || 0, acc.y || 0, acc.z || 0);
      if (mag > 28 && Date.now() - lastShakeAt > 1500) {
        lastShakeAt = Date.now();
        window.__hideChatToNotes?.();
      }
    });
  }

  function isChatVisible() {
    return chatScreen.style.display === "flex";
  }

  function isNotesVisible() {
    return notesScreen.style.display !== "none";
  }

  function getAutoHideMinutes() {
    const val = Number(localStorage.getItem(AUTO_HIDE_KEY) || "0");
    return [0, 2, 5].includes(val) ? val : 0;
  }

  function setAutoHideMinutes(mins) {
    try {
      localStorage.setItem(AUTO_HIDE_KEY, String(mins));
    } catch {}
    resetAutoHideTimer();
  }

  function resetAutoHideTimer(hasActiveCallFn) {
    clearTimeout(autoHideTimer);
    const mins = getAutoHideMinutes();
    if (!mins || !isChatVisible()) return;
    autoHideTimer = setTimeout(() => {
      if (isChatVisible() && !isPickingMedia && !hasActiveCallFn?.()) {
        window.__hideChatToNotes?.();
      }
    }, mins * 60 * 1000);
  }

  function setPickingMedia(val) {
    isPickingMedia = Boolean(val);
    if (val) {
      setTimeout(() => {
        isPickingMedia = false;
      }, 45000);
    }
  }

  function getIsPickingMedia() {
    return isPickingMedia;
  }

  function getPhoneNotes() {
    try {
      return JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function savePhoneNotes(list) {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(list));
    } catch {}
  }

  function renderPhoneNotes() {
    const notes = getPhoneNotes();
    savedNotesWrap.innerHTML = "";
    if (!notes.length) return;

    const head = document.createElement("div");
    head.className = "saved-notes-heading";
    head.innerHTML = `<span>📝 Saved Notes (${notes.length})</span>`;
    savedNotesWrap.appendChild(head);

    notes.forEach(n => {
      const card = document.createElement("div");
      card.className = "note-card";

      const info = document.createElement("div");
      info.className = "note-card-info";
      info.innerHTML = `
        <div class="note-card-title">${escapeHtml(n.title || "Untitled Note")}</div>
        <div class="note-card-preview">${escapeHtml(n.body || "")}</div>
        <div class="note-card-date">${escapeHtml(n.date || "")}</div>
      `;
      card.onclick = () => {
        editingNoteId = n.id;
        noteTitleEl.value = n.title || "";
        noteContentEl.value = n.body || "";
        noteStatusEl.innerText = "Editing note...";
      };

      const delBtn = document.createElement("button");
      delBtn.className = "note-del-btn";
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", `Delete note ${n.title || "Untitled"}`);
      delBtn.innerText = "✕";
      delBtn.onclick = e => {
        e.stopPropagation();
        savePhoneNotes(getPhoneNotes().filter(x => x.id !== n.id));
        if (editingNoteId === n.id) {
          editingNoteId = null;
          noteTitleEl.value = "";
          noteContentEl.value = "";
        }
        renderPhoneNotes();
      };

      card.appendChild(info);
      card.appendChild(delBtn);
      savedNotesWrap.appendChild(card);
    });
  }

  renderPhoneNotes();

  document.getElementById("new-note-btn").addEventListener("click", () => {
    editingNoteId = null;
    noteTitleEl.value = "";
    noteContentEl.value = "";
    noteStatusEl.innerText = "";
  });

  document.getElementById("save-note-btn").addEventListener("click", () => {
    const t = noteTitleEl.value.trim();
    const b = noteContentEl.value.trim();
    const secret = getSecretCode();
    const decoy = getDecoyCode();

    if (decoy && (t === decoy || b === decoy)) {
      noteTitleEl.value = "";
      noteContentEl.value = "";
      editingNoteId = null;
      noteStatusEl.innerText = "All notes synced safely ✓";
      setTimeout(() => {
        noteStatusEl.innerText = "";
      }, 2000);
      return;
    }

    if (t === secret || b === secret) {
      noteTitleEl.value = "";
      noteContentEl.value = "";
      noteStatusEl.innerText = "";
      editingNoteId = null;
      onUnlock();
      return;
    }
    if (!t && !b) return;
    const notes = getPhoneNotes();
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
    if (editingNoteId) {
      const idx = notes.findIndex(x => x.id === editingNoteId);
      if (idx >= 0) notes[idx] = { ...notes[idx], title: t || b.slice(0, 26), body: b, date: dateStr };
    } else {
      notes.unshift({ id: Date.now().toString(), title: t || b.slice(0, 26), body: b, date: dateStr });
    }
    savePhoneNotes(notes);
    editingNoteId = null;
    noteTitleEl.value = "";
    noteContentEl.value = "";
    renderPhoneNotes();
    noteStatusEl.innerText = "Note Saved Successfully!";
    setTimeout(() => {
      noteStatusEl.innerText = "";
    }, 2000);
  });

  return {
    notesScreen,
    loginScreen,
    chatScreen,
    secretCallDot,
    isChatVisible,
    isNotesVisible,
    setPickingMedia,
    getIsPickingMedia,
    getAutoHideMinutes,
    setAutoHideMinutes,
    resetAutoHideTimer,
    getSecretCode,
    setSecretCode,
    getDecoyCode,
    setDecoyCode,
    isShakeHideEnabled,
    setShakeHideEnabled
  };
}
