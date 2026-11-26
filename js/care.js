import { playEmotionSound } from "./crypto.js";

const CARE_PING_POOL = [
  { emoji: "🍲", label: "Khana Khaya?", sub: "Apna khayal rakhna 💖" },
  { emoji: "💧", label: "Paani Piya?", sub: "Stay hydrated jaan" },
  { emoji: "🥺", label: "Yaad Aa Rahi Hai", sub: "Miss you bohot zyada" },
  { emoji: "🛣️", label: "Reach Safe", sub: "Pohnch kar message karna" },
  { emoji: "🤗", label: "Tight Hug", sub: "Sab theek ho jayega" },
  { emoji: "🌙", label: "Good Night Jaan", sub: "Meethe khwab aayein" },
  { emoji: "☀️", label: "Good Morning Love", sub: "Aaj ka din pyara guzre" },
  { emoji: "☕", label: "Chai / Coffee Break", sub: "Thoda aaram kar lo ❤️" },
  { emoji: "💊", label: "Dawai Li?", sub: "Health sabse pehle hai" },
  { emoji: "😘", label: "Pyari Si Pappi", sub: "Dil se bheji hai 💋" },
  { emoji: "🫶🏻", label: "Hamesha Saath", sub: "Main tumhare saath hoon" },
  { emoji: "🧸", label: "Cuddle Time", sub: "Aaj bohot pyar aa raha hai" },
  { emoji: "📵", label: "Kam Kaam Karo", sub: "Thakna mana hai 😌" },
  { emoji: "✨", label: "Smile Karo Abhi", sub: "Tumhari muskan jaan hai" },
  { emoji: "🚗", label: "Dhyan Se Jaana", sub: "Allah hifazat kare 🤲" },
  { emoji: "🎧", label: "Awaaz Sunao", sub: "Ek pyara voice note bhejo" },
  { emoji: "🌹", label: "Special Phool", sub: "Mere pyare partner ke liye" },
  { emoji: "🍫", label: "Meetha Surprise", sub: "Mood fresh karne ke liye" }
];

const DIL_KI_BAAT_POOL = [
  "Aaj mere baare mein sabse pehle kya khayal aaya? 💭",
  "Meri kaunsi chhoti si aadat tumhe sabse zyada pasand hai? 🥰",
  "Abhi is waqt agar hum saath hote to kya kar rahe hote? 💖",
  "Tumhare liye humara sabse pyara memory pal kaunsa hai? ✨",
  "Koi ek baat jo tum mujhse hamesha sunna chahte ho? 💌",
  "Jab tum thak jate ho to mujhse kya expect karte ho? 🤗",
  "Humari agli mulaqat par sabse pehli cheez kya karoge? 😘",
  "Meri kaunsi ek photo ya look tumhare dil ke sabse kareeb hai? 📸",
  "Jab main gussa hota/hoti hoon to tumhara dil kya kehta hai? 🥺",
  "Raat ko sone se pehle mere baare mein kya sochte ho? 🌙",
  "Mere liye ek 2-line ki dil se nikli baat likho 💘",
  "Humari shaadi / future life ka sabse pyara dream kya hai? 💍",
  "Kis waqt tumhe meri yaad sabse zyada satati hai? 🕰️",
  "Mera diya hua kaunsa gift ya lafz tum kabhi nahi bhoologe? 🎁",
  "Agar aaj ek wish poori ho jaye hamare liye, to kya maangoge? 🌟",
  "Mujhmein kaunsi baat dekh kar pehli baar pyar aur sukoon mila? 💓",
  "Aaj tumhara mood 1 se 10 mein kitna romantic hai aur kyun? 🔥",
  "Meri awaaz mein sabse pyari baat kya lagti hai tumhe? 🎙️",
  "Kaunsi ek jagah hai jahan tum sirf mere saath jaana chahte ho? ✈️",
  "Jab main tumhara haath pakadta/pakadti hoon to kaisa mehsoos hota hai? 🫶🏻",
  "Ek chhota sa secret jo aaj mujhe batana chaho 🤫",
  "Mera kaunsa nickname tumhe sabse zyada cute lagta hai? 🧸",
  "Baarish ke mausam mein mere saath kya karne ka dil karta hai? 🌧️",
  "Agar abhi hum call par hote to pehli line kya bolte? 📞"
];

function pickFreshSlice(pool, count, prevKeys = new Set()) {
  const freshFirst = [...pool.filter(x => !prevKeys.has(typeof x === "string" ? x : x.label))];
  const rest = [...pool.filter(x => prevKeys.has(typeof x === "string" ? x : x.label))];
  freshFirst.sort(() => Math.random() - 0.5);
  rest.sort(() => Math.random() - 0.5);
  return [...freshFirst, ...rest].slice(0, count);
}

export function createCareManager({ chat }) {
  const modal = document.getElementById("care-modal");
  const pingGrid = document.getElementById("care-ping-grid");
  const qGrid = document.getElementById("dil-baat-grid");
  const customPingInput = document.getElementById("custom-ping-input");
  const customDilInput = document.getElementById("custom-dil-input");

  let currentPings = [];
  let currentQuestions = [];

  function renderPings() {
    if (!pingGrid) return;
    const prev = new Set(currentPings.map(p => p.label));
    currentPings = pickFreshSlice(CARE_PING_POOL, 6, prev);
    pingGrid.replaceChildren();
    currentPings.forEach(p => {
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

  function renderDilQuestions() {
    if (!qGrid) return;
    const prev = new Set(currentQuestions);
    currentQuestions = pickFreshSlice(DIL_KI_BAAT_POOL, 5, prev);
    qGrid.replaceChildren();
    currentQuestions.forEach(q => {
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

  renderPings();
  renderDilQuestions();

  document.getElementById("refresh-pings-btn")?.addEventListener("click", () => {
    playEmotionSound("chime");
    renderPings();
  });

  document.getElementById("refresh-dil-btn")?.addEventListener("click", () => {
    playEmotionSound("chime");
    renderDilQuestions();
  });

  document.getElementById("send-custom-ping-btn")?.addEventListener("click", async () => {
    const label = (customPingInput?.value || "").trim();
    if (!label) {
      customPingInput?.focus();
      return;
    }
    customPingInput.value = "";
    modal.style.display = "none";
    playEmotionSound("love");
    await chat.sendEncryptedMessage(
      { carePing: { emoji: "💞", label, sub: "Dil se bheja gaya special ping ❤️" } },
      "ping"
    );
  });

  document.getElementById("send-custom-dil-btn")?.addEventListener("click", async () => {
    const q = (customDilInput?.value || "").trim();
    if (!q) {
      customDilInput?.focus();
      return;
    }
    customDilInput.value = "";
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage(
      { questionCard: { question: q, answer: "" } },
      "letter"
    );
  });

  document.getElementById("send-letter-btn")?.addEventListener("click", async () => {
    const titleEl = document.getElementById("letter-title-input");
    const bodyEl = document.getElementById("letter-body-input");
    const title = titleEl.value.trim() || "Pyar Bhara Khat";
    const body = bodyEl.value.trim();
    if (!body) {
      bodyEl?.focus();
      return;
    }
    titleEl.value = "";
    bodyEl.value = "";
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({ letterData: { title, body } }, "letter");
  });

  document.getElementById("care-studio-btn")?.addEventListener("click", () => {
    renderPings();
    renderDilQuestions();
    modal.style.display = "flex";
  });

  document.getElementById("close-care-modal-btn")?.addEventListener("click", () => {
    modal.style.display = "none";
  });
}
