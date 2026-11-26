import { playEmotionSound } from "./crypto.js";

const CARE_PINGS = [
  { emoji: "🍲", label: "Khana Khaya?", sub: "Apna khayal rakhna 💖" },
  { emoji: "💧", label: "Paani Piya?", sub: "Stay hydrated jaan" },
  { emoji: "🥺", label: "Yaad Aa Rahi Hai", sub: "Miss you bohot zyada" },
  { emoji: "🛣️", label: "Reach Safe", sub: "Pohnch kar message karna" },
  { emoji: "🤗", label: "Tight Hug", sub: "Sab theek ho jayega" },
  { emoji: "🌙", label: "Good Night Jaan", sub: "Meethe khwab aayein" }
];

const DIL_KI_BAAT_QUESTIONS = [
  "Aaj mere baare mein sabse pehle kya khayal aaya? 💭",
  "Meri kaunsi chhoti si aadat tumhe sabse zyada pasand hai? 🥰",
  "Abhi is waqt agar hum saath hote to kya kar rahe hote? 💖",
  "Tumhare liye humara sabse pyara memory pal kaunsa hai? ✨",
  "Koi ek baat jo tum mujhse hamesha sunna chahte ho? 💌",
  "Jab tum thak jate ho to mujhse kya expect karte ho? 🤗"
];

export function createCareManager({ chat }) {
  const modal = document.getElementById("care-modal");
  const pingGrid = document.getElementById("care-ping-grid");
  const qGrid = document.getElementById("dil-baat-grid");

  if (pingGrid) {
    CARE_PINGS.forEach(p => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mood-item";
      b.innerText = `${p.emoji} ${p.label}`;
      b.onclick = async () => {
        modal.style.display = "none";
        playEmotionSound("love");
        await chat.sendEncryptedMessage({ carePing: p }, "ping");
      };
      pingGrid.appendChild(b);
    });
  }

  if (qGrid) {
    DIL_KI_BAAT_QUESTIONS.forEach(q => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mood-item";
      b.style.gridColumn = "span 3";
      b.style.textAlign = "left";
      b.style.padding = "10px 12px";
      b.innerText = `🃏 ${q}`;
      b.onclick = async () => {
        modal.style.display = "none";
        playEmotionSound("gift");
        await chat.sendEncryptedMessage({ questionCard: { question: q, answer: "" } }, "letter");
      };
      qGrid.appendChild(b);
    });
  }

  document.getElementById("send-letter-btn")?.addEventListener("click", async () => {
    const titleEl = document.getElementById("letter-title-input");
    const bodyEl = document.getElementById("letter-body-input");
    const title = titleEl.value.trim() || "Pyar Bhara Khat";
    const body = bodyEl.value.trim();
    if (!body) return;
    titleEl.value = "";
    bodyEl.value = "";
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({ letterData: { title, body } }, "letter");
  });

  document.getElementById("care-studio-btn")?.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  document.getElementById("close-care-modal-btn")?.addEventListener("click", () => {
    modal.style.display = "none";
  });
}
