import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthMiddleware } from "./server/auth.js";
import { registerPushRoutes } from "./server/push.js";
import { normalizeIceServers } from "./shared/rtcLogic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

app.use(express.json({ limit: "256kb" }));

const PUBLIC_FILES = new Set([
  "index.html",
  "style.css",
  "moods.css",
  "chat.css",
  "manifest.json",
  "dp.png",
  "sw.js"
]);

function loadFallbackFirebaseConfig() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "firebase-web-config.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getResolvedFirebaseConfig() {
  const fallback = loadFallbackFirebaseConfig();
  return {
    apiKey: process.env.FIREBASE_API_KEY || fallback.apiKey || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || fallback.authDomain || "",
    databaseURL: process.env.FIREBASE_DATABASE_URL || fallback.databaseURL || "",
    projectId: process.env.FIREBASE_PROJECT_ID || fallback.projectId || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || fallback.storageBucket || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || fallback.messagingSenderId || "",
    appId: process.env.FIREBASE_APP_ID || fallback.appId || "",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || fallback.measurementId || ""
  };
}

const requireFirebaseAuth = createAuthMiddleware(() => getResolvedFirebaseConfig().projectId);

app.get("/firebase-config.js", (_req, res) => {
  const firebaseConfig = getResolvedFirebaseConfig();
  const appConfig = {
    pushWorkerUrl: process.env.PUSH_WORKER_URL || "",
    hasPushServer: Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON || process.env.PUSH_WORKER_URL)
  };

  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(
    `window.__FIREBASE_CONFIG__ = ${JSON.stringify(firebaseConfig)};\n` +
    `window.__APP_CONFIG__ = ${JSON.stringify(appConfig)};\n`
  );
});

app.get("/api/rtc-config", requireFirebaseAuth, (_req, res) => {
  const config = normalizeIceServers({
    url: process.env.TURN_URL || "",
    username: process.env.TURN_USERNAME || "",
    credential: process.env.TURN_CREDENTIAL || ""
  });
  res.json(config);
});

registerPushRoutes(app, requireFirebaseAuth);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use("/js", express.static(path.join(__dirname, "js"), { extensions: ["js"] }));
app.use("/shared", express.static(path.join(__dirname, "shared"), { extensions: ["js"] }));

app.get("/:file", (req, res, next) => {
  const file = req.params.file;
  if (PUBLIC_FILES.has(file)) {
    return res.sendFile(path.join(__dirname, file));
  }
  return next();
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
