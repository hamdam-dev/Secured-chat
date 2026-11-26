import { playEmotionSound } from "./crypto.js";

const VAULT_PIN_KEY = "sc_vault_pin_v1";
const VAULT_ITEMS_KEY = "sc_private_vault_v1";

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

function playSoftHeartbeatTone() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const beat = (delay, freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.24);
    };
    beat(0, 68);
    beat(0.24, 54);
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {}
}

export function createVaultAndTogetherManager({
  getAuth,
  getDb,
  doc,
  setDoc,
  notes,
  notifications,
  spawnFloatingHearts
}) {
  // ==============================
  // 1. PRIVATE SECRET VAULT
  // ==============================
  const vaultModal = document.getElementById("vault-modal");
  const lockScreen = document.getElementById("vault-lock-screen");
  const contentScreen = document.getElementById("vault-content-screen");
  const pinInput = document.getElementById("vault-pin-input");
  const pinErr = document.getElementById("vault-pin-err");
  const noteInput = document.getElementById("vault-note-input");
  const itemsListEl = document.getElementById("vault-items-list");
  const newPinInput = document.getElementById("vault-new-pin-input");

  let isVaultUnlocked = false;

  function getVaultPin() {
    return localStorage.getItem(VAULT_PIN_KEY) || "0000";
  }

  function lockVault() {
    isVaultUnlocked = false;
    if (pinInput) pinInput.value = "";
    if (pinErr) pinErr.innerText = "";
    if (lockScreen) lockScreen.style.display = "flex";
    if (contentScreen) contentScreen.style.display = "none";
  }

  function renderVaultItems() {
    if (!itemsListEl) return;
    const list = readJson(VAULT_ITEMS_KEY, []);
    itemsListEl.innerHTML = "";
    if (!list.length) {
      itemsListEl.innerHTML = `<p style="font-size:12.5px;opacity:0.75;">Vault abhi khali hai — apna pehla secret note ya photo save karein 🔒</p>`;
      return;
    }
    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "vault-item-card";
      if (item.imageData) {
        const img = document.createElement("img");
        img.className = "vault-item-img";
        img.src = item.imageData;
        img.alt = "Private Vault Photo";
        card.appendChild(img);
      }
      if (item.text) {
        const txt = document.createElement("div");
        txt.innerText = item.text;
        card.appendChild(txt);
      }
      const foot = document.createElement("div");
      foot.className = "care-head-inline";
      const dt = document.createElement("span");
      dt.style.cssText = "font-size:10.5px;opacity:0.7;";
      dt.innerText = new Date(item.at || Date.now()).toLocaleDateString();
      const del = document.createElement("button");
      del.type = "button";
      del.className = "pinned-close-btn";
      del.innerText = "✕";
      del.setAttribute("aria-label", "Delete vault item");
      del.onclick = () => {
        const next = readJson(VAULT_ITEMS_KEY, []).filter(x => x.id !== item.id);
        writeJson(VAULT_ITEMS_KEY, next);
        renderVaultItems();
      };
      foot.append(dt, del);
      card.appendChild(foot);
      itemsListEl.appendChild(card);
    });
  }

  function tryUnlockVault() {
    const entered = (pinInput?.value || "").trim();
    if (entered !== getVaultPin()) {
      if (pinErr) pinErr.innerText = "Galat PIN! Dobara try karein (Default: 0000)";
      return;
    }
    isVaultUnlocked = true;
    if (pinErr) pinErr.innerText = "";
    if (lockScreen) lockScreen.style.display = "none";
    if (contentScreen) contentScreen.style.display = "flex";
    playEmotionSound("love");
    renderVaultItems();
  }

  document.getElementById("open-vault-btn")?.addEventListener("click", () => {
    document.getElementById("more-dropdown").style.display = "none";
    lockVault();
    if (vaultModal) vaultModal.style.display = "flex";
  });
  document.getElementById("close-vault-btn")?.addEventListener("click", () => {
    lockVault();
    if (vaultModal) vaultModal.style.display = "none";
  });
  document.getElementById("vault-unlock-btn")?.addEventListener("click", tryUnlockVault);
  pinInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") tryUnlockVault();
  });
  document.getElementById("vault-lock-btn")?.addEventListener("click", lockVault);

  document.getElementById("vault-save-note-btn")?.addEventListener("click", () => {
    if (!isVaultUnlocked) return;
    const text = (noteInput?.value || "").trim();
    if (!text) {
      noteInput?.focus();
      return;
    }
    noteInput.value = "";
    const next = [{ id: `v_${Date.now()}`, text, at: Date.now() }, ...readJson(VAULT_ITEMS_KEY, [])].slice(0, 40);
    writeJson(VAULT_ITEMS_KEY, next);
    playEmotionSound("chime");
    renderVaultItems();
  });

  document.getElementById("vault-add-photo-btn")?.addEventListener("click", () => {
    if (!isVaultUnlocked) return;
    notes?.setPickingMedia?.(true);
    document.getElementById("vault-photo-input")?.click();
  });

  document.getElementById("vault-photo-input")?.addEventListener("change", e => {
    notes?.setPickingMedia?.(false);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isVaultUnlocked) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 560;
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      const next = [{ id: `v_${Date.now()}`, imageData: dataUrl, at: Date.now() }, ...readJson(VAULT_ITEMS_KEY, [])].slice(0, 25);
      writeJson(VAULT_ITEMS_KEY, next);
      playEmotionSound("gift");
      renderVaultItems();
    };
    img.src = url;
  });

  document.getElementById("vault-change-pin-btn")?.addEventListener("click", () => {
    if (!isVaultUnlocked) return;
    const val = (newPinInput?.value || "").trim();
    if (!/^\d{4,6}$/.test(val)) {
      if (newPinInput) newPinInput.placeholder = "4-6 digits likhein!";
      return;
    }
    try { localStorage.setItem(VAULT_PIN_KEY, val); } catch {}
    newPinInput.value = "";
    newPinInput.placeholder = "✅ PIN Save Ho Gaya!";
    playEmotionSound("chime");
  });

  // ==============================
  // 2. COZY TOGETHER MODE
  // ==============================
  const togetherModal = document.getElementById("together-modal");
  const timerDisp = document.getElementById("together-timer-display");
  const statusLbl = document.getElementById("together-status-label");
  const pulseToggle = document.getElementById("together-pulse-toggle");
  const startBtn = document.getElementById("together-start-btn");
  const ringEl = togetherModal?.querySelector(".together-ring");

  let selectedMinutes = 10;
  let secondsLeft = 600;
  let togetherInt = null;
  let pulseCounter = 0;

  function renderTogetherDisplay() {
    if (timerDisp) {
      const m = Math.floor(Math.max(0, secondsLeft) / 60);
      const s = Math.max(0, secondsLeft) % 60;
      timerDisp.innerText = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }

  function stopTogetherMode() {
    clearInterval(togetherInt);
    togetherInt = null;
    ringEl?.classList.remove("beating");
    if (startBtn) startBtn.innerText = "▶ Start Session";
    if (statusLbl) statusLbl.innerText = "Ready for cozy calm time ✨";
  }

  document.querySelectorAll("#together-duration-row [data-together-min]").forEach(btn => {
    btn.addEventListener("click", () => {
      stopTogetherMode();
      selectedMinutes = Number(btn.dataset.togetherMin || 10);
      secondsLeft = selectedMinutes * 60;
      document.querySelectorAll("#together-duration-row [data-together-min]").forEach(b => {
        b.classList.toggle("active", b === btn);
      });
      renderTogetherDisplay();
    });
  });

  startBtn?.addEventListener("click", () => {
    if (togetherInt) {
      stopTogetherMode();
      return;
    }
    if (secondsLeft <= 0) secondsLeft = selectedMinutes * 60;
    ringEl?.classList.add("beating");
    startBtn.innerText = "⏸ Pause Session";
    if (statusLbl) statusLbl.innerText = "🌙 Cozy Together Mode Active — Bas saath raho 💓";
    pulseCounter = 0;
    if (pulseToggle?.checked) {
      playSoftHeartbeatTone();
      navigator.vibrate?.([40, 80, 40]);
    }
    togetherInt = setInterval(() => {
      secondsLeft--;
      pulseCounter++;
      renderTogetherDisplay();
      if (pulseToggle?.checked && pulseCounter % 3 === 0) {
        playSoftHeartbeatTone();
        navigator.vibrate?.([35, 70, 35]);
      }
      if (secondsLeft <= 0) {
        stopTogetherMode();
        playEmotionSound("gift");
        if (statusLbl) statusLbl.innerText = "✨ Session Complete! Ek lambi hug banti hai 🤗";
      }
    }, 1000);
  });

  document.getElementById("together-stop-btn")?.addEventListener("click", () => {
    stopTogetherMode();
    secondsLeft = selectedMinutes * 60;
    renderTogetherDisplay();
  });

  document.getElementById("together-send-pulse-btn")?.addEventListener("click", () => {
    spawnFloatingHearts?.("💓");
    playSoftHeartbeatTone();
    navigator.vibrate?.([50, 90, 50]);
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (user && db) {
      setDoc(doc(db, "status", user.uid), { togetherPulseAt: Date.now() }, { merge: true }).catch(() => {});
      notifications?.sendPushAlert?.("ping");
    }
  });

  document.getElementById("open-together-btn")?.addEventListener("click", () => {
    document.getElementById("more-dropdown").style.display = "none";
    renderTogetherDisplay();
    if (togetherModal) togetherModal.style.display = "flex";
  });
  document.getElementById("close-together-btn")?.addEventListener("click", () => {
    stopTogetherMode();
    if (togetherModal) togetherModal.style.display = "none";
  });

  function handleRemoteTogetherPulse() {
    spawnFloatingHearts?.("💓");
    playSoftHeartbeatTone();
    navigator.vibrate?.([50, 90, 50]);
  }

  return {
    lockAll() {
      lockVault();
      stopTogetherMode();
    },
    handleRemoteTogetherPulse
  };
}
