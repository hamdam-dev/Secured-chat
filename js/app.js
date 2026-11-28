import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore,
  collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp,
  doc, setDoc, getDocs, deleteDoc, updateDoc, where, Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { playEmotionSound } from "./crypto.js";
import { createNotesManager } from "./notes.js";
import { createNotificationManager } from "./notifications.js";
import { createChatManager } from "./chat.js";
import { createCallManager } from "./call.js";
import { createCareManager } from "./care.js";
import { createGamesManager } from "./games.js";
import { createDoodleManager } from "./doodle.js";
import { createVaultAndTogetherManager } from "./vaultAndTogether.js";
import { createFeaturesStudio } from "./featuresStudio.js";
import {
  NIGHT_DESIRES,
  LUXURY_THEMES,
  PERIOD_SYMPTOMS,
  PERIOD_CARE_PACKAGES,
  calculatePeriodPhase
} from "../shared/featuresLogic.js";

const THEME_KEY = "sc_dark_mode_v1";
const LUXURY_THEME_KEY = "sc_luxury_theme_v1";
const MY_MOOD_KEY = "sc_my_mood_v1";
const MY_ACT_KEY = "sc_my_act_v1";
const MY_DESIRE_KEY = "sc_my_desire_v1";
const PERIOD_CFG_KEY = "sc_period_care_v1";
const CHAT_TITLE_KEY = "sc_chat_title_v1";
const CUSTOM_DP_KEY = "sc_custom_dp_v1";
const WALL_DIM_KEY = "sc_wall_dim_v1";
const PULSE_SEEN_KEY = "sc_last_pulse_seen_v1";
const TOGETHER_PULSE_SEEN_KEY = "sc_last_together_pulse_v1";
const CLEAR_SEEN_KEY = "sc_last_clear_seen_v1";

let firebaseConfig = window.__FIREBASE_CONFIG__ || {};
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  try {
    const cfgRes = await fetch("./firebase-web-config.json", { cache: "no-store" });
    if (cfgRes.ok) {
      const parsedCfg = await cfgRes.json();
      if (parsedCfg?.apiKey && parsedCfg?.projectId) {
        firebaseConfig = parsedCfg;
      }
    }
  } catch {}
}
const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : { currentUser: null };
let db = null;
if (app) {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch {
    db = getFirestore(app);
  }
}

const fsOps = {
  collection, addDoc, query, orderBy, limit, onSnapshot,
  serverTimestamp, doc, setDoc, getDocs, deleteDoc, updateDoc, where, Timestamp
};

const MOODS = [
  { key: "romantic", e: "🥰", l: "Romantic", s: "love" },
  { key: "happy", e: "😊", l: "Happy", s: "happy" },
  { key: "miss", e: "🥺", l: "Miss U", s: "love" },
  { key: "sleepy", e: "😴", l: "Sleepy", s: "chime" },
  { key: "hungry", e: "😋", l: "Hungry", s: "happy" },
  { key: "angry", e: "😡", l: "Angry", s: "angry" },
  { key: "sad", e: "😢", l: "Sad", s: "sad" },
  { key: "busy", e: "💼", l: "Busy", s: "chime" },
  { key: "excited", e: "🤩", l: "Excited", s: "happy" },
  { key: "sick", e: "🤒", l: "Sick", s: "sad" },
  { key: "shy", e: "🙈", l: "Shy", s: "kiss" },
  { key: "kissy", e: "😘", l: "Kissy", s: "kiss" },
  { key: "moody", e: "🖤", l: "Moody", s: "sad" },
  { key: "night", e: "🌙", l: "Night Vibe", s: "chime" },
  { key: "cozy", e: "🧸", l: "Cozy", s: "love" },
  { key: "royal", e: "👑", l: "Royal", s: "gift" }
];

let myMoodText = "";
let myMoodKey = "";
let myActivityText = localStorage.getItem(MY_ACT_KEY) || "";
let myDesireText = localStorage.getItem(MY_DESIRE_KEY) || "";
let activeLuxuryTheme = localStorage.getItem(LUXURY_THEME_KEY) || "default";
let partnerMoodText = "";
let partnerActivityText = "";
let partnerDesireText = "";
let isPartnerOnline = false;
let heartbeatInt = null;
let unsubStatus = null;
let isFirstStatusLoad = true;
let partnerTypingTimeout = null;
let lastPulseSeen = Number(localStorage.getItem(PULSE_SEEN_KEY) || 0);
let lastTogetherPulseSeen = Number(localStorage.getItem(TOGETHER_PULSE_SEEN_KEY) || 0);
let lastClearSeen = Number(localStorage.getItem(CLEAR_SEEN_KEY) || 0);
const signalState = { lastOfferTs: 0, lastAnswerTs: 0, lastHangupTs: 0 };

let partnerPeriodCfg = null;

function proceedToChatOrLogin() {
  if (auth.currentUser) {
    openChatScreen();
  } else {
    notes.notesScreen.style.display = "none";
    notes.loginScreen.style.display = "flex";
  }
}

const notes = createNotesManager({
  onUnlock: () => {
    const quickPin = notes.getPanicPin();
    const pinModal = document.getElementById("panic-pin-modal");
    const pinInp = document.getElementById("panic-pin-unlock-input");
    const pinErr = document.getElementById("panic-pin-err");
    if (quickPin && pinModal) {
      if (pinErr) pinErr.innerText = "";
      if (pinInp) pinInp.value = "";
      pinModal.style.display = "flex";
      setTimeout(() => pinInp?.focus(), 60);
      return;
    }
    proceedToChatOrLogin();
  }
});

const notifications = createNotificationManager({
  getAuth: () => auth,
  getDb: () => db,
  doc,
  setDoc,
  isNotesVisible: notes.isNotesVisible,
  onIncomingCallPush: () => window.AndroidCallBridge?.vibratePattern?.("call")
});

const chat = createChatManager({
  getAuth: () => auth,
  getDb: () => db,
  fsOps,
  notes,
  notifications,
  onActivity: () => notes.resetAutoHideTimer(() => call.hasActiveCall())
});

