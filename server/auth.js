import crypto from "node:crypto";

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let cachedCerts = null;
let certsExpiresAt = 0;

function base64UrlToBuffer(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function decodeJwtPart(part) {
  return JSON.parse(base64UrlToBuffer(part).toString("utf8"));
}

async function getFirebasePublicCerts() {
  if (cachedCerts && Date.now() < certsExpiresAt) {
    return cachedCerts;
  }
  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys (${res.status})`);
  }
  const cacheControl = res.headers.get("cache-control") || "";
  const match = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = match ? Number(match[1]) : 3600;
  cachedCerts = await res.json();
  certsExpiresAt = Date.now() + Math.max(60, maxAgeSec - 30) * 1000;
  return cachedCerts;
}

export async function verifyFirebaseIdToken(token, expectedProjectId) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing auth token");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT");
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeJwtPart(headerB64);
  const payload = decodeJwtPart(payloadB64);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported JWT header");
  }

  const certs = await getFirebasePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error("Unknown key ID");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const isValid = verifier.verify(certPem, base64UrlToBuffer(sigB64));
  if (!isValid) {
    throw new Error("Invalid token signature");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (expectedProjectId) {
    if (payload.aud !== expectedProjectId) {
      throw new Error("Token audience mismatch");
    }
    if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
      throw new Error("Token issuer mismatch");
    }
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Missing subject claim");
  }
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
    throw new Error("Token expired");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSec + 300) {
    throw new Error("Token issued in future");
  }

  return payload;
}

export function createAuthMiddleware(getProjectId) {
  return async function requireFirebaseAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const token = authHeader.slice(7).trim();
      const projectId = typeof getProjectId === "function" ? getProjectId() : getProjectId;
      req.firebaseUser = await verifyFirebaseIdToken(token, projectId);
      return next();
    } catch (err) {
      return res.status(401).json({ error: err?.message || "Invalid auth token" });
    }
  };
}
