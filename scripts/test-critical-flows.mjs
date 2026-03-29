import assert from "node:assert/strict";
import WebSocket from "ws";

const BASE_URL = process.env.PICTOMAG_BASE_URL ?? "http://127.0.0.1:3005";
const TEST_USER_ID = process.env.PICTOMAG_TEST_USER_ID ?? "critical-smoke-user";
const REALTIME_WAIT_TIMEOUT_MS = 12_000;

function withUser(pathname) {
  const url = new URL(pathname, BASE_URL);
  url.searchParams.set("userId", TEST_USER_ID);
  return url.toString();
}

function withCustomUser(pathname, userId) {
  const url = new URL(pathname, BASE_URL);
  url.searchParams.set("userId", userId);
  return url.toString();
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout(promise, timeoutMs, errorMessage) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function connectRealtimeSocket(wsUrl, clientLabel) {
  const socket = new WebSocket(wsUrl);
  const events = [];
  const waiters = new Set();
  let settled = false;

  const connected = withTimeout(
    new Promise((resolve, reject) => {
      socket.once("open", () => {
        settled = true;
        resolve();
      });

      socket.once("error", (error) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      });
    }),
    REALTIME_WAIT_TIMEOUT_MS,
    `Timeout websocket open pour ${clientLabel}`,
  );

  socket.on("message", (raw) => {
    const text = raw.toString();
    let parsed = null;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    events.push(parsed);

    for (const waiter of Array.from(waiters)) {
      if (waiter.predicate(parsed)) {
        waiters.delete(waiter);
        clearTimeout(waiter.timeoutId);
        waiter.resolve(parsed);
      }
    }
  });

  await connected;

  const waitForEvent = (predicate, label, timeoutMs = REALTIME_WAIT_TIMEOUT_MS) => {
    const existing = events.find((event) => predicate(event));
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve,
        timeoutId: setTimeout(() => {
          waiters.delete(waiter);
          const recentEvents = events
            .slice(-8)
            .map((event) => `${String(event?.type ?? "unknown")}:${String(event?.payload?.action ?? "-")}`)
            .join(", ");
          reject(
            new Error(
              `Timeout evenement websocket "${label}" pour ${clientLabel}. Evenements recents=[${recentEvents}]`,
            ),
          );
        }, timeoutMs),
      };

      waiters.add(waiter);
    });
  };

  const close = () =>
    new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) {
          return;
        }

        done = true;
        resolve();
      };

      if (socket.readyState === WebSocket.CLOSED) {
        finish();
        return;
      }

      const hardCloseTimer = setTimeout(() => {
        try {
          socket.terminate();
        } catch {
          // ignore terminate failures
        }
        finish();
      }, 1_500);

      socket.once("close", () => {
        clearTimeout(hardCloseTimer);
        finish();
      });

      try {
        socket.close();
      } catch {
        clearTimeout(hardCloseTimer);
        finish();
      }
    });

  return {
    socket,
    events,
    waitForEvent,
    close,
  };
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  return { response, payload, text };
}

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

async function loginAsRole({ userId, role }) {
  const login = await requestJson(new URL("/api/auth/session", BASE_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role }),
  });

  assert.equal(login.response.status, 200, `POST auth/session doit retourner 200 pour ${userId}`);
  const setCookieValues = getSetCookieValues(login.response);
  const cookieHeader = buildCookieHeaderFromSetCookies(setCookieValues, [
    "pictomag_auth_token",
    "pictomag_auth_user_id",
    "pictomag_auth_role",
    "pictomag_session_id",
    "pictomag_preference_user_id",
  ]);
  assert.ok(cookieHeader, `Le header Cookie doit etre construit pour ${userId}`);

  return {
    cookieHeader,
    setCookieValues,
  };
}

async function ensureServerReachable() {
  const { response } = await requestJson(withUser("/api/state/marketplace-orders"), { method: "GET" });
  assert.equal(
    response.ok,
    true,
    `Serveur non joignable sur ${BASE_URL}. Lance 'npm run dev' (ou change PICTOMAG_BASE_URL).`,
  );
}