function spawnFloatingHearts(emoji = "💖") {
  if (!notes.isChatVisible()) return;
  for (let i = 0; i < 10; i++) {
    setTimeout(() => {
      if (!notes.isChatVisible()) return;
      const h = document.createElement("div");
      h.className = "floating-heart";
      h.innerText = emoji;
      h.style.left = 10 + Math.random() * 80 + "vw";
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 2300);
    }, i * 110);
  }
}

const call = createCallManager({
  getAuth: () => auth,
  getDb: () => db,
  fsOps,
  notes,
  notifications,
  sendEncryptedMessage: chat.sendEncryptedMessage,
  spawnFloatingHearts,
  onRequestHideToNotes: () => hideChatToNotes()
});

const moodStatusLine = document.getElementById("mood-status-line");
function renderMoodStatusLine() {
  const parts = [];
  const myCombined = [myMoodText, myActivityText, myDesireText].filter(Boolean).join(" • ");
  const partnerCombined = [partnerMoodText, partnerActivityText, partnerDesireText].filter(Boolean).join(" • ");
  if (myCombined) parts.push("Main: " + myCombined);
  if (partnerCombined) parts.push("Love: " + partnerCombined);
  if (parts.length) {
    moodStatusLine.innerText = parts.join("  |  ");
    moodStatusLine.style.display = "block";
  } else {
    moodStatusLine.style.display = "none";
  }
}

function applyMoodTheme(themeKey) {
  [...document.body.classList].forEach(c => {
    if (c.startsWith("theme-")) document.body.classList.remove(c);
  });
  if (themeKey) document.body.classList.add("theme-" + themeKey);
  document.querySelectorAll("#mood-grid .mood-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.key === themeKey);
  });
}

function applyLuxuryTheme(themeKey = "default") {
  activeLuxuryTheme = themeKey || "default";
  [...document.body.classList].forEach(c => {
    if (c.startsWith("lux-")) document.body.classList.remove(c);
  });
  if (activeLuxuryTheme !== "default") {
    document.body.classList.add("lux-" + activeLuxuryTheme);
  }
  try {
    localStorage.setItem(LUXURY_THEME_KEY, activeLuxuryTheme);
  } catch {}
  document.querySelectorAll("#luxury-theme-row [data-lux-theme]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.luxTheme === activeLuxuryTheme);
  });
}

function selectMoodByKey(key) {
  const found = MOODS.find(m => m.key === key);
  if (!found) return;
  myMoodKey = found.key;
  myMoodText = `${found.e} ${found.l}`;
  document.getElementById("mood-btn").innerText = found.e;
  try {
    localStorage.setItem(MY_MOOD_KEY, JSON.stringify({ key: found.key, emoji: found.e, text: myMoodText }));
  } catch {}
  applyMoodTheme(found.key);
  renderMoodStatusLine();
  playEmotionSound(found.s);
  if (auth.currentUser && db) {
    setDoc(doc(db, "status", auth.currentUser.uid), { mood: myMoodText, moodKey: found.key }, { merge: true }).catch(() => {});
  }
}

createCareManager({
  chat,
  getAuth: () => auth,
  onOpenPeriod: () => openPeriodModal()
});
const games = createGamesManager({ getAuth: () => auth, chat });
chat.setGameRenderer(games.renderGameBubble);
chat.setGameUpdateHandler(games.handleLiveMessageUpdate);
chat.setWalletGiftHandler(games.claimWalletGift);
createDoodleManager({ chat });
const vaultTogether = createVaultAndTogetherManager({
  getAuth: () => auth,
  getDb: () => db,
  doc,
  setDoc,
  notes,
  notifications,
  spawnFloatingHearts
});
const featuresStudio = createFeaturesStudio({
  getAuth: () => auth,
  getDb: () => db,
  fsOps,
  chat,
  notes,
  notifications,
  spawnFloatingHearts
});

function openChatScreen() {
  notes.notesScreen.style.display = "none";
  notes.loginScreen.style.display = "none";
  notes.chatScreen.style.display = "flex";
  const curtain = document.getElementById("panic-blur-curtain");
  if (curtain) curtain.style.display = "none";
  window.AndroidCallBridge?.setSecureScreen?.(true);
  notifications.clearAlerts();
  chat.markMessagesAsRead();
  notifications.initPushNotifications();
  notifications.requestBrowserPermission();
  call.showIncomingOverlayIfPending();
  notes.resetAutoHideTimer(() => call.hasActiveCall());
}

