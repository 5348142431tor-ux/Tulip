import crypto from "node:crypto";
import { buildCompanyDescriptor, buildRoleDescriptor } from "./accessModel.js";
import { getConfig } from "../config.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getSecret() {
  return getConfig().adminSessionSecret;
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function inferActorType(role) {
  if (role === "project_owner") return "platform_owner";
  if (role === "client") return "client";
  return "company_staff";
}

function normalizeActor(actor) {
  if (!actor?.id || !actor?.name || !actor?.role) {
    const error = new Error("id, name, and role are required for admin session");
    error.statusCode = 400;
    throw error;
  }

  return {
    id: String(actor.id).trim(),
    name: String(actor.name).trim(),
    role: String(actor.role).trim(),
    actorType: String(actor.actorType || inferActorType(actor.role)).trim(),
    login: actor.login ? String(actor.login).trim() : undefined,
    mustChangePassword: Boolean(actor.mustChangePassword),
    clientId: actor.clientId ? String(actor.clientId).trim() : undefined,
    staffId: actor.staffId ? String(actor.staffId).trim() : undefined,
    company: actor.company
      ? {
          id: String(actor.company.id || "").trim(),
          code: String(actor.company.code || "").trim(),
          name: String(actor.company.name || "").trim(),
          status: String(actor.company.status || "active").trim(),
        }
      : undefined,
  };
}

function inflateActor(actor) {
  const normalizedActor = normalizeActor(actor);
  const roleInfo = buildRoleDescriptor(normalizedActor.role, {
    scope: "admin_cabinet",
    actorType: normalizedActor.actorType,
  });

  return {
    id: normalizedActor.id,
    name: normalizedActor.name,
    role: normalizedActor.role,
    roleLabel: roleInfo.label,
    roleInfo,
    actorType: normalizedActor.actorType,
    ...(normalizedActor.login ? { login: normalizedActor.login } : {}),
    mustChangePassword: Boolean(normalizedActor.mustChangePassword),
    ...(normalizedActor.clientId ? { clientId: normalizedActor.clientId } : {}),
    ...(normalizedActor.staffId ? { staffId: normalizedActor.staffId } : {}),
    ...(normalizedActor.company?.id
      ? { company: buildCompanyDescriptor(normalizedActor.company) }
      : {}),
  };
}

export function createAdminSessionToken({ user, impersonator = null }) {
  const payload = {
    user: normalizeActor(user),
    impersonator: impersonator ? normalizeActor(impersonator) : null,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  const rawToken = String(token || "").trim();

  if (!rawToken || !rawToken.includes(".")) {
    const error = new Error("Admin session token is invalid");
    error.statusCode = 401;
    throw error;
  }

  const [encodedPayload, signature] = rawToken.split(".");
  const expectedSignature = signValue(encodedPayload);
  if (!signature || signature.length !== expectedSignature.length) {
    const error = new Error("Admin session token signature is invalid");
    error.statusCode = 401;
    throw error;
  }

  const signatureOk = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!signatureOk) {
    const error = new Error("Admin session token signature is invalid");
    error.statusCode = 401;
    throw error;
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));

  if (!payload?.user?.id || !payload?.user?.name || !payload?.user?.role) {
    const error = new Error("Admin session payload is invalid");
    error.statusCode = 401;
    throw error;
  }

  if (Number(payload.exp || 0) < Date.now()) {
    const error = new Error("Admin session token has expired");
    error.statusCode = 401;
    throw error;
  }

  return {
    token: rawToken,
    user: inflateActor(payload.user),
    impersonator: payload.impersonator ? inflateActor(payload.impersonator) : null,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}

export function getBearerToken(request) {
  const header = String(request.headers.authorization || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}
