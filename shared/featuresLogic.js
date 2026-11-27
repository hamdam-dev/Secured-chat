// Pure logic helpers for Secret Vibes, Night Desire Meter, Time Capsule,
// Disguise Skins, Luxury Themes, Message Editing, Touch Sync, and Intruder Log.

export const SECRET_VIBES = [
  { key: "free", icon: "💬", label: "2 Taps · Free ho?", msg: "2 Halkay Taps: Kya abhi free ho? 💬", pattern: [90, 90, 90] },
  { key: "miss", icon: "🥺", label: "3 Tez · Miss You", msg: "3 Tez Taps: Bohot zyada yaad aa rahi hai 🥺", pattern: [70, 60, 70, 60, 70] },
  { key: "tonight", icon: "🔥", label: "Long-Short-Long · Aaj Raat?", msg: "🔥 Secret Signal: Aaj raat Honey/Chocolate mode ready?", pattern: [260, 90, 80, 90, 260] },
  { key: "love", icon: "💓", label: "Heartbeat · Love You", msg: "💓 Heartbeat Pulse: Sirf tum mere ho", pattern: [60, 80, 140, 220, 60, 80, 140] }
];

export const NIGHT_DESIRES = [
  { key: "cuddle", label: "🧸 Cuddle & Sukoon" },
  { key: "flirty", label: "😘 Flirty & Tease" },
  { key: "wild", label: "🔥 Wild Honey/Choc" },
  { key: "spoil", label: "👑 Spoil Me Tonight" },
  { key: "tired", label: "😴 Tired (Need Care)" }
];

export const DISGUISE_SKINS = [
  { key: "notepad", label: "📝 Classic Notepad", title: "My Notes", placeholder: "Yahan apne notes likhein..." },
  { key: "todo", label: "✅ Daily Tasks", title: "Daily To-Do", placeholder: "1. Morning walk\n2. Groceries\n3. Call home..." },
  { key: "shopping", label: "🛒 Shopping List", title: "Grocery List", placeholder: "- Milk\n- Eggs\n- Coffee\n- Fruits..." }
];

export const LUXURY_THEMES = [
  { key: "default", label: "🌸 Classic Pink" },
  { key: "midnight-velvet", label: "🖤 Midnight Velvet" },
  { key: "rose-gold", label: "✨ Rose Gold" },
  { key: "crimson-silk", label: "🌹 Crimson Silk" }
];

export const AMBIENCE_MODES = [
  { key: "off", label: "🔇 Off" },
  { key: "rain", label: "🌧️ Soft Rain" },
  { key: "fire", label: "🔥 Fireplace" },
  { key: "lofi", label: "🌙 Night Lo-Fi" }
];

export const POSE_CHALLENGES = [
  { key: "wink", label: "😉 Flirty Wink Pose" },
  { key: "kiss", label: "😘 Flying Kiss Pose" },
  { key: "heart", label: "🫶 Heart Hands Together" },
  { key: "boss", label: "😎 Cute Boss Look" },
  { key: "hug", label: "🧸 Cozy Hug Smile" }
];

export function computeCapsuleUnlockTime(preset, nowMs = Date.now()) {
  if (preset === "15m") return nowMs + 15 * 60 * 1000;
  if (preset === "1h") return nowMs + 60 * 60 * 1000;
  if (preset === "3h") return nowMs + 3 * 60 * 60 * 1000;
  if (preset === "midnight") {
    const d = new Date(nowMs);
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }
  return nowMs + 60 * 60 * 1000;
}

export function isCapsuleUnlocked(unlockAtMs, nowMs = Date.now()) {
  const target = Number(unlockAtMs || 0);
  if (!target) return true;
  return nowMs >= target;
}

export function formatCountdownMs(ms = 0) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function canEditMessage(msg, myUid, nowMs = Date.now(), maxWindowMs = 15 * 60 * 1000) {
  if (!msg || !myUid || msg.sender !== myUid || msg.isPending) return false;
  const dec = msg.decrypted;
  if (!dec || typeof dec.text !== "string") return false;
  if (dec.imageData || dec.audioData || dec.giftData || dec.gameData || dec.capsuleData || dec.songCard || dec.walletRedeem || dec.walletGift || dec.carePing || dec.letterData || dec.questionCard) {
    return false;
  }
  const createdMs = (msg.createdAtSec || 0) * 1000;
  if (!createdMs) return true;
  return nowMs - createdMs <= maxWindowMs;
}

export function computeTouchDistance(p1, p2) {
  if (!p1 || !p2) return Infinity;
  return Math.hypot((p1.x || 0) - (p2.x || 0), (p1.y || 0) - (p2.y || 0));
}

export function areTouchesMeeting(p1, p2, threshold = 0.14, nowMs = Date.now()) {
  if (!p1?.active || !p2?.active) return false;
  if (p1.ts && nowMs - p1.ts > 4500) return false;
  if (p2.ts && nowMs - p2.ts > 4500) return false;
  return computeTouchDistance(p1, p2) <= threshold;
}

export function recordIntruderAttempt(existing = [], entry = {}, maxItems = 25) {
  const item = {
    at: Number(entry.at || Date.now()),
    source: String(entry.source || "Notes").slice(0, 30),
    snippet: String(entry.snippet || "Wrong code").slice(0, 40)
  };
  return [item, ...(Array.isArray(existing) ? existing : [])].slice(0, maxItems);
}

export function normalizeBackupBundle(raw) {
  if (!raw || typeof raw !== "object" || Number(raw.version || 0) < 1) {
    return null;
  }
  return {
    version: 2,
    exportedAt: Number(raw.exportedAt || Date.now()),
    wallet: Array.isArray(raw.wallet) ? raw.wallet.slice(0, 80) : [],
    vault: Array.isArray(raw.vault) ? raw.vault.slice(0, 60) : [],
    starred: Array.isArray(raw.starred) ? raw.starred.slice(0, 150) : [],
    intimateCustom: raw.intimateCustom && typeof raw.intimateCustom === "object" ? raw.intimateCustom : {},
    universalCustom: raw.universalCustom && typeof raw.universalCustom === "object" ? raw.universalCustom : {},
    pinnedReacts: Array.isArray(raw.pinnedReacts) ? raw.pinnedReacts.slice(0, 12) : []
  };
}