function hideChatToNotes() {
  document.getElementById("call-dropdown").style.display = "none";
  document.getElementById("more-dropdown").style.display = "none";
  document.getElementById("emoji-picker").style.display = "none";
  document.getElementById("reaction-popup").style.display = "none";
  const curtain = document.getElementById("panic-blur-curtain");
  if (curtain) curtain.style.display = "none";
  ["delete-msg-modal", "clear-confirm-modal", "push-debug-modal", "mood-modal", "gift-modal", "care-modal", "img-viewer-modal", "reaction-all-modal", "games-modal", "saza-bank-modal", "doodle-modal", "starred-modal", "privacy-settings-modal", "period-modal", "panic-pin-modal", "wallet-modal", "vault-modal", "together-modal", "touch-sync-modal", "vibe-lang-modal", "capsule-modal", "song-modal", "mystery-modal", "polaroid-modal", "gallery-modal", "edit-msg-modal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  document.getElementById("viewer-img").src = "";
  chat.stopTransientMedia();
  games.stopTransientLoops?.();
  featuresStudio.stopTransient();
  vaultTogether.lockAll();
  notes.chatScreen.style.display = "none";
  notes.loginScreen.style.display = "none";
  notes.notesScreen.style.display = "flex";
  window.AndroidCallBridge?.setSecureScreen?.(false);
  call.hideToDisguiseIfCallOpen?.();
}
window.__hideChatToNotes = hideChatToNotes;

window.handleAndroidBack = function () {
  if (call.handleHardwareBack?.()) {
    return true;
  }
  const imgModal = document.getElementById("img-viewer-modal");
  if (imgModal.style.display === "flex") {
    imgModal.style.display = "none";
    document.getElementById("viewer-img").src = "";
    return true;
  }
  for (const id of ["panic-pin-modal", "period-modal", "edit-msg-modal", "gallery-modal", "polaroid-modal", "mystery-modal", "song-modal", "capsule-modal", "vibe-lang-modal", "touch-sync-modal", "wallet-modal", "saza-bank-modal", "vault-modal", "together-modal", "reaction-all-modal", "games-modal", "doodle-modal", "starred-modal", "privacy-settings-modal", "delete-msg-modal", "clear-confirm-modal", "push-debug-modal", "mood-modal", "gift-modal", "care-modal"]) {
    const el = document.getElementById(id);
    if (el && el.style.display === "flex") {
      el.style.display = "none";
      if (id === "games-modal") games.stopTransientLoops?.();
      if (id === "touch-sync-modal") featuresStudio.stopTransient();
      if (id === "vault-modal" || id === "together-modal") vaultTogether.lockAll();
      return true;
    }
  }
  if (document.getElementById("emoji-picker").style.display === "flex") {
    document.getElementById("emoji-picker").style.display = "none";
    return true;
  }
  if (document.getElementById("reaction-popup").style.display === "flex") {
    document.getElementById("reaction-popup").style.display = "none";
    return true;
  }
  if (chat.getSelectedCount() > 0) {
    chat.clearSelection();
    return true;
  }
  if (notes.isChatVisible() || notes.loginScreen.style.display === "flex") {
    hideChatToNotes();
    return true;
  }
  return false;
};

// Scattered multilingual love wallpaper
function buildLoveBackground() {
  const bg = document.getElementById("love-background");
  const texts = [
    ["Janan loves Mino 💕", 4, 4, "bg-big", -14], ["Mino loves Janan ❤️", 10, 48, "bg-big", 12],
    ["Zargoo 🥰", 16, 12, "bg-med", -10], ["Jwandun 🧸", 18, 66, "bg-small", 16],
    ["Mama 🌸", 24, 34, "bg-med", -8], ["Kachocho 🐻", 29, 6, "bg-small", 14],
    ["Katoto ✨", 32, 58, "bg-small", -16], ["Zra Sar 😘", 37, 22, "bg-med", 10],
    ["Love 💖", 42, 72, "bg-big", -12], ["Bacha 💕", 46, 8, "bg-small", 15],
    ["Kachocha ❤️", 50, 40, "bg-med", -6], ["Sqaman 💕", 55, 68, "bg-small", 14],
    ["Jan 💖", 59, 14, "bg-big", -15], ["Mino ❤️", 63, 52, "bg-big", 10],
    ["جاناں ❤️", 68, 28, "bg-big", -8], ["مینو 💕", 73, 66, "bg-big", 12],
    ["زما ژوند 🌸", 77, 6, "bg-med", -10], ["زما زړه 💖", 81, 46, "bg-med", 14],
    ["چن ماہی 🌙", 85, 16, "bg-small", -12], ["سوھنا یار 🥰", 88, 62, "bg-small", 16],
    ["میری جان 💘", 92, 34, "bg-big", -6], ["زما جانانه 🌹", 7, 28, "bg-small", 8],
    ["تاسو زما هر څه یئ 🌷", 53, 2, "bg-small", -10], ["ہمیشہ ساتھ ♾️", 22, 80, "bg-small", 12],
    ["میرا ڈھولن 💞", 65, 78, "bg-small", -14], ["Janan & Mino 💖", 94, 4, "bg-med", 10],
    ["رب راکھا 🤲", 40, 44, "bg-small", -18], ["Sweet Mino 🍯", 84, 76, "bg-small", 11]
  ];
  const emojis = [
    ["❤️", 6, 84, 24, 12], ["💖", 13, 26, 18, -18], ["😘", 19, 44, 28, 15],
    ["🥰", 25, 86, 22, -12], ["💕", 28, 52, 16, 20], ["🧸", 34, 4, 26, -15],
    ["🌸", 39, 86, 20, 10], ["💋", 44, 52, 24, -20], ["✨", 49, 22, 16, 14],
    ["🦋", 54, 88, 25, -10], ["🌹", 61, 36, 20, 18], ["💘", 66, 84, 30, -14],
    ["💓", 71, 6, 22, 12], ["💞", 76, 56, 18, -16], ["🐥", 79, 86, 24, 15],
    ["🍓", 86, 44, 17, -12], ["🌙", 90, 84, 26, 10], ["💍", 95, 58, 22, -18],
    ["🎀", 15, 90, 18, 16], ["🍫", 48, 90, 20, -12], ["🫶", 31, 38, 17, 14]
  ];
  bg.innerHTML = "";
  texts.forEach(([txt, top, left, cls, rot]) => {
    const sp = document.createElement("span");
    sp.className = `bg-text ${cls}`;
    sp.innerText = txt;
    sp.style.top = top + "%";
    sp.style.left = left + "%";
    sp.style.transform = `rotate(${rot}deg)`;
    bg.appendChild(sp);
  });
  emojis.forEach(([em, top, left, size, rot]) => {
    const sp = document.createElement("span");
    sp.className = "bg-emoji";
    sp.innerText = em;
    sp.style.top = top + "%";
    sp.style.left = left + "%";
    sp.style.fontSize = size + "px";
    sp.style.transform = `rotate(${rot}deg)`;
    bg.appendChild(sp);
  });
}
buildLoveBackground();

// Login
const loginBtn = document.getElementById("login-btn");
const loginErr = document.getElementById("login-error");
const passwordEl = document.getElementById("password");
const backToNotesFromLogin = document.getElementById("back-to-notes-btn");

async function doLogin() {
  if (!hasFirebaseConfig) {
    loginErr.innerText = "Firebase config missing — set FIREBASE_* environment variables";
    return;
  }
  const email = document.getElementById("email").value.trim();
  const pass = passwordEl.value;
  if (!email || !pass) {
    loginErr.innerText = "Email aur password daalein";
    return;
  }
  loginBtn.disabled = true;
  loginBtn.innerText = "Login ho raha hai... ⏳";
  loginErr.innerText = "";
  notifications.requestBrowserPermission().catch(() => {});
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    openChatScreen();
  } catch (e) {
    notes.logIntruderAttempt("Chat Login", email || "Failed password");
    loginErr.innerText = "Error: " + e.message;
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = "Login Karein";
  }
}
loginBtn.addEventListener("click", doLogin);
passwordEl.addEventListener("keydown", e => {
  if (e.key === "Enter") doLogin();
});
if (backToNotesFromLogin) {
  backToNotesFromLogin.addEventListener("click", hideChatToNotes);
}

