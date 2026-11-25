const E2EE_SECRET = "JananMino-2026-SecretKey";
const E2EE_SALT = "JananMino-E2EE-Salt-v1";

let aesKeyPromise = null;
let audioCtx = null;

export function getAudioCtx() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

export function playEmotionSound(type = "chime") {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const tones = {
      chime: [523.25, 659.25],
      love: [587.33, 783.99, 987.77],
      kiss: [880, 698.46],
      happy: [523.25, 659.25, 783.99],
      sad: [392.0, 329.63],
      angry: [220, 196],
      gift: [523.25, 659.25, 783.99, 1046.5]
    }[type] || [523.25, 659.25];

    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type === "angry" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      g.gain.setValueAtTime(0.18, now + idx * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.45);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.46);
    });
  } catch {}
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[m]));
}

export function getAesKey() {
  if (!aesKeyPromise) {
    aesKeyPromise = (async () => {
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey("raw", enc.encode(E2EE_SECRET), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode(E2EE_SALT), iterations: 100000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    })();
  }
  return aesKeyPromise;
}

export async function encryptPayload(obj) {
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(obj));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const combined = new Uint8Array(12 + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), 12);
  let bin = "";
  for (let i = 0; i < combined.length; i += 8192) {
    bin += String.fromCharCode(...combined.subarray(i, i + 8192));
  }
  return "E2EE:" + btoa(bin);
}

export async function decryptPayload(raw) {
  if (!raw || typeof raw !== "string") return { text: "" };
  if (!raw.startsWith("E2EE:")) return { text: raw };
  try {
    const bin = atob(raw.slice(5));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const iv = bytes.slice(0, 12);
    const cipher = bytes.slice(12);
    const key = await getAesKey();
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(plainBuf));
  } catch {
    return { text: "🔒 Encrypted message" };
  }
}
