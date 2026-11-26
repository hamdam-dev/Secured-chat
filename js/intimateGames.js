import { playEmotionSound } from "./crypto.js";
import {
  CODEWORD_GLOSSARY,
  INTIMATE_GAMES_META,
  DEFAULT_DICE_CONFIG,
  DEFAULT_ROULETTE_WEDGES,
  DEFAULT_HEAT_LEVELS,
  DEFAULT_SPICY_DECK,
  DEFAULT_FANTASY_POOL,
  DEFAULT_RAPID_FIRE,
  DEFAULT_ROLEPLAY_OPTIONS,
  DEFAULT_BOSS_COMMANDS,
  DEFAULT_SCRATCH_REWARDS,
  DEFAULT_DART_ZONES,
  DEFAULT_NIGHT_PLAN,
  rollNaughtyDice,
  stepHeatLevel,
  evaluateFantasyMatches,
  resolveStripRound,
  checkBlurredAnswer,
  formatTonightPlan,
  createWalletCoupon,
  redeemWalletCoupon
} from "../shared/intimateLogic.js";

const INTIMATE_CUSTOM_KEY = "sc_intimate_custom_v1";
const LOVE_WALLET_KEY = "sc_love_wallet_v1";
const KISS_COUNTER_KEY = "sc_intimate_kisses_v1";

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

function parseLines(raw = "", fallback = []) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
  return lines.length ? lines : [...fallback];
}