// Header, Dropdowns & Auto-Hide Privacy Setting
const callDropdown = document.getElementById("call-dropdown");
const moreDropdown = document.getElementById("more-dropdown");
const emojiPicker = document.getElementById("emoji-picker");
const reactionPopup = document.getElementById("reaction-popup");

document.getElementById("call-menu-btn").addEventListener("click", e => {
  e.stopPropagation();
  moreDropdown.style.display = "none";
  callDropdown.style.display = callDropdown.style.display === "flex" ? "none" : "flex";
});
document.getElementById("more-menu-btn").addEventListener("click", e => {
  e.stopPropagation();
  callDropdown.style.display = "none";
  moreDropdown.style.display = moreDropdown.style.display === "flex" ? "none" : "flex";
});
document.addEventListener("click", () => {
  callDropdown.style.display = "none";
  moreDropdown.style.display = "none";
  emojiPicker.style.display = "none";
  if (Date.now() - chat.getPopupOpenedAt() > 450) reactionPopup.style.display = "none";
  notes.resetAutoHideTimer(() => call.hasActiveCall());
});

if (localStorage.getItem(THEME_KEY) === "1") document.body.classList.add("dark-mode");
document.getElementById("theme-btn").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark-mode") ? "1" : "0");
});
document.getElementById("hide-btn").addEventListener("click", hideChatToNotes);

document.getElementById("dp-tap-btn").addEventListener("click", () => {
  document.getElementById("viewer-img").src = document.getElementById("header-dp").src;
  document.getElementById("img-viewer-modal").style.display = "flex";
});
document.getElementById("img-viewer-modal").addEventListener("click", () => {
  document.getElementById("img-viewer-modal").style.display = "none";
  document.getElementById("viewer-img").src = "";
});

// Auto-Hide Cycle Button in More Menu
const autoHideBtn = document.getElementById("auto-hide-cycle-btn");
function renderAutoHideLabel() {
  const mins = notes.getAutoHideMinutes();
  autoHideBtn.innerText = mins ? `⏱️ Auto-Hide: ${mins}m` : "⏱️ Auto-Hide: Off";
}
renderAutoHideLabel();
autoHideBtn.addEventListener("click", e => {
  e.stopPropagation();
  const order = [0, 2, 5];
  const next = order[(order.indexOf(notes.getAutoHideMinutes()) + 1) % order.length];
  notes.setAutoHideMinutes(next);
  renderAutoHideLabel();
});

document.getElementById("test-push-btn").addEventListener("click", async () => {
  moreDropdown.style.display = "none";
  const modal = document.getElementById("push-debug-modal");
  const txtEl = document.getElementById("push-debug-text");
  const apkWrap = document.getElementById("apk-server-url-wrap");
  const apkInput = document.getElementById("apk-server-url-input");
  if (apkWrap && apkInput) {
    apkWrap.style.display = notifications.isNativeApp() ? "flex" : "none";
    apkInput.value = notifications.getServerBaseUrl();
  }
  txtEl.innerText = "Checking live notification setup...";
  modal.style.display = "flex";
  await notifications.requestBrowserPermission();
  txtEl.innerText = await notifications.getDiagnostics();
});
document.getElementById("test-live-alert-btn")?.addEventListener("click", async () => {
  const txtEl = document.getElementById("push-debug-text");
  const { perm, shown } = await notifications.testLiveNotification();
  const diag = await notifications.getDiagnostics();
  txtEl.innerText = `${shown ? "✅ Test notification bhej di gayi!" : `⚠️ Alert permission: ${perm} (browser settings mein Allow karein)`}\n\n${diag}`;
});
document.getElementById("save-apk-server-btn")?.addEventListener("click", async () => {
  const apkInput = document.getElementById("apk-server-url-input");
  const txtEl = document.getElementById("push-debug-text");
  const saved = notifications.setServerBaseUrl(apkInput?.value || "");
  txtEl.innerText = `${saved ? "✅ Server URL save ho gaya!" : "ℹ️ Server URL clear ho gaya."}\n\n${await notifications.getDiagnostics()}`;
});
document.getElementById("close-push-debug-btn").addEventListener("click", () => {
  document.getElementById("push-debug-modal").style.display = "none";
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  moreDropdown.style.display = "none";
  if (auth.currentUser && db) {
    try {
      await setDoc(
        doc(db, "status", auth.currentUser.uid),
        { online: false, typing: false, lastSeen: serverTimestamp() },
        { merge: true }
      );
    } catch {}
  }
  if (app) await signOut(auth);
  hideChatToNotes();
});

// Mood Grid, Quick Activity Status & Custom Look/Privacy
function applyCustomAppearance() {
  const customTitle = (localStorage.getItem(CHAT_TITLE_KEY) || "").trim();
  const titleEl = document.getElementById("chat-header-title");
  if (titleEl && customTitle) titleEl.innerText = customTitle;

  const customDp = localStorage.getItem(CUSTOM_DP_KEY);
  if (customDp) {
    const hdrDp = document.getElementById("header-dp");
    const loginDp = document.querySelector(".login-dp");
    if (hdrDp) hdrDp.src = customDp;
    if (loginDp) loginDp.src = customDp;
  }

  const dimWall = localStorage.getItem(WALL_DIM_KEY) === "1";
  const loveBg = document.getElementById("love-background");
  if (loveBg) loveBg.style.opacity = dimWall ? "0.32" : "1";
}
applyCustomAppearance();

