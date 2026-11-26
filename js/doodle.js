import { playEmotionSound } from "./crypto.js";

export function createDoodleManager({ chat }) {
  const modal = document.getElementById("doodle-modal");
  const canvas = document.getElementById("doodle-canvas");
  if (!modal || !canvas) return {};

  const ctx = canvas.getContext("2d");
  let drawing = false;
  let color = "#ff4081";
  let brushSize = 4;
  let strokes = [];
  let currentStroke = null;

  function initCanvasBg() {
    ctx.fillStyle = "#fff9fb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function redraw() {
    initCanvasBg();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes) {
      if (!s.points.length) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      if (s.points.length === 1) {
        ctx.lineTo(s.points[0].x + 0.1, s.points[0].y + 0.1);
      }
      ctx.stroke();
    }
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    drawing = true;
    const pt = getPos(e);
    currentStroke = { color, size: brushSize, points: [pt] };
    strokes.push(currentStroke);
    redraw();
  });

  canvas.addEventListener("pointermove", e => {
    if (!drawing || !currentStroke) return;
    e.preventDefault();
    currentStroke.points.push(getPos(e));
    redraw();
  });

  const endStroke = () => {
    drawing = false;
    currentStroke = null;
  };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  modal.querySelectorAll("[data-doodle-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      color = btn.dataset.doodleColor || "#ff4081";
      modal.querySelectorAll("[data-doodle-color]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.getElementById("doodle-undo-btn")?.addEventListener("click", () => {
    strokes.pop();
    redraw();
  });

  document.getElementById("doodle-clear-btn")?.addEventListener("click", () => {
    strokes = [];
    redraw();
  });

  document.getElementById("doodle-open-btn")?.addEventListener("click", () => {
    strokes = [];
    redraw();
    modal.style.display = "flex";
  });

  document.getElementById("close-doodle-btn")?.addEventListener("click", () => {
    modal.style.display = "none";
  });

  document.getElementById("doodle-send-btn")?.addEventListener("click", async () => {
    if (!strokes.length) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    modal.style.display = "none";
    strokes = [];
    redraw();
    playEmotionSound("love");
    await chat.sendEncryptedMessage({ imageData: dataUrl, doodle: true, text: "🎨 Love Doodle" }, "letter");
  });

  initCanvasBg();
  return { open: () => { strokes = []; redraw(); modal.style.display = "flex"; } };
}
