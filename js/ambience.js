import { getAudioCtx } from "./crypto.js";

let currentMode = "off";
let activeNodes = [];
let activeTimer = null;

export function stopNightAmbience() {
  currentMode = "off";
  if (activeTimer) {
    clearInterval(activeTimer);
    activeTimer = null;
  }
  activeNodes.forEach(node => {
    try { node.stop?.(); } catch {}
    try { node.disconnect?.(); } catch {}
  });
  activeNodes = [];
  syncAmbienceButtons("off");
}

export function getNightAmbienceMode() {
  return currentMode;
}

function syncAmbienceButtons(mode) {
  document.querySelectorAll("[data-ambience], [data-touch-ambience]").forEach(btn => {
    const val = btn.dataset.ambience || btn.dataset.touchAmbience || "";
    btn.classList.toggle("active", val === mode);
  });
}

export function startNightAmbience(mode = "off") {
  stopNightAmbience();
  if (!mode || mode === "off") return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  currentMode = mode;
  syncAmbienceButtons(mode);

  try {
    if (mode === "rain" || mode === "fire") {
      // Synthesize filtered noise buffer safely on client
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.04 * white) / 1.04;
        lastOut = output[i];
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = mode === "rain" ? "bandpass" : "lowpass";
      filter.frequency.setValueAtTime(mode === "rain" ? 950 : 340, ctx.currentTime);
      filter.Q.setValueAtTime(mode === "rain" ? 0.8 : 1.2, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(mode === "rain" ? 0.09 : 0.14, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start();
      activeNodes.push(whiteNoise, filter, gain);

      if (mode === "fire") {
        // Gentle crackle sparkle pops
        activeTimer = setInterval(() => {
          if (currentMode !== "fire") return;
          try {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(120 + Math.random() * 260, ctx.currentTime);
            g.gain.setValueAtTime(0.025, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + 0.09);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch {}
        }, 650);
      }
    } else if (mode === "lofi") {
      const chords = [
        [220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66],
        [174.61, 220.0, 261.63],
        [164.81, 196.0, 246.94]
      ];
      let idx = 0;
      const playChord = () => {
        if (currentMode !== "lofi") return;
        const freqs = chords[idx % chords.length];
        idx++;
        freqs.forEach(f => {
          try {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, ctx.currentTime);
            g.gain.setValueAtTime(0.001, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.032, ctx.currentTime + 0.5);
            g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 2.8);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 2.9);
          } catch {}
        });
      };
      playChord();
      activeTimer = setInterval(playChord, 2800);
    }
  } catch {}
}
