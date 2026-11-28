import { playEmotionSound } from "./crypto.js";
import {
  DEFAULT_STUN_SERVERS,
  filterNewIceCandidates,
  evaluateNetworkQuality,
  isOfferActiveAndFresh,
  shouldProcessIceRestartOffer,
  resolveCallLogOnEnd
} from "../shared/rtcLogic.js";
import { rollNaughtyDice } from "../shared/intimateLogic.js";

export function createCallManager({
  getAuth,
  getDb,
  fsOps,
  notes,
  notifications,
  sendEncryptedMessage,
  spawnFloatingHearts,
  onRequestHideToNotes
}) {
  const { doc, setDoc } = fsOps;

  let pc = null;
  let localStream = null;
  let aiCanvasStream = null;
  let screenStream = null;
  let funChannel = null;
  let videoTransceiver = null;
  let currentCallId = null;
  let isCaller = false;
  let isVideoCall = false;
  let isLowNet = false;
  let isAudioFallback = false;
  let isPartnerAudioOnly = false;
  let isMuted = false;
  let isCamOff = false;
  let isSpeaker = false;
  let isMinimized = false;
  let facingMode = "user";
  let activeFilter = "none";
  let callTimerInt = null;
  let callStatsInt = null;
  let ringTimeoutInt = null;
  let ringbackInt = null;
  let stealthVibrateInt = null;
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
  let faceDetectorFailed = false;
  let lastDetectedFaces = [];
  let consecutiveWeakCount = 0;
  let lastCallDareTs = 0;
  let lastRestartOfferAt = 0;
  let lastProcessedRestartTs = 0;
  let lastConnState = "";
  let lastConnChangeAt = 0;

  const handledCallIds = new Set();
  const loggedCallIds = new Set();

  const CALL_DARES = [
    "💋 Bina kuch bole 10 sec camera/mic par slow kiss sound bhejo!",
    "🎀 Neck ya Mam ke baare mein 1 flirty line bolo abhi!",
    "🔥 Honey / Chocolate codeword ke saath 1 secret wish batao!",
    "😘 Cute smile ke saath aankh maaro (Wink Challenge)!",
    "🎙️ Slow romantic voice mein 'I miss you Janan' bolo!"
  ];

  const callOverlay = document.getElementById("call-overlay");
  const incomingOverlay = document.getElementById("incoming-call-overlay");
  const remoteVideo = document.getElementById("remote-video");
  const localVideo = document.getElementById("local-video");
  const aiCanvas = document.getElementById("ai-video-canvas");
  const remoteAudio = document.getElementById("remote-audio");
  const audioAvatar = document.getElementById("audio-call-avatar");
  const avatarNoteEl = document.getElementById("call-avatar-note");
  const netBadgeEl = document.getElementById("call-net-badge");
  const audioFallbackBtn = document.getElementById("call-audio-only-btn");
  const shareBtn = document.getElementById("call-share-btn");

  if (shareBtn && !navigator.mediaDevices?.getDisplayMedia) {
    shareBtn.style.display = "none";
  }

  function showCallDareBanner(text) {
    const card = document.getElementById("call-dare-card");
    const txt = document.getElementById("call-dare-text");
    if (!card || !txt || !text) return;
    txt.innerText = text;
    card.style.display = "flex";
    playEmotionSound("gift");
  }

  function refreshRemoteStageDisplay() {
    const hasRemoteTrack = Boolean(remoteVideo.srcObject && remoteVideo.srcObject.getVideoTracks?.().length);
    const shouldShowVideo = isVideoCall && !isAudioFallback && !isPartnerAudioOnly && hasRemoteTrack;
    remoteVideo.style.display = shouldShowVideo ? "block" : "none";
    audioAvatar.style.display = shouldShowVideo ? "none" : "flex";
    if (avatarNoteEl) {
      if (isAudioFallback) {
        avatarNoteEl.innerText = "🎧 Audio-Only Mode Active";
        avatarNoteEl.style.display = "block";
      } else if (isPartnerAudioOnly) {
        avatarNoteEl.innerText = "🎧 Partner Audio-Only par hai";
        avatarNoteEl.style.display = "block";
      } else if (!isVideoCall) {
        avatarNoteEl.innerText = "📞 Encrypted Audio";
        avatarNoteEl.style.display = "block";
      } else {
        avatarNoteEl.style.display = "none";
      }
    }
  }

  function sendPartnerModeState(audioOnly) {
    const modeTag = audioOnly ? "MODE:AUDIO_ONLY" : "MODE:VIDEO";
    if (funChannel?.readyState === "open") {
      try { funChannel.send(modeTag); } catch {}
    }
    if (currentCallId) {
      sendSignalField("callMode", { callId: currentCallId, audioOnly: Boolean(audioOnly) });
    }
  }

  function bindFunChannel(ch) {
    if (!ch) return;
    ch.onmessage = e => {
      const val = String(e.data || "");
      if (val.startsWith("DARE:")) {
        showCallDareBanner(val.slice(5));
      } else if (val === "MODE:AUDIO_ONLY") {
        isPartnerAudioOnly = true;
        refreshRemoteStageDisplay();
        if (callConnected) {
          document.getElementById("call-status-text").innerText = "Partner Audio Mode 🎧";
        }
      } else if (val === "MODE:VIDEO") {
        isPartnerAudioOnly = false;
        refreshRemoteStageDisplay();
        if (callConnected) {
          document.getElementById("call-status-text").innerText = isAudioFallback ? "Audio Saver Connected 🎧" : "Connected 💖";
        }
      } else {
        spawnFloatingHearts(val);
      }
    };
  }

  async function fetchIceServers() {
    const user = getAuth()?.currentUser;
    if (!user) return { iceServers: DEFAULT_STUN_SERVERS, iceCandidatePoolSize: 4 };
    const rtcUrl = notifications.buildEndpointUrl("/api/rtc-config");
    if (!(notifications.isNativeApp?.() && rtcUrl.startsWith("/"))) {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 4500) : null;
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(rtcUrl, {
          headers: { Authorization: "Bearer " + idToken },
          signal: ctrl?.signal
        });
        if (res.ok) {
          const cfg = await res.json();
          if (Array.isArray(cfg?.iceServers) && cfg.iceServers.length > 0) {
            return { iceServers: cfg.iceServers, iceCandidatePoolSize: 4 };
          }
        }
      } catch {} finally {
        if (timer) clearTimeout(timer);
      }
    }
    return { iceServers: DEFAULT_STUN_SERVERS, iceCandidatePoolSize: 4 };
  }

  function updateMirrorState() {
    const mirror = facingMode === "user" && !screenStream;
    localVideo.classList.toggle("mirror-cam", mirror);
    aiCanvas.classList.toggle("mirror-cam", mirror);
  }

  function updateCallUiForMode(video) {
    const showVideoCtrls = video && !isAudioFallback;
    const canShare = Boolean(navigator.mediaDevices?.getDisplayMedia);
    document.querySelectorAll(".video-only-ctrl").forEach(el => {
      if (el.id === "call-share-btn" && !canShare) {
        el.style.display = "none";
      } else {
        el.style.display = showVideoCtrls ? "flex" : "none";
      }
    });
    document.getElementById("call-filter-bar").style.display = showVideoCtrls ? "flex" : "none";
    document.getElementById("call-react-bar").style.display = video ? "flex" : "none";
    if (audioFallbackBtn) {
      audioFallbackBtn.style.display = video ? "flex" : "none";
      audioFallbackBtn.classList.toggle("active", isAudioFallback);
    }
    document.getElementById("call-speaker-btn").classList.toggle("active", isSpeaker);
    refreshRemoteStageDisplay();
    updateMirrorState();
  }

  function sendSignalField(fieldName, payload) {
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db) return;
    setDoc(
      doc(db, "status", user.uid),
      { [fieldName]: payload === null ? null : { ...payload, ts: Date.now(), from: user.uid } },
      { merge: true }
    ).catch(() => {});
  }

  function logCallOnce(payload) {
    if (!payload || !payload.callId || loggedCallIds.has(payload.callId)) return;
    loggedCallIds.add(payload.callId);
    sendEncryptedMessage(
      { isCallLog: true, missed: Boolean(payload.missed), text: payload.text },
      "call"
    ).catch(() => {});
  }

  function queueIceCandidate(cand) {
    sentIceList.push(cand.toJSON());
    clearTimeout(iceFlushTimer);
    iceFlushTimer = setTimeout(() => {
      if (sentIceList.length && currentCallId) {
        sendSignalField("callIce", { callId: currentCallId, candidates: sentIceList });
      }
    }, 280);
  }

  function startRingtone() {
    stopRingtone();
    stopStealthVibrate();
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
    stopStealthVibrate();
    window.AndroidCallBridge?.vibratePattern?.("stop");
  }

  function startStealthVibrate() {
    stopStealthVibrate();
    window.AndroidCallBridge?.vibratePattern?.("call");
    navigator.vibrate?.([240, 160, 240]);
    stealthVibrateInt = setInterval(() => {
      if (!incomingOffer) {
        stopStealthVibrate();
        return;
      }
      navigator.vibrate?.([220, 140, 220]);
    }, 3200);
  }

  function stopStealthVibrate() {
    clearInterval(stealthVibrateInt);
    stealthVibrateInt = null;
  }

  function startRingback() {
    stopRingback();
    playEmotionSound("ringback");
    ringbackInt = setInterval(() => {
      if (callConnected || !currentCallId) {
        stopRingback();
        return;
      }
      playEmotionSound("ringback");
    }, 3200);
  }

  function stopRingback() {
    clearInterval(ringbackInt);
    ringbackInt = null;
  }

  async function loadFaceDetector() {
    if (faceDetector || faceDetectorFailed) return faceDetector;
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
    } catch {
      faceDetectorFailed = true;
    }
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
          if (lastDetectedFaces.length > 0) {
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
                ctx.fillText("👑", fx + fw * 0.5, Math.max(24, fy - fh * 0.14));
              } else if (activeFilter === "bunny") {
                ctx.font = `${Math.round(fw * 0.45)}px sans-serif`;
                ctx.fillText("🐰", fx + fw * 0.5, Math.max(24, fy - fh * 0.18));
              } else if (activeFilter === "aura") {
                ctx.strokeStyle = "rgba(255,64,129,0.75)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(fx + fw / 2, fy + fh / 2, Math.max(fw, fh) * 0.65, 0, Math.PI * 2);
                ctx.stroke();
              }
            });
          } else if (activeFilter === "aura") {
            ctx.strokeStyle = "rgba(255,64,129,0.55)";
            ctx.lineWidth = 5;
            ctx.strokeRect(8, 8, w - 16, h - 16);
          }
        }
      }
      aiRaf = requestAnimationFrame(render);
    };
    aiRaf = requestAnimationFrame(render);
  }

  function getVideoSender() {
    if (videoTransceiver?.sender) return videoTransceiver.sender;
    return pc?.getSenders().find(s => s.track?.kind === "video") || null;
  }

  async function syncOutgoingVideoTrack() {
    if (!pc || !localStream || !isVideoCall) return;
    const sender = getVideoSender();
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
      updateMirrorState();
      return;
    }

    if (activeFilter !== "glow") loadFaceDetector();
    localVideo.style.display = "none";
    aiCanvas.style.display = "block";
    updateMirrorState();
    startAiVideoLoop();
    const existingCanvasTrack = aiCanvasStream?.getVideoTracks?.()[0];
    if (!aiCanvasStream || !existingCanvasTrack || existingCanvasTrack.readyState === "ended") {
      aiCanvasStream = aiCanvas.captureStream(20);
    }
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
    localVideo.style.display = "none";
    aiCanvas.style.display = "none";
    document.getElementById("call-status-text").innerText = reason;
    sendPartnerModeState(true);
    updateCallUiForMode(true);

    const sender = getVideoSender();
    if (sender) {
      const p = sender.getParameters();
      p.encodings = p.encodings || [{}];
      p.encodings[0].active = false;
      await sender.setParameters(p).catch(() => {});
    }
  }

  async function restoreVideoFromFallback() {
    if (!isVideoCall || !isAudioFallback) return;
    isAudioFallback = false;
    consecutiveWeakCount = 0;

    let vTrack = localStream?.getVideoTracks?.()[0];
    if (!vTrack || vTrack.readyState === "ended") {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: isLowNet ? 320 : 480 },
            frameRate: { ideal: isLowNet ? 15 : 24, max: 24 }
          }
        });
        vTrack = vs.getVideoTracks()[0];
        if (vTrack && localStream) {
          localStream.addTrack(vTrack);
          localVideo.srcObject = localStream;
          localVideo.play().catch(() => {});
        }
      } catch {
        isAudioFallback = true;
        document.getElementById("call-status-text").innerText = "⚠️ Camera access nahi mila";
        updateCallUiForMode(true);
        return;
      }
    }

    localStream?.getVideoTracks().forEach(t => { t.enabled = !isCamOff; });
    const sender = getVideoSender();
    if (sender) {
      if (vTrack) await sender.replaceTrack(vTrack).catch(() => {});
      const p = sender.getParameters();
      p.encodings = p.encodings || [{}];
      p.encodings[0].active = true;
      await sender.setParameters(p).catch(() => {});
    }
    sendPartnerModeState(false);
    await syncOutgoingVideoTrack();
    document.getElementById("call-status-text").innerText = "Connected 💖";
    updateCallUiForMode(true);
  }

  async function triggerIceRestartRenegotiation() {
    if (!pc || !currentCallId || !isCaller) return;
    const now = Date.now();
    if (now - lastRestartOfferAt < 6500) return;
    if (pc.signalingState !== "stable") return;
    lastRestartOfferAt = now;
    try {
      pc.restartIce?.();
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      sentIceList = [];
      processedRemoteIceCount = 0;
      sendSignalField("callOffer", {
        callId: currentCallId,
        video: isVideoCall,
        iceRestart: true,
        sdp: { type: offer.type, sdp: offer.sdp }
      });
    } catch {}
  }

  function createPeerConnection(rtcConfig) {
    pc = new RTCPeerConnection(rtcConfig);
    pc.onicecandidate = e => {
      if (e.candidate) queueIceCandidate(e.candidate);
    };
    pc.ontrack = e => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      remoteAudio.srcObject = stream;
      remoteAudio.play().catch(() => {});
      if (stream.getVideoTracks().length > 0 || e.track?.kind === "video") {
        remoteVideo.srcObject = stream;
        refreshRemoteStageDisplay();
      }
    };

    const handleConnChange = state => {
      if (!state) return;
      const now = Date.now();
      if (state === lastConnState && now - lastConnChangeAt < 900) return;
      lastConnState = state;
      lastConnChangeAt = now;

      if (state === "connected" || state === "completed") {
        clearTimeout(ringTimeoutInt);
        stopRingback();
        consecutiveWeakCount = 0;
        if (!callConnected) {
          callConnected = true;
          startCallTimer();
        }
        document.getElementById("call-status-text").innerText = isAudioFallback
          ? "Audio Saver Connected 🎧"
          : isPartnerAudioOnly
            ? "Partner Audio Mode 🎧"
            : "Connected 💖";
        netBadgeEl.innerText = isAudioFallback ? "📶 Audio Saver" : "📶 Good";
      } else if (state === "failed" || state === "disconnected") {
        const evalRes = evaluateNetworkQuality({
          connectionState: state,
          isVideoCall,
          isAudioFallback,
          consecutiveWeakCount
        });
        consecutiveWeakCount = evalRes.nextWeakCount;
        netBadgeEl.innerText = evalRes.badge;
        document.getElementById("call-status-text").innerText = "Reconnecting... ⏳";
        if (evalRes.shouldRestartIce) {
          if (isCaller) {
            triggerIceRestartRenegotiation();
          } else {
            pc?.restartIce?.();
          }
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
    videoTransceiver = null;
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
        isAudioFallback = true;
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
      } else {
        throw err;
      }
    }

    localStream.getAudioTracks().forEach(t => pc.addTrack(t, localStream));

    if (video && localStream.getVideoTracks().length > 0 && !isAudioFallback) {
      localVideo.srcObject = localStream;
      localVideo.play().catch(() => {});
      localVideo.style.display = "block";
      aiCanvas.style.display = "none";
      const track = localStream.getVideoTracks()[0];
      pc.addTrack(track, localStream);
      videoTransceiver = pc.getTransceivers().find(tr => tr.sender?.track === track) || null;
    } else if (video) {
      // Reserve video transceiver so user can restore camera later even if camera failed initially
      try {
        videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
      } catch {}
      localVideo.style.display = "none";
      aiCanvas.style.display = "none";
    } else {
      localVideo.style.display = "none";
      aiCanvas.style.display = "none";
    }
  }

  async function startCall(video) {
    document.getElementById("call-dropdown").style.display = "none";
    currentCallId = Date.now().toString();
    handledCallIds.add(currentCallId);
    isCaller = true;
    callConnected = false;
    isMuted = false;
    isCamOff = false;
    isLowNet = false;
    isAudioFallback = false;
    isPartnerAudioOnly = false;
    isSpeaker = Boolean(video);
    isMinimized = false;
    consecutiveWeakCount = 0;
    lastRestartOfferAt = 0;
    lastProcessedRestartTs = 0;
    lastConnState = "";
    activeFilter = "none";
    sentIceList = [];
    pendingRemoteIce = [];
    processedRemoteIceCount = 0;
    remoteVideo.srcObject = null;
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
      startRingback();
      window.AndroidCallBridge?.startProximity?.(isSpeaker);
      clearTimeout(ringTimeoutInt);
      ringTimeoutInt = setTimeout(() => {
        if (!callConnected && currentCallId) endCall(true);
      }, 60000);
    } catch (err) {
      stopRingback();
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
    notifications.clearAlerts?.();
    incomingOverlay.style.display = "none";
    notes.secretCallDot.style.display = "none";
    if (!incomingOffer) return;

    const offerToAccept = incomingOffer;
    incomingOffer = null;
    const video = Boolean(offerToAccept.video);
    currentCallId = offerToAccept.callId;
    handledCallIds.add(currentCallId);
    isCaller = false;
    callConnected = false;
    isMuted = false;
    isCamOff = false;
    isLowNet = false;
    isAudioFallback = false;
    isPartnerAudioOnly = false;
    isSpeaker = video;
    isMinimized = false;
    consecutiveWeakCount = 0;
    lastRestartOfferAt = 0;
    lastProcessedRestartTs = 0;
    lastConnState = "";
    activeFilter = "none";
    sentIceList = [];
    remoteVideo.srcObject = null;
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
      await pc.setRemoteDescription(new RTCSessionDescription(offerToAccept.sdp));
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
    stopRingback();
    cancelAnimationFrame(aiRaf);
    clearInterval(callTimerInt);
    clearInterval(callStatsInt);
    clearTimeout(ringTimeoutInt);
    clearTimeout(iceFlushTimer);
    window.AndroidCallBridge?.stopProximity?.();
    notifications.clearAlerts?.();
    document.getElementById("ear-blackout").style.display = "none";
    notes.secretCallDot.style.display = "none";
    notes.secretCallDot.innerText = "• Syncing";

    const durationStr = document.getElementById("call-timer").innerText;
    const wasVideo = isVideoCall;
    const wasConnected = callConnected;
    const endingCallId = currentCallId || incomingOffer?.callId || null;

    if (endingCallId) handledCallIds.add(endingCallId);

    const logEntry = resolveCallLogOnEnd({
      notifyPartner,
      currentCallId: endingCallId,
      wasConnected,
      wasVideo,
      durationStr,
      loggedCallIds
    });

    if (notifyPartner && endingCallId) {
      sendSignalField("callHangup", {
        callId: endingCallId,
        missed: !wasConnected,
        loggedBySender: Boolean(logEntry)
      });
      if (isCaller) sendSignalField("callOffer", null);
      if (logEntry) logCallOnce(logEntry);
    } else if (isCaller) {
      sendSignalField("callOffer", null);
    }

    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
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
    videoTransceiver = null;
    currentCallId = null;
    isCaller = false;
    incomingOffer = null;
    callConnected = false;
    isMuted = false;
    isCamOff = false;
    isLowNet = false;
    isAudioFallback = false;
    isPartnerAudioOnly = false;
    isSpeaker = false;
    isMinimized = false;
    consecutiveWeakCount = 0;
    lastConnState = "";
    sentIceList = [];
    pendingRemoteIce = [];
    processedRemoteIceCount = 0;

    ["call-mute-btn", "call-cam-btn", "call-low-net-btn", "call-speaker-btn", "call-audio-only-btn", "call-share-btn"].forEach(id => {
      document.getElementById(id)?.classList.remove("active");
    });
    document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b.dataset.filter === "none"));
    const dareCard = document.getElementById("call-dare-card");
    if (dareCard) dareCard.style.display = "none";
    remoteVideo.srcObject = null;
    remoteVideo.style.display = "none";
    localVideo.srcObject = null;
    localVideo.style.display = "none";
    aiCanvas.style.display = "none";
    if (avatarNoteEl) avatarNoteEl.style.display = "none";
    callOverlay.style.display = "none";
    incomingOverlay.style.display = "none";
  }

  // UI Listeners
  document.getElementById("start-audio-call").addEventListener("click", () => startCall(false));
  document.getElementById("start-video-call").addEventListener("click", () => startCall(true));
  document.getElementById("accept-call-btn").addEventListener("click", acceptIncomingCall);
  document.getElementById("reject-call-btn").addEventListener("click", () => {
    stopRingtone();
    notifications.clearAlerts?.();
    incomingOverlay.style.display = "none";
    notes.secretCallDot.style.display = "none";
    if (incomingOffer) {
      const rejected = incomingOffer;
      handledCallIds.add(rejected.callId);
      sendSignalField("callHangup", { callId: rejected.callId, missed: true, rejected: true, loggedBySender: true });
      logCallOnce({
        isCallLog: true,
        missed: true,
        callId: rejected.callId,
        text: `📵 Missed ${rejected.video ? "Video" : "Audio"} Call`
      });
    }
    incomingOffer = null;
    pendingRemoteIce = [];
    processedRemoteIceCount = 0;
  });
  document.getElementById("hangup-call-btn").addEventListener("click", () => endCall(true));

  document.getElementById("call-minimize-btn")?.addEventListener("click", () => {
    if (typeof onRequestHideToNotes === "function") {
      onRequestHideToNotes();
    } else if (currentCallId) {
      isMinimized = true;
      callOverlay.style.display = "none";
      notes.secretCallDot.innerText = "• Syncing";
      notes.secretCallDot.style.display = "inline-flex";
    }
  });

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
    if (!isVideoCall || isAudioFallback || !pc) return;
    facingMode = facingMode === "user" ? "environment" : "user";
    try {
      const ns = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: isLowNet ? 320 : 480 } }
      });
      const newTrack = ns.getVideoTracks()[0];
      if (!newTrack) return;
      newTrack.enabled = !isCamOff;
      localStream?.getVideoTracks().forEach(t => {
        t.stop();
        localStream.removeTrack(t);
      });
      localStream.addTrack(newTrack);
      localVideo.srcObject = null;
      localVideo.srcObject = localStream;
      localVideo.play().catch(() => {});
      updateMirrorState();
      await syncOutgoingVideoTrack();
    } catch {}
  });

  document.getElementById("call-speaker-btn").addEventListener("click", async function () {
    isSpeaker = !isSpeaker;
    this.classList.toggle("active", isSpeaker);
    window.AndroidCallBridge?.setSpeaker?.(isSpeaker);
    if (!window.AndroidCallBridge && typeof remoteAudio.setSinkId === "function" && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const outputs = devs.filter(d => d.kind === "audiooutput");
        if (outputs.length > 1) {
          const target = isSpeaker
            ? outputs.find(d => /speaker/i.test(d.label)) || outputs[0]
            : outputs.find(d => /earpiece|head|default/i.test(d.label)) || outputs[0];
          if (target?.deviceId) await remoteAudio.setSinkId(target.deviceId).catch(() => {});
        }
      } catch {}
    }
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
    const sender = getVideoSender();
    if (sender) {
      const p = sender.getParameters();
      p.encodings = p.encodings || [{}];
      p.encodings[0].maxBitrate = isLowNet ? 160000 : 750000;
      await sender.setParameters(p).catch(() => {});
    }
  });

  if (audioFallbackBtn) {
    audioFallbackBtn.addEventListener("click", () => {
      if (isAudioFallback) restoreVideoFromFallback();
      else downgradeToAudioOnly("Audio-Only Saver Active 🎧");
    });
  }

  shareBtn?.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || !pc) return;
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
      shareBtn.classList.remove("active");
      updateMirrorState();
      await syncOutgoingVideoTrack();
      return;
    }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const st = ds.getVideoTracks()[0];
      const sender = getVideoSender();
      if (sender && st) {
        screenStream = ds;
        shareBtn.classList.add("active");
        updateMirrorState();
        await sender.replaceTrack(st);
        st.onended = () => {
          screenStream = null;
          shareBtn.classList.remove("active");
          updateMirrorState();
          syncOutgoingVideoTrack();
        };
      } else {
        ds.getTracks().forEach(t => t.stop());
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
    if (currentCallId) {
      isMinimized = false;
      notes.secretCallDot.style.display = "none";
      notes.secretCallDot.innerText = "• Syncing";
      callOverlay.style.display = "flex";
    } else if (incomingOffer) {
      notes.secretCallDot.style.display = "none";
      incomingOverlay.style.display = "flex";
      startRingtone();
    }
  });

  return {
    hasActiveCall: () => Boolean(currentCallId),
    getIncomingOffer: () => incomingOffer,
    showIncomingOverlayIfPending() {
      if (currentCallId && isMinimized) {
        isMinimized = false;
        notes.secretCallDot.style.display = "none";
        notes.secretCallDot.innerText = "• Syncing";
        callOverlay.style.display = "flex";
      } else if (incomingOffer) {
        notes.secretCallDot.style.display = "none";
        incomingOverlay.style.display = "flex";
        startRingtone();
      }
    },
    hideToDisguiseIfCallOpen() {
      if (document.getElementById("ear-blackout").style.display === "flex") {
        document.getElementById("ear-blackout").style.display = "none";
      }
      if (currentCallId) {
        isMinimized = true;
        callOverlay.style.display = "none";
        notes.secretCallDot.innerText = "• Syncing";
        notes.secretCallDot.style.display = "inline-flex";
      }
      if (incomingOffer) {
        stopRingtone();
        incomingOverlay.style.display = "none";
        notes.secretCallDot.style.display = "inline-flex";
      }
    },
    hideIncomingToDotIfPending() {
      this.hideToDisguiseIfCallOpen();
    },
    handleHardwareBack() {
      const ear = document.getElementById("ear-blackout");
      if (ear && ear.style.display === "flex") {
        ear.style.display = "none";
        if (isVideoCall) window.AndroidCallBridge?.setProximityEnabled?.(false);
        return true;
      }
      if (incomingOverlay.style.display === "flex" && incomingOffer) {
        stopRingtone();
        incomingOverlay.style.display = "none";
        notes.secretCallDot.style.display = "inline-flex";
        return true;
      }
      if (callOverlay.style.display === "flex" && currentCallId) {
        if (typeof onRequestHideToNotes === "function") {
          onRequestHideToNotes();
        } else {
          this.hideToDisguiseIfCallOpen();
        }
        return true;
      }
      return false;
    },
    async handleSignalingData(data, state) {
      const offer = data.callOffer;
      const hang = data.callHangup;

      if (shouldProcessIceRestartOffer({ offer, currentCallId, lastProcessedRestartTs })) {
        lastProcessedRestartTs = Number(offer.ts || 0);
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
            processedRemoteIceCount = 0;
            sentIceList = [];
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            sendSignalField("callAnswer", {
              callId: currentCallId,
              iceRestart: true,
              sdp: { type: ans.type, sdp: ans.sdp }
            });
          } catch {}
        }
      } else if (
        isOfferActiveAndFresh({
          offer,
          hangup: hang,
          lastOfferTs: state.lastOfferTs,
          handledCallIds,
          nowMs: Date.now()
        })
      ) {
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
            startStealthVibrate();
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

      const mode = data.callMode;
      if (mode && currentCallId && mode.callId === currentCallId && Date.now() - Number(mode.ts || 0) < 30000) {
        const nextRemoteAudioOnly = Boolean(mode.audioOnly);
        if (nextRemoteAudioOnly !== isPartnerAudioOnly) {
          isPartnerAudioOnly = nextRemoteAudioOnly;
          refreshRemoteStageDisplay();
          if (callConnected) {
            document.getElementById("call-status-text").innerText = isPartnerAudioOnly
              ? "Partner Audio Mode 🎧"
              : isAudioFallback
                ? "Audio Saver Connected 🎧"
                : "Connected 💖";
          }
        }
      }

      if (hang && hang.ts > state.lastHangupTs && (hang.callId === currentCallId || hang.callId === incomingOffer?.callId)) {
        state.lastHangupTs = hang.ts;
        if (hang.callId) handledCallIds.add(hang.callId);
        if (hang.loggedBySender && hang.callId) loggedCallIds.add(hang.callId);
        await endCall(false);
      }

      const dare = data.callDare;
      if (dare && dare.ts > lastCallDareTs && currentCallId && dare.callId === currentCallId && Date.now() - dare.ts < 25000) {
        lastCallDareTs = dare.ts;
        showCallDareBanner(dare.text);
      }
    }
  };
}
