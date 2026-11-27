import { playEmotionSound } from "./crypto.js";
import {
  DEFAULT_STUN_SERVERS,
  filterNewIceCandidates,
  evaluateNetworkQuality
} from "../shared/rtcLogic.js";
import { rollNaughtyDice } from "../shared/intimateLogic.js";

export function createCallManager({
  getAuth,
  getDb,
  fsOps,
  notes,
  notifications,
  sendEncryptedMessage,
  spawnFloatingHearts
}) {
  const { doc, setDoc } = fsOps;

  let pc = null;
  let localStream = null;
  let aiCanvasStream = null;
  let funChannel = null;
  let currentCallId = null;
  let isVideoCall = false;
  let isLowNet = false;
  let isAudioFallback = false;
  let isMuted = false;
  let isCamOff = false;
  let isSpeaker = false;
  let facingMode = "user";
  let activeFilter = "none";
  let callTimerInt = null;
  let callStatsInt = null;
  let ringTimeoutInt = null;
  let callSeconds = 0;
  let callConnected = false;
  let incomingOffer = null;
  let sentIceList = [];
  let pendingRemoteIce = [];
  let processedRemoteIceCount = 0;
  let iceFlushTimer = null;
  let ringtoneInt = null;
  let aiRaf = null;
  let faceDetector = null;
  let lastDetectedFaces = [];
  let consecutiveWeakCount = 0;
  let lastCallDareTs = 0;

  const CALL_DARES = [
    "💋 Bina kuch bole 10 sec camera/mic par slow kiss sound bhejo!",
    "🎀 Neck ya Mam ke baare mein 1 flirty line bolo abhi!",
    "🔥 Honey / Chocolate codeword ke saath 1 secret wish batao!",
    "😘 Cute smile ke saath aankh maaro (Wink Challenge)!",
    "🎙️ Slow romantic voice mein 'I miss you Janan' bolo!"
  ];

  function showCallDareBanner(text) {
    const card = document.getElementById("call-dare-card");
    const txt = document.getElementById("call-dare-text");
    if (!card || !txt || !text) return;
    txt.innerText = text;
    card.style.display = "flex";
    playEmotionSound("gift");
  }

  function bindFunChannel(ch) {
    if (!ch) return;
    ch.onmessage = e => {
      const val = String(e.data || "");
      if (val.startsWith("DARE:")) {
        showCallDareBanner(val.slice(5));
      } else {
        spawnFloatingHearts(val);
      }
    };
  }

  const callOverlay = document.getElementById("call-overlay");
  const incomingOverlay = document.getElementById("incoming-call-overlay");
  const remoteVideo = document.getElementById("remote-video");
  const localVideo = document.getElementById("local-video");
  const aiCanvas = document.getElementById("ai-video-canvas");
  const remoteAudio = document.getElementById("remote-audio");
  const audioAvatar = document.getElementById("audio-call-avatar");
  const netBadgeEl = document.getElementById("call-net-badge");
  const audioFallbackBtn = document.getElementById("call-audio-only-btn");

  async function fetchIceServers() {
    const user = getAuth()?.currentUser;
    if (!user) return { iceServers: DEFAULT_STUN_SERVERS, iceCandidatePoolSize: 4 };
    const rtcUrl = notifications.buildEndpointUrl("/api/rtc-config");
    if (!(notifications.isNativeApp?.() && rtcUrl.startsWith("/"))) {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(rtcUrl, {
          headers: { Authorization: "Bearer " + idToken }
        });
        if (res.ok) {
          const cfg = await res.json();
          if (Array.isArray(cfg?.iceServers)) {
            return { iceServers: cfg.iceServers, iceCandidatePoolSize: 4 };
          }
        }
      } catch {}
    }
    return { iceServers: DEFAULT_STUN_SERVERS, iceCandidatePoolSize: 4 };
  }

  function updateCallUiForMode(video) {
    const showVideoCtrls = video && !isAudioFallback;
    document.querySelectorAll(".video-only-ctrl").forEach(el => {
      el.style.display = showVideoCtrls ? "flex" : "none";
    });
    document.getElementById("call-filter-bar").style.display = showVideoCtrls ? "flex" : "none";
    document.getElementById("call-react-bar").style.display = video ? "flex" : "none";
    if (audioFallbackBtn) {
      audioFallbackBtn.style.display = video ? "flex" : "none";
      audioFallbackBtn.classList.toggle("active", isAudioFallback);
    }
    audioAvatar.style.display = showVideoCtrls && remoteVideo.style.display === "block" ? "none" : "block";
    document.getElementById("call-speaker-btn").classList.toggle("active", isSpeaker);
  }

  function sendSignalField(fieldName, payload) {
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db) return;
    setDoc(
      doc(db, "status", user.uid),
      { [fieldName]: { ...payload, ts: Date.now(), from: user.uid } },
      { merge: true }
    ).catch(() => {});
  }

  function queueIceCandidate(cand) {
    sentIceList.push(cand.toJSON());
    clearTimeout(iceFlushTimer);
    iceFlushTimer = setTimeout(() => {
      if (sentIceList.length && currentCallId) {
        sendSignalField("callIce", { callId: currentCallId, candidates: sentIceList });
      }
    }, 300);
  }

  function startRingtone() {
    stopRingtone();
    playEmotionSound("love");
    window.AndroidCallBridge?.vibratePattern?.("call");
    ringtoneInt = setInterval(() => {
      playEmotionSound("love");
      navigator.vibrate?.([240, 160, 240]);
    }, 2400);
  }

  function stopRingtone() {
    clearInterval(ringtoneInt);
    ringtoneInt = null;
    window.AndroidCallBridge?.vibratePattern?.("stop");
  }

  async function loadFaceDetector() {
    if (faceDetector) return faceDetector;
    try {
      const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      try {
        faceDetector = await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO"
        });
      } catch {
        faceDetector = await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "CPU"
          },
          runningMode: "VIDEO"
        });
      }
    } catch {}
    return faceDetector;
  }

  function startAiVideoLoop() {
    cancelAnimationFrame(aiRaf);
    const ctx = aiCanvas.getContext("2d");
    let frameCnt = 0;

    const render = () => {
      if (!localStream || !isVideoCall || isAudioFallback || activeFilter === "none") return;
      if (isCamOff) {
        ctx.fillStyle = "#11050d";
        ctx.fillRect(0, 0, aiCanvas.width || 320, aiCanvas.height || 240);
      } else if (localVideo.readyState >= 2) {
        const w = isLowNet ? 320 : 480;
        const h = Math.round((localVideo.videoHeight / (localVideo.videoWidth || 1)) * w) || 360;
        if (aiCanvas.width !== w || aiCanvas.height !== h) {
          aiCanvas.width = w;
          aiCanvas.height = h;
        }
        ctx.save();
        if (activeFilter === "glow") ctx.filter = "brightness(1.12) contrast(1.04) saturate(1.16)";
        else if (activeFilter === "aura") ctx.filter = "saturate(1.22) hue-rotate(-6deg)";
        else ctx.filter = "none";
        ctx.drawImage(localVideo, 0, 0, w, h);
        ctx.restore();

        if (activeFilter !== "glow") {
          frameCnt++;
          if (frameCnt % 3 === 0 && faceDetector) {
            try {
              lastDetectedFaces = faceDetector.detectForVideo(localVideo, performance.now()).detections || [];
            } catch {}
          }
          lastDetectedFaces.forEach(det => {
            const bb = det.boundingBox;
            const sx = w / (localVideo.videoWidth || w);
            const sy = h / (localVideo.videoHeight || h);
            const fx = bb.originX * sx;
            const fy = bb.originY * sy;
            const fw = bb.width * sx;
            const fh = bb.height * sy;
            const kps = det.keypoints || [];
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            if (activeFilter === "hearts" && kps.length >= 2) {
              ctx.font = `${Math.round(fw * 0.24)}px sans-serif`;
              ctx.fillText("😍", kps[0].x * w, kps[0].y * h);
              ctx.fillText("😍", kps[1].x * w, kps[1].y * h);
            } else if (activeFilter === "crown") {
              ctx.font = `${Math.round(fw * 0.45)}px sans-serif`;
              ctx.fillText("👑", fx + fw * 0.5, fy - fh * 0.14);
            } else if (activeFilter === "bunny") {
              ctx.font = `${Math.round(fw * 0.45)}px sans-serif`;
              ctx.fillText("🐰", fx + fw * 0.5, fy - fh * 0.18);
            } else if (activeFilter === "aura") {
              ctx.strokeStyle = "rgba(255,64,129,0.75)";
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(fx + fw / 2, fy + fh / 2, Math.max(fw, fh) * 0.65, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
        }
      }
      aiRaf = requestAnimationFrame(render);
    };
    aiRaf = requestAnimationFrame(render);
  }

  async function syncOutgoingVideoTrack() {
    if (!pc || !localStream || !isVideoCall) return;
    const sender = pc.getSenders().find(s => s.track?.kind === "video");
    if (!sender) return;

    if (isAudioFallback) {
      localStream.getVideoTracks().forEach(t => { t.enabled = false; });
      cancelAnimationFrame(aiRaf);
      return;
    }

    if (activeFilter === "none") {
      cancelAnimationFrame(aiRaf);
      const rawTrack = localStream.getVideoTracks()[0];
      if (rawTrack) {
        rawTrack.enabled = !isCamOff;
        await sender.replaceTrack(rawTrack).catch(() => {});
      }
      aiCanvas.style.display = "none";
      localVideo.style.display = "block";
      return;
    }

    // Filter selected: lazy-load MediaPipe only for face filters
    if (activeFilter !== "glow") loadFaceDetector();
    localVideo.style.display = "none";
    aiCanvas.style.display = "block";
    startAiVideoLoop();
    if (!aiCanvasStream) aiCanvasStream = aiCanvas.captureStream(20);
    const canvasTrack = aiCanvasStream.getVideoTracks()[0];
    if (canvasTrack) {
      canvasTrack.enabled = !isCamOff;
      await sender.replaceTrack(canvasTrack).catch(() => {});
    }
  }

  async function downgradeToAudioOnly(reason = "Slow net: Audio-Only active 🎧") {
    if (!isVideoCall || isAudioFallback) return;
    isAudioFallback = true;
    cancelAnimationFrame(aiRaf);
    localStream?.getVideoTracks().forEach(t => { t.enabled = false; });
    aiCanvasStream?.getVideoTracks().forEach(t => { t.enabled = false; });
    remoteVideo.style.display = "none";
    localVideo.style.display = "none";
    aiCanvas.style.display = "none";
    audioAvatar.style.display = "block";
    document.getElementById("call-status-text").innerText = reason;
    updateCallUiForMode(true);

    if (pc) {
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === "video") {
          const p = sender.getParameters();
          p.encodings = p.encodings || [{}];
          p.encodings[0].active = false;
          await sender.setParameters(p).catch(() => {});
        }
      }
    }
  }

  async function restoreVideoFromFallback() {
    if (!isVideoCall || !isAudioFallback) return;
    isAudioFallback = false;
    consecutiveWeakCount = 0;
    localStream?.getVideoTracks().forEach(t => { t.enabled = !isCamOff; });
    if (pc) {
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === "video") {
          const p = sender.getParameters();
          p.encodings = p.encodings || [{}];
          p.encodings[0].active = true;
          await sender.setParameters(p).catch(() => {});
        }
      }
    }
    if (remoteVideo.srcObject) remoteVideo.style.display = "block";
    await syncOutgoingVideoTrack();
    document.getElementById("call-status-text").innerText = "Connected 💖";
    updateCallUiForMode(true);
  }

  function createPeerConnection(rtcConfig) {
    pc = new RTCPeerConnection(rtcConfig);
    pc.onicecandidate = e => {
      if (e.candidate) queueIceCandidate(e.candidate);
    };
    pc.ontrack = e => {
      const stream = e.streams[0];
      if (!stream) return;
      remoteAudio.srcObject = stream;
      remoteAudio.play().catch(() => {});
      if (stream.getVideoTracks().length > 0 && !isAudioFallback) {
        remoteVideo.srcObject = stream;
        remoteVideo.style.display = "block";
        audioAvatar.style.display = "none";
      }
    };
    const handleConnChange = state => {
      if (state === "connected" || state === "completed") {
        clearTimeout(ringTimeoutInt);
        if (!callConnected) {
          callConnected = true;
          consecutiveWeakCount = 0;
          document.getElementById("call-status-text").innerText = isAudioFallback ? "Audio Saver Connected 🎧" : "Connected 💖";
          netBadgeEl.innerText = isAudioFallback ? "📶 Audio Saver" : "📶 Good";
          startCallTimer();
        }
      } else if (state === "failed" || state === "disconnected") {
        const evalRes = evaluateNetworkQuality({
          connectionState: state,
          isVideoCall,
          isAudioFallback,
          consecutiveWeakCount
        });
        consecutiveWeakCount = evalRes.nextWeakCount;
        netBadgeEl.innerText = evalRes.badge;
        if (evalRes.shouldRestartIce && pc?.restartIce) {
          try { pc.restartIce(); } catch {}
        }
        if (evalRes.shouldDowngradeToAudio) {
          downgradeToAudioOnly("Weak internet: Switched to Audio 🎧");
        }
      }
    };
    pc.onconnectionstatechange = () => handleConnChange(pc?.connectionState);
    pc.oniceconnectionstatechange = () => {
      const iceState = pc?.iceConnectionState;
      if (iceState === "connected" || iceState === "completed" || iceState === "failed" || iceState === "disconnected") {
        handleConnChange(iceState);
      }
    };
    return pc;
  }

  function startCallTimer() {
    clearInterval(callTimerInt);
    clearInterval(callStatsInt);
    callSeconds = 0;
    callTimerInt = setInterval(() => {
      callSeconds++;
      document.getElementById("call-timer").innerText =
        `${String(Math.floor(callSeconds / 60)).padStart(2, "0")}:${String(callSeconds % 60).padStart(2, "0")}`;
    }, 1000);

    callStatsInt = setInterval(async () => {
      if (!pc) return;
      try {
        let rttMs = null;
        const stats = await pc.getStats();
        stats.forEach(r => {
          if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime != null) {
            rttMs = Math.round(r.currentRoundTripTime * 1000);
          }
        });
        const evalRes = evaluateNetworkQuality({
          rttMs,
          connectionState: pc.connectionState,
          isVideoCall,
          isAudioFallback,
          consecutiveWeakCount
        });
        consecutiveWeakCount = evalRes.nextWeakCount;
        netBadgeEl.innerText = isLowNet ? "📶 Saver" : evalRes.badge;
        if (evalRes.shouldDowngradeToAudio) {
          await downgradeToAudioOnly("Slow signal: Auto Audio Mode 🎧");
        }
      } catch {}
    }, 4000);
  }

  async function setupLocalMedia(video) {
    isVideoCall = video;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: video
          ? {
              facingMode,
              width: { ideal: isLowNet ? 320 : 480 },
              frameRate: { ideal: isLowNet ? 15 : 24, max: 24 }
            }
          : false
      });
    } catch (err) {
      if (video) {
        // Fallback to audio-only if camera permission/hardware fails
        isAudioFallback = true;
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
      } else {
        throw err;
      }
    }

    if (video && localStream.getVideoTracks().length > 0 && !isAudioFallback) {
      localVideo.srcObject = localStream;
      localVideo.play().catch(() => {});
      localVideo.style.display = "block";
      aiCanvas.style.display = "none";
      const track = localStream.getVideoTracks()[0];
      pc.addTrack(track, localStream);
    } else {
      localVideo.style.display = "none";
      aiCanvas.style.display = "none";
    }
    localStream.getAudioTracks().forEach(t => pc.addTrack(t, localStream));
  }

  async function startCall(video) {
    document.getElementById("call-dropdown").style.display = "none";
    currentCallId = Date.now().toString();
    callConnected = false;
    isMuted = false;
    isCamOff = false;
    isLowNet = false;
    isAudioFallback = false;
    consecutiveWeakCount = 0;
    activeFilter = "none";
    sentIceList = [];
    pendingRemoteIce = [];
    processedRemoteIceCount = 0;
    remoteVideo.style.display = "none";
    updateCallUiForMode(video);
    callOverlay.style.display = "flex";
    document.getElementById("call-status-text").innerText = "Connecting... 🔔";
    document.getElementById("call-timer").innerText = "00:00";

    try {
      const rtcConfig = await fetchIceServers();
      createPeerConnection(rtcConfig);
      funChannel = pc.createDataChannel("fun");
      bindFunChannel(funChannel);
      await setupLocalMedia(video);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignalField("callOffer", {
        callId: currentCallId,
        video,
        sdp: { type: offer.type, sdp: offer.sdp }
      });
      notifications.sendPushAlert("call");
      window.AndroidCallBridge?.startProximity?.(isSpeaker);
      clearTimeout(ringTimeoutInt);
      ringTimeoutInt = setTimeout(() => {
        if (!callConnected && currentCallId) endCall(true);
      }, 60000);
    } catch (err) {
      const statusEl = document.getElementById("call-status-text");
      if (statusEl) {
        statusEl.innerText = err?.name === "NotAllowedError"
          ? "⚠️ Mic/Camera permission Allow karein!"
          : "⚠️ Call connect nahi ho saki";
      }
      setTimeout(() => endCall(true), 1600);
    }
  }

  async function acceptIncomingCall() {
    stopRingtone();
    window.AndroidCallBridge?.vibratePattern?.("stop");
    notifications.clearAlerts?.();
    incomingOverlay.style.display = "none";
    notes.secretCallDot.style.display = "none";
    if (!incomingOffer) return;

    const video = Boolean(incomingOffer.video);
    currentCallId = incomingOffer.callId;
    callConnected = false;
    isMuted = false;
    isCamOff = false;
    isLowNet = false;
    isAudioFallback = false;
    consecutiveWeakCount = 0;
    activeFilter = "none";
    sentIceList = [];
    isSpeaker = video;
    remoteVideo.style.display = "none";
    updateCallUiForMode(video);
    callOverlay.style.display = "flex";
    document.getElementById("call-status-text").innerText = "Connecting... ⏳";
    document.getElementById("call-timer").innerText = "00:00";

    try {
      const rtcConfig = await fetchIceServers();
      createPeerConnection(rtcConfig);
      pc.ondatachannel = e => {
        funChannel = e.channel;
        bindFunChannel(funChannel);
      };
      await setupLocalMedia(video);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer.sdp));
      while (pendingRemoteIce.length) {
        await pc.addIceCandidate(new RTCIceCandidate(pendingRemoteIce.shift())).catch(() => {});
      }
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      sendSignalField("callAnswer", { callId: currentCallId, sdp: { type: ans.type, sdp: ans.sdp } });
      window.AndroidCallBridge?.startProximity?.(isSpeaker);
    } catch (err) {
      const statusEl = document.getElementById("call-status-text");
      if (statusEl) {
        statusEl.innerText = err?.name === "NotAllowedError"
          ? "⚠️ Mic/Camera permission Allow karein!"
          : "⚠️ Call accept nahi ho saki";
      }
      setTimeout(() => endCall(true), 1600);
    }
  }

  async function endCall(notifyPartner = true) {
    stopRingtone();
    cancelAnimationFrame(aiRaf);
    clearInterval(callTimerInt);
    clearInterval(callStatsInt);
    clearTimeout(ringTimeoutInt);
    clearTimeout(iceFlushTimer);
    window.AndroidCallBridge?.stopProximity?.();
    window.AndroidCallBridge?.vibratePattern?.("stop");
    notifications.clearAlerts?.();
    document.getElementById("ear-blackout").style.display = "none";
    notes.secretCallDot.style.display = "none";

    const durationStr = document.getElementById("call-timer").innerText;
    const wasVideo = isVideoCall;
    const wasConnected = callConnected;

    if (notifyPartner && currentCallId) {
      sendSignalField("callHangup", { callId: currentCallId, missed: !wasConnected });
      if (!wasConnected) {
        sendEncryptedMessage({
          isCallLog: true,
          missed: true,
          text: `📵 Missed ${wasVideo ? "Video" : "Audio"} Call`
        }, "call").catch(() => {});
      } else {
        sendEncryptedMessage({
          isCallLog: true,
          missed: false,
          text: `${wasVideo ? "📹" : "📞"} Call Ended (${durationStr})`
        }, "call").catch(() => {});
      }
    }

    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (aiCanvasStream) aiCanvasStream.getTracks().forEach(t => t.stop());
    if (pc) {
      pc.close();
      pc = null;
    }

    localStream = null;
    aiCanvasStream = null;
    funChannel = null;
    currentCallId = null;
    incomingOffer = null;
    callConnected = false;
    isMuted = false;
    isCamOff = false;
    isLowNet = false;
    isAudioFallback = false;
    isSpeaker = false;
    consecutiveWeakCount = 0;
    sentIceList = [];
    pendingRemoteIce = [];
    processedRemoteIceCount = 0;

    ["call-mute-btn", "call-cam-btn", "call-low-net-btn", "call-speaker-btn", "call-audio-only-btn"].forEach(id => {
      document.getElementById(id)?.classList.remove("active");
    });
    remoteVideo.srcObject = null;
    remoteVideo.style.display = "none";
    localVideo.srcObject = null;
    localVideo.style.display = "none";
    aiCanvas.style.display = "none";
    callOverlay.style.display = "none";
    incomingOverlay.style.display = "none";
  }

  // UI Listeners
  document.getElementById("start-audio-call").addEventListener("click", () => startCall(false));
  document.getElementById("start-video-call").addEventListener("click", () => startCall(true));
  document.getElementById("accept-call-btn").addEventListener("click", acceptIncomingCall);
  document.getElementById("reject-call-btn").addEventListener("click", () => {
    stopRingtone();
    window.AndroidCallBridge?.vibratePattern?.("stop");
    notifications.clearAlerts?.();
    incomingOverlay.style.display = "none";
    notes.secretCallDot.style.display = "none";
    if (incomingOffer) sendSignalField("callHangup", { callId: incomingOffer.callId, missed: true });
    incomingOffer = null;
    pendingRemoteIce = [];
    processedRemoteIceCount = 0;
  });
  document.getElementById("hangup-call-btn").addEventListener("click", () => endCall(true));

  document.getElementById("call-mute-btn").addEventListener("click", function () {
    isMuted = !isMuted;
    localStream?.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    this.classList.toggle("active", isMuted);
  });

  document.getElementById("call-cam-btn").addEventListener("click", function () {
    isCamOff = !isCamOff;
    localStream?.getVideoTracks().forEach(t => { t.enabled = !isCamOff; });
    aiCanvasStream?.getVideoTracks().forEach(t => { t.enabled = !isCamOff; });
    this.classList.toggle("active", isCamOff);
  });

  document.getElementById("call-flip-btn").addEventListener("click", async () => {
    if (!isVideoCall || !pc) return;
    facingMode = facingMode === "user" ? "environment" : "user";
    try {
      const ns = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: isLowNet ? 320 : 480 } }
      });
      const newTrack = ns.getVideoTracks()[0];
      localStream?.getVideoTracks().forEach(t => {
        t.stop();
        localStream.removeTrack(t);
      });
      localStream.addTrack(newTrack);
      localVideo.srcObject = null;
      localVideo.srcObject = localStream;
      localVideo.play().catch(() => {});
      await syncOutgoingVideoTrack();
    } catch {}
  });

  document.getElementById("call-speaker-btn").addEventListener("click", function () {
    isSpeaker = !isSpeaker;
    this.classList.toggle("active", isSpeaker);
    window.AndroidCallBridge?.setSpeaker?.(isSpeaker);
  });

  document.getElementById("call-ear-btn").addEventListener("click", () => {
    isSpeaker = false;
    document.getElementById("call-speaker-btn").classList.remove("active");
    document.getElementById("ear-blackout").style.display = "flex";
    window.AndroidCallBridge?.setSpeaker?.(false);
  });

  let lastEarTap = 0;
  document.getElementById("ear-blackout").addEventListener("click", () => {
    const now = Date.now();
    if (now - lastEarTap < 380) {
      document.getElementById("ear-blackout").style.display = "none";
      if (isVideoCall) window.AndroidCallBridge?.setProximityEnabled?.(false);
    }
    lastEarTap = now;
  });

  document.getElementById("call-low-net-btn").addEventListener("click", async function () {
    isLowNet = !isLowNet;
    this.classList.toggle("active", isLowNet);
    netBadgeEl.innerText = isLowNet ? "📶 Saver" : "📶 Good";
    if (pc) {
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === "video") {
          const p = sender.getParameters();
          p.encodings = p.encodings || [{}];
          p.encodings[0].maxBitrate = isLowNet ? 160000 : 750000;
          await sender.setParameters(p).catch(() => {});
        }
      }
    }
  });

  if (audioFallbackBtn) {
    audioFallbackBtn.addEventListener("click", () => {
      if (isAudioFallback) restoreVideoFromFallback();
      else downgradeToAudioOnly("Audio-Only Saver Active 🎧");
    });
  }

  document.getElementById("call-share-btn").addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || !pc) return;
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const st = ds.getVideoTracks()[0];
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender && st) {
        await sender.replaceTrack(st);
        st.onended = () => syncOutgoingVideoTrack();
      }
    } catch {}
  });

  document.getElementById("call-snap-btn").addEventListener("click", () => {
    if (remoteVideo.readyState < 2) return;
    const c = document.createElement("canvas");
    c.width = remoteVideo.videoWidth;
    c.height = remoteVideo.videoHeight;
    c.getContext("2d").drawImage(remoteVideo, 0, 0);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `moment_${Date.now()}.png`;
    a.click();
  });

  document.querySelectorAll("[data-filter]").forEach(b => {
    b.addEventListener("click", async () => {
      activeFilter = b.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      await syncOutgoingVideoTrack();
    });
  });

  document.querySelectorAll("[data-callreact]").forEach(b => {
    b.addEventListener("click", () => {
      const em = b.dataset.callreact;
      spawnFloatingHearts(em);
      if (funChannel?.readyState === "open") funChannel.send(em);
    });
  });

  document.getElementById("call-dare-btn")?.addEventListener("click", () => {
    const useDice = Math.random() > 0.45;
    const text = useDice
      ? `🎲 Call Dice: ${rollNaughtyDice().summary}`
      : CALL_DARES[Math.floor(Math.random() * CALL_DARES.length)];
    showCallDareBanner(text);
    if (funChannel?.readyState === "open") {
      funChannel.send("DARE:" + text);
    } else if (currentCallId) {
      sendSignalField("callDare", { callId: currentCallId, text });
    }
  });
  document.getElementById("call-dare-close")?.addEventListener("click", () => {
    const card = document.getElementById("call-dare-card");
    if (card) card.style.display = "none";
  });

  notes.secretCallDot.addEventListener("click", () => {
    if (incomingOffer) {
      notes.secretCallDot.style.display = "none";
      incomingOverlay.style.display = "flex";
      startRingtone();
    }
  });

  return {
    hasActiveCall: () => Boolean(currentCallId),
    getIncomingOffer: () => incomingOffer,
    showIncomingOverlayIfPending() {
      if (incomingOffer) {
        notes.secretCallDot.style.display = "none";
        incomingOverlay.style.display = "flex";
        startRingtone();
      }
    },
    hideIncomingToDotIfPending() {
      if (incomingOffer) {
        incomingOverlay.style.display = "none";
        notes.secretCallDot.style.display = "inline-flex";
      }
    },
    async handleSignalingData(data, state) {
      const offer = data.callOffer;
      if (offer && offer.ts > state.lastOfferTs && Date.now() - offer.ts < 60000) {
        state.lastOfferTs = offer.ts;
        if (!currentCallId) {
          incomingOffer = offer;
          pendingRemoteIce = [];
          processedRemoteIceCount = 0;
          document.getElementById("incoming-call-type").innerText = offer.video
            ? "📹 Incoming Video Call"
            : "📞 Incoming Audio Call";
          if (notes.isChatVisible() && document.visibilityState === "visible") {
            incomingOverlay.style.display = "flex";
            startRingtone();
          } else {
            notes.secretCallDot.style.display = "inline-flex";
            window.AndroidCallBridge?.vibratePattern?.("call");
            navigator.vibrate?.([240, 160, 240]);
            notifications.showBrowserAlert("call");
          }
        }
      }

      const answer = data.callAnswer;
      if (answer && answer.ts > state.lastAnswerTs && pc && answer.callId === currentCallId) {
        state.lastAnswerTs = answer.ts;
        await pc.setRemoteDescription(new RTCSessionDescription(answer.sdp)).catch(() => {});
        while (pendingRemoteIce.length) {
          await pc.addIceCandidate(new RTCIceCandidate(pendingRemoteIce.shift())).catch(() => {});
        }
      }

      const ice = data.callIce;
      const targetCallId = currentCallId || incomingOffer?.callId;
      const { candidates, nextCount } = filterNewIceCandidates(ice, targetCallId, processedRemoteIceCount);
      if (candidates.length > 0) {
        for (const c of candidates) {
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          } else {
            pendingRemoteIce.push(c);
          }
        }
        processedRemoteIceCount = nextCount;
      }

      const hang = data.callHangup;
      if (hang && hang.ts > state.lastHangupTs && (hang.callId === currentCallId || hang.callId === incomingOffer?.callId)) {
        state.lastHangupTs = hang.ts;
        endCall(false);
      }

      const dare = data.callDare;
      if (dare && dare.ts > lastCallDareTs && currentCallId && dare.callId === currentCallId && Date.now() - dare.ts < 25000) {
        lastCallDareTs = dare.ts;
        showCallDareBanner(dare.text);
      }
    }
  };
}