document.querySelectorAll("#activity-status-row [data-act]").forEach(btn => {
  if (btn.dataset.act === myActivityText && myActivityText) btn.classList.add("active");
  btn.addEventListener("click", () => {
    myActivityText = btn.dataset.act || "";
    try { localStorage.setItem(MY_ACT_KEY, myActivityText); } catch {}
    document.querySelectorAll("#activity-status-row [data-act]").forEach(b => {
      b.classList.toggle("active", b.dataset.act === myActivityText && Boolean(myActivityText));
    });
    renderMoodStatusLine();
    if (auth.currentUser && db) {
      setDoc(doc(db, "status", auth.currentUser.uid), { activity: myActivityText }, { merge: true }).catch(() => {});
    }
  });
});

// =====================================
// PERIOD CARE PLANNER & QUICK PANIC SHIELD
// =====================================
function readPeriodConfig() {
  try {
    const raw = localStorage.getItem(PERIOD_CFG_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      lastStartIso: String(parsed?.lastStartIso || ""),
      cycleDays: Number(parsed?.cycleDays || 28),
      periodDays: Number(parsed?.periodDays || 5),
      symptoms: Array.isArray(parsed?.symptoms) ? parsed.symptoms : [],
      comfortNote: String(parsed?.comfortNote || "")
    };
  } catch {
    return { lastStartIso: "", cycleDays: 28, periodDays: 5, symptoms: [], comfortNote: "" };
  }
}

function writePeriodConfig(cfg) {
  try {
    localStorage.setItem(PERIOD_CFG_KEY, JSON.stringify(cfg));
  } catch {}
}

let periodSelectedSymptoms = new Set(readPeriodConfig().symptoms);

function renderPeriodPhaseCards() {
  const cfg = readPeriodConfig();
  const phase = calculatePeriodPhase(cfg);
  const selfEl = document.getElementById("period-phase-card");
  if (selfEl) {
    selfEl.innerHTML = "";
    const top = document.createElement("div");
    top.className = "period-phase-top";
    const t = document.createElement("span");
    t.className = "period-phase-title";
    t.innerText = phase.title;
    const b = document.createElement("span");
    b.className = "period-phase-badge";
    b.innerText = phase.badge;
    top.append(t, b);
    selfEl.appendChild(top);
    if (phase.configured) {
      const meta = document.createElement("div");
      meta.className = "period-phase-meta";
      meta.innerText = `Day ${phase.dayOfCycle}/${phase.cycleDays} · Next period ~${phase.daysUntilNext} days`;
      selfEl.appendChild(meta);
    }
    const tip = document.createElement("div");
    tip.className = "period-phase-tip";
    tip.innerText = phase.tip;
    selfEl.appendChild(tip);
  }

  const pEl = document.getElementById("period-partner-banner");
  const careBtn = document.getElementById("care-studio-btn");
  if (partnerPeriodCfg && partnerPeriodCfg.lastStartIso) {
    const pPhase = calculatePeriodPhase(partnerPeriodCfg);
    if (careBtn) {
      careBtn.title = pPhase.configured ? `Love Care: ${pPhase.title}` : "Care & Khat";
    }
    if (pEl) {
      pEl.style.display = "flex";
      pEl.innerHTML = "";
      const top = document.createElement("div");
      top.className = "period-phase-top";
      const t = document.createElement("span");
      t.className = "period-phase-title";
      t.innerText = `💖 Love Update: ${pPhase.title}`;
      const b = document.createElement("span");
      b.className = "period-phase-badge";
      b.innerText = pPhase.badge;
      top.append(t, b);
      pEl.appendChild(top);

      if (pPhase.configured) {
        const meta = document.createElement("div");
        meta.className = "period-phase-meta";
        meta.innerText = `Cycle Day ${pPhase.dayOfCycle} · Next ~${pPhase.daysUntilNext} days`;
        pEl.appendChild(meta);
      }
      const symText = Array.isArray(partnerPeriodCfg.symptoms) && partnerPeriodCfg.symptoms.length
        ? `Symptoms: ${partnerPeriodCfg.symptoms.join(", ")}`
        : "";
      const noteText = partnerPeriodCfg.comfortNote ? `💌 "${partnerPeriodCfg.comfortNote}"` : "";
      if (symText || noteText) {
        const d = document.createElement("div");
        d.className = "period-phase-tip";
        d.innerText = [symText, noteText].filter(Boolean).join(" · ");
        pEl.appendChild(d);
      }
    }
  } else if (pEl) {
    pEl.style.display = "none";
  }
}

function renderPeriodModalControls() {
  const cfg = readPeriodConfig();
  periodSelectedSymptoms = new Set(cfg.symptoms || []);
  const startInp = document.getElementById("period-start-input");
  const cycleInp = document.getElementById("period-cycle-input");
  const lenInp = document.getElementById("period-len-input");
  const noteInp = document.getElementById("period-note-input");
  if (startInp) startInp.value = cfg.lastStartIso || "";
  if (cycleInp) cycleInp.value = String(cfg.cycleDays || 28);
  if (lenInp) lenInp.value = String(cfg.periodDays || 5);
  if (noteInp) noteInp.value = cfg.comfortNote || "";

  const symGrid = document.getElementById("period-symptoms-grid");
  if (symGrid) {
    symGrid.innerHTML = "";
    PERIOD_SYMPTOMS.forEach(s => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-mini-btn" + (periodSelectedSymptoms.has(s.label) ? " active" : "");
      b.innerText = s.label;
      b.onclick = () => {
        if (periodSelectedSymptoms.has(s.label)) periodSelectedSymptoms.delete(s.label);
        else periodSelectedSymptoms.add(s.label);
        b.classList.toggle("active", periodSelectedSymptoms.has(s.label));
      };
      symGrid.appendChild(b);
    });
  }

  const pkgGrid = document.getElementById("period-packages-grid");
  if (pkgGrid) {
    pkgGrid.innerHTML = "";
    PERIOD_CARE_PACKAGES.forEach(pkg => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mood-item";
      b.innerText = `${pkg.emoji} ${pkg.title}`;
      b.onclick = async () => {
        document.getElementById("period-modal").style.display = "none";
        playEmotionSound("love");
        await chat.sendEncryptedMessage(
          { periodCard: { emoji: pkg.emoji, title: pkg.title, note: pkg.note } },
          "letter"
        );
      };
      pkgGrid.appendChild(b);
    });
  }
  renderPeriodPhaseCards();
}

