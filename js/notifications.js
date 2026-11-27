import { resolveApiUrl } from "../shared/chatLogic.js";

const SERVER_URL_KEY = "sc_api_base_url_v1";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function createNotificationManager({ getAuth, getDb, doc, setDoc, isNotesVisible, onIncomingCallPush }) {
  let pushListenersSet = false;
  let myFcmToken = "";
  let myWebPushSub = null;
  let lastPushError = "";
  let lastWebPushError = "";
  let partnerFcmToken = null;
  let partnerWebSub = null;
  let swRegistration = null;
  let pushInitPromise = null;

  function isNativeApp() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  }

  function getServerBaseUrl() {
    try {
      const saved = (localStorage.getItem(SERVER_URL_KEY) || "").trim();
      if (saved) return saved;
    } catch {}
    const cfgUrl = String(window.__APP_CONFIG__?.serverBaseUrl || "").trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(cfgUrl) ? cfgUrl : "";
  }

  function getPushWorkerUrl() {
    const cfgUrl = String(window.__APP_CONFIG__?.pushWorkerUrl || "").trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(cfgUrl) ? cfgUrl : "";
  }

  function setServerBaseUrl(url) {
    const clean = String(url || "").trim().replace(/\/+$/, "");
    try {
      if (clean && /^https?:\/\//i.test(clean)) {
        localStorage.setItem(SERVER_URL_KEY, clean);
      } else {
        localStorage.removeItem(SERVER_URL_KEY);
      }
    } catch {}
    return getServerBaseUrl();
  }

  function buildEndpointUrl(path) {
    return resolveApiUrl(path, {
      isNative: isNativeApp(),
      serverBaseUrl: getServerBaseUrl()
    });
  }

  async function ensureServiceWorker() {
    if (!("serviceWorker" in navigator) || isNativeApp()) return null;
    if (swRegistration) return swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
      return swRegistration;
    } catch {
      return null;
    }
  }

  async function subscribeWebPush() {
    if (isNativeApp()) return null;
    if (!("Notification" in window) || Notification.permission !== "granted") return null;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      lastWebPushError = "PushManager not supported";
      return null;
    }
    const user = getAuth()?.currentUser;
    const db = getDb();
    if (!user || !db) return null;

    try {
      const reg = await ensureServiceWorker();
      if (!reg?.pushManager) return null;

      const idToken = await user.getIdToken();
      const keyRes = await fetch(buildEndpointUrl("/api/push/public-key"), {
        headers: { Authorization: "Bearer " + idToken }
      });
      if (!keyRes.ok) {
        lastWebPushError = `VAPID fetch failed (${keyRes.status})`;
        return null;
      }
      const { publicKey } = await keyRes.json();
      if (!publicKey) return null;

      const desiredKey = urlBase64ToUint8Array(publicKey);
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        const existingKey = sub.options?.applicationServerKey;
        const existingArr = existingKey ? new Uint8Array(existingKey) : null;
        const mismatch =
          !existingArr ||
          existingArr.length !== desiredKey.length ||
          existingArr.some((b, idx) => b !== desiredKey[idx]);
        if (mismatch) {
          await sub.unsubscribe().catch(() => {});
          sub = null;
        }
      }

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: desiredKey
        });
      }

      const subJson = JSON.stringify(sub.toJSON());
      myWebPushSub = subJson;
      lastWebPushError = "";
      await setDoc(doc(db, "status", user.uid), { webPushSub: subJson }, { merge: true }).catch(() => {});
      return subJson;
    } catch (e) {
      lastWebPushError = e?.message || "Web push subscribe failed";
      return null;
    }
  }

  async function requestBrowserPermission() {
    if (isNativeApp()) return "native";
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") {
      await ensureServiceWorker();
      await subscribeWebPush();
      return "granted";
    }
    if (Notification.permission === "denied") return "denied";
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await ensureServiceWorker();
        await subscribeWebPush();
      }
      return perm;
    } catch {
      return "denied";
    }
  }

  function getDisguisedCopy(kind = "message") {
    return {
      call: { title: "My Notes", body: "Important sync alert waiting" },
      ping: { title: "My Notes", body: "Pinned reminder updated" },
      letter: { title: "My Notes", body: "New synced note available" },
      message: { title: "My Notes", body: "New note backup synced" }
    }[kind] || { title: "My Notes", body: "New note backup synced" };
  }

  async function showBrowserAlert(kind = "message", forceTest = false) {
    const inForegroundChat = document.visibilityState === "visible" && !isNotesVisible();
    if (!forceTest && inForegroundChat) return false;

    const copy = getDisguisedCopy(kind);
    if (!forceTest) {
      try {
        document.title = "My Notes •";
      } catch {}
    }

    if (window.AndroidCallBridge?.showSyncNotification) {
      window.AndroidCallBridge.showSyncNotification(kind);
      if (isNativeApp()) return true;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
      return false;
    }

    try {
      const reg = await ensureServiceWorker();
      if (reg?.showNotification) {
        await reg.showNotification(copy.title, {
          body: copy.body,
          tag: kind === "call" ? "my-notes-call" : "my-notes-sync",
          renotify: true,
          requireInteraction: kind === "call"
        });
        return true;
      }
      new Notification(copy.title, {
        body: copy.body,
        tag: kind === "call" ? "my-notes-call" : "my-notes-sync"
      });
      return true;
    } catch {
      return false;
    }
  }

  function clearAlerts() {
    try {
      document.title = "My Notes";
    } catch {}
    window.AndroidCallBridge?.cancelSyncNotification?.();
  }

  async function initPushNotifications() {
    if (pushInitPromise) return pushInitPromise;
    pushInitPromise = (async () => {
      ensureServiceWorker();
      const Push = window.Capacitor?.Plugins?.PushNotifications;
      if (!Push) {
        lastPushError = "Browser mode";
        if ("Notification" in window && Notification.permission === "granted") {
          subscribeWebPush();
        }
        return;
      }
      try {
        await new Promise(r => setTimeout(r, 350));

        if (window.AndroidCallBridge?.canUseFcm) {
          const ok = window.AndroidCallBridge.canUseFcm();
          if (!ok) {
            lastPushError = window.AndroidCallBridge.getFcmInitError?.() || "FCM unavailable on device";
            return;
          }
        }

        await Push.createChannel({
          id: "notes_sync",
          name: "Notes Sync",
          description: "Notes backup and reminders",
          importance: 4,
          visibility: 0,
          vibration: true
        }).catch(() => {});

        if (!pushListenersSet) {
          pushListenersSet = true;
          Push.addListener("registration", ({ value }) => {
            myFcmToken = value || "";
            lastPushError = "";
            const user = getAuth()?.currentUser;
            const db = getDb();
            if (value && user && db) {
              setDoc(doc(db, "status", user.uid), { fcmToken: value }, { merge: true }).catch(() => {});
            }
          });
          Push.addListener("registrationError", err => {
            lastPushError = "FCM Reg Error: " + (err?.error || JSON.stringify(err));
          });
          Push.addListener("pushNotificationReceived", notif => {
            const kind = notif?.data?.kind || "message";
            if (kind === "call" && isNotesVisible()) {
              onIncomingCallPush?.();
            }
            if (isNotesVisible()) {
              window.AndroidCallBridge?.showSyncNotification?.(kind);
            }
          });
          Push.addListener("pushNotificationActionPerformed", action => {
            const kind = action?.notification?.data?.kind || "message";
            if (kind === "call") {
              onIncomingCallPush?.();
            }
          });
        }

        const currentUser = getAuth()?.currentUser;
        const currentDb = getDb();
        if (myFcmToken && currentUser && currentDb) {
          setDoc(doc(currentDb, "status", currentUser.uid), { fcmToken: myFcmToken }, { merge: true }).catch(() => {});
        }

        let perm = await Push.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          perm = await Push.requestPermissions();
        }
        if (perm.receive !== "granted") {
          lastPushError = "Permission denied (" + perm.receive + ")";
          return;
        }
        await Push.register();
      } catch (e) {
        lastPushError = e?.message || "Push init error";
      }
    })();
    try {
      await pushInitPromise;
    } finally {
      pushInitPromise = null;
    }
  }

  async function sendPushAlert(kind = "message", returnDebug = false) {
    const user = getAuth()?.currentUser;
    if (!user) return returnDebug ? "Not logged in" : null;
    if (!partnerFcmToken && !partnerWebSub) {
      return returnDebug ? "Love ne abhi notifications Allow nahi ki hain" : null;
    }
    const url = buildEndpointUrl("/api/send-push");
    const workerUrl = getPushWorkerUrl();
    const canCallServer = !(isNativeApp() && url.startsWith("/"));
    if (!canCallServer && !(partnerFcmToken && workerUrl)) {
      return returnDebug ? "APK ke liye neeche Live Server URL add karein" : null;
    }
    try {
      const idToken = await user.getIdToken();
      if (canCallServer) {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + idToken
          },
          body: JSON.stringify({
            targetToken: partnerFcmToken || "",
            targetWebSub: partnerWebSub || null,
            kind
          })
        });
        const data = await res.json().catch(() => ({}));
        if (data.ok) {
          return returnDebug ? `Server Push OK (${data.mode || "push"})` : data;
        }
        if (!(partnerFcmToken && workerUrl)) {
          return returnDebug ? (data.reason || data.error || `HTTP ${res.status}`) : data;
        }
      }

      if (partnerFcmToken && workerUrl) {
        const wRes = await fetch(workerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + idToken
          },
          body: JSON.stringify({
            targetToken: partnerFcmToken,
            kind
          })
        });
        const wData = await wRes.json().catch(() => ({}));
        if (returnDebug) {
          return wData.ok ? "Worker Push OK ✅" : (wData.error || `Worker HTTP ${wRes.status}`);
        }
        return wData;
      }
      return returnDebug ? "Push dispatch failed" : null;
    } catch (e) {
      if (returnDebug) return "Network error: " + e.message;
      return null;
    }
  }

  function setPartnerTargets({ fcmToken, webPushSub } = {}) {
    if (fcmToken) partnerFcmToken = fcmToken;
    if (webPushSub) partnerWebSub = webPushSub;
  }

  async function testLiveNotification() {
    const perm = await requestBrowserPermission();
    const shown = await showBrowserAlert("call", true);
    return { perm, shown };
  }

  async function checkRtcRelayStatus() {
    const user = getAuth()?.currentUser;
    if (!user) return "Not logged in";
    const rtcUrl = buildEndpointUrl("/api/rtc-config");
    if (isNativeApp() && rtcUrl.startsWith("/")) {
      return "Live Server URL add karein (STUN Only ⚠️)";
    }
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(rtcUrl, {
        headers: { Authorization: "Bearer " + idToken }
      });
      if (!res.ok) return `HTTP ${res.status} (Check Server)`;
      const data = await res.json();
      return data?.hasTurn ? "TURN Relay Ready ✅" : "STUN Only (Set TURN_URL on server)";
    } catch (e) {
      return "Unreachable (" + (e?.message || "network") + ")";
    }
  }

  async function getDiagnostics() {
    await initPushNotifications();
    const browserPerm = isNativeApp()
      ? "Android Native Channel Ready ✅"
      : ("Notification" in window ? Notification.permission : "unsupported");
    const myWebState = isNativeApp()
      ? "APK Mode"
      : (myWebPushSub ? "Closed-App Web Push Ready ✅" : (lastWebPushError || "Allow alerts first"));
    const myApkState = myFcmToken ? "APK Token OK ✅" : (isNativeApp() ? (lastPushError || "Registering...") : "Web Mode");
    const partnerState = partnerFcmToken && partnerWebSub
      ? "APK + Browser Ready ✅"
      : (partnerFcmToken ? "APK Ready ✅" : (partnerWebSub ? "Browser Push Ready ✅" : "Missing ❌"));
    const [serverRes, turnState] = await Promise.all([
      (partnerFcmToken || partnerWebSub)
        ? sendPushAlert("message", true)
        : Promise.resolve("Skipped (Love ne abhi Allow nahi kiya)"),
      checkRtcRelayStatus()
    ]);
    return [
      `Permission: ${browserPerm}`,
      `My Browser Push: ${myWebState}`,
      `My APK Push: ${myApkState}`,
      `Love Push Target: ${partnerState}`,
      `Server Dispatch: ${serverRes}`,
      `Calls TURN Relay: ${turnState}`
    ].join("\n");
  }

  return {
    isNativeApp,
    getServerBaseUrl,
    setServerBaseUrl,
    buildEndpointUrl,
    initPushNotifications,
    requestBrowserPermission,
    subscribeWebPush,
    showBrowserAlert,
    clearAlerts,
    testLiveNotification,
    sendPushAlert,
    setPartnerTargets,
    getDiagnostics
  };
}