async function testMarketplaceOrdersFlow() {
  const getBefore = await requestJson(withUser("/api/state/marketplace-orders"), { method: "GET" });
  assert.equal(getBefore.response.status, 200, "GET marketplace-orders doit retourner 200");
  assert.ok(Array.isArray(getBefore.payload?.orders), "GET marketplace-orders doit retourner orders[]");

  const now = Date.now();
  const customOrder = {
    id: now,
    gigId: 999,
    title: "Critical smoke order",
    client: "Test Client",
    seller: "Test Seller",
    budget: 321,
    dueDate: "1 avr.",
    stageIndex: 0,
    lastUpdate: "Created from smoke test",
    paymentReleased: false,
    timelikeTrust: 90,
    brief: "Smoke test brief",
    notes: ["smoke-1", "smoke-2"],
  };

  const put = await requestJson(withUser("/api/state/marketplace-orders"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders: [customOrder] }),
  });
  assert.equal(put.response.status, 200, "PUT marketplace-orders doit retourner 200");
  assert.equal(Array.isArray(put.payload?.orders), true, "PUT marketplace-orders doit retourner orders[]");
  assert.equal(put.payload.orders.length, 1, "PUT marketplace-orders doit sauvegarder 1 commande");

  const getAfter = await requestJson(withUser("/api/state/marketplace-orders"), { method: "GET" });
  assert.equal(getAfter.response.status, 200, "GET marketplace-orders apres PUT doit retourner 200");
  assert.equal(getAfter.payload.orders[0]?.id, customOrder.id, "La commande sauvegardee doit etre relue");
}