function openPeriodModal() {
  renderPeriodModalControls();
  const pm = document.getElementById("period-modal");
  if (pm) pm.style.display = "flex";
}

document.getElementById("open-period-btn")?.addEventListener("click", () => {
  moreDropdown.style.display = "none";
  openPeriodModal();
});
document.getElementById("close-period-btn")?.addEventListener("click", () => {
  document.getElementById("period-modal").style.display = "none";
});
document.getElementById("period-save-btn")?.addEventListener("click", async () => {
  const lastStartIso = (document.getElementById("period-start-input")?.value || "").trim();
  const cycleDays = Math.max(20, Math.min(45, Number(document.getElementById("period-cycle-input")?.value || 28)));
  const periodDays = Math.max(2, Math.min(10, Number(document.getElementById("period-len-input")?.value || 5)));
  const comfortNote = (document.getElementById("period-note-input")?.value || "").trim();
  const nextCfg = {
    lastStartIso,
    cycleDays,
    periodDays,
    symptoms: [...periodSelectedSymptoms],
    comfortNote,
    updatedAt: Date.now()
  };
  writePeriodConfig(nextCfg);
  renderPeriodPhaseCards();
  playEmotionSound("gift");
  if (auth.currentUser && db) {
    await setDoc(doc(db, "status", auth.currentUser.uid), { periodCare: nextCfg }, { merge: true }).catch(() => {});
  }
});

// Quick Lock PIN Unlock Prompt wiring
const panicPinUnlockInput = document.getElementById("panic-pin-unlock-input");
const verifyQuickPanicPin = () => {
  const expected = notes.getPanicPin();
  const entered = (panicPinUnlockInput?.value || "").trim();
  const errEl = document.getElementById("panic-pin-err");
  if (!expected || entered === expected) {
    document.getElementById("panic-pin-modal").style.display = "none";
    if (panicPinUnlockInput) panicPinUnlockInput.value = "";
    proceedToChatOrLogin();
  } else {
    notes.logIntruderAttempt("Panic PIN", entered.slice(0, 8) || "Empty PIN");
    if (errEl) errEl.innerText = "Galat PIN — dubara koshish karein!";
  }
};
document.getElementById("panic-pin-unlock-btn")?.addEventListener("click", verifyQuickPanicPin);
panicPinUnlockInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") verifyQuickPanicPin();
});
document.getElementById("panic-pin-cancel-btn")?.addEventListener("click", () => {
  document.getElementById("panic-pin-modal").style.display = "none";
});

// Panic Shield Curtain, Double-Tap Header & Escape Key Instant Escape
const panicCurtain = document.getElementById("panic-blur-curtain");
document.getElementById("panic-resume-btn")?.addEventListener("click", () => {
  if (panicCurtain) panicCurtain.style.display = "none";
});
document.getElementById("panic-escape-btn")?.addEventListener("click", () => {
  if (panicCurtain) panicCurtain.style.display = "none";
  hideChatToNotes();
});
window.addEventListener("blur", () => {
  if (notes.isChatVisible() && notes.isPanicBlurEnabled() && !call.hasActiveCall() && !notes.getIsPickingMedia()) {
    if (panicCurtain) panicCurtain.style.display = "flex";
  }
});
window.addEventListener("focus", () => {
  if (panicCurtain && document.visibilityState === "visible") {
    panicCurtain.style.display = "none";
  }
});
document.getElementById("normal-hdr-left")?.addEventListener("dblclick", e => {
  if (e.target?.closest?.("#dp-tap-btn")) return;
  if (notes.isChatVisible()) hideChatToNotes();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && notes.isChatVisible()) {
    e.preventDefault();
    hideChatToNotes();
  }
});

const privacyModal = document.getElementById("privacy-settings-modal");
document.getElementById("open-privacy-btn")?.addEventListener("click", () => {
  moreDropdown.style.display = "none";
  document.getElementById("custom-name-input").value = localStorage.getItem(CHAT_TITLE_KEY) || "Janan & Mino";
  document.getElementById("custom-secret-input").value = notes.getSecretCode();
  document.getElementById("custom-decoy-input").value = notes.getDecoyCode();
  const skinSel = document.getElementById("disguise-skin-select");
  if (skinSel) skinSel.value = notes.getDisguiseSkin();
  const panicBlurTog = document.getElementById("panic-blur-toggle");
  if (panicBlurTog) panicBlurTog.checked = notes.isPanicBlurEnabled();
  const instTog = document.getElementById("instant-hide-toggle");
  if (instTog) instTog.checked = notes.isInstantHideEnabled();
  document.getElementById("shake-hide-toggle").checked = notes.isShakeHideEnabled();
  const pinInp = document.getElementById("panic-pin-input");
  if (pinInp) pinInp.value = notes.getPanicPin();
  featuresStudio.renderIntruderLog();
  privacyModal.style.display = "flex";
});
document.getElementById("close-privacy-btn")?.addEventListener("click", () => {
  privacyModal.style.display = "none";
});
document.getElementById("wall-bright-btn")?.addEventListener("click", () => {
  const next = localStorage.getItem(WALL_DIM_KEY) === "1" ? "0" : "1";
  try { localStorage.setItem(WALL_DIM_KEY, next); } catch {}
  applyCustomAppearance();
});
document.getElementById("custom-dp-btn")?.addEventListener("click", () => {
  notes.setPickingMedia(true);
  document.getElementById("custom-dp-input")?.click();
});
document.getElementById("custom-dp-input")?.addEventListener("change", e => {
  notes.setPickingMedia(false);
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 240;
    const minSide = Math.min(img.width, img.height);
    const sx = (img.width - minSide) / 2;
    const sy = (img.height - minSide) / 2;
    c.getContext("2d").drawImage(img, sx, sy, minSide, minSide, 0, 0, 240, 240);
    try { localStorage.setItem(CUSTOM_DP_KEY, c.toDataURL("image/jpeg", 0.8)); } catch {}
    URL.revokeObjectURL(url);
    applyCustomAppearance();
  };
  img.src = url;
});
document.getElementById("save-privacy-btn")?.addEventListener("click", () => {
  const titleVal = document.getElementById("custom-name-input").value.trim() || "Janan & Mino";
  const secretVal = document.getElementById("custom-secret-input").value.trim();
  const decoyVal = document.getElementById("custom-decoy-input").value.trim();
  const skinVal = document.getElementById("disguise-skin-select")?.value || "notepad";
  const panicBlurVal = document.getElementById("panic-blur-toggle")?.checked ?? true;
  const instVal = document.getElementById("instant-hide-toggle")?.checked ?? true;
  const shakeVal = document.getElementById("shake-hide-toggle").checked;
  const pinVal = document.getElementById("panic-pin-input")?.value.trim() || "";
  try { localStorage.setItem(CHAT_TITLE_KEY, titleVal); } catch {}
  if (secretVal) notes.setSecretCode(secretVal);
  notes.setDecoyCode(decoyVal);
  notes.setDisguiseSkin(skinVal);
  notes.setPanicBlurEnabled(panicBlurVal);
  notes.setInstantHideEnabled(instVal);
  notes.setShakeHideEnabled(shakeVal);
  notes.setPanicPin(pinVal);
  applyCustomAppearance();
  privacyModal.style.display = "none";
});

