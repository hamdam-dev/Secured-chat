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

export const PERIOD_SYMPTOMS = [
  { key: "cramps", label: "😣 Cramps" },
  { key: "tired", label: "😴 Low Energy" },
  { key: "mood", label: "🥺 Extra Pyar Chahiye" },
  { key: "cravings", label: "🍫 Chocolate Craving" },
  { key: "backache", label: "💆 Back / Garam Bag" },
  { key: "headache", label: "🤕 Sar Dard" }
];

export const PERIOD_CARE_PACKAGES = [
  { key: "chocolate", emoji: "🍫", title: "Sweet Chocolate + Garam Chai", note: "Aaj kuch kaam nahi karna, sirf aaram karo meri jaan ❤️" },
  { key: "massage", emoji: "💆", title: "15-Min Back & Tummy Massage Pass", note: "Garam heating pad + pyare hathon ka massage 🫶🏻" },
  { key: "cuddle", emoji: "🧸", title: "Zero-Gussa Unlimited Cuddle", note: "Har nakhra sar aankhon par — aaj sirf sukoon 🤗" },
  { key: "icecream", emoji: "🍨", title: "Midnight Craving Treat", note: "Jo dil kare bolo, foran hazir hai 💖" }
];

export const MORNING_PROMPTS = [
  "Aaj subah uthte hi mere liye pehla khayal kya aaya? ☀️",
  "Aaj ke din ka sabse pyara chhota target kya hai? 🌸",
  "Aaj tumhe mujhse kaunsi ek dua ya wish chahiye? 🤲💖",
  "Subah ki ek pyari line jo mera poora din bana de ✨",
  "Aaj agar hum subah saath chai peete to kya baatein karte? ☕",
  "Tumhare chehre par subah ki pehli muskan kis baat se aati hai? 😊"
];

export const NIGHT_PROMPTS = [
  "Aaj pooray din mein sabse achha pal kaunsa laga? 🌙",
  "Sone se pehle aaj ka ek pyara thank-you ya sorry bolna ho to? 💖",
  "Aaj raat khwab mein hum dono kahan ghoomne chalein? ✨",
  "Din bhar ki thakan mein tumhe mujhse kaisa hug chahiye? 🤗",
  "Raat ki aakhri pyari wish jo kal subah poori ho 🌸",
  "Aaj meri kaunsi baat ya message dil ko sabse zyada chhoo gaya? 💌"
];

export function calculatePeriodPhase(cfg = {}, nowMs = Date.now()) {
  const lastStartIso = String(cfg?.lastStartIso || "").trim();
  const rawCycle = Number(cfg?.cycleDays || 28);
  const rawPeriod = Number(cfg?.periodDays || 5);
  const cycleDays = Math.max(20, Math.min(45, Number.isFinite(rawCycle) ? Math.round(rawCycle) : 28));
  const periodDays = Math.max(2, Math.min(10, Number.isFinite(rawPeriod) ? Math.round(rawPeriod) : 5));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastStartIso)) {
    return {
      configured: false,
      phase: "unset",
      title: "Cycle Date Set Karein 🌸",
      badge: "📅 Setup Pending",
      tip: "Last period start date set karein taake partner ko live care tips dikhein.",
      dayOfCycle: 0,
      daysUntilNext: 0,
      cycleDays,
      periodDays
    };
  }

  const startMs = Date.parse(`${lastStartIso}T00:00:00Z`);
  if (!Number.isFinite(startMs)) {
    return {
      configured: false,
      phase: "unset",
      title: "Cycle Date Set Karein 🌸",
      badge: "📅 Setup Pending",
      tip: "Valid date select karein (YYYY-MM-DD).",
      dayOfCycle: 0,
      daysUntilNext: 0,
      cycleDays,
      periodDays
    };
  }

  const d = new Date(nowMs);
  const todayUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const rawDiff = Math.floor((todayUtc - startMs) / 86400000);
  const offset = rawDiff >= 0 ? (rawDiff % cycleDays) : 0;
  const dayOfCycle = offset + 1;
  const daysUntilNext = rawDiff >= 0 ? (cycleDays - offset) : Math.abs(rawDiff);

  let phase = "luteal";
  let title = "🌙 Cozy Calm Days";
  let badge = "☕ Slow Down";
  let tip = "Thakan jaldi ho sakti hai — cozy talks aur pyari care best rahegi.";

  const ovStart = Math.max(periodDays + 1, cycleDays - 16);
  const ovEnd = Math.max(ovStart, cycleDays - 12);

  if (dayOfCycle <= periodDays) {
    phase = "period";
    title = "🌸 Period Days — Extra Care";
    badge = "🩸 Comfort Mode";
    tip = "Garam paani, poora aaram, chocolate aur bina tension ke sirf pyar dein 💖";
  } else if (dayOfCycle >= cycleDays - 4) {
    phase = "pms";
    title = "🥺 PMS Window — Soft Patience";
    badge = "🫶🏻 Gentle Days";
    tip = "Mood sensitive ho sakta hai — extra hugs, patience aur meetha treat ready rakhein.";
  } else if (dayOfCycle >= ovStart && dayOfCycle <= ovEnd) {
    phase = "ovulation";
    title = "✨ Peak Energy & Glow";
    badge = "💫 High Connect";
    tip = "Energy aur romantic mood peak par — special talk ya cozy plan best rahega.";
  } else if (dayOfCycle < ovStart) {
    phase = "follicular";
    title = "🌷 Fresh Follicular Days";
    badge = "🌱 Light & Playful";
    tip = "Mood fresh aur playful hai — couple games aur sweet plans enjoy karein.";
  }

  return {
    configured: true,
    phase,
    title,
    badge,
    tip,
    dayOfCycle,
    daysUntilNext,
    cycleDays,
    periodDays
  };
}

export function buildRitualCardPayload({ mode = "morning", prompt = "", text = "", authorUid = "", nowMs = Date.now() } = {}) {
  const cleanMode = mode === "night" ? "night" : "morning";
  const fallbackPool = cleanMode === "night" ? NIGHT_PROMPTS : MORNING_PROMPTS;
  const cleanPrompt = String(prompt || fallbackPool[0]).trim();
  const cleanText = String(text || "").trim();
  return {
    mode: cleanMode,
    prompt: cleanPrompt,
    entryA: cleanText,
    authorA: String(authorUid || ""),
    entryB: "",
    authorB: "",
    updatedAtMs: Number(nowMs || Date.now())
  };
}

export function canEditMessage(msg, myUid, nowMs = Date.now(), maxWindowMs = 15 * 60 * 1000) {
  if (!msg || !myUid || msg.sender !== myUid || msg.isPending) return false;
  const dec = msg.decrypted;
  if (!dec || typeof dec.text !== "string") return false;
  if (dec.imageData || dec.audioData || dec.giftData || dec.gameData || dec.capsuleData || dec.songCard || dec.walletRedeem || dec.walletGift || dec.carePing || dec.letterData || dec.questionCard || dec.ritualCard || dec.periodCard) {
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