async function testSessionStabilityFlow() {
  const first = await requestJson(withUser("/api/state/marketplace-orders"), { method: "GET" });
  assert.equal(first.response.status, 200, "GET marketplace-orders (session init) doit retourner 200");

  const setCookieValues = getSetCookieValues(first.response);
  const sessionId = extractCookieValue(setCookieValues, "pictomag_session_id");
  const preferenceUserId = extractCookieValue(setCookieValues, "pictomag_preference_user_id");

  assert.ok(sessionId, "La reponse doit setter un cookie de session pictomag_session_id");

  const cookieHeader = [
    `pictomag_session_id=${sessionId}`,
    preferenceUserId ? `pictomag_preference_user_id=${preferenceUserId}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  const withoutQueryUrl = new URL("/api/state/marketplace-orders", BASE_URL).toString();
  const second = await requestJson(withoutQueryUrl, {
    method: "GET",
    headers: { Cookie: cookieHeader },
  });

  assert.equal(second.response.status, 200, "GET marketplace-orders avec session doit retourner 200");
  assert.equal(second.payload?.userId, TEST_USER_ID, "La session doit garder le meme userId entre requetes");
}

async function testAuthSessionFlow() {
  const login = await requestJson(new URL("/api/auth/session", BASE_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: TEST_USER_ID, role: "seller" }),
  });

  assert.equal(login.response.status, 200, "POST auth/session doit retourner 200");

  const setCookieValues = getSetCookieValues(login.response);
  const authUserCookie = extractCookieValue(setCookieValues, "pictomag_auth_user_id");
  const authRoleCookie = extractCookieValue(setCookieValues, "pictomag_auth_role");
  const sessionCookie = extractCookieValue(setCookieValues, "pictomag_session_id");

  assert.ok(authUserCookie, "Le cookie auth user doit etre present");
  assert.ok(authRoleCookie, "Le cookie auth role doit etre present");
  assert.ok(sessionCookie, "Le cookie session doit etre present");

  const authTokenCookie = extractCookieValue(setCookieValues, "pictomag_auth_token");
  assert.ok(authTokenCookie, "Le cookie auth token signe doit etre present");

  const cookieHeader = buildCookieHeaderFromSetCookies(setCookieValues, [
    "pictomag_auth_token",
    "pictomag_auth_user_id",
    "pictomag_auth_role",
    "pictomag_session_id",
    "pictomag_preference_user_id",
  ]);

  const profile = await requestJson(new URL("/api/auth/session", BASE_URL).toString(), {
    method: "GET",
    headers: { Cookie: cookieHeader },
  });

  assert.equal(profile.response.status, 200, "GET auth/session doit retourner 200");
  assert.equal(profile.payload?.userId, TEST_USER_ID, "GET auth/session doit retourner le userId demande");
  assert.equal(profile.payload?.role, "seller", "GET auth/session doit retourner le role actif");
}

async function testLiveOrdersFlow() {
  const getBefore = await requestJson(withUser("/api/state/live-shopping-orders"), { method: "GET" });
  assert.equal(getBefore.response.status, 200, "GET live-shopping-orders doit retourner 200");
  assert.ok(Array.isArray(getBefore.payload?.orders), "GET live-shopping-orders doit retourner orders[]");

  const orderId = Date.now() + 1;
  const customOrder = {
    id: orderId,
    eventId: 101,
    title: "Critical live order",
    buyer: "Test Buyer",
    seller: "Test Seller",
    amount: 88,
    quantity: 2,
    stageIndex: 1,
    etaLabel: "48h",
    lastUpdate: "Live order smoke test",
    note: "Smoke note",
  };

  const put = await requestJson(withUser("/api/state/live-shopping-orders"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders: [customOrder] }),
  });
  assert.equal(put.response.status, 200, "PUT live-shopping-orders doit retourner 200");
  assert.equal(put.payload.orders[0]?.id, customOrder.id, "PUT live-shopping-orders doit sauvegarder la commande");

  const getAfter = await requestJson(withUser("/api/state/live-shopping-orders"), { method: "GET" });
  assert.equal(getAfter.response.status, 200, "GET live-shopping-orders apres PUT doit retourner 200");
  assert.equal(getAfter.payload.orders[0]?.id, customOrder.id, "La commande live sauvegardee doit etre relue");
}

async function testLiveInventoryFlow() {
  const getBefore = await requestJson(withUser("/api/state/live-shopping-inventory"), { method: "GET" });
  assert.equal(getBefore.response.status, 200, "GET live-shopping-inventory doit retourner 200");
  assert.ok(Array.isArray(getBefore.payload?.inventory), "GET live-shopping-inventory doit retourner inventory[]");

  const inventoryId = `critical-item-${Date.now()}`;
  const customInventoryItem = {
    id: inventoryId,
    title: "Critical inventory item",
    categoryId: "trading-card-games",
    categoryLabel: "Trading Card Games",
    description: "Item for critical smoke test",
    quantity: 9,
    price: 77,
    status: "active",
    mode: "auction",
    currentBid: 80,
    bidIncrement: 2,
    reserveForLive: true,
    liveSlug: "jp-p2pdd-one-piece-live-14",
    flashSale: true,
    acceptOffers: true,
    cover: "/figma-assets/photo-feed/photo-grid-6.jpg",
    deliveryProfile: "Expedition 48h",
    dangerousGoods: "Pas de matieres dangereuses",
    costPerItem: "42",
    sku: "CRITICAL-ITEM",
    createdAt: Date.now(),
  };

  const put = await requestJson(withUser("/api/state/live-shopping-inventory"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inventory: [customInventoryItem] }),
  });
  assert.equal(put.response.status, 200, "PUT live-shopping-inventory doit retourner 200");
  assert.equal(
    put.payload.inventory[0]?.id,
    customInventoryItem.id,
    "PUT live-shopping-inventory doit sauvegarder l'inventaire",
  );
  assert.equal(
    put.payload.inventory[0]?.currentBid,
    80,
    "PUT live-shopping-inventory doit conserver currentBid pour le mode auction",
  );

  const getAfter = await requestJson(withUser("/api/state/live-shopping-inventory"), { method: "GET" });
  assert.equal(getAfter.response.status, 200, "GET live-shopping-inventory apres PUT doit retourner 200");
  assert.equal(
    getAfter.payload.inventory[0]?.id,
    customInventoryItem.id,
    "L'inventaire sauvegarde doit etre relu",
  );
}

async function testLiveScheduleFlow() {
  const getBefore = await requestJson(withUser("/api/state/live-shopping-schedule"), { method: "GET" });
  assert.equal(getBefore.response.status, 200, "GET live-shopping-schedule doit retourner 200");
  assert.equal(Array.isArray(getBefore.payload?.schedule), true, "GET live-shopping-schedule doit retourner schedule[]");

  const scheduleId = `critical-schedule-${Date.now()}`;
  const customScheduledLive = {
    id: scheduleId,
    title: "Critical scheduled live",
    liveDate: "2026-04-10",
    liveTime: "20:30",
    repeatValue: "Ne se repete pas",
    categoryId: "trading-card-games",
    categoryLabel: "Trading Card Games",
    saleFormat: "Enchere live",
    tags: ["Pokemon", "One Piece"],
    moderators: ["critical.mod"],
    coverName: "critical-cover.jpg",
    previewName: "critical-preview.mp4",
    freePickup: true,
    shippingDefault: "Expedition 48h",
    shippingFees: "6,90 EUR",
    disablePreBids: false,
    waitlistEnabled: true,
    replayEnabled: true,
    language: "Francais",
    explicitLanguage: false,
    mutedWords: "spam",
    discoveryMode: "public",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const put = await requestJson(withUser("/api/state/live-shopping-schedule"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schedule: [customScheduledLive] }),
  });
  assert.equal(put.response.status, 200, "PUT live-shopping-schedule doit retourner 200");
  assert.equal(
    put.payload.schedule[0]?.id,
    customScheduledLive.id,
    "PUT live-shopping-schedule doit sauvegarder le live programme",
  );

  const getAfter = await requestJson(withUser("/api/state/live-shopping-schedule"), { method: "GET" });
  assert.equal(getAfter.response.status, 200, "GET live-shopping-schedule apres PUT doit retourner 200");
  assert.equal(
    getAfter.payload.schedule[0]?.id,
    customScheduledLive.id,
    "Le planning live sauvegarde doit etre relu",
  );
}

async function testLiveActionsFlow() {
  const inventoryBefore = await requestJson(withUser("/api/state/live-shopping-inventory"), { method: "GET" });
  assert.equal(inventoryBefore.response.status, 200, "GET inventory avant actions live doit retourner 200");

  const inventoryList = Array.isArray(inventoryBefore.payload?.inventory) ? inventoryBefore.payload.inventory : [];
  const auctionItem = inventoryList.find((item) => item?.mode === "auction" && Number(item?.quantity) > 0);
  assert.ok(auctionItem, "Il faut au moins un produit auction en stock pour tester les actions live");

  const minimumBid = (Number(auctionItem.currentBid ?? auctionItem.price) || 0) + (Number(auctionItem.bidIncrement) || 1);

  const bid = await requestJson(withUser("/api/live-shopping/actions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-idempotency-key": `critical-bid-${Date.now()}`,
    },
    body: JSON.stringify({
      action: "place_bid",
      eventId: 1,
      eventSeller: "Test Seller",
      lot: {
        id: auctionItem.id,
        title: auctionItem.title,
        mode: "auction",
        price: Number(auctionItem.price),
        currentBid: auctionItem.currentBid,
        bidIncrement: auctionItem.bidIncrement,
        delivery: auctionItem.deliveryProfile,
        stock: Number(auctionItem.quantity),
      },
      amount: minimumBid,
    }),
  });

  assert.equal(bid.response.status, 200, "POST live action place_bid doit retourner 200");
  assert.equal(bid.payload?.acceptedBid, minimumBid, "Le montant d enchere accepte doit matcher l offre");

  const checkoutKey = `critical-checkout-${Date.now()}`;
  const checkoutBody = {
    action: "checkout",
    eventId: 1,
    eventSeller: "Test Seller",
    lot: {
      id: auctionItem.id,
      title: auctionItem.title,
      mode: "auction",
      price: Number(auctionItem.price),
      currentBid: minimumBid,
      bidIncrement: auctionItem.bidIncrement,
      delivery: auctionItem.deliveryProfile,
      stock: Number(auctionItem.quantity),
    },
    amount: minimumBid,
    quantity: 1,
    note: "critical live checkout",
    paymentMethod: "card",
  };

  const checkout = await requestJson(withUser("/api/live-shopping/actions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-idempotency-key": checkoutKey,
    },
    body: JSON.stringify(checkoutBody),
  });

  assert.equal(checkout.response.status, 200, "POST live action checkout doit retourner 200");
  assert.equal(checkout.payload?.order?.title, auctionItem.title, "Le checkout doit creer une commande sur le bon lot");
  assert.equal(
    checkout.payload?.remainingStock,
    Number(auctionItem.quantity) - 1,
    "Le checkout doit decrementer le stock",
  );

  const replay = await requestJson(withUser("/api/live-shopping/actions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-idempotency-key": checkoutKey,
    },
    body: JSON.stringify(checkoutBody),
  });

  assert.equal(replay.response.status, 200, "Le replay idempotent checkout doit retourner 200");
  assert.equal(
    replay.response.headers.get("x-idempotency-replayed"),
    "1",
    "La reponse idempotente doit indiquer le replay",
  );
  assert.equal(replay.payload?.order?.id, checkout.payload?.order?.id, "Le replay idempotent doit renvoyer la meme commande");
  assert.equal(
    replay.payload?.remainingStock,
    checkout.payload?.remainingStock,
    "Le replay idempotent ne doit pas redecrementer le stock",
  );

  const adminLogin = await requestJson(new URL("/api/auth/session", BASE_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: TEST_USER_ID, role: "admin" }),
  });

  assert.equal(adminLogin.response.status, 200, "POST auth/session admin doit retourner 200");
  const adminCookieHeader = buildCookieHeaderFromSetCookies(getSetCookieValues(adminLogin.response), [
    "pictomag_auth_token",
    "pictomag_auth_user_id",
    "pictomag_auth_role",
    "pictomag_session_id",
    "pictomag_preference_user_id",
  ]);

  const audit = await requestJson(withUser("/api/admin/audit-logs?limit=20"), {
    method: "GET",
    headers: { Cookie: adminCookieHeader },
  });

  assert.equal(audit.response.status, 200, "GET admin/audit-logs doit retourner 200 pour un role admin");
  assert.equal(Array.isArray(audit.payload?.logs), true, "admin/audit-logs doit retourner logs[]");
  const actions = new Set((audit.payload?.logs ?? []).map((entry) => entry?.action_type));
  assert.equal(actions.has("place_bid"), true, "Les logs d audit doivent inclure place_bid");
  assert.equal(actions.has("checkout"), true, "Les logs d audit doivent inclure checkout");
}

async function testLiveSharedRealtimeFlow() {
  const userA = `critical-room-a-${Date.now()}`;
  const userB = `critical-room-b-${Date.now()}`;

  const [loginA, loginB] = await Promise.all([
    loginAsRole({ userId: userA, role: "buyer" }),
    loginAsRole({ userId: userB, role: "buyer" }),
  ]);
  const eventId = 1;
  const [realtimeDescriptorA, realtimeDescriptorB] = await Promise.all([
    requestJson(withCustomUser(`/api/live-shopping/realtime?eventId=${eventId}`, userA), {
      method: "GET",
      headers: { Cookie: loginA.cookieHeader },
    }),
    requestJson(withCustomUser(`/api/live-shopping/realtime?eventId=${eventId}`, userB), {
      method: "GET",
      headers: { Cookie: loginB.cookieHeader },
    }),
  ]);

  assert.equal(realtimeDescriptorA.response.status, 200, "GET live-shopping/realtime userA doit retourner 200");
  assert.equal(realtimeDescriptorB.response.status, 200, "GET live-shopping/realtime userB doit retourner 200");
  assert.equal(
    typeof realtimeDescriptorA.payload?.wsUrl === "string" || realtimeDescriptorA.payload?.transport === "sse",
    true,
    "Le descriptor realtime userA doit fournir wsUrl ou fallback sse",
  );
  assert.equal(
    typeof realtimeDescriptorB.payload?.wsUrl === "string" || realtimeDescriptorB.payload?.transport === "sse",
    true,
    "Le descriptor realtime userB doit fournir wsUrl ou fallback sse",
  );
  if (typeof realtimeDescriptorA.payload?.wsUrl === "string") {
    assert.equal(realtimeDescriptorA.payload.wsUrl.includes("ticket="), true, "Le wsUrl userA doit contenir un ticket signe");
  }
  if (typeof realtimeDescriptorB.payload?.wsUrl === "string") {
    assert.equal(realtimeDescriptorB.payload.wsUrl.includes("ticket="), true, "Le wsUrl userB doit contenir un ticket signe");
  }

  const hasWebSocketRealtime =
    typeof realtimeDescriptorA.payload?.wsUrl === "string" && typeof realtimeDescriptorB.payload?.wsUrl === "string";
  const hasRedisBridge =
    Boolean(realtimeDescriptorA.payload?.bridge?.redisEnabled) &&
    Boolean(realtimeDescriptorB.payload?.bridge?.redisEnabled);

  let wsA = null;
  let wsB = null;

  if (hasWebSocketRealtime) {
    wsA = await connectRealtimeSocket(realtimeDescriptorA.payload.wsUrl, "clientA");
    try {
      wsB = await connectRealtimeSocket(realtimeDescriptorB.payload.wsUrl, "clientB");
    } catch (error) {
      await wsA.close().catch(() => {});
      throw error;
    }

  }

  try {
  if (wsA && wsB) {
    await Promise.all([
      wsA.waitForEvent((event) => event?.type === "system.heartbeat", "heartbeat clientA"),
      wsB.waitForEvent((event) => event?.type === "system.heartbeat", "heartbeat clientB"),
    ]);

    const presenceState = await requestJson(withCustomUser(`/api/live-shopping/presence?eventId=${eventId}`, userA), {
      method: "GET",
      headers: { Cookie: loginA.cookieHeader },
    });
    assert.equal(presenceState.response.status, 200, "GET presence doit retourner 200");
    assert.equal(
      typeof presenceState.payload?.presence === "object" && presenceState.payload?.presence !== null,
      true,
      "Le payload presence doit etre retourne",
    );
  }

  const roomBefore = await requestJson(withCustomUser(`/api/live-shopping/chat?eventId=${eventId}`, userA), {
    method: "GET",
    headers: { Cookie: loginA.cookieHeader },
  });
  assert.equal(roomBefore.response.status, 200, "GET roomState initial doit retourner 200");

  const roomLotStates = roomBefore.payload?.roomState?.lotStates ?? {};
  const auctionLotIds = Object.keys(roomLotStates);
  assert.ok(auctionLotIds.length > 0, "Le roomState doit contenir au moins un lot auction");
  const auctionLotId = auctionLotIds[0];
  const roomLotStateBefore = roomLotStates[auctionLotId];
  const bidIncrement = 1;
  const startBid = Number(roomLotStateBefore?.currentBid ?? 0) || 0;

  const marker = `critical-chat-${Date.now()}`;
  const chatSend = await requestJson(withCustomUser("/api/live-shopping/chat", userA), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: loginA.cookieHeader,
    },
    body: JSON.stringify({
      eventId,
      body: `message ${marker}`,
    }),
  });
  assert.equal(chatSend.response.status, 200, "POST chat doit retourner 200");
  if (wsA && wsB && hasRedisBridge) {
    await Promise.all([
      wsA.waitForEvent(
        (event) =>
          event?.type === "live.sync" &&
          event?.payload?.action === "send_chat" &&
          String(event?.payload?.chatMessage?.body ?? "").includes(marker),
        "chat sync clientA",
      ),
      wsB.waitForEvent(
        (event) =>
          event?.type === "live.sync" &&
          event?.payload?.action === "send_chat" &&
          String(event?.payload?.chatMessage?.body ?? "").includes(marker),
        "chat sync clientB",
      ),
    ]);
  }

  const roomReadByB = await requestJson(withCustomUser(`/api/live-shopping/chat?eventId=${eventId}`, userB), {
    method: "GET",
    headers: { Cookie: loginB.cookieHeader },
  });
  assert.equal(roomReadByB.response.status, 200, "GET roomState userB doit retourner 200");
  const hasMarkerMessage = (roomReadByB.payload?.roomState?.chat ?? []).some((entry) =>
    String(entry?.body ?? "").includes(marker),
  );
  assert.equal(hasMarkerMessage, true, "Le chat doit etre partage entre utilisateurs");

  const bidFromB = startBid + bidIncrement;
  const bidResultB = await requestJson(withCustomUser("/api/live-shopping/actions", userB), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: loginB.cookieHeader,
      "x-idempotency-key": `critical-shared-bid-b-${Date.now()}`,
    },
    body: JSON.stringify({
      action: "place_bid",
      eventId,
      eventSeller: "Test Seller",
      lot: {
        id: auctionLotId,
        title: "Shared room lot",
        mode: "auction",
        price: startBid,
        currentBid: startBid,
        bidIncrement,
        delivery: "48h",
        stock: 1,
      },
      amount: bidFromB,
    }),
  });
  assert.equal(bidResultB.response.status, 200, "POST bid userB doit retourner 200");

  const bidFromA = bidFromB + bidIncrement;
  const bidResultA = await requestJson(withCustomUser("/api/live-shopping/actions", userA), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: loginA.cookieHeader,
      "x-idempotency-key": `critical-shared-bid-a-${Date.now()}`,
    },
    body: JSON.stringify({
      action: "place_bid",
      eventId,
      eventSeller: "Test Seller",
      lot: {
        id: auctionLotId,
        title: "Shared room lot",
        mode: "auction",
        price: startBid,
        currentBid: bidFromB,
        bidIncrement,
        delivery: "48h",
        stock: 1,
      },
      amount: bidFromA,
    }),
  });
  assert.equal(bidResultA.response.status, 200, "POST bid userA doit retourner 200");
  if (wsA && wsB && hasRedisBridge) {
    await Promise.all([
      wsA.waitForEvent(
        (event) =>
          event?.type === "live.sync" &&
          event?.payload?.action === "place_bid" &&
          event?.payload?.lotId === auctionLotId &&
          Number(event?.payload?.acceptedBid ?? 0) === bidFromA,
        "bid sync final clientA",
      ),
      wsB.waitForEvent(
        (event) =>
          event?.type === "live.sync" &&
          event?.payload?.action === "place_bid" &&
          event?.payload?.lotId === auctionLotId &&
          Number(event?.payload?.acceptedBid ?? 0) === bidFromA,
        "bid sync final clientB",
      ),
    ]);
  }

  const [roomAfterA, roomAfterB] = await Promise.all([
    requestJson(withCustomUser(`/api/live-shopping/chat?eventId=${eventId}`, userA), {
      method: "GET",
      headers: { Cookie: loginA.cookieHeader },
    }),
    requestJson(withCustomUser(`/api/live-shopping/chat?eventId=${eventId}`, userB), {
      method: "GET",
      headers: { Cookie: loginB.cookieHeader },
    }),
  ]);

  assert.equal(roomAfterA.response.status, 200, "GET roomState final userA doit retourner 200");
  assert.equal(roomAfterB.response.status, 200, "GET roomState final userB doit retourner 200");

  const lotAfterA = roomAfterA.payload?.roomState?.lotStates?.[auctionLotId];
  const lotAfterB = roomAfterB.payload?.roomState?.lotStates?.[auctionLotId];
  assert.ok(lotAfterA, "Le lot doit exister en roomState apres enchere");
  assert.ok(lotAfterB, "Le lot doit exister en roomState apres enchere");
  assert.equal(lotAfterA.currentBid, bidFromA, "Le currentBid final doit etre le plus haut montant");
  assert.equal(lotAfterB.currentBid, bidFromA, "Le currentBid final doit etre partage pour tous");
  assert.equal(lotAfterA.leadingBidder, userA, "Le leading bidder doit etre userA");
  assert.equal(lotAfterB.leadingBidder, userA, "Le leading bidder partage doit etre userA");
  } finally {
    if (wsA) {
      await wsA.close().catch(() => {});
    }

    if (wsB) {
      await wsB.close().catch(() => {});
    }

    if (wsA && wsB) {
      await wait(120);
      const presenceAfterClose = await requestJson(withCustomUser(`/api/live-shopping/presence?eventId=${eventId}`, userA), {
        method: "GET",
        headers: { Cookie: loginA.cookieHeader },
      });
      assert.equal(presenceAfterClose.response.status, 200, "GET presence apres close doit retourner 200");
      assert.equal(
        Number(presenceAfterClose.payload?.presence?.totalConnections ?? 0) >= 0,
        true,
        "Le snapshot presence apres close doit rester valide",
      );
    }
  }
}

async function testMainPagesReachable() {
  const pages = ["/", "/marketplace", "/live-shopping", "/profile", "/live-shopping/inventory", "/live-shopping/schedule"];

  for (const pathname of pages) {
    const response = await fetch(new URL(pathname, BASE_URL));
    assert.equal(response.status, 200, `La page ${pathname} doit retourner 200`);
  }
}

async function main() {
  console.log(`[critical] base=${BASE_URL} user=${TEST_USER_ID}`);

  await ensureServerReachable();
  await testMarketplaceOrdersFlow();
  await testSessionStabilityFlow();
  await testAuthSessionFlow();
  await testLiveOrdersFlow();
  await testLiveInventoryFlow();
  await testLiveScheduleFlow();
  await testLiveActionsFlow();
  await testLiveSharedRealtimeFlow();
  await testMainPagesReachable();

  console.log("[critical] OK - flux critiques valides.");
}

main().catch((error) => {
  console.error("[critical] FAIL");
  console.error(error);
  process.exitCode = 1;
});