try {
  const savedMood = JSON.parse(localStorage.getItem(MY_MOOD_KEY) || "null");
  if (savedMood && savedMood.key) {
    myMoodKey = savedMood.key;
    myMoodText = savedMood.text;
    document.getElementById("mood-btn").innerText = savedMood.emoji || "😌";
    applyMoodTheme(myMoodKey);
  }
} catch {}

const desireRow = document.getElementById("desire-meter-row");
if (desireRow) {
  desireRow.innerHTML = "";
  NIGHT_DESIRES.forEach(d => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mood-item" + (myDesireText === d.label ? " active" : "");
    b.innerText = d.label;
    b.onclick = () => {
      myDesireText = myDesireText === d.label ? "" : d.label;
      try { localStorage.setItem(MY_DESIRE_KEY, myDesireText); } catch {}
      desireRow.querySelectorAll("button").forEach(btn => {
        btn.classList.toggle("active", btn.innerText === myDesireText);
      });
      renderMoodStatusLine();
      playEmotionSound("love");
      if (auth.currentUser && db) {
        setDoc(doc(db, "status", auth.currentUser.uid), { desire: myDesireText }, { merge: true }).catch(() => {});
      }
    };
    desireRow.appendChild(b);
  });
}

const luxThemeRow = document.getElementById("luxury-theme-row");
if (luxThemeRow) {
  luxThemeRow.innerHTML = "";
  LUXURY_THEMES.forEach(th => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mood-item" + (activeLuxuryTheme === th.key ? " active" : "");
    b.dataset.luxTheme = th.key;
    b.innerText = th.label;
    b.onclick = () => {
      applyLuxuryTheme(th.key);
      playEmotionSound("chime");
    };
    luxThemeRow.appendChild(b);
  });
}
applyLuxuryTheme(activeLuxuryTheme);
renderMoodStatusLine();

const moodGrid = document.getElementById("mood-grid");
MOODS.forEach(m => {
  const b = document.createElement("button");
  b.className = "mood-item";
  b.type = "button";
  b.dataset.key = m.key;
  b.innerText = `${m.e} ${m.l}`;
  if (m.key === myMoodKey) b.classList.add("active");
  b.onclick = () => {
    document.getElementById("mood-modal").style.display = "none";
    selectMoodByKey(m.key);
  };
  moodGrid.appendChild(b);
});

document.getElementById("reset-mood-theme-btn").addEventListener("click", () => {
  document.getElementById("mood-modal").style.display = "none";
  myMoodKey = "";
  myMoodText = "";
  document.getElementById("mood-btn").innerText = "😌";
  try { localStorage.removeItem(MY_MOOD_KEY); } catch {}
  applyMoodTheme("");
  applyLuxuryTheme("default");
  renderMoodStatusLine();
  if (auth.currentUser && db) {
    setDoc(doc(db, "status", auth.currentUser.uid), { mood: "", moodKey: "" }, { merge: true }).catch(() => {});
  }
});
document.getElementById("mood-btn").addEventListener("click", () => {
  document.getElementById("mood-modal").style.display = "flex";
});
document.getElementById("close-mood-btn").addEventListener("click", () => {
  document.getElementById("mood-modal").style.display = "none";
});

// Love Pulse
document.getElementById("love-pulse-btn").addEventListener("click", () => {
  spawnFloatingHearts("💓");
  playEmotionSound("love");
  window.AndroidCallBridge?.vibratePattern?.("pulse");
  if (auth.currentUser && db) {
    setDoc(doc(db, "status", auth.currentUser.uid), { lovePulseAt: Date.now() }, { merge: true }).catch(() => {});
    notifications.sendPushAlert("message");
  }
});

// Auth & Partner Status Listener
const partnerStatusEl = document.getElementById("partner-status");
const dpOnlineDot = document.getElementById("dp-online-dot");
const typingIndicator = document.getElementById("typing-indicator");
let lastPartnerActiveLabel = "Offline";