export function createIntimateGamesManager({ getAuth, chat, openGamesModal }) {
  const rootEl = document.getElementById("intimate-games-root");
  const walletModal = document.getElementById("wallet-modal");
  const walletListEl = document.getElementById("wallet-list");
  const walletSummaryEl = document.getElementById("wallet-summary-text");
  const walletCustomInput = document.getElementById("wallet-custom-input");

  let customCfg = readJson(INTIMATE_CUSTOM_KEY, {});
  let activeCat = "all";
  let activeGameId = "dice";
  let showCustomize = false;

  // Ephemeral game states
  let lastDiceRes = null;
  let wheelTier = "soft";
  let wheelResult = "";
  let heatLv = 1;
  let teaserTimerInt = null;
  let teaserLeft = 60;
  let teaserTarget = "🍯 Honey";
  let teaserSecSetting = 60;
  let teaserRunning = false;

  let scratchReward = "";
  let scratchRevealed = false;
  let spicyTier = "flirty";
  let spicyCard = null;
  let fantasyVotesA = {};
  let fantasyIdx = 0;

  let stripRound = 0;
  let stripScoreA = 0;
  let stripScoreB = 0;
  let stripLastText = "Round 1 shuru karo!";

  let bottleAngle = 0;
  let bottleAnimating = false;
  let bottleRaf = null;
  let bottleResult = "";

  let dartResult = "";
  let dartHitPt = null;

  let rapidIdx = 0;
  let rapidRunning = false;
  let rapidSec = 5;
  let rapidTimerInt = null;
  let rapidAnswers = [];

  let blurWord = "Honey";
  let blurHint = "Male private focus ka codeword 🍯";
  let blurMessage = "Tonight 2-Min Slow Honey Focus Unlocked!";
  let blurUnlocked = false;

  let roleplaySel = { scenarioIdx: 0, outfitIdx: 0, ruleIdx: 0 };
  let planSel = { starterIdx: 0, teaseIdx: 0, mainIdx: 0, aftercareIdx: 0 };
  let sensorySel = { item: "🧊 Ice Cube", zone: "🍯 Honey" };
  let whisperPrompt = "";
  let bossSelected = "";

  function myUid() {
    return getAuth()?.currentUser?.uid || "";
  }

  function cfg(key, fallback) {
    return customCfg[key] !== undefined ? customCfg[key] : fallback;
  }

  function saveCfg(key, value) {
    customCfg = { ...customCfg, [key]: value };
    writeJson(INTIMATE_CUSTOM_KEY, customCfg);
  }

  function stopLoops() {
    clearInterval(teaserTimerInt);
    teaserTimerInt = null;
    teaserRunning = false;
    clearInterval(rapidTimerInt);
    rapidTimerInt = null;
    rapidRunning = false;
    if (bottleRaf) {
      cancelAnimationFrame(bottleRaf);
      bottleRaf = null;
    }
    bottleAnimating = false;
  }

  // =====================================
  // REDEEMABLE LOVE WALLET
  // =====================================
  function getWallet() {
    return readJson(LOVE_WALLET_KEY, []);
  }

  function saveToWallet(title, source = "Intimate Game") {
    const clean = String(title || "").trim();
    if (!clean) return null;
    const item = createWalletCoupon(clean, source);
    const next = [item, ...getWallet()].slice(0, 50);
    writeJson(LOVE_WALLET_KEY, next);
    renderWalletModal();
    return item;
  }

  function renderWalletModal() {
    if (!walletListEl) return;
    const list = getWallet();
    const activeCount = list.filter(x => !x.redeemed).length;
    if (walletSummaryEl) {
      walletSummaryEl.innerText = `🎟️ ${activeCount} Active Coupons • ${list.length - activeCount} Redeemed`;
    }
    walletListEl.innerHTML = "";
    if (!list.length) {
      walletListEl.innerHTML = `<p style="font-size:12.5px;opacity:0.75;">Abhi Love Wallet khali hai. Games jeet ke rewards save karein ya upar apna custom coupon add karein!</p>`;
      return;
    }

    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "wallet-card" + (item.redeemed ? " redeemed" : "");
      const info = document.createElement("div");
      info.className = "wallet-card-info";
      const title = document.createElement("div");
      title.className = "wallet-card-title";
      title.innerText = item.title;
      const meta = document.createElement("div");
      meta.className = "wallet-card-meta";
      meta.innerText = `${item.source}${item.redeemed ? " · Redeemed ✅" : " · Ready to Claim"}`;
      info.appendChild(title);
      info.appendChild(meta);
      card.appendChild(info);

      if (!item.redeemed) {
        const redBtn = document.createElement("button");
        redBtn.type = "button";
        redBtn.className = "game-mini-btn active";
        redBtn.innerText = "🎟️ Redeem";
        redBtn.onclick = async () => {
          const { next, redeemedItem } = redeemWalletCoupon(getWallet(), item.id);
          writeJson(LOVE_WALLET_KEY, next);
          renderWalletModal();
          if (redeemedItem) {
            if (walletModal) walletModal.style.display = "none";
            playEmotionSound("gift");
            await chat.sendEncryptedMessage(
              { walletRedeem: { title: redeemedItem.title, source: redeemedItem.source } },
              "letter"
            );
          }
        };
        card.appendChild(redBtn);
      }

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "pinned-close-btn";
      delBtn.innerText = "✕";
      delBtn.setAttribute("aria-label", `Remove ${item.title}`);
      delBtn.onclick = () => {
        const next = getWallet().filter(x => x.id !== item.id);
        writeJson(LOVE_WALLET_KEY, next);
        renderWalletModal();
      };
      card.appendChild(delBtn);
      walletListEl.appendChild(card);
    });
  }

  function openWalletModal() {
    renderWalletModal();
    if (walletModal) walletModal.style.display = "flex";
  }

  document.getElementById("open-wallet-btn")?.addEventListener("click", () => {
    document.getElementById("more-dropdown").style.display = "none";
    openWalletModal();
  });
  document.getElementById("games-open-wallet-btn")?.addEventListener("click", openWalletModal);
  document.getElementById("close-wallet-btn")?.addEventListener("click", () => {
    if (walletModal) walletModal.style.display = "none";
  });
  document.getElementById("wallet-add-btn")?.addEventListener("click", () => {
    const val = (walletCustomInput?.value || "").trim();
    if (!val) {
      walletCustomInput?.focus();
      return;
    }
    walletCustomInput.value = "";
    playEmotionSound("gift");
    saveToWallet(val, "Custom Coupon");
  });

  // Helper: Send an interactive intimate card or simple challenge to chat
  async function sendToChat(gameData, noticeAlertKind = "letter") {
    const gamesModal = document.getElementById("games-modal");
    if (gamesModal) gamesModal.style.display = "none";
    stopLoops();
    playEmotionSound("gift");
    await chat.sendEncryptedMessage(
      { gameData: { ...gameData, creator: myUid() } },
      noticeAlertKind
    );
  }

  // =====================================
  // CANVAS MINI-ENGINES (SCRATCH, BOTTLE, DART)
  // =====================================
  function setupScratchCanvas(canvas, onRevealed) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.globalCompositeOperation = "source-over";
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#f48fb1");
    grad.addColorStop(1, "#ad1457");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✨ Yahan Scratch / Rub Karein ✨", w / 2, h / 2 + 5);

    let rubbing = false;
    let strokeCount = 0;

    const getPos = ev => {
      const rect = canvas.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      return {
        x: ((clientX - rect.left) / Math.max(1, rect.width)) * w,
        y: ((clientY - rect.top) / Math.max(1, rect.height)) * h
      };
    };

    const rubAt = ev => {
      const { x, y } = getPos(ev);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      strokeCount++;
      if (!scratchRevealed && strokeCount >= 18) {
        scratchRevealed = true;
        ctx.clearRect(0, 0, w, h);
        onRevealed?.();
      }
    };

    canvas.onpointerdown = ev => {
      rubbing = true;
      rubAt(ev);
    };
    canvas.onpointermove = ev => {
      if (rubbing) rubAt(ev);
    };
    window.addEventListener("pointerup", () => { rubbing = false; }, { passive: true });
    canvas.ontouchstart = ev => { rubbing = true; rubAt(ev); };
    canvas.ontouchmove = ev => { if (rubbing) rubAt(ev); };
    canvas.ontouchend = () => { rubbing = false; };
  }

  const BOTTLE_SLICES = [
    { label: "🍯 Honey Focus", color: "#ffe0ec" },
    { label: "🍫 Chocolate Kiss", color: "#fff3e0" },
    { label: "🎀 Mam Cuddle", color: "#fce4ec" },
    { label: "💋 20s Lip Kiss", color: "#f8bbd0" },
    { label: "🔥 Wild Wish", color: "#ffd1dc" },
    { label: "🎙️ Dirty Whisper", color: "#f3e5f5" }
  ];

  function drawBottleWheel(canvas, angleDeg = 0) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 6;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const step = (Math.PI * 2) / BOTTLE_SLICES.length;
    BOTTLE_SLICES.forEach((sl, i) => {
      const start = i * step - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + step);
      ctx.closePath();
      ctx.fillStyle = sl.color;
      ctx.fill();
      ctx.strokeStyle = "#f48fb1";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + step / 2);
      ctx.fillStyle = "#880e4f";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(sl.label, r - 8, 4);
      ctx.restore();
    });

    // Bottle pointer in center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.fillStyle = "#c2185b";
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(12, 16);
    ctx.lineTo(0, 8);
    ctx.lineTo(-12, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDartboard(canvas, hitPt = null) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxR = Math.min(cx, cy) - 6;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rings = [
      { r: maxR, c: "#fce4ec" },
      { r: maxR * 0.78, c: "#f8bbd0" },
      { r: maxR * 0.56, c: "#ff80ab" },
      { r: maxR * 0.34, c: "#e91e63" },
      { r: maxR * 0.15, c: "#ffd54f" }
    ];
    rings.forEach(rg => {
      ctx.beginPath();
      ctx.arc(cx, cy, rg.r, 0, Math.PI * 2);
      ctx.fillStyle = rg.c;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.fillStyle = "#4a0e2e";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎯", cx, cy + 4);

    if (hitPt) {
      ctx.beginPath();
      ctx.arc(hitPt.x, hitPt.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#111";
      ctx.fill();
      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // =====================================
  // RENDER STAGE FOR SELECTED INTIMATE GAME
  // =====================================
  function makeSaveWalletBtn(text, source) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "modal-btn";
    b.innerText = "🎟️ Wallet";
    b.onclick = () => {
      if (!text) return;
      saveToWallet(text, source);
      playEmotionSound("gift");
      b.innerText = "✅ Saved!";
      setTimeout(() => { b.innerText = "🎟️ Wallet"; }, 1400);
    };
    return b;
  }

  function renderStage(stageEl) {
    stageEl.innerHTML = "";
    const meta = INTIMATE_GAMES_META.find(g => g.id === activeGameId) || INTIMATE_GAMES_META[0];

    const topRow = document.createElement("div");
    topRow.className = "care-head-inline";
    const h = document.createElement("div");
    h.className = "game-card-head";
    h.innerText = `${meta.icon} ${meta.name}`;
    const custToggle = document.createElement("button");
    custToggle.type = "button";
    custToggle.className = "game-mini-btn" + (showCustomize ? " active" : "");
    custToggle.innerText = showCustomize ? "✓ Done Edit" : "✍️ Customize";
    custToggle.onclick = () => {
      showCustomize = !showCustomize;
      renderStage(stageEl);
    };
    topRow.appendChild(h);
    topRow.appendChild(custToggle);
    stageEl.appendChild(topRow);

    // 1. NAUGHTY DICE
    if (activeGameId === "dice") {
      const diceCfg = cfg("dice", DEFAULT_DICE_CONFIG);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        panel.innerHTML = `<div class="care-section-title">Har line mein 1 option likhein (Actions / Targets / Time)</div>`;
        const aTa = document.createElement("textarea");
        aTa.rows = 3;
        aTa.value = (diceCfg.actions || DEFAULT_DICE_CONFIG.actions).join("\n");
        aTa.ariaLabel = "Custom dice actions";
        const tTa = document.createElement("textarea");
        tTa.rows = 3;
        tTa.value = (diceCfg.targets || DEFAULT_DICE_CONFIG.targets).join("\n");
        tTa.ariaLabel = "Custom dice targets";
        const dTa = document.createElement("textarea");
        dTa.rows = 2;
        dTa.value = (diceCfg.durations || DEFAULT_DICE_CONFIG.durations).join("\n");
        dTa.ariaLabel = "Custom dice durations";
        const saveB = document.createElement("button");
        saveB.type = "button";
        saveB.className = "game-mini-btn active";
        saveB.innerText = "💾 Save Custom Dice";
        saveB.onclick = () => {
          saveCfg("dice", {
            actions: parseLines(aTa.value, DEFAULT_DICE_CONFIG.actions),
            targets: parseLines(tTa.value, DEFAULT_DICE_CONFIG.targets),
            durations: parseLines(dTa.value, DEFAULT_DICE_CONFIG.durations)
          });
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.append(aTa, tTa, dTa, saveB);
        stageEl.appendChild(panel);
        return;
      }

      const resBox = document.createElement("div");
      resBox.className = "flirty-wheel-result";
      resBox.innerText = lastDiceRes ? lastDiceRes.summary : "Roll Dabao — Action + Target + Time banega 🎲🔥";
      stageEl.appendChild(resBox);

      const row = document.createElement("div");
      row.className = "game-btn-row";
      const rollBtn = document.createElement("button");
      rollBtn.type = "button";
      rollBtn.className = "modal-btn primary";
      rollBtn.innerText = "🎲 Roll Dice";
      rollBtn.onclick = () => {
        lastDiceRes = rollNaughtyDice(diceCfg);
        playEmotionSound("love");
        resBox.innerText = lastDiceRes.summary;
      };
      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "modal-btn";
      sendBtn.innerText = "💬 Chat Bhejein";
      sendBtn.onclick = () => {
        const res = lastDiceRes || rollNaughtyDice(diceCfg);
        sendToChat({
          kind: "intimate_dare",
          title: "🎲 Naughty Dice Roll",
          prompt: res.summary,
          replyText: ""
        });
      };
      row.append(rollBtn, sendBtn);
      if (lastDiceRes) row.appendChild(makeSaveWalletBtn(lastDiceRes.summary, "Naughty Dice"));
      stageEl.appendChild(row);
      return;
    }

    // 2. INTIMATE WHEEL
    if (activeGameId === "roulette") {
      const wedges = cfg("roulette", DEFAULT_ROULETTE_WEDGES);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        panel.innerHTML = `<div class="care-section-title">${wheelTier.toUpperCase()} Wheel Tasks Edit Karein (1 per line)</div>`;
        const ta = document.createElement("textarea");
        ta.rows = 5;
        ta.value = (wedges[wheelTier] || DEFAULT_ROULETTE_WEDGES[wheelTier]).join("\n");
        const saveB = document.createElement("button");
        saveB.type = "button";
        saveB.className = "game-mini-btn active";
        saveB.innerText = "💾 Save Wheel";
        saveB.onclick = () => {
          saveCfg("roulette", { ...wedges, [wheelTier]: parseLines(ta.value, DEFAULT_ROULETTE_WEDGES[wheelTier]) });
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.append(ta, saveB);
        stageEl.appendChild(panel);
        return;
      }
      const tierRow = document.createElement("div");
      tierRow.className = "game-btn-row";
      [["soft", "🌸 Soft"], ["naughty", "😘 Naughty"], ["wild", "🔥 Wild"]].forEach(([k, lbl]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "game-mini-btn" + (wheelTier === k ? " active" : "");
        b.innerText = lbl;
        b.onclick = () => { wheelTier = k; renderStage(stageEl); };
        tierRow.appendChild(b);
      });
      const res = document.createElement("div");
      res.className = "flirty-wheel-result";
      res.innerText = wheelResult || "Mood chunein aur Wheel Spin karein 🎡";
      const actRow = document.createElement("div");
      actRow.className = "game-btn-row";
      const spBtn = document.createElement("button");
      spBtn.type = "button";
      spBtn.className = "modal-btn primary";
      spBtn.innerText = "🎡 Spin";
      spBtn.onclick = () => {
        const pool = wedges[wheelTier] || DEFAULT_ROULETTE_WEDGES.soft;
        wheelResult = pool[Math.floor(Math.random() * pool.length)];
        playEmotionSound("love");
        renderStage(stageEl);
      };
      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "modal-btn";
      sendBtn.innerText = "💬 Chat Bhejein";
      sendBtn.onclick = () => {
        const pool = wedges[wheelTier] || DEFAULT_ROULETTE_WEDGES.soft;
        const val = wheelResult || pool[0];
        sendToChat({ kind: "intimate_dare", title: `🎡 Intimate Wheel (${wheelTier})`, prompt: val, replyText: "" });
      };
      actRow.append(spBtn, sendBtn);
      if (wheelResult) actRow.appendChild(makeSaveWalletBtn(wheelResult, "Intimate Wheel"));
      stageEl.append(tierRow, res, actRow);
      return;
    }

    // 3. 5-CARD STAKES (STRIP/POINTS)
    if (activeGameId === "strip") {
      const stakes = cfg("stripStakes", [
        "Round 1: 1 Accessory / Shirt Button + Whisper 💋",
        "Round 2: 30s Neck & Mam Tease 🎀",
        "Round 3: Honey / Chocolate 30s Sweet Focus 🍯🍫",
        "Round 4: 45s Blindfold Kiss Challenge 🔥",
        "Round 5: Winner Claims Full Night Boss Pass 👑"
      ]);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        const ta = document.createElement("textarea");
        ta.rows = 5;
        ta.value = stakes.join("\n");
        const saveB = document.createElement("button");
        saveB.type = "button";
        saveB.className = "game-mini-btn active";
        saveB.innerText = "💾 Save 5 Stakes";
        saveB.onclick = () => {
          saveCfg("stripStakes", parseLines(ta.value, stakes));
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.append(ta, saveB);
        stageEl.appendChild(panel);
        return;
      }
      const hud = document.createElement("div");
      hud.className = "game-card-sub tabular-nums";
      hud.innerText = `Round ${Math.min(5, stripRound + 1)}/5 • Aap ${stripScoreA} vs Love ${stripScoreB}`;
      const res = document.createElement("div");
      res.className = "flirty-wheel-result";
      res.innerText = stripLastText;
      const row = document.createElement("div");
      row.className = "game-btn-row";
      const drawB = document.createElement("button");
      drawB.type = "button";
      drawB.className = "modal-btn primary";
      drawB.innerText = stripRound >= 5 ? "🔄 Naya Match" : "🃏 Draw Card";
      drawB.onclick = () => {
        if (stripRound >= 5) {
          stripRound = 0; stripScoreA = 0; stripScoreB = 0; stripLastText = "Naya match shuru! Card draw karein.";
        } else {
          const cA = Math.floor(Math.random() * 13) + 2;
          const cB = Math.floor(Math.random() * 13) + 2;
          const { winner, stake } = resolveStripRound(stripRound, cA, cB, stakes);
          if (winner === "A") stripScoreA++;
          else if (winner === "B") stripScoreB++;
          stripRound++;
          stripLastText = `Aap: ${cA} vs Bot: ${cB} (${winner === "draw" ? "Draw 🤝" : winner === "A" ? "Aap Jeete 🏆" : "Bot Jeeta 😈"})\n${stake}`;
          playEmotionSound(winner === "A" ? "gift" : "chime");
        }
        renderStage(stageEl);
      };
      const liveB = document.createElement("button");
      liveB.type = "button";
      liveB.className = "modal-btn";
      liveB.innerText = "💬 Chat Live";
      liveB.onclick = () => {
        sendToChat({
          kind: "intimate_strip",
          title: "🃏 5-Card Stakes Duel",
          stakes,
          roundIdx: 0,
          scoreA: 0,
          scoreB: 0,
          history: []
        });
      };
      row.append(drawB, liveB);
      stageEl.append(hud, res, row);
      return;
    }

    // 4. HEAT METER 1-5
    if (activeGameId === "heat") {
      const levels = cfg("heatLevels", DEFAULT_HEAT_LEVELS);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        const inputs = levels.map(lv => {
          const inp = document.createElement("input");
          inp.type = "text";
          inp.value = lv.task;
          panel.appendChild(inp);
          return inp;
        });
        const saveB = document.createElement("button");
        saveB.type = "button";
        saveB.className = "game-mini-btn active";
        saveB.innerText = "💾 Save Levels";
        saveB.onclick = () => {
          const next = levels.map((lv, i) => ({ ...lv, task: inputs[i].value.trim() || lv.task }));
          saveCfg("heatLevels", next);
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.appendChild(saveB);
        stageEl.appendChild(panel);
        return;
      }
      const cur = stepHeatLevel(heatLv, 0, levels);
      const track = document.createElement("div");
      track.className = "heat-meter-track";
      for (let i = 1; i <= 5; i++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "heat-step-btn" + (i <= cur.level ? " lit" : "");
        b.innerText = `Lv ${i}`;
        b.onclick = () => { heatLv = i; playEmotionSound("love"); renderStage(stageEl); };
        track.appendChild(b);
      }
      const box = document.createElement("div");
      box.className = "flirty-wheel-result";
      box.innerText = `${cur.title}\n${cur.task}`;
      const row = document.createElement("div");
      row.className = "game-btn-row";
      const upB = document.createElement("button");
      upB.type = "button";
      upB.className = "modal-btn primary";
      upB.innerText = cur.level < 5 ? "🔥 Heat Badhao" : "🔄 Reset Lv 1";
      upB.onclick = () => {
        heatLv = cur.level < 5 ? cur.level + 1 : 1;
        playEmotionSound("love");
        renderStage(stageEl);
      };
      const sendB = document.createElement("button");
      sendB.type = "button";
      sendB.className = "modal-btn";
      sendB.innerText = "💬 Chat Bhejein";
      sendB.onclick = () => sendToChat({ kind: "intimate_dare", title: `🌡️ ${cur.title}`, prompt: cur.task, replyText: "" });
      row.append(upB, sendB);
      stageEl.append(track, box, row);
      return;
    }

    // 5. 60s TEASE TIMER
    if (activeGameId === "teaser") {
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        const secInp = document.createElement("input");
        secInp.type = "number"; secInp.min = "10"; secInp.max = "300";
        secInp.value = String(teaserSecSetting);
        const tgtInp = document.createElement("input");
        tgtInp.type = "text"; tgtInp.value = teaserTarget;
        const saveB = document.createElement("button");
        saveB.type = "button"; saveB.className = "game-mini-btn active"; saveB.innerText = "💾 Apply Timer";
        saveB.onclick = () => {
          teaserSecSetting = Math.max(10, Math.min(300, Number(secInp.value) || 60));
          teaserLeft = teaserSecSetting;
          teaserTarget = tgtInp.value.trim() || "🍯 Honey";
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.append(secInp, tgtInp, saveB);
        stageEl.appendChild(panel);
        return;
      }
      const tgtRow = document.createElement("div");
      tgtRow.className = "game-btn-row";
      ["🍯 Honey", "🍫 Chocolate", "🎀 Mam", "💋 Neck/Lips"].forEach(t => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "game-mini-btn" + (teaserTarget === t ? " active" : "");
        b.innerText = t;
        b.onclick = () => { teaserTarget = t; renderStage(stageEl); };
        tgtRow.appendChild(b);
      });
      const disp = document.createElement("div");
      disp.className = "flirty-wheel-result tabular-nums";
      disp.innerText = `${teaserTarget} Slow Tease\n⏱️ ${teaserLeft}s`;
      const row = document.createElement("div");
      row.className = "game-btn-row";
      const startB = document.createElement("button");
      startB.type = "button";
      startB.className = "modal-btn primary";
      startB.innerText = teaserRunning ? "⏸ Pause" : "▶ Start Timer";
      startB.onclick = () => {
        if (teaserRunning) {
          clearInterval(teaserTimerInt); teaserRunning = false; renderStage(stageEl);
        } else {
          if (teaserLeft <= 0) teaserLeft = teaserSecSetting;
          teaserRunning = true;
          teaserTimerInt = setInterval(() => {
            teaserLeft--;
            disp.innerText = `${teaserTarget} Slow Tease\n⏱️ ${Math.max(0, teaserLeft)}s`;
            if (teaserLeft <= 0) {
              clearInterval(teaserTimerInt); teaserRunning = false;
              playEmotionSound("gift");
              disp.innerText = `🔥 ${teaserTarget} Timer Complete!`;
            }
          }, 1000);
          renderStage(stageEl);
        }
      };
      const sendB = document.createElement("button");
      sendB.type = "button";
      sendB.className = "modal-btn";
      sendB.innerText = "💬 Chat Timer Task";
      sendB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: `⏱️ ${teaserSecSetting}s Tease Challenge`,
        prompt: `${teaserTarget} par ${teaserSecSetting} seconds nonstop slow tease! No rushing 😘`,
        replyText: ""
      });
      row.append(startB, sendB);
      stageEl.append(tgtRow, disp, row);
      return;
    }

    // 6. SCRATCH CARD (HTML5 CANVAS)
    if (activeGameId === "scratch") {
      const pool = cfg("scratchRewards", DEFAULT_SCRATCH_REWARDS);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        const ta = document.createElement("textarea");
        ta.rows = 4; ta.value = pool.join("\n");
        const saveB = document.createElement("button");
        saveB.type = "button"; saveB.className = "game-mini-btn active"; saveB.innerText = "💾 Save Scratch Pool";
        saveB.onclick = () => {
          saveCfg("scratchRewards", parseLines(ta.value, DEFAULT_SCRATCH_REWARDS));
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.append(ta, saveB);
        stageEl.appendChild(panel);
        return;
      }
      if (!scratchReward) {
        scratchReward = pool[Math.floor(Math.random() * pool.length)];
        scratchRevealed = false;
      }
      const wrap = document.createElement("div");
      wrap.className = "scratch-wrap";
      const under = document.createElement("div");
      under.className = "scratch-underneath";
      under.innerText = scratchReward;
      const canvas = document.createElement("canvas");
      canvas.id = "scratch-canvas";
      canvas.width = 280;
      canvas.height = 116;
      wrap.append(under, canvas);
      stageEl.appendChild(wrap);

      const status = document.createElement("div");
      status.className = "game-card-sub";
      status.innerText = scratchRevealed ? `🎉 Khul gaya: ${scratchReward}` : "Ungli / Mouse se pink card rub karke apna reward kholen!";
      stageEl.appendChild(status);

      if (!scratchRevealed) {
        setupScratchCanvas(canvas, () => {
          playEmotionSound("gift");
          status.innerText = `🎉 Khul gaya: ${scratchReward}`;
        });
      }

      const row = document.createElement("div");
      row.className = "game-btn-row";
      const newB = document.createElement("button");
      newB.type = "button"; newB.className = "modal-btn"; newB.innerText = "🔄 Naya";
      newB.onclick = () => {
        scratchReward = pool[Math.floor(Math.random() * pool.length)];
        scratchRevealed = false;
        renderStage(stageEl);
      };
      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Chat Bhejo";
      sendB.onclick = () => {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        sendToChat({
          kind: "intimate_scratch",
          title: "💋 Mystery Scratch Card",
          reward: picked,
          scratched: false
        });
      };
      row.append(newB, sendB, makeSaveWalletBtn(scratchReward, "Scratch Card"));
      stageEl.appendChild(row);
      return;
    }

    // 7. SPICY T/D
    if (activeGameId === "spicydare") {
      const deck = cfg("spicyDeck", DEFAULT_SPICY_DECK);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        const inp = document.createElement("input");
        inp.type = "text"; inp.placeholder = `Naya ${spicyTier} dare/truth add karein...`;
        const addB = document.createElement("button");
        addB.type = "button"; addB.className = "game-mini-btn active"; addB.innerText = "+ Add to Deck";
        addB.onclick = () => {
          const val = inp.value.trim();
          if (!val) return;
          const next = { ...deck, [spicyTier]: [{ type: `Custom ${spicyTier}`, text: val }, ...(deck[spicyTier] || [])] };
          saveCfg("spicyDeck", next);
          spicyCard = next[spicyTier][0];
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.append(inp, addB);
        stageEl.appendChild(panel);
        return;
      }
      const tRow = document.createElement("div");
      tRow.className = "game-btn-row";
      [["soft", "🌸 Soft"], ["flirty", "😘 Naughty"], ["wild", "🔥 Wild"]].forEach(([k, lbl]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn" + (spicyTier === k ? " active" : "");
        b.innerText = lbl;
        b.onclick = () => { spicyTier = k; spicyCard = null; renderStage(stageEl); };
        tRow.appendChild(b);
      });
      const list = deck[spicyTier] || DEFAULT_SPICY_DECK.flirty;
      if (!spicyCard) spicyCard = list[0];
      const box = document.createElement("div");
      box.className = "flirty-wheel-result";
      box.innerText = `${spicyCard.type}: ${spicyCard.text}`;
      const row = document.createElement("div");
      row.className = "game-btn-row";
      const shB = document.createElement("button");
      shB.type = "button"; shB.className = "modal-btn"; shB.innerText = "🎲 Shuffle";
      shB.onclick = () => {
        spicyCard = list[Math.floor(Math.random() * list.length)];
        renderStage(stageEl);
      };
      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Chat Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: `😈 ${spicyCard.type}`,
        prompt: spicyCard.text,
        replyText: ""
      });
      row.append(shB, sendB);
      stageEl.append(tRow, box, row);
      return;
    }

    // 8. FANTASY SWIPE MATCH
    if (activeGameId === "fantasy") {
      const items = cfg("fantasyPool", DEFAULT_FANTASY_POOL);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        const ta = document.createElement("textarea");
        ta.rows = 5; ta.value = items.join("\n");
        const saveB = document.createElement("button");
        saveB.type = "button"; saveB.className = "game-mini-btn active"; saveB.innerText = "💾 Save Fantasies";
        saveB.onclick = () => {
          saveCfg("fantasyPool", parseLines(ta.value, DEFAULT_FANTASY_POOL));
          fantasyVotesA = {}; fantasyIdx = 0; showCustomize = false; renderStage(stageEl);
        };
        panel.append(ta, saveB);
        stageEl.appendChild(panel);
        return;
      }
      const done = fantasyIdx >= items.length;
      const box = document.createElement("div");
      box.className = "flirty-wheel-result";
      if (done) {
        const yesList = items.filter((_, i) => fantasyVotesA[i] === "yes");
        box.innerText = `Aapki Pasand Ready (${yesList.length}/${items.length})! Ab Love ko bhejein taake Mutual Match dikhe 💯`;
      } else {
        box.innerText = `${fantasyIdx + 1}/${items.length}: ${items[fantasyIdx]}`;
      }
      stageEl.appendChild(box);
      const row = document.createElement("div");
      row.className = "game-btn-row";
      if (!done) {
        [["no", "❌ Pass"], ["maybe", "🤫 Maybe"], ["yes", "❤️ Yes"]].forEach(([v, lbl]) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "modal-btn" + (v === "yes" ? " primary" : "");
          b.innerText = lbl;
          b.onclick = () => {
            fantasyVotesA[fantasyIdx] = v;
            fantasyIdx++;
            playEmotionSound("love");
            renderStage(stageEl);
          };
          row.appendChild(b);
        });
      } else {
        const resetB = document.createElement("button");
        resetB.type = "button"; resetB.className = "modal-btn"; resetB.innerText = "🔄 Phir Se";
        resetB.onclick = () => { fantasyVotesA = {}; fantasyIdx = 0; renderStage(stageEl); };
        const sendB = document.createElement("button");
        sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Love Se Match Karein";
        sendB.onclick = () => {
          const votes = { ...fantasyVotesA };
          fantasyVotesA = {}; fantasyIdx = 0;
          sendToChat({
            kind: "intimate_fantasy",
            title: "🔥 Secret Fantasy Match",
            items,
            votesA: votes,
            votesB: {}
          });
        };
        row.append(resetB, sendB);
      }
      stageEl.appendChild(row);
      return;
    }

    // 9. ROLEPLAY STUDIO
    if (activeGameId === "roleplay") {
      const rp = cfg("roleplay", DEFAULT_ROLEPLAY_OPTIONS);
      if (showCustomize) {
        const panel = document.createElement("div");
        panel.className = "intimate-custom-panel";
        const sInp = document.createElement("input"); sInp.type = "text"; sInp.placeholder = "Custom Scenario add...";
        const oInp = document.createElement("input"); oInp.type = "text"; oInp.placeholder = "Custom Outfit add...";
        const rInp = document.createElement("input"); rInp.type = "text"; rInp.placeholder = "Custom Rule add...";
        const saveB = document.createElement("button");
        saveB.type = "button"; saveB.className = "game-mini-btn active"; saveB.innerText = "💾 Add Roleplay Item";
        saveB.onclick = () => {
          const next = {
            scenarios: sInp.value.trim() ? [sInp.value.trim(), ...rp.scenarios] : rp.scenarios,
            outfits: oInp.value.trim() ? [oInp.value.trim(), ...rp.outfits] : rp.outfits,
            rules: rInp.value.trim() ? [rInp.value.trim(), ...rp.rules] : rp.rules
          };
          saveCfg("roleplay", next);
          roleplaySel = { scenarioIdx: 0, outfitIdx: 0, ruleIdx: 0 };
          showCustomize = false;
          renderStage(stageEl);
        };
        panel.append(sInp, oInp, rInp, saveB);
        stageEl.appendChild(panel);
        return;
      }
      const sc = rp.scenarios[roleplaySel.scenarioIdx % rp.scenarios.length];
      const out = rp.outfits[roleplaySel.outfitIdx % rp.outfits.length];
      const rl = rp.rules[roleplaySel.ruleIdx % rp.rules.length];
      const box = document.createElement("div");
      box.className = "flirty-wheel-result";
      box.innerText = `🎬 ${sc}\n👗 ${out}\n📜 ${rl}`;
      const row = document.createElement("div");
      row.className = "game-btn-row";
      [["scenarioIdx", "🎬 Scene"], ["outfitIdx", "👗 Look"], ["ruleIdx", "📜 Rule"]].forEach(([k, lbl]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn"; b.innerText = lbl;
        b.onclick = () => { roleplaySel[k]++; renderStage(stageEl); };
        row.appendChild(b);
      });
      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Roleplay Invite Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: "🎭 Tonight Roleplay Invite",
        prompt: `🎬 ${sc}\n👗 ${out}\n📜 ${rl}`,
        replyText: ""
      });
      stageEl.append(box, row, sendB);
      return;
    }

    // 10. SENSORY QUIZ
    if (activeGameId === "sensory") {
      const sRow = document.createElement("div"); sRow.className = "game-btn-row";
      ["🧊 Ice Cube", "🪶 Feather", "💋 Warm Kiss", "🕯️ Massage Oil"].forEach(it => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn" + (sensorySel.item === it ? " active" : "");
        b.innerText = it;
        b.onclick = () => { sensorySel.item = it; renderStage(stageEl); };
        sRow.appendChild(b);
      });
      const zRow = document.createElement("div"); zRow.className = "game-btn-row";
      ["🍯 Honey", "🍫 Chocolate", "🎀 Mam", "✨ Neck"].forEach(zn => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn" + (sensorySel.zone === zn ? " active" : "");
        b.innerText = zn;
        b.onclick = () => { sensorySel.zone = zn; renderStage(stageEl); };
        zRow.appendChild(b);
      });
      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Sensory Challenge Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: "🧊 Sensory Blindfold Quiz",
        prompt: `Aankhein band karke guess karo: ${sensorySel.item} ko ${sensorySel.zone} par kahan aur kaise use karun? 😉`,
        replyText: ""
      });
      stageEl.append(sRow, zRow, sendB);
      return;
    }

    // 11. WHISPER DARE
    if (activeGameId === "whisper") {
      const inp = document.createElement("input");
      inp.type = "text"; inp.className = "care-input";
      inp.placeholder = "Whisper line (e.g. 15s Honey/Chocolate ke liye apni khwahish bolo)...";
      inp.value = whisperPrompt;
      inp.oninput = () => { whisperPrompt = inp.value; };
      const row = document.createElement("div"); row.className = "game-btn-row";
      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Whisper Dare Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: "🎙️ Whisper Voice Dare",
        prompt: whisperPrompt.trim() || "Dheemi saanson ke saath 15-second whisper voice note bhejo: aaj Chocolate / Honey / Mam par kya pasand hai? 🎙️🔥",
        replyText: ""
      });
      const recB = document.createElement("button");
      recB.type = "button"; recB.className = "modal-btn"; recB.innerText = "🎤 Voice Record Kholen";
      recB.onclick = () => {
        document.getElementById("games-modal").style.display = "none";
        document.getElementById("voice-btn")?.click();
      };
      row.append(sendB, recB);
      stageEl.append(inp, row);
      return;
    }

    // 12. TEASE FRAME (1x PHOTO)
    if (activeGameId === "teaseframe") {
      const info = document.createElement("div");
      info.className = "flirty-wheel-result";
      info.innerText = "📸 Ek View-Once Tease Photo (neck, lips ya cute mirror hint) bhejo jo sirf 1 baar khulegi 🔥";
      const row = document.createElement("div"); row.className = "game-btn-row";
      const camB = document.createElement("button");
      camB.type = "button"; camB.className = "modal-btn primary"; camB.innerText = "📸 1x View-Once Camera";
      camB.onclick = () => {
        const voCheck = document.getElementById("view-once-checkbox");
        const voBtn = document.getElementById("view-once-btn");
        if (voCheck) voCheck.checked = true;
        voBtn?.classList.add("active");
        document.getElementById("games-modal").style.display = "none";
        document.getElementById("camera-btn")?.click();
      };
      const reqB = document.createElement("button");
      reqB.type = "button"; reqB.className = "modal-btn"; reqB.innerText = "💬 1x Photo Maangein";
      reqB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: "📸 View-Once Tease Request",
        prompt: "Sirf mere liye 1 View-Once naughty/cute Tease Frame bhejo abhi! 🔥📸",
        replyText: ""
      });
      row.append(camB, reqB);
      stageEl.append(info, row);
      return;
    }

    // 13. SPIN THE BOTTLE (CANVAS)
    if (activeGameId === "bottle") {
      const canvas = document.createElement("canvas");
      canvas.id = "bottle-canvas"; canvas.width = 230; canvas.height = 230;
      const res = document.createElement("div");
      res.className = "game-card-sub";
      res.innerText = bottleResult || "Bottle par tap karke ghumayein! 🍾";
      const spinBtn = document.createElement("button");
      spinBtn.type = "button"; spinBtn.className = "modal-btn primary"; spinBtn.innerText = "🍾 Spin Bottle";

      const triggerSpin = () => {
        if (bottleAnimating) return;
        bottleAnimating = true;
        const startA = bottleAngle;
        const delta = 1080 + Math.random() * 720;
        const startTs = performance.now();
        const dur = 1500;
        const tick = now => {
          const t = Math.min(1, (now - startTs) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          bottleAngle = startA + delta * eased;
          drawBottleWheel(canvas, bottleAngle);
          if (t < 1) {
            bottleRaf = requestAnimationFrame(tick);
          } else {
            bottleAnimating = false;
            const norm = ((bottleAngle % 360) + 360) % 360;
            const idx = Math.floor((norm / 360) * BOTTLE_SLICES.length) % BOTTLE_SLICES.length;
            bottleResult = `🍾 Bottle ruki: ${BOTTLE_SLICES[idx].label}!`;
            res.innerText = bottleResult;
            playEmotionSound("gift");
          }
        };
        bottleRaf = requestAnimationFrame(tick);
      };
      canvas.onclick = triggerSpin;
      spinBtn.onclick = triggerSpin;
      drawBottleWheel(canvas, bottleAngle);

      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn"; sendB.innerText = "💬 Chat Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: "🍾 Spin Bottle Result",
        prompt: bottleResult || "🍾 Honey/Chocolate/Mam Spin Bottle Challenge!",
        replyText: ""
      });
      stageEl.append(canvas, res, spinBtn, sendB);
      return;
    }

    // 14. 3 SECRET WISHES
    if (activeGameId === "wishes") {
      const w1 = document.createElement("input"); w1.type = "text"; w1.className = "care-input"; w1.placeholder = "Wish 1 (e.g. 🍯 Honey par slow kiss)...";
      const w2 = document.createElement("input"); w2.type = "text"; w2.className = "care-input"; w2.placeholder = "Wish 2 (e.g. 🍫 Chocolate 2-min attention)...";
      const w3 = document.createElement("input"); w3.type = "text"; w3.className = "care-input"; w3.placeholder = "Wish 3 (e.g. 🎀 Mam cuddle & sleep)...";
      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💌 3 Sealed Wishes Bhejein";
      sendB.onclick = () => {
        const list = [w1.value.trim(), w2.value.trim(), w3.value.trim()].filter(Boolean);
        const finalWishes = list.length ? list : [
          "🍯 Honey 2-Min Slow Focus",
          "🍫 Chocolate Sweet Attention",
          "🎀 Mam Tight Cuddle & Neck Kisses"
        ];
        sendToChat({
          kind: "intimate_wishes",
          title: "💌 3 Sealed Secret Wishes",
          wishes: finalWishes,
          accepted: false
        });
      };
      stageEl.append(w1, w2, w3, sendB);
      return;
    }

    // 15. KISSES & MARKS COUNTER
    if (activeGameId === "counter") {
      const stats = readJson(KISS_COUNTER_KEY, { kisses: 0, honey: 0, chocolate: 0, mam: 0 });
      const items = [
        ["kisses", "💋 Kisses"],
        ["honey", "🍯 Honey"],
        ["chocolate", "🍫 Chocolate"],
        ["mam", "🎀 Mam"]
      ];
      items.forEach(([key, label]) => {
        const row = document.createElement("div");
        row.className = "care-head-inline";
        const lbl = document.createElement("span");
        lbl.className = "game-card-sub tabular-nums";
        lbl.innerText = `${label}: ${stats[key] || 0}`;
        const grp = document.createElement("div");
        grp.className = "care-head-actions";
        const minus = document.createElement("button");
        minus.type = "button"; minus.className = "game-mini-btn"; minus.innerText = "-1";
        minus.onclick = () => { stats[key] = Math.max(0, (stats[key] || 0) - 1); writeJson(KISS_COUNTER_KEY, stats); renderStage(stageEl); };
        const plus = document.createElement("button");
        plus.type = "button"; plus.className = "game-mini-btn active"; plus.innerText = "+1";
        plus.onclick = () => { stats[key] = (stats[key] || 0) + 1; writeJson(KISS_COUNTER_KEY, stats); playEmotionSound("kiss"); renderStage(stageEl); };
        grp.append(minus, plus);
        row.append(lbl, grp);
        stageEl.appendChild(row);
      });
      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "📤 Score Chat Mein Share";
      sendB.onclick = () => sendToChat({
        kind: "score_card",
        challengeSubtab: "intimate",
        title: "💘 Intimate Scoreboard",
        summary: `💋 Kisses: ${stats.kisses} • 🍯 Honey: ${stats.honey} • 🍫 Chocolate: ${stats.chocolate} • 🎀 Mam: ${stats.mam}`
      });
      stageEl.appendChild(sendB);
      return;
    }

    // 16. BLURRED RIDDLE CARD
    if (activeGameId === "blurcard") {
      const box = document.createElement("div");
      box.className = "blur-secret-box" + (blurUnlocked ? "" : " blurred");
      box.innerText = blurMessage;
      const hintInp = document.createElement("input"); hintInp.type = "text"; hintInp.className = "care-input"; hintInp.value = blurHint; hintInp.placeholder = "Riddle Hint...";
      const keyInp = document.createElement("input"); keyInp.type = "text"; keyInp.className = "care-input"; keyInp.value = blurWord; keyInp.placeholder = "Unlock Keyword (e.g. Honey)...";
      const msgInp = document.createElement("input"); msgInp.type = "text"; msgInp.className = "care-input"; msgInp.value = blurMessage; msgInp.placeholder = "Chhupa Hua Secret Task...";
      hintInp.oninput = () => { blurHint = hintInp.value; };
      keyInp.oninput = () => { blurWord = keyInp.value; };
      msgInp.oninput = () => { blurMessage = msgInp.value; box.innerText = blurMessage; };

      const row = document.createElement("div"); row.className = "game-btn-row";
      const prevB = document.createElement("button"); prevB.type = "button"; prevB.className = "modal-btn"; prevB.innerText = blurUnlocked ? "🙈 Blur Karein" : "👀 Preview";
      prevB.onclick = () => { blurUnlocked = !blurUnlocked; renderStage(stageEl); };
      const sendB = document.createElement("button"); sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Blurred Card Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_blur",
        title: "🧩 Blurred Secret Card",
        hint: blurHint.trim() || "Password guess karo!",
        answer: blurWord.trim() || "Honey",
        secretText: blurMessage.trim() || "Tonight 2-Min Honey / Chocolate Reward Unlocked!",
        unlocked: false
      });
      row.append(prevB, sendB);
      stageEl.append(box, hintInp, keyInp, msgInp, row);
      return;
    }

    // 17. RAPID FIRE 10 (5s TIMER)
    if (activeGameId === "rapidfire") {
      const deck = cfg("rapidFire", DEFAULT_RAPID_FIRE);
      if (showCustomize) {
        const panel = document.createElement("div"); panel.className = "intimate-custom-panel";
        const qI = document.createElement("input"); qI.placeholder = "Sawal...";
        const aI = document.createElement("input"); aI.placeholder = "Option A...";
        const bI = document.createElement("input"); bI.placeholder = "Option B...";
        const addB = document.createElement("button"); addB.type = "button"; addB.className = "game-mini-btn active"; addB.innerText = "+ Add Question";
        addB.onclick = () => {
          if (!qI.value.trim()) return;
          saveCfg("rapidFire", [{ q: qI.value.trim(), a: aI.value.trim() || "Yes 🔥", b: bI.value.trim() || "No 🙈" }, ...deck].slice(0, 12));
          showCustomize = false; rapidIdx = 0; rapidAnswers = []; renderStage(stageEl);
        };
        panel.append(qI, aI, bI, addB);
        stageEl.appendChild(panel);
        return;
      }
      const done = rapidIdx >= deck.length;
      const timerLbl = document.createElement("div");
      timerLbl.className = "game-card-sub tabular-nums";
      timerLbl.innerText = done ? `✅ ${deck.length}/${deck.length} Rapid Fire Complete!` : `Q${rapidIdx + 1}/${deck.length} • ⏱️ ${rapidSec}s`;
      stageEl.appendChild(timerLbl);

      if (!done) {
        const curQ = deck[rapidIdx];
        const qBox = document.createElement("div");
        qBox.className = "flirty-wheel-result";
        qBox.innerText = curQ.q;
        stageEl.appendChild(qBox);
        const optRow = document.createElement("div");
        optRow.className = "game-btn-row";
        [curQ.a, curQ.b].forEach(choice => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "modal-btn primary"; b.innerText = choice;
          b.onclick = () => {
            clearInterval(rapidTimerInt);
            rapidAnswers.push(`${curQ.q} → ${choice}`);
            rapidIdx++;
            rapidSec = 5;
            playEmotionSound("chime");
            renderStage(stageEl);
          };
          optRow.appendChild(b);
        });
        stageEl.appendChild(optRow);
      } else {
        const sum = document.createElement("div");
        sum.className = "game-card-sub";
        sum.innerText = rapidAnswers.slice(0, 5).join("\n");
        const row = document.createElement("div"); row.className = "game-btn-row";
        const rst = document.createElement("button"); rst.type = "button"; rst.className = "modal-btn"; rst.innerText = "🔄 Phir Se";
        rst.onclick = () => { rapidIdx = 0; rapidAnswers = []; rapidSec = 5; renderStage(stageEl); };
        const sendB = document.createElement("button"); sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Answers Bhejein";
        sendB.onclick = () => {
          const textOut = rapidAnswers.join("\n");
          rapidIdx = 0; rapidAnswers = []; rapidSec = 5;
          sendToChat({ kind: "score_card", challengeSubtab: "intimate", title: "⚡ Rapid Fire 10 Answers", summary: textOut });
        };
        row.append(rst, sendB);
        stageEl.append(sum, row);
      }
      return;
    }

    // 18. BOSS COMMAND (1h PASS)
    if (activeGameId === "boss") {
      const cmds = cfg("bossCommands", DEFAULT_BOSS_COMMANDS);
      if (showCustomize) {
        const panel = document.createElement("div"); panel.className = "intimate-custom-panel";
        const ta = document.createElement("textarea"); ta.rows = 5; ta.value = cmds.join("\n");
        const saveB = document.createElement("button"); saveB.type = "button"; saveB.className = "game-mini-btn active"; saveB.innerText = "💾 Save Commands";
        saveB.onclick = () => { saveCfg("bossCommands", parseLines(ta.value, DEFAULT_BOSS_COMMANDS)); showCustomize = false; renderStage(stageEl); };
        panel.append(ta, saveB);
        stageEl.appendChild(panel);
        return;
      }
      if (!bossSelected) bossSelected = cmds[0];
      const listRow = document.createElement("div"); listRow.className = "quiz-opt-col";
      cmds.forEach(c => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn" + (bossSelected === c ? " active" : "");
        b.innerText = c;
        b.onclick = () => { bossSelected = c; renderStage(stageEl); };
        listRow.appendChild(b);
      });
      const sendB = document.createElement("button"); sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "👑 Boss Command Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_boss",
        title: "👑 1-Hour King/Queen Command",
        command: bossSelected,
        accepted: false
      });
      stageEl.append(listRow, sendB);
      return;
    }

    // 19. MOOD DARTBOARD (CANVAS)
    if (activeGameId === "dart") {
      const zones = cfg("dartZones", DEFAULT_DART_ZONES);
      if (showCustomize) {
        const panel = document.createElement("div"); panel.className = "intimate-custom-panel";
        const ta = document.createElement("textarea"); ta.rows = 5; ta.value = zones.join("\n");
        const saveB = document.createElement("button"); saveB.type = "button"; saveB.className = "game-mini-btn active"; saveB.innerText = "💾 Save Dart Rewards";
        saveB.onclick = () => { saveCfg("dartZones", parseLines(ta.value, DEFAULT_DART_ZONES)); showCustomize = false; renderStage(stageEl); };
        panel.append(ta, saveB);
        stageEl.appendChild(panel);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.id = "dart-canvas"; canvas.width = 230; canvas.height = 230;
      const res = document.createElement("div");
      res.className = "game-card-sub";
      res.innerText = dartResult || "Target par tap karke Dart phekein! 🎯";
      drawDartboard(canvas, dartHitPt);

      canvas.onclick = ev => {
        const rect = canvas.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
        const y = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
        dartHitPt = { x, y };
        const dist = Math.hypot(x - canvas.width / 2, y - canvas.height / 2);
        const maxR = canvas.width / 2 - 6;
        const ratio = dist / maxR;
        const zIdx = ratio <= 0.16 ? 0 : ratio <= 0.35 ? 1 : ratio <= 0.56 ? 2 : ratio <= 0.78 ? 3 : 4;
        dartResult = zones[Math.min(zones.length - 1, zIdx)] || zones[0];
        playEmotionSound(zIdx <= 1 ? "gift" : "love");
        renderStage(stageEl);
      };

      const row = document.createElement("div"); row.className = "game-btn-row";
      const sendB = document.createElement("button"); sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "💬 Chat Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_dare",
        title: "🎯 Mood Dartboard Hit",
        prompt: dartResult || zones[0],
        replyText: ""
      });
      row.appendChild(sendB);
      if (dartResult) row.appendChild(makeSaveWalletBtn(dartResult, "Mood Dartboard"));
      stageEl.append(canvas, res, row);
      return;
    }

    // 20. TONIGHT'S 4-STEP PLANNER
    if (activeGameId === "nightplan") {
      const pl = cfg("nightPlan", DEFAULT_NIGHT_PLAN);
      const curObj = {
        starter: pl.starters[planSel.starterIdx % pl.starters.length],
        tease: pl.teases[planSel.teaseIdx % pl.teases.length],
        main: pl.mains[planSel.mainIdx % pl.mains.length],
        aftercare: pl.aftercares[planSel.aftercareIdx % pl.aftercares.length]
      };
      const formatted = formatTonightPlan(curObj);
      const box = document.createElement("div");
      box.className = "flirty-wheel-result";
      box.style.whiteSpace = "pre-line";
      box.style.textAlign = "left";
      box.innerText = formatted;

      const row = document.createElement("div"); row.className = "game-btn-row";
      [
        ["starterIdx", "1️⃣ Starter"],
        ["teaseIdx", "2️⃣ Tease"],
        ["mainIdx", "3️⃣ Main"],
        ["aftercareIdx", "4️⃣ Care"]
      ].forEach(([k, lbl]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn"; b.innerText = lbl;
        b.onclick = () => { planSel[k]++; renderStage(stageEl); };
        row.appendChild(b);
      });

      const sendB = document.createElement("button");
      sendB.type = "button"; sendB.className = "modal-btn primary"; sendB.innerText = "🌙 Tonight's Plan Bhejein";
      sendB.onclick = () => sendToChat({
        kind: "intimate_plan",
        title: "🌙 Aaj Raat Ka 4-Step Plan",
        planText: formatted,
        approved: false
      });
      stageEl.append(box, row, sendB);
    }
  }

  function renderIntimateHub() {
    if (!rootEl) return;
    rootEl.innerHTML = "";

    // Glossary bar explaining Honey / Chocolate / Mam codewords cleanly without dangling separator dots
    const glossary = document.createElement("div");
    glossary.className = "intimate-glossary-bar";
    glossary.innerHTML = CODEWORD_GLOSSARY.map(c => `<span class="glossary-chip">${c.label}: ${c.hint}</span>`).join("");
    rootEl.appendChild(glossary);

    // Category filter chips
    const catRow = document.createElement("div");
    catRow.className = "intimate-cat-row";
    [
      ["all", "🔥 All (20)"],
      ["dice", "🎲 Spin/Dart"],
      ["cards", "🃏 Cards"],
      ["timers", "⏱️ Timers"],
      ["plan", "🌙 Plan/VIP"]
    ].forEach(([cat, lbl]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-subtab-btn" + (activeCat === cat ? " active" : "");
      b.innerText = lbl;
      b.onclick = () => {
        activeCat = cat;
        renderIntimateHub();
        b.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      };
      catRow.appendChild(b);
    });
    rootEl.appendChild(catRow);

    // 20-game selector grid
    const grid = document.createElement("div");
    grid.className = "intimate-picker-grid";
    const list = activeCat === "all"
      ? INTIMATE_GAMES_META
      : INTIMATE_GAMES_META.filter(g => g.cat === activeCat);

    list.forEach(g => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "intimate-game-card" + (activeGameId === g.id ? " active" : "");
      card.innerHTML = `<span class="intimate-game-icon">${g.icon}</span><span class="intimate-game-name">${g.name}</span><span class="intimate-game-badge">${g.badge}</span>`;
      card.onclick = () => {
        stopLoops();
        activeGameId = g.id;
        showCustomize = false;
        renderIntimateHub();
      };
      grid.appendChild(card);
    });
    rootEl.appendChild(grid);

    // Stage for currently selected game
    const stage = document.createElement("div");
    stage.className = "intimate-stage-box";
    renderStage(stage);
    rootEl.appendChild(stage);
  }

  // =====================================
  // RENDER INTERACTIVE INTIMATE CHAT CARDS
  // =====================================
  function renderIntimateChatBubble(m, dec, gd) {
    const uid = myUid();
    const box = document.createElement("div");
    box.className = "game-card-msg";

    const badge = document.createElement("div");
    badge.className = "game-creator-badge";
    badge.innerText = gd.creator === uid ? "✨ Aapne bheja" : "💖 Love ne bheja";
    box.appendChild(badge);

    const head = document.createElement("div");
    head.className = "game-card-head";
    head.innerText = gd.title || "🔥 Intimate Game";
    box.appendChild(head);

    if (gd.kind === "intimate_dare") {
      const promptEl = document.createElement("div");
      promptEl.className = "game-card-prompt";
      promptEl.innerText = gd.prompt || "";
      box.appendChild(promptEl);

      if (gd.replyText) {
        const rep = document.createElement("div");
        rep.className = "game-card-answer";
        rep.innerText = `💖 Jawab: ${gd.replyText}`;
        box.appendChild(rep);
        const wBtn = document.createElement("button");
        wBtn.type = "button"; wBtn.className = "game-mini-btn";
        wBtn.innerText = "🎟️ Wallet Mein Save Karein";
        wBtn.onclick = e => { e.stopPropagation(); saveToWallet(gd.prompt, gd.title); wBtn.innerText = "✅ Saved!"; };
        box.appendChild(wBtn);
      } else {
        const qRow = document.createElement("div"); qRow.className = "game-btn-row";
        ["🔥 Accepted!", "😘 Done!", "🍯 Coming Soon"].forEach(chip => {
          const qb = document.createElement("button");
          qb.type = "button"; qb.className = "game-mini-btn"; qb.innerText = chip;
          qb.onclick = async e => {
            e.stopPropagation();
            playEmotionSound("love");
            await chat.updateEncryptedMessage(
              m.id,
              { ...dec, gameData: { ...gd, replyText: chip, lastUpdatedBy: uid, lastActionText: `${gd.title}: ${chip}` } },
              { notifyPartner: true, alertKind: "letter", gameNoticeText: `${gd.title} complete!\n${gd.prompt}\n💖 ${chip}` }
            );
          };
          qRow.appendChild(qb);
        });
        box.appendChild(qRow);
      }
      return box;
    }

    if (gd.kind === "intimate_scratch") {
      if (gd.scratched) {
        const ans = document.createElement("div");
        ans.className = "game-card-answer";
        ans.innerText = `💋 Khula Reward:\n${gd.reward}`;
        box.appendChild(ans);
        const wBtn = document.createElement("button");
        wBtn.type = "button"; wBtn.className = "game-mini-btn";
        wBtn.innerText = "🎟️ Wallet Mein Save";
        wBtn.onclick = e => { e.stopPropagation(); saveToWallet(gd.reward, "Chat Scratch Card"); wBtn.innerText = "✅ Saved!"; };
        box.appendChild(wBtn);
      } else if (gd.creator === uid) {
        const sub = document.createElement("div");
        sub.className = "game-card-sub";
        sub.innerText = "Sealed Scratch Card bhej diya — Love ke scratch karne ka intezar ⏳";
        box.appendChild(sub);
      } else {
        const revBtn = document.createElement("button");
        revBtn.type = "button"; revBtn.className = "game-mini-btn active";
        revBtn.innerText = "💋 Tap karke Scratch Kholen!";
        revBtn.onclick = async e => {
          e.stopPropagation();
          playEmotionSound("gift");
          await chat.updateEncryptedMessage(
            m.id,
            { ...dec, gameData: { ...gd, scratched: true, lastUpdatedBy: uid, lastActionText: `💋 Scratch Card khula: ${gd.reward}` } },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: `💋 Scratch Card khul gaya!\n🎁 Reward: ${gd.reward}` }
          );
        };
        box.appendChild(revBtn);
      }
      return box;
    }

    if (gd.kind === "intimate_fantasy") {
      const items = gd.items || [];
      const votesB = { ...(gd.votesB || {}) };
      const res = evaluateFantasyMatches(items, gd.votesA || {}, votesB);
      if (res.totalReviewed >= items.length) {
        const ans = document.createElement("div");
        ans.className = "game-card-answer";
        ans.innerText = res.mutual.length
          ? `💯 Mutual Matches (${res.mutual.length}):\n• ${res.mutual.join("\n• ")}`
          : "🤫 Koi exact match nahi — Maybe list try karein!";
        box.appendChild(ans);
      } else if (gd.creator === uid) {
        const sub = document.createElement("div");
        sub.className = "game-card-sub";
        sub.innerText = `Fantasy Deck (${res.totalReviewed}/${items.length}) — Love ki choice ka intezar ⏳`;
        box.appendChild(sub);
      } else {
        const nextIdx = res.totalReviewed;
        const p = document.createElement("div");
        p.className = "game-card-prompt";
        p.innerText = `${nextIdx + 1}/${items.length}: ${items[nextIdx]}`;
        box.appendChild(p);
        const row = document.createElement("div"); row.className = "game-btn-row";
        [["no", "❌ No"], ["maybe", "🤫 Maybe"], ["yes", "❤️ Yes"]].forEach(([v, lbl]) => {
          const b = document.createElement("button");
          b.type = "button"; b.className = "game-mini-btn" + (v === "yes" ? " active" : "");
          b.innerText = lbl;
          b.onclick = async e => {
            e.stopPropagation();
            votesB[nextIdx] = v;
            const nextRes = evaluateFantasyMatches(items, gd.votesA || {}, votesB);
            const done = nextRes.totalReviewed >= items.length;
            const notice = done
              ? `🔥 Fantasy Match Complete! ${nextRes.mutual.length} Mutual Matches mile 💯`
              : "";
            playEmotionSound(done ? "gift" : "love");
            await chat.updateEncryptedMessage(
              m.id,
              { ...dec, gameData: { ...gd, votesB, lastUpdatedBy: uid, lastActionText: notice || `🔥 Fantasy vote ${nextIdx + 1}/${items.length}` } },
              { notifyPartner: done, alertKind: "letter", gameNoticeText: notice }
            );
          };
          row.appendChild(b);
        });
        box.appendChild(row);
      }
      return box;
    }

    if (gd.kind === "intimate_strip") {
      const roundIdx = gd.roundIdx || 0;
      const done = roundIdx >= 5;
      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      sub.innerText = done
        ? `🏆 Match Khatam! A: ${gd.scoreA} vs B: ${gd.scoreB}`
        : `Round ${roundIdx + 1}/5 • A: ${gd.scoreA} vs B: ${gd.scoreB}\n${(gd.stakes || [])[roundIdx] || ""}`;
      box.appendChild(sub);
      if (!done && gd.lastMover !== uid) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn active"; b.innerText = "🃏 Draw Next Round";
        b.onclick = async e => {
          e.stopPropagation();
          const cA = Math.floor(Math.random() * 13) + 2;
          const cB = Math.floor(Math.random() * 13) + 2;
          const { winner, stake } = resolveStripRound(roundIdx, cA, cB, gd.stakes || []);
          const nextA = (gd.scoreA || 0) + (winner === "A" ? 1 : 0);
          const nextB = (gd.scoreB || 0) + (winner === "B" ? 1 : 0);
          const nextR = roundIdx + 1;
          const notice = `🃏 Stakes R${roundIdx + 1}: ${cA} vs ${cB} (${winner === "draw" ? "Draw" : winner + " Jeeta"}) — ${stake}`;
          playEmotionSound("gift");
          await chat.updateEncryptedMessage(
            m.id,
            { ...dec, gameData: { ...gd, roundIdx: nextR, scoreA: nextA, scoreB: nextB, lastMover: uid, lastUpdatedBy: uid, lastActionText: notice } },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: nextR >= 5 ? notice : "" }
          );
        };
        box.appendChild(b);
      }
      return box;
    }

    if (gd.kind === "intimate_wishes") {
      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      if (gd.accepted) {
        sub.innerText = `✅ Wishes Accepted!\n• ${(gd.wishes || []).join("\n• ")}`;
        box.appendChild(sub);
      } else if (gd.creator === uid) {
        sub.innerText = "3 Secret Wishes bhej di — Love ke accept karne ka intezar ⏳";
        box.appendChild(sub);
      } else {
        sub.innerText = "• " + (gd.wishes || []).join("\n• ");
        box.appendChild(sub);
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn active"; b.innerText = "💋 3 Wishes Accept Karein";
        b.onclick = async e => {
          e.stopPropagation();
          playEmotionSound("gift");
          await chat.updateEncryptedMessage(
            m.id,
            { ...dec, gameData: { ...gd, accepted: true, lastUpdatedBy: uid, lastActionText: "💌 Love ne aapki 3 Secret Wishes accept kar lin!" } },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: "💌 Love ne aapki 3 Secret Wishes accept kar lin! 🔥" }
          );
        };
        box.appendChild(b);
      }
      return box;
    }

    if (gd.kind === "intimate_blur") {
      const p = document.createElement("div");
      p.className = "blur-secret-box" + (gd.unlocked ? "" : " blurred");
      p.innerText = gd.secretText || "";
      box.appendChild(p);
      const hintEl = document.createElement("div");
      hintEl.className = "game-card-sub";
      hintEl.innerText = `Hint: ${gd.hint || ""}`;
      box.appendChild(hintEl);
      if (!gd.unlocked && gd.creator !== uid) {
        const row = document.createElement("div"); row.className = "game-inline-reply";
        const inp = document.createElement("input"); inp.type = "text"; inp.className = "game-inline-input"; inp.placeholder = "Password guess karo...";
        inp.onclick = e => e.stopPropagation();
        const b = document.createElement("button"); b.type = "button"; b.className = "game-mini-btn active"; b.innerText = "🔓 Unlock";
        b.onclick = async e => {
          e.stopPropagation();
          if (!checkBlurredAnswer(gd.answer, inp.value)) {
            inp.placeholder = "Galat! Dobara try karo...";
            inp.value = "";
            return;
          }
          playEmotionSound("gift");
          await chat.updateEncryptedMessage(
            m.id,
            { ...dec, gameData: { ...gd, unlocked: true, lastUpdatedBy: uid, lastActionText: `🧩 Blurred Card unlock ho gaya: ${gd.secretText}` } },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: `🧩 Love ne Blurred Card unlock kar liya!\n"${gd.secretText}"` }
          );
        };
        row.append(inp, b);
        box.appendChild(row);
      }
      return box;
    }

    if (gd.kind === "intimate_boss") {
      const p = document.createElement("div");
      p.className = "game-card-prompt";
      p.innerText = gd.command || "";
      box.appendChild(p);
      if (gd.accepted) {
        const ans = document.createElement("div");
        ans.className = "game-card-answer";
        ans.innerText = "🫡 Hukam Manzoor Ho Gaya! 👑";
        box.appendChild(ans);
      } else if (gd.creator !== uid) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "game-mini-btn active"; b.innerText = "🫡 Hukam Manzoor!";
        b.onclick = async e => {
          e.stopPropagation();
          playEmotionSound("gift");
          await chat.updateEncryptedMessage(
            m.id,
            { ...dec, gameData: { ...gd, accepted: true, lastUpdatedBy: uid, lastActionText: `👑 Boss Command Manzoor: ${gd.command}` } },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: `👑 Boss Command Manzoor!\n${gd.command}` }
          );
        };
        box.appendChild(b);
      }
      return box;
    }

    // intimate_plan
    const p = document.createElement("div");
    p.className = "game-card-sub";
    p.innerText = gd.planText || "";
    box.appendChild(p);
    if (gd.approved) {
      const ans = document.createElement("div");
      ans.className = "game-card-answer";
      ans.innerText = "🌙 Tonight's Plan Locked! ❤️";
      box.appendChild(ans);
    } else if (gd.creator !== uid) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "game-mini-btn active"; b.innerText = "🌙 Lock Tonight's Plan!";
      b.onclick = async e => {
        e.stopPropagation();
        playEmotionSound("gift");
        await chat.updateEncryptedMessage(
          m.id,
          { ...dec, gameData: { ...gd, approved: true, lastUpdatedBy: uid, lastActionText: "🌙 Love ne Tonight's Plan Lock kar diya!" } },
          { notifyPartner: true, alertKind: "letter", gameNoticeText: "🌙 Tonight's 4-Step Plan Lock ho gaya! 🔥" }
        );
      };
      box.appendChild(b);
    }
    return box;
  }

  return {
    renderIntimateHub,
    renderIntimateChatBubble,
    openWalletModal,
    saveToWallet,
    stopLoops,
    openIntimateChallenge() {
      openGamesModal?.("intimate");
    }
  };
}
