import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const BASE_URL = process.env.PICTOMAG_BASE_URL ?? "http://127.0.0.1:3005";

function getSetCookieValues(response) {
  const headers = response.headers;
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function extractCookieValue(setCookieValues, cookieName) {
  for (const value of setCookieValues) {
    const match = value.match(new RegExp(`${cookieName}=([^;\\s,]+)`));
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function buildCookieHeaderFromSetCookies(setCookieValues, cookieNames) {
  return cookieNames
    .map((cookieName) => {
      const cookieValue = extractCookieValue(setCookieValues, cookieName);
      return cookieValue ? `${cookieName}=${cookieValue}` : null;
    })
    .filter(Boolean)
    .join("; ");
}

async function requestJson(pathname, init) {
  const response = await fetch(new URL(pathname, BASE_URL), init);
  const text = await response.text();

  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  return { response, payload };
}

async function ensureServerReachable() {
  const { response } = await requestJson("/api/auth/session", {
    method: "GET",
    cache: "no-store",
  });

  assert.equal(
    response.ok,
    true,
    `Serveur non joignable sur ${BASE_URL}. Lance 'npm run dev:3005' (ou change PICTOMAG_BASE_URL).`,
  );
}

async function main() {
  const email = `phase1-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
  const password = "Phase1Auth!234";
  const compatUserId = `compat-phase1-${Date.now()}`;

  console.log(`[auth-phase1] base=${BASE_URL}`);
  await ensureServerReachable();

  const register = await requestJson("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      displayName: "Phase 1 User",
      username: `phase1-${Date.now()}`,
    }),
  });

  assert.equal(register.response.status, 201, "register doit retourner 201");
  assert.equal(register.payload?.authenticated, true, "register doit authentifier l utilisateur");
  assert.equal(register.payload?.compatibilityMode, false, "register doit ouvrir une vraie session locale");
  assert.equal(register.payload?.user?.email, email, "register doit retourner le bon email");

  const registerCookies = getSetCookieValues(register.response);
  const authCookieHeader = buildCookieHeaderFromSetCookies(registerCookies, [
    "pictomag_auth_token",
    "pictomag_auth_user_id",
    "pictomag_auth_role",
    "pictomag_session_id",
    "pictomag_preference_user_id",
  ]);
  assert.ok(authCookieHeader, "register doit poser les cookies de session");

  const meAfterRegister = await requestJson("/api/profile/me", {
    method: "GET",
    headers: { Cookie: authCookieHeader },
  });
  assert.equal(meAfterRegister.response.status, 200, "profile/me doit retourner 200 apres register");
  assert.equal(meAfterRegister.payload?.user?.email, email, "profile/me doit lire le user depuis SQLite");

  const sessionAfterRegister = await requestJson("/api/auth/session", {
    method: "GET",
    headers: { Cookie: authCookieHeader },
  });
  assert.equal(sessionAfterRegister.response.status, 200, "auth/session GET doit rester lisible");
  assert.equal(sessionAfterRegister.payload?.authenticated, true, "auth/session GET doit exposer la vraie session");
  assert.equal(sessionAfterRegister.payload?.compatibilityMode, false, "auth/session GET ne doit pas redevenir principal compat");

  const logout = await requestJson("/api/auth/logout", {
    method: "POST",
    headers: { Cookie: authCookieHeader },
  });
  assert.equal(logout.response.status, 200, "logout doit retourner 200");
  assert.equal(logout.payload?.authenticated, false, "logout doit fermer la session locale");

  const logoutCookies = getSetCookieValues(logout.response);
  const guestCookieHeader = buildCookieHeaderFromSetCookies(logoutCookies, [
    "pictomag_session_id",
    "pictomag_preference_user_id",
  ]);

  const meAfterLogout = await requestJson("/api/profile/me", {
    method: "GET",
    headers: guestCookieHeader ? { Cookie: guestCookieHeader } : undefined,
  });
  assert.equal(meAfterLogout.response.status, 401, "profile/me doit refuser un visiteur deconnecte");

  const login = await requestJson("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.response.status, 200, "login doit retourner 200");
  assert.equal(login.payload?.authenticated, true, "login doit reouvrir la session");
  assert.equal(login.payload?.compatibilityMode, false, "login doit rester sur le flux principal local");

  const adminGuest = await requestJson("/api/admin/audit-logs", {
    method: "GET",
  });
  assert.equal(adminGuest.response.status, 401, "audit-logs doit refuser un visiteur");

  const compatAdmin = await requestJson("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: compatUserId, role: "admin" }),
  });
  assert.equal(compatAdmin.response.status, 200, "auth/session POST compat doit rester disponible");
  assert.equal(compatAdmin.payload?.authenticated, true, "auth/session compat doit ouvrir une session temporaire");
  assert.equal(compatAdmin.payload?.compatibilityMode, true, "auth/session compat doit etre marque compat");

  const compatCookies = getSetCookieValues(compatAdmin.response);
  const compatCookieHeader = buildCookieHeaderFromSetCookies(compatCookies, [
    "pictomag_auth_token",
    "pictomag_auth_user_id",
    "pictomag_auth_role",
    "pictomag_session_id",
    "pictomag_preference_user_id",
  ]);
  assert.ok(compatCookieHeader, "le mode compat admin doit poser ses cookies");

  const auditAdmin = await requestJson("/api/admin/audit-logs", {
    method: "GET",
    headers: { Cookie: compatCookieHeader },
  });
  assert.equal(auditAdmin.response.status, 200, "audit-logs doit accepter une session admin compat");
  assert.equal(Array.isArray(auditAdmin.payload?.logs), true, "audit-logs doit retourner logs[]");

  console.log("[auth-phase1] OK - register/login/logout/me/audit valides.");
}

main().catch((error) => {
  console.error("[auth-phase1] FAIL");
  console.error(error);
  process.exitCode = 1;
});