if (app) {
  onAuthStateChanged(auth, user => {
    if (user) {
      chat.setMyUid(user.uid);
      if (notes.loginScreen.style.display === "flex") openChatScreen();

      chat.loadMsgCache();
      notifications.initPushNotifications();
      const initUpdate = {
        online: true,
        typing: false,
        lastActiveAt: Date.now(),
        lastSeen: serverTimestamp()
      };
      if (myMoodText) {
        initUpdate.mood = myMoodText;
        initUpdate.moodKey = myMoodKey;
      }
      if (myActivityText) {
        initUpdate.activity = myActivityText;
      }
      if (myDesireText) {
        initUpdate.desire = myDesireText;
      }
      setDoc(doc(db, "status", user.uid), initUpdate, { merge: true }).catch(() => {});

      clearInterval(heartbeatInt);
      heartbeatInt = setInterval(() => {
        if (auth.currentUser && (document.visibilityState === "visible" || call.hasActiveCall())) {
          setDoc(
            doc(db, "status", auth.currentUser.uid),
            { online: true, lastActiveAt: Date.now() },
            { merge: true }
          ).catch(() => {});
        }
      }, 25000);

      if (unsubStatus) unsubStatus();
      isFirstStatusLoad = true;
      unsubStatus = onSnapshot(collection(db, "status"), async snap => {
        let latestPin = null;
        for (const d of snap.docs) {
          const data = d.data();
          if (data.pinnedMsg && (!latestPin || (data.pinnedMsg.at || 0) > (latestPin.at || 0))) {
            latestPin = data.pinnedMsg;
          }
          const gameSyncArr = [
            ...(Array.isArray(data.gameSyncLog) ? data.gameSyncLog : []),
            ...(data.gameSync ? [data.gameSync] : [])
          ];
          if (gameSyncArr.length) {
            chat.applyRemoteGameSyncs(gameSyncArr, d.id, isFirstStatusLoad || d.id === user.uid);
          }
          if (d.id === user.uid) continue;

          if (data.fcmToken || data.webPushSub) {
            notifications.setPartnerTargets({
              fcmToken: data.fcmToken,
              webPushSub: data.webPushSub
            });
          }
          if (data.lastReadAt) chat.setPartnerLastReadMs(data.lastReadAt.toMillis());
          partnerMoodText = data.mood || "";
          partnerActivityText = data.activity || "";
          partnerDesireText = data.desire || "";
          if (data.periodCare && typeof data.periodCare === "object") {
            partnerPeriodCfg = data.periodCare;
            renderPeriodPhaseCards();
          }
          renderMoodStatusLine();

          if (data.clearedAtMs && data.clearedAtMs > lastClearSeen) {
            lastClearSeen = data.clearedAtMs;
            try { localStorage.setItem(CLEAR_SEEN_KEY, String(lastClearSeen)); } catch {}
            if (!isFirstStatusLoad) chat.clearFromRemote();
          }

          if (data.lovePulseAt && data.lovePulseAt > lastPulseSeen) {
            lastPulseSeen = data.lovePulseAt;
            try { localStorage.setItem(PULSE_SEEN_KEY, String(lastPulseSeen)); } catch {}
            if (!isFirstStatusLoad) {
              if (notes.isChatVisible() && document.visibilityState === "visible") {
                spawnFloatingHearts("💖");
                playEmotionSound("love");
              } else {
                notifications.showBrowserAlert("ping");
              }
            }
          }

          if (data.togetherPulseAt && data.togetherPulseAt > lastTogetherPulseSeen) {
            lastTogetherPulseSeen = data.togetherPulseAt;
            try { localStorage.setItem(TOGETHER_PULSE_SEEN_KEY, String(lastTogetherPulseSeen)); } catch {}
            if (!isFirstStatusLoad) {
              if (notes.isChatVisible() && document.visibilityState === "visible") {
                vaultTogether.handleRemoteTogetherPulse();
              } else {
                notifications.showBrowserAlert("ping");
              }
            }
          }

          if (data.togetherSession) {
            vaultTogether.handleRemoteTogetherSession(data.togetherSession);
          }
          if (data.touchPoint) {
            featuresStudio.handleRemoteTouchPoint(data.touchPoint);
          }
          if (data.secretVibe) {
            featuresStudio.handleRemoteSecretVibe(data.secretVibe, isFirstStatusLoad);
          }

          const syncArr = [
            ...(Array.isArray(data.reactionSyncLog) ? data.reactionSyncLog : []),
            ...(data.reactionSync ? [data.reactionSync] : [])
          ];
          if (syncArr.length) {
            chat.applyRemoteReactionSyncs(syncArr, d.id, isFirstStatusLoad);
          }

          const isReallyOnline = Boolean(data.online) && (!data.lastActiveAt || Date.now() - data.lastActiveAt < 75000);
          isPartnerOnline = isReallyOnline;

          if (isReallyOnline) {
            lastPartnerActiveLabel = "Online";
          } else {
            lastPartnerActiveLabel = data.lastSeen
              ? "Last seen: " + data.lastSeen.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Offline";
          }

          if (data.typing && isReallyOnline) {
            typingIndicator.style.display = "flex";
            partnerStatusEl.innerText = "Typing...";
            partnerStatusEl.style.color = "#22c55e";
            dpOnlineDot.classList.add("online");
            clearTimeout(partnerTypingTimeout);
            partnerTypingTimeout = setTimeout(() => {
              typingIndicator.style.display = "none";
              partnerStatusEl.innerText = lastPartnerActiveLabel;
              partnerStatusEl.style.color = lastPartnerActiveLabel === "Online" ? "#22c55e" : "#888";
            }, 3000);
          } else {
            typingIndicator.style.display = "none";
            partnerStatusEl.innerText = lastPartnerActiveLabel;
            partnerStatusEl.style.color = isReallyOnline ? "#22c55e" : "#888";
            dpOnlineDot.classList.toggle("online", isReallyOnline);
          }

          await call.handleSignalingData(data, signalState);
        }
        chat.setPinnedBarState(latestPin);
        isFirstStatusLoad = false;
      });
      chat.startMessagesListener();
    } else {
      clearInterval(heartbeatInt);
      if (unsubStatus) {
        unsubStatus();
        unsubStatus = null;
      }
      chat.resetOnSignOut();
      typingIndicator.style.display = "none";
      partnerMoodText = "";
      partnerActivityText = "";
      partnerDesireText = "";
      isPartnerOnline = false;
      renderMoodStatusLine();
    }
  });
}

document.addEventListener("visibilitychange", () => {
  if (!auth.currentUser || !db) return;
  if (document.visibilityState === "hidden") {
    if (!call.hasActiveCall() && !notes.getIsPickingMedia()) {
      setDoc(
        doc(db, "status", auth.currentUser.uid),
        { online: false, typing: false, lastSeen: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
      if (notes.isChatVisible() && notes.isInstantHideEnabled()) hideChatToNotes();
    }
  } else {
    notifications.clearAlerts();
    notifications.initPushNotifications();
    chat.markMessagesAsRead();
  }
});
