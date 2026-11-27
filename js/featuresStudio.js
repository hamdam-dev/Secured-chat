import { escapeHtml, playEmotionSound } from "./crypto.js";
import { startNightAmbience, stopNightAmbience } from "./ambience.js";
import { createMysteryBoxes, DEFAULT_SCRATCH_REWARDS } from "../shared/intimateLogic.js";
import {
  SECRET_VIBES,
  POSE_CHALLENGES,
  computeCapsuleUnlockTime,
  areTouchesMeeting,
  normalizeBackupBundle
} from "../shared/featuresLogic.js";

const LOVE_WALLET_KEY = "sc_love_wallet_v1";
const VAULT_ITEMS_KEY = "sc_private_vault_v1";
const STARRED_MSGS_KEY = "sc_starred_msgs_v1";
const INTIMATE_CUSTOM_KEY = "sc_intimate_custom_v1";
const UNIVERSAL_CUSTOM_KEY = "sc_custom_games_v2";
const CUSTOM_QUICK_REACTS_KEY = "sc_custom_quick_reacts_v1";

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

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveBackupAesKey(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function createFeaturesStudio({
  getAuth,
  getDb,
  fsOps,
  chat,
  notes,
  notifications,
  spawnFloatingHearts
}) {
  const { doc, setDoc } = fsOps;
  const moreDropdown = document.getElementById("more-dropdown");

  function myUid() {
    return getAuth()?.currentUser?.uid || "";
  }

  // ======================================
  // 1. LIVE TOUCH SYNC CANVAS
  // ======================================
  const touchModal = document.getElementById("touch-sync-modal");
  const touchCanvas = document.getElementById("touch-sync-canvas");
  const touchStatus = document.getElementById("touch-sync-status");

  let myTouch = { x: 0.5, y: 0.5, active: false, ts: 0 };
  let partnerTouch = { x: 0.5, y: 0.5, active: false, ts: 0 };
  let lastTouchPushAt = 0;
  let lastMeetBurstAt = 0;
  let touchRaf = null;
  let touchExpiryTimer = null;

  function scheduleTouchDraw() {
    if (!touchRaf && touchCanvas && touchModal?.style.display === "flex") {
      touchRaf = requestAnimationFrame(drawTouchSyncFrame);
    }
  }

  function drawTouchSyncFrame() {
    touchRaf = null;
    if (!touchCanvas || touchModal?.style.display !== "flex") {
      return;
    }
    const ctx = touchCanvas.getContext("2d");
    const w = touchCanvas.width;
    const h = touchCanvas.height;
    const now = Date.now();

    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(w / 2, h / 2, 12, w / 2, h / 2, w * 0.72);
    bg.addColorStop(0, "#3b0d2c");
    bg.addColorStop(1, "#160511");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle concentric guide rings
    ctx.strokeStyle = "rgba(255, 182, 193, 0.14)";
    ctx.lineWidth = 1;
    [45, 90, 130].forEach(rad => {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2);
      ctx.stroke();
    });

    const pFresh = partnerTouch.active && now - (partnerTouch.ts || 0) < 4500;
    const mFresh = myTouch.active && now - (myTouch.ts || 0) < 4500;
    const meeting = areTouchesMeeting(myTouch, partnerTouch, 0.14, now);

    if (meeting && now - lastMeetBurstAt > 1200) {
      lastMeetBurstAt = now;
      playEmotionSound("love");
      navigator.vibrate?.([70, 80, 120]);
      spawnFloatingHearts?.("💞");
    }

    if (pFresh) {
      const px = partnerTouch.x * w;
      const py = partnerTouch.y * h;
      const grad = ctx.createRadialGradient(px, py, 4, px, py, 44);
      grad.addColorStop(0, "rgba(255, 105, 180, 0.95)");
      grad.addColorStop(1, "rgba(255, 105, 180, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💗 Love", px, Math.max(16, py - 24));
    }

    if (mFresh) {
      const mx = myTouch.x * w;
      const my = myTouch.y * h;
      const grad = ctx.createRadialGradient(mx, my, 4, mx, my, meeting ? 56 : 40);
      grad.addColorStop(0, meeting ? "rgba(255, 215, 0, 0.96)" : "rgba(255, 64, 129, 0.95)");
      grad.addColorStop(1, "rgba(255, 64, 129, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, meeting ? 56 : 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(meeting ? "💞 Synced!" : "💖 Aap", mx, Math.max(16, my - 24));
    }

    if (!mFresh && !pFresh) {
      ctx.fillStyle = "rgba(255, 224, 236, 0.72)";
      ctx.font = "600 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Screen par ungli rakhein aur hilaayein 👆", w / 2, h / 2 + 4);
    }

    if (touchStatus) {
      let nextStatus = "Screen par ungli rakhein — jab dono ki ungliyan milengi to Heartbeat Burst hoga!";
      if (meeting) nextStatus = "💞 Ungliyan Mil Gayin! Live Heartbeat Sync!";
      else if (mFresh && pFresh) nextStatus = "✨ Partner ka glow dikh raha hai — paas laayein!";
      else if (pFresh) nextStatus = "💗 Love screen par touch kar rahe hain — apni ungli rakhein!";
      if (touchStatus.innerText !== nextStatus) touchStatus.innerText = nextStatus;
    }

    if (touchExpiryTimer) {
      clearTimeout(touchExpiryTimer);
      touchExpiryTimer = null;
    }
    if (mFresh || pFresh) {
      const oldest = Math.min(
        mFresh ? myTouch.ts || now : now,
        pFresh ? partnerTouch.ts || now : now
      );
      const waitMs = Math.max(250, 4550 - (now - oldest));
      touchExpiryTimer = setTimeout(scheduleTouchDraw, waitMs);
    }
  }

  function pushMyTouch(active) {
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db) return;
    const now = Date.now();
    if (active && now - lastTouchPushAt < 100) return;
    lastTouchPushAt = now;
    setDoc(
      doc(db, "status", user.uid),
      { touchPoint: { x: myTouch.x, y: myTouch.y, active, ts: now } },
      { merge: true }
    ).catch(() => {});
  }

  function updateTouchFromEvent(ev, active) {
    if (!touchCanvas) return;
    const rect = touchCanvas.getBoundingClientRect();
    const clientX = ev.touches?.[0]?.clientX ?? ev.changedTouches?.[0]?.clientX ?? ev.clientX;
    const clientY = ev.touches?.[0]?.clientY ?? ev.changedTouches?.[0]?.clientY ?? ev.clientY;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
    myTouch = { x, y, active, ts: Date.now() };
    pushMyTouch(active);
    scheduleTouchDraw();
  }

  if (touchCanvas) {
    touchCanvas.addEventListener("pointerdown", e => {
      updateTouchFromEvent(e, true);
    });
    touchCanvas.addEventListener("pointermove", e => {
      if (myTouch.active) updateTouchFromEvent(e, true);
    });
    const endTouch = () => {
      if (!myTouch.active) return;
      myTouch = { ...myTouch, active: false, ts: Date.now() };
      pushMyTouch(false);
      scheduleTouchDraw();
    };
    window.addEventListener("pointerup", endTouch, { passive: true });
    touchCanvas.addEventListener("touchstart", e => {
      e.preventDefault();
      updateTouchFromEvent(e, true);
    }, { passive: false });
    touchCanvas.addEventListener("touchmove", e => {
      e.preventDefault();
      updateTouchFromEvent(e, true);
    }, { passive: false });
    touchCanvas.addEventListener("touchend", endTouch, { passive: true });
  }

  document.querySelectorAll("#touch-ambience-row [data-touch-ambience]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.touchAmbience || "off";
      startNightAmbience(mode);
      document.querySelectorAll("#touch-ambience-row [data-touch-ambience]").forEach(b => {
        b.classList.toggle("active", b === btn && mode !== "off");
      });
    });
  });

  document.getElementById("open-touch-btn")?.addEventListener("click", () => {
    if (moreDropdown) moreDropdown.style.display = "none";
    if (touchModal) touchModal.style.display = "flex";
    if (!touchRaf) touchRaf = requestAnimationFrame(drawTouchSyncFrame);
  });
  document.getElementById("close-touch-btn")?.addEventListener("click", () => {
    if (touchRaf) {
      cancelAnimationFrame(touchRaf);
      touchRaf = null;
    }
    if (touchExpiryTimer) {
      clearTimeout(touchExpiryTimer);
      touchExpiryTimer = null;
    }
    stopNightAmbience();
    if (touchModal) touchModal.style.display = "none";
  });

  // ======================================
  // 2. SECRET TAP VIBRATION LANGUAGE
  // ======================================
  const vibeModal = document.getElementById("vibe-lang-modal");
  const vibeGrid = document.getElementById("vibe-lang-grid");
  const vibeFeedback = document.getElementById("vibe-lang-feedback");
  let lastRemoteVibeTs = 0;

  if (vibeGrid) {
    vibeGrid.innerHTML = "";
    SECRET_VIBES.forEach(v => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "modal-btn";
      b.innerText = `${v.icon} ${v.label}`;
      b.onclick = () => {
        navigator.vibrate?.(v.pattern);
        playEmotionSound("love");
        spawnFloatingHearts?.(v.icon);
        if (vibeFeedback) vibeFeedback.innerText = `✅ Signal bheja: ${v.msg}`;
        const user = getAuth()?.currentUser;
        const db = getDb();
        if (user && db) {
          setDoc(
            doc(db, "status", user.uid),
            { secretVibe: { key: v.key, msg: v.msg, pattern: v.pattern, ts: Date.now() } },
            { merge: true }
          ).catch(() => {});
          notifications?.sendPushAlert?.("ping");
        }
      };
      vibeGrid.appendChild(b);
    });
  }

  document.getElementById("open-vibes-btn")?.addEventListener("click", () => {
    if (moreDropdown) moreDropdown.style.display = "none";
    if (vibeFeedback) vibeFeedback.innerText = "Tap karke secret pattern bhejein!";
    if (vibeModal) vibeModal.style.display = "flex";
  });
  document.getElementById("close-vibes-btn")?.addEventListener("click", () => {
    if (vibeModal) vibeModal.style.display = "none";
  });

  // ======================================
  // 3. TIME CAPSULE MESSAGES
  // ======================================
  const capsuleModal = document.getElementById("capsule-modal");
  const capsuleTextInput = document.getElementById("capsule-text-input");
  const capsuleDtInput = document.getElementById("capsule-custom-dt");
  let capsulePreset = "15m";

  function syncCapsuleDtPreview() {
    if (!capsuleDtInput) return;
    const ms = computeCapsuleUnlockTime(capsulePreset, Date.now());
    const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
    capsuleDtInput.value = d.toISOString().slice(0, 16);
  }

  document.querySelectorAll("#capsule-preset-row [data-cap-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      capsulePreset = btn.dataset.capPreset || "15m";
      document.querySelectorAll("#capsule-preset-row [data-cap-preset]").forEach(b => {
        b.classList.toggle("active", b === btn);
      });
      syncCapsuleDtPreview();
    });
  });

  document.getElementById("open-capsule-btn")?.addEventListener("click", () => {
    if (moreDropdown) moreDropdown.style.display = "none";
    syncCapsuleDtPreview();
    if (capsuleModal) capsuleModal.style.display = "flex";
  });
  document.getElementById("close-capsule-btn")?.addEventListener("click", () => {
    if (capsuleModal) capsuleModal.style.display = "none";
  });
  document.getElementById("capsule-send-btn")?.addEventListener("click", async () => {
    const txt = (capsuleTextInput?.value || "").trim();
    if (!txt) {
      capsuleTextInput?.focus();
      return;
    }
    let unlockAtMs = computeCapsuleUnlockTime(capsulePreset, Date.now());
    if (capsuleDtInput?.value) {
      const parsed = new Date(capsuleDtInput.value).getTime();
      if (!Number.isNaN(parsed) && parsed > Date.now() + 10000) {
        unlockAtMs = parsed;
      }
    }
    capsuleTextInput.value = "";
    if (capsuleModal) capsuleModal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage(
      {
        capsuleData: {
          text: txt,
          unlockAtMs,
          createdAtMs: Date.now(),
          creator: myUid()
        }
      },
      "letter"
    );
  });

  // ======================================
  // 4. SONG DEDICATION CARD
  // ======================================
  const songModal = document.getElementById("song-modal");
  const songTitleInput = document.getElementById("song-title-input");
  const songArtistInput = document.getElementById("song-artist-input");
  const songLyricsInput = document.getElementById("song-lyrics-input");
  const songNoteInput = document.getElementById("song-note-input");

  document.getElementById("open-song-btn")?.addEventListener("click", () => {
    if (moreDropdown) moreDropdown.style.display = "none";
    if (songModal) songModal.style.display = "flex";
  });
  document.getElementById("close-song-btn")?.addEventListener("click", () => {
    if (songModal) songModal.style.display = "none";
  });
  document.getElementById("song-send-btn")?.addEventListener("click", async () => {
    const title = (songTitleInput?.value || "").trim();
    if (!title) {
      songTitleInput?.focus();
      return;
    }
    const artist = (songArtistInput?.value || "").trim();
    const lyrics = (songLyricsInput?.value || "").trim();
    const note = (songNoteInput?.value || "").trim();
    songTitleInput.value = "";
    if (songArtistInput) songArtistInput.value = "";
    if (songLyricsInput) songLyricsInput.value = "";
    if (songNoteInput) songNoteInput.value = "";
    if (songModal) songModal.style.display = "none";
    playEmotionSound("love");
    await chat.sendEncryptedMessage(
      { songCard: { title, artist, lyrics, note, creator: myUid() } },
      "letter"
    );
  });

  // ======================================
  // 5. 7-BOX MYSTERY GIFT PACK
  // ======================================
  const mysteryModal = document.getElementById("mystery-modal");
  const mysteryInputsWrap = document.getElementById("mystery-boxes-inputs");
  const mysteryDefaults = [
    ...DEFAULT_SCRATCH_REWARDS,
    "🌙 Midnight Surprise Hug & Secret Fantasy"
  ];
  let mysteryFields = [];

  function renderMysteryBuilder() {
    if (!mysteryInputsWrap) return;
    mysteryInputsWrap.innerHTML = "";
    mysteryFields = Array.from({ length: 7 }, (_, i) => {
      const row = document.createElement("div");
      row.className = "mystery-input-row";
      const lbl = document.createElement("span");
      lbl.className = "mystery-day-lbl";
      lbl.innerText = `Box ${i + 1}`;
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "care-input";
      inp.value = mysteryDefaults[i % mysteryDefaults.length];
      inp.setAttribute("aria-label", `Mystery Box ${i + 1} gift`);
      row.append(lbl, inp);
      mysteryInputsWrap.appendChild(row);
      return inp;
    });
  }

  document.getElementById("open-mystery-btn")?.addEventListener("click", () => {
    if (moreDropdown) moreDropdown.style.display = "none";
    renderMysteryBuilder();
    if (mysteryModal) mysteryModal.style.display = "flex";
  });
  document.getElementById("close-mystery-btn")?.addEventListener("click", () => {
    if (mysteryModal) mysteryModal.style.display = "none";
  });
  document.getElementById("mystery-send-btn")?.addEventListener("click", async () => {
    const rewards = mysteryFields.map(el => el.value.trim());
    const boxes = createMysteryBoxes(rewards);
    if (mysteryModal) mysteryModal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage(
      {
        gameData: {
          kind: "intimate_mystery",
          title: "🎁 7-Box Mystery Pack",
          boxes,
          creator: myUid()
        }
      },
      "letter"
    );
  });

  // ======================================
  // 6. DUAL COUPLE POLAROID & POSE CHALLENGE
  // ======================================
  const polaroidModal = document.getElementById("polaroid-modal");
  const polaroidCanvas = document.getElementById("polaroid-canvas");
  const polaroidPoseRow = document.getElementById("polaroid-pose-row");
  const polaroidCaption = document.getElementById("polaroid-caption-input");
  let selectedPose = POSE_CHALLENGES[0];
  let photo1Img = null;
  let photo2Img = null;

  function drawCoverImg(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
  }

  function renderPolaroidCanvas() {
    if (!polaroidCanvas) return;
    const ctx = polaroidCanvas.getContext("2d");
    const w = polaroidCanvas.width;
    const h = polaroidCanvas.height;

    ctx.fillStyle = "#fff9fb";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#f48fb1";
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    const drawSlot = (img, x, y, sw, sh, emptyLabel) => {
      ctx.fillStyle = "#fce4ec";
      ctx.fillRect(x, y, sw, sh);
      if (img) {
        drawCoverImg(ctx, img, x, y, sw, sh);
      } else {
        ctx.fillStyle = "#ad1457";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(emptyLabel, x + sw / 2, y + sh / 2);
      }
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, sw, sh);
    };

    drawSlot(photo1Img, 14, 16, 140, 166, "📷 Photo 1 (Aap)");
    drawSlot(photo2Img, 166, 16, 140, 166, "📷 Photo 2 (Love)");

    ctx.fillStyle = "#d81b60";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(selectedPose.label, w / 2, 206);

    const cap = (polaroidCaption?.value || "").trim() || "Janan & Mino Forever 💖";
    ctx.fillStyle = "#4a0e2e";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(cap, w / 2, 232);
  }

  if (polaroidPoseRow) {
    polaroidPoseRow.innerHTML = "";
    POSE_CHALLENGES.forEach((p, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-mini-btn" + (idx === 0 ? " active" : "");
      b.innerText = p.label;
      b.onclick = () => {
        selectedPose = p;
        polaroidPoseRow.querySelectorAll("button").forEach(btn => btn.classList.toggle("active", btn === b));
        renderPolaroidCanvas();
      };
      polaroidPoseRow.appendChild(b);
    });
  }

  function bindPolaroidFile(inputId, slot) {
    document.getElementById(inputId)?.addEventListener("change", e => {
      notes?.setPickingMedia?.(false);
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        if (slot === 1) photo1Img = img;
        else photo2Img = img;
        URL.revokeObjectURL(url);
        renderPolaroidCanvas();
      };
      img.src = url;
    });
  }
  bindPolaroidFile("polaroid-p1-input", 1);
  bindPolaroidFile("polaroid-p2-input", 2);

  document.getElementById("polaroid-p1-btn")?.addEventListener("click", () => {
    notes?.setPickingMedia?.(true);
    document.getElementById("polaroid-p1-input")?.click();
  });
  document.getElementById("polaroid-p2-btn")?.addEventListener("click", () => {
    notes?.setPickingMedia?.(true);
    document.getElementById("polaroid-p2-input")?.click();
  });
  polaroidCaption?.addEventListener("input", renderPolaroidCanvas);

  document.getElementById("open-polaroid-btn")?.addEventListener("click", () => {
    if (moreDropdown) moreDropdown.style.display = "none";
    renderPolaroidCanvas();
    if (polaroidModal) polaroidModal.style.display = "flex";
  });
  document.getElementById("close-polaroid-btn")?.addEventListener("click", () => {
    if (polaroidModal) polaroidModal.style.display = "none";
  });

  document.getElementById("polaroid-send-btn")?.addEventListener("click", async () => {
    if (!polaroidCanvas) return;
    const dataUrl = polaroidCanvas.toDataURL("image/jpeg", 0.78);
    const cap = (polaroidCaption?.value || "").trim() || selectedPose.label;
    if (polaroidModal) polaroidModal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage(
      { imageData: dataUrl, polaroid: true, text: `📸 ${cap}` },
      "letter"
    );
  });

  document.getElementById("polaroid-vault-btn")?.addEventListener("click", () => {
    if (!polaroidCanvas) return;
    const dataUrl = polaroidCanvas.toDataURL("image/jpeg", 0.75);
    const cap = (polaroidCaption?.value || "").trim() || selectedPose.label;
    const list = readJson(VAULT_ITEMS_KEY, []);
    const next = [{ id: `v_pol_${Date.now()}`, imageData: dataUrl, text: `📸 ${cap}`, at: Date.now() }, ...list].slice(0, 30);
    writeJson(VAULT_ITEMS_KEY, next);
    playEmotionSound("gift");
    const btn = document.getElementById("polaroid-vault-btn");
    if (btn) {
      btn.innerText = "✅ Vault Saved!";
      setTimeout(() => { btn.innerText = "🔒 Vault Mein Save"; }, 1600);
    }
  });

  // ======================================
  // 7. SHARED MEDIA & MEMORIES GALLERY
  // ======================================
  const galleryModal = document.getElementById("gallery-modal");
  const galleryGrid = document.getElementById("gallery-grid");
  let activeGalTab = "photos";

  function renderGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = "";
    const msgs = chat.getLoadedMessages?.() || [];

    if (activeGalTab === "photos" || activeGalTab === "doodles") {
      const items = msgs.filter(m => {
        const d = m.decrypted || {};
        if (!d.imageData || d.viewOnce || d.teaseBlur) return false;
        return activeGalTab === "doodles" ? Boolean(d.doodle) : !d.doodle;
      }).reverse();

      if (!items.length) {
        galleryGrid.innerHTML = `<p class="game-card-sub">Abhi koi ${activeGalTab === "doodles" ? "doodle" : "photo"} saved nahi hai 📸</p>`;
        return;
      }
      items.forEach(m => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "gallery-thumb-btn";
        const img = document.createElement("img");
        img.src = m.decrypted.imageData;
        img.alt = m.decrypted.text || "Shared memory";
        card.appendChild(img);
        card.onclick = () => {
          document.getElementById("viewer-img").src = m.decrypted.imageData;
          document.getElementById("img-viewer-modal").style.display = "flex";
        };
        galleryGrid.appendChild(card);
      });
      return;
    }

    if (activeGalTab === "voice") {
      const items = msgs.filter(m => m.decrypted?.audioData && !m.decrypted?.viewOnce).reverse();
      if (!items.length) {
        galleryGrid.innerHTML = `<p class="game-card-sub">Abhi koi voice memory nahi hai 🎤</p>`;
        return;
      }
      items.forEach(m => {
        const row = document.createElement("div");
        row.className = "starred-item";
        const lbl = document.createElement("span");
        const dt = m.createdAtSec ? new Date(m.createdAtSec * 1000).toLocaleDateString() : "Voice";
        lbl.innerText = `🎤 Voice (${m.decrypted.duration || 0}s) · ${dt}`;
        const playBtn = document.createElement("button");
        playBtn.type = "button";
        playBtn.className = "game-mini-btn active";
        playBtn.innerText = "▶ Play";
        playBtn.onclick = () => {
          const aud = new Audio(m.decrypted.audioData);
          aud.play().catch(() => {});
        };
        row.append(lbl, playBtn);
        galleryGrid.appendChild(row);
      });
      return;
    }

    // starred tab
    const starred = readJson(STARRED_MSGS_KEY, []);
    if (!starred.length) {
      galleryGrid.innerHTML = `<p class="game-card-sub">Abhi koi starred message nahi hai ⭐</p>`;
      return;
    }
    starred.forEach(item => {
      const row = document.createElement("div");
      row.className = "starred-item";
      const lbl = document.createElement("span");
      lbl.innerText = `⭐ ${item.preview}`;
      row.appendChild(lbl);
      galleryGrid.appendChild(row);
    });
  }

  document.querySelectorAll("#gallery-tabs-row [data-gal-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeGalTab = btn.dataset.galTab || "photos";
      document.querySelectorAll("#gallery-tabs-row [data-gal-tab]").forEach(b => {
        b.classList.toggle("active", b === btn);
      });
      renderGallery();
    });
  });

  document.getElementById("open-gallery-btn")?.addEventListener("click", () => {
    if (moreDropdown) moreDropdown.style.display = "none";
    renderGallery();
    if (galleryModal) galleryModal.style.display = "flex";
  });
  document.getElementById("close-gallery-btn")?.addEventListener("click", () => {
    if (galleryModal) galleryModal.style.display = "none";
  });

  // ======================================
  // 8. ENCRYPTED BACKUP EXPORT/RESTORE & INTRUDER LOG
  // ======================================
  const encPassInput = document.getElementById("enc-backup-pass");
  const encStatusEl = document.getElementById("enc-backup-status");
  const intruderListEl = document.getElementById("intruder-log-list");

  function renderIntruderLog() {
    if (!intruderListEl) return;
    const log = notes?.getIntruderLog?.() || [];
    intruderListEl.innerHTML = "";
    if (!log.length) {
      intruderListEl.innerHTML = `<div class="game-card-sub">Koi suspicious wrong-code try nahi mili ✅</div>`;
      return;
    }
    log.forEach(entry => {
      const row = document.createElement("div");
      row.className = "intruder-row";
      const dt = new Date(entry.at || Date.now()).toLocaleString();
      row.innerText = `⚠️ ${entry.source}: ${entry.snippet} (${dt})`;
      intruderListEl.appendChild(row);
    });
  }

  document.getElementById("clear-intruder-btn")?.addEventListener("click", () => {
    notes?.clearIntruderLog?.();
    renderIntruderLog();
  });

  document.getElementById("enc-export-btn")?.addEventListener("click", async () => {
    const pass = (encPassInput?.value || "").trim();
    if (pass.length < 4) {
      if (encStatusEl) encStatusEl.innerText = "⚠️ Kam az kam 4 characters ka password likhein!";
      encPassInput?.focus();
      return;
    }
    try {
      const bundle = normalizeBackupBundle({
        version: 2,
        exportedAt: Date.now(),
        wallet: readJson(LOVE_WALLET_KEY, []),
        vault: readJson(VAULT_ITEMS_KEY, []),
        starred: readJson(STARRED_MSGS_KEY, []),
        intimateCustom: readJson(INTIMATE_CUSTOM_KEY, {}),
        universalCustom: readJson(UNIVERSAL_CUSTOM_KEY, {}),
        pinnedReacts: readJson(CUSTOM_QUICK_REACTS_KEY, [])
      });
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveBackupAesKey(pass, salt);
      const cipherBuf = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(JSON.stringify(bundle))
      );
      const envelope = {
        scEncryptedBackup: true,
        version: 2,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        cipher: bytesToBase64(new Uint8Array(cipherBuf))
      };
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-notes-vault-backup-${Date.now()}.scbak`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (encStatusEl) encStatusEl.innerText = "✅ Password-Protected .scbak Export Ho Gaya!";
      playEmotionSound("gift");
    } catch {
      if (encStatusEl) encStatusEl.innerText = "❌ Export fail ho gaya.";
    }
  });

  document.getElementById("enc-import-btn")?.addEventListener("click", () => {
    notes?.setPickingMedia?.(true);
    document.getElementById("enc-import-input")?.click();
  });

  document.getElementById("enc-import-input")?.addEventListener("change", async e => {
    notes?.setPickingMedia?.(false);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const pass = (encPassInput?.value || "").trim();
    if (!pass) {
      if (encStatusEl) encStatusEl.innerText = "⚠️ Restore se pehle upar backup password daalein!";
      encPassInput?.focus();
      return;
    }
    try {
      const txt = await file.text();
      const env = JSON.parse(txt);
      if (!env?.scEncryptedBackup || !env.salt || !env.iv || !env.cipher) {
        if (encStatusEl) encStatusEl.innerText = "❌ Invalid backup file format.";
        return;
      }
      const key = await deriveBackupAesKey(pass, base64ToBytes(env.salt));
      const plainBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(env.iv) },
        key,
        base64ToBytes(env.cipher)
      );
      const bundle = normalizeBackupBundle(JSON.parse(new TextDecoder().decode(plainBuf)));
      if (!bundle) {
        if (encStatusEl) encStatusEl.innerText = "❌ Backup schema invalid hai.";
        return;
      }
      writeJson(LOVE_WALLET_KEY, bundle.wallet);
      writeJson(VAULT_ITEMS_KEY, bundle.vault);
      writeJson(STARRED_MSGS_KEY, bundle.starred);
      writeJson(INTIMATE_CUSTOM_KEY, bundle.intimateCustom);
      writeJson(UNIVERSAL_CUSTOM_KEY, bundle.universalCustom || {});
      writeJson(CUSTOM_QUICK_REACTS_KEY, bundle.pinnedReacts);
      if (encStatusEl) {
        encStatusEl.innerText = `✅ Restored: ${bundle.wallet.length} Coupons, ${bundle.vault.length} Vault items, ${bundle.starred.length} Starred!`;
      }
      playEmotionSound("gift");
    } catch {
      if (encStatusEl) encStatusEl.innerText = "❌ Galat password ya damaged backup file!";
    }
  });

  // ======================================
  // REMOTE HANDLERS & CLEANUP
  // ======================================
  function handleRemoteTouchPoint(pt) {
    if (!pt || typeof pt !== "object") return;
    partnerTouch = {
      x: Number(pt.x ?? 0.5),
      y: Number(pt.y ?? 0.5),
      active: Boolean(pt.active),
      ts: Number(pt.ts || Date.now())
    };
    scheduleTouchDraw();
  }

  function handleRemoteSecretVibe(vibe, isInitial = false) {
    if (!vibe || !vibe.ts || vibe.ts <= lastRemoteVibeTs) return;
    lastRemoteVibeTs = vibe.ts;
    if (isInitial || Date.now() - vibe.ts > 20000) return;
    navigator.vibrate?.(Array.isArray(vibe.pattern) ? vibe.pattern : [90, 90, 90]);
    if (notes?.isChatVisible?.() && document.visibilityState === "visible") {
      playEmotionSound("love");
      spawnFloatingHearts?.("💓");
      if (vibeFeedback) vibeFeedback.innerText = `💗 Love ne bheja: ${vibe.msg || "Secret Vibe"}`;
    } else {
      notifications?.showBrowserAlert?.("ping");
    }
  }

  function stopTransient() {
    if (touchRaf) {
      cancelAnimationFrame(touchRaf);
      touchRaf = null;
    }
    if (touchExpiryTimer) {
      clearTimeout(touchExpiryTimer);
      touchExpiryTimer = null;
    }
    if (myTouch.active) {
      myTouch = { ...myTouch, active: false, ts: Date.now() };
      pushMyTouch(false);
    }
    stopNightAmbience();
  }

  return {
    handleRemoteTouchPoint,
    handleRemoteSecretVibe,
    renderIntruderLog,
    stopTransient
  };
}
