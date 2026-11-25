import { playEmotionSound } from "./crypto.js";

const CARE_PINGS = [
  { emoji: "🍲", label: "Khana Khaya?", sub: "Apna khayal rakhna 💖" },
  { emoji: "💧", label: "Paani Piya?", sub: "Stay hydrated jaan" },
  { emoji: "🥺", label: "Yaad Aa Rahi Hai", sub: "Miss you bohot zyada" },
  { emoji: "🛣️", label: "Reach Safe", sub: "Pohnch kar message karna" },
  { emoji: "🤗", label: "Tight Hug", sub: "Sab theek ho jayega" },
  { emoji: "🌙", label: "Good Night Jaan", sub: "Meethe khwab aayein" }
];

export function createCareManager({ chat }) {
  const modal = document.getElementById("care-modal");
  const pingGrid = document.getElementById("care-ping-grid");

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
